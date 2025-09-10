const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');

/**
 * Assignment Management Service - Comprehensive assignment management for teachers
 */
class AssignmentManagementService {
  
  /**
   * Create assignment with detailed grading criteria and templates
   * @param {Object} assignmentData - Assignment creation data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Created assignment
   */
  async createAssignment(assignmentData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT id, title FROM courses WHERE id = ? AND teacher_id = ?',
        [assignmentData.courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const {
        courseId,
        title,
        description,
        instructions,
        totalPoints,
        deadline,
        category,
        submissionFormat = 'pdf',
        gradingMethod = 'auto',
        gradingCriteria,
        allowLateSubmissions = true,
        latePenalty = 0,
        maxAttempts = 1,
        showGradingRubric = true,
        autoPublishGrades = false,
        questionPdfPath,
        resourceFiles = []
      } = assignmentData;
      
      // Create the assignment
      const [assignmentResult] = await connection.query(
        `INSERT INTO assignments 
         (course_id, title, description, instructions, total_points, deadline, 
          category, submission_format, grading_method, allow_late_submissions, 
          late_penalty, max_attempts, show_grading_rubric, auto_publish_grades,
          question_pdf_path, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, NOW())`,
        [
          courseId, title, description, instructions, totalPoints, deadline,
          category, submissionFormat, gradingMethod, allowLateSubmissions,
          latePenalty, maxAttempts, showGradingRubric, autoPublishGrades,
          questionPdfPath
        ]
      );
      
      const assignmentId = assignmentResult.insertId;
      
      // Insert grading criteria
      if (gradingCriteria && gradingCriteria.length > 0) {
        const criteriaValues = gradingCriteria.map(criteria => [
          assignmentId,
          criteria.name,
          criteria.description,
          criteria.maxPoints,
          criteria.weight || 1.0
        ]);
        
        await connection.query(
          `INSERT INTO grading_criteria 
           (assignment_id, criteria_name, description, max_points, weight) 
           VALUES ?`,
          [criteriaValues]
        );
      }
      
      // Insert resource files
      if (resourceFiles.length > 0) {
        const resourceValues = resourceFiles.map(file => [
          assignmentId,
          file.filename,
          file.originalName,
          file.filePath,
          file.fileSize,
          file.mimeType
        ]);
        
        await connection.query(
          `INSERT INTO assignment_resources 
           (assignment_id, filename, original_name, file_path, file_size, mime_type) 
           VALUES ?`,
          [resourceValues]
        );
      }
      
      // Create automatic notification for enrolled students
      const [enrolledStudents] = await connection.query(
        'SELECT student_id FROM enrollments WHERE course_id = ? AND status = "active"',
        [courseId]
      );
      
      if (enrolledStudents.length > 0) {
        const notificationValues = enrolledStudents.map(student => [
          student.student_id,
          teacherId,
          'assignment',
          `New Assignment: ${title}`,
          `A new assignment "${title}" has been posted in your course. Deadline: ${new Date(deadline).toLocaleDateString()}`,
          null, // submission_id
          assignmentId,
          courseId,
          'normal',
          'sent'
        ]);
        
        await connection.query(
          `INSERT INTO notifications 
           (recipient_id, sender_id, type, subject, message, submission_id, 
            assignment_id, course_id, priority, status) 
           VALUES ?`,
          [notificationValues]
        );
      }
      
      await connection.commit();
      
      // Get the complete assignment data
      const assignment = await this.getAssignmentDetails(assignmentId, teacherId);
      
      logger.info(`Assignment created: ${title} (ID: ${assignmentId}) by teacher ${teacherId}`);
      
      return assignment;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error creating assignment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get assignment details with comprehensive data
   * @param {Number} assignmentId - Assignment ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Assignment details
   */
  async getAssignmentDetails(assignmentId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      // Verify assignment access
      const [assignmentCheck] = await connection.query(
        `SELECT a.*, c.title as course_title, c.code as course_code
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ? AND c.teacher_id = ?`,
        [assignmentId, teacherId]
      );
      
      if (assignmentCheck.length === 0) {
        throw createError(404, 'Assignment not found or access denied');
      }
      
      const assignment = assignmentCheck[0];
      
      // Get grading criteria
      const [gradingCriteria] = await connection.query(
        'SELECT * FROM grading_criteria WHERE assignment_id = ? ORDER BY criteria_name',
        [assignmentId]
      );
      
      // Get resource files
      const [resourceFiles] = await connection.query(
        'SELECT * FROM assignment_resources WHERE assignment_id = ? ORDER BY original_name',
        [assignmentId]
      );
      
      // Get submission statistics
      const [submissionStats] = await connection.query(
        `SELECT 
           COUNT(*) as total_submissions,
           COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_submissions,
           COUNT(CASE WHEN status = 'submitted' AND grade IS NULL THEN 1 END) as pending_grading,
           COUNT(CASE WHEN submission_time > ? THEN 1 END) as late_submissions,
           AVG(normalized_grade) as average_grade,
           MIN(normalized_grade) as min_grade,
           MAX(normalized_grade) as max_grade,
           STDDEV(normalized_grade) as grade_std_dev
         FROM submissions 
         WHERE assignment_id = ?`,
        [assignment.deadline, assignmentId]
      );
      
      // Get enrolled students count for comparison
      const [enrolledCount] = await connection.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = "active"',
        [assignment.course_id]
      );
      
      // Get recent submissions
      const [recentSubmissions] = await connection.query(
        `SELECT s.*, 
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.identifier as student_identifier
         FROM submissions s
         JOIN users u ON s.student_id = u.id
         WHERE s.assignment_id = ?
         ORDER BY s.submission_time DESC
         LIMIT 10`,
        [assignmentId]
      );
      
      return {
        ...assignment,
        gradingCriteria,
        resourceFiles,
        statistics: {
          ...submissionStats[0],
          enrolled_students: enrolledCount[0].count,
          submission_rate: enrolledCount[0].count > 0 
            ? (submissionStats[0].total_submissions / enrolledCount[0].count) * 100 
            : 0
        },
        recentSubmissions
      };
      
    } catch (error) {
      logger.error('Error getting assignment details:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update assignment with validation
   * @param {Number} assignmentId - Assignment ID
   * @param {Object} updateData - Assignment update data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Updated assignment
   */
  async updateAssignment(assignmentId, updateData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify assignment access
      const [assignmentCheck] = await connection.query(
        `SELECT a.*, c.id as course_id
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ? AND c.teacher_id = ?`,
        [assignmentId, teacherId]
      );
      
      if (assignmentCheck.length === 0) {
        throw createError(404, 'Assignment not found or access denied');
      }
      
      const assignment = assignmentCheck[0];
      
      // Check if assignment has submissions
      const [submissionCheck] = await connection.query(
        'SELECT COUNT(*) as count FROM submissions WHERE assignment_id = ?',
        [assignmentId]
      );
      
      const hasSubmissions = submissionCheck[0].count > 0;
      
      // Prepare update fields with validation
      const allowedFields = [
        'title', 'description', 'instructions', 'deadline', 'category',
        'allow_late_submissions', 'late_penalty', 'show_grading_rubric',
        'auto_publish_grades'
      ];
      
      // Restrict certain updates if assignment has submissions
      if (hasSubmissions) {
        const restrictedFields = ['total_points', 'submission_format', 'grading_method'];
        allowedFields.filter(field => !restrictedFields.includes(field));
      }
      
      const updateFields = [];
      const updateValues = [];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      }
      
      if (updateFields.length > 0) {
        updateValues.push(assignmentId);
        await connection.query(
          `UPDATE assignments SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          updateValues
        );
      }
      
      // Update grading criteria if provided and no submissions exist
      if (updateData.gradingCriteria && !hasSubmissions) {
        // Remove existing criteria
        await connection.query(
          'DELETE FROM grading_criteria WHERE assignment_id = ?',
          [assignmentId]
        );
        
        // Insert new criteria
        if (updateData.gradingCriteria.length > 0) {
          const criteriaValues = updateData.gradingCriteria.map(criteria => [
            assignmentId,
            criteria.name,
            criteria.description,
            criteria.maxPoints,
            criteria.weight || 1.0
          ]);
          
          await connection.query(
            `INSERT INTO grading_criteria 
             (assignment_id, criteria_name, description, max_points, weight) 
             VALUES ?`,
            [criteriaValues]
          );
        }
      }
      
      // Notify students about significant changes
      if (updateData.deadline && updateData.deadline !== assignment.deadline) {
        const [enrolledStudents] = await connection.query(
          'SELECT student_id FROM enrollments WHERE course_id = ? AND status = "active"',
          [assignment.course_id]
        );
        
        if (enrolledStudents.length > 0) {
          const notificationValues = enrolledStudents.map(student => [
            student.student_id,
            teacherId,
            'announcement',
            `Assignment Updated: ${assignment.title}`,
            `The deadline for assignment "${assignment.title}" has been updated to ${new Date(updateData.deadline).toLocaleDateString()}`,
            null,
            assignmentId,
            assignment.course_id,
            'high',
            'sent'
          ]);
          
          await connection.query(
            `INSERT INTO notifications 
             (recipient_id, sender_id, type, subject, message, submission_id, 
              assignment_id, course_id, priority, status) 
             VALUES ?`,
            [notificationValues]
          );
        }
      }
      
      await connection.commit();
      
      // Get updated assignment details
      const updatedAssignment = await this.getAssignmentDetails(assignmentId, teacherId);
      
      logger.info(`Assignment updated: ${assignmentId} by teacher ${teacherId}`);
      
      return updatedAssignment;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating assignment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Create assignment from template
   * @param {Number} templateId - Template ID
   * @param {Object} assignmentData - Assignment data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Created assignment
   */
  async createFromTemplate(templateId, assignmentData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      // Get template data
      const [template] = await connection.query(
        `SELECT * FROM assignment_templates 
         WHERE id = ? AND (created_by = ? OR is_public = true)`,
        [templateId, teacherId]
      );
      
      if (template.length === 0) {
        throw createError(404, 'Template not found or access denied');
      }
      
      const templateData = template[0];
      const templateStructure = JSON.parse(templateData.template_data);
      
      // Merge template data with provided assignment data
      const mergedData = {
        courseId: assignmentData.courseId,
        title: assignmentData.title || templateData.name,
        description: assignmentData.description || templateData.description,
        instructions: templateStructure.instructions || '',
        totalPoints: assignmentData.totalPoints || templateStructure.totalPoints || 100,
        deadline: assignmentData.deadline,
        category: assignmentData.category || templateData.category,
        submissionFormat: assignmentData.submissionFormat || templateData.submission_format,
        gradingMethod: assignmentData.gradingMethod || templateData.grading_method,
        gradingCriteria: templateStructure.gradingCriteria || [],
        allowLateSubmissions: assignmentData.allowLateSubmissions !== undefined 
          ? assignmentData.allowLateSubmissions : true,
        latePenalty: assignmentData.latePenalty || 0,
        maxAttempts: assignmentData.maxAttempts || 1,
        showGradingRubric: assignmentData.showGradingRubric !== undefined 
          ? assignmentData.showGradingRubric : true,
        autoPublishGrades: assignmentData.autoPublishGrades || false
      };
      
      // Create assignment from merged data
      const assignment = await this.createAssignment(mergedData, teacherId);
      
      // Update template usage count
      await connection.query(
        'UPDATE assignment_templates SET usage_count = usage_count + 1 WHERE id = ?',
        [templateId]
      );
      
      logger.info(`Assignment created from template ${templateId}: ${assignment.title}`);
      
      return assignment;
      
    } catch (error) {
      logger.error('Error creating assignment from template:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Duplicate an existing assignment
   * @param {Number} assignmentId - Source assignment ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} overrides - Override data for the new assignment
   * @returns {Promise<Object>} Duplicated assignment
   */
  async duplicateAssignment(assignmentId, teacherId, overrides = {}) {
    const connection = await pool.getConnection();
    
    try {
      // Get source assignment
      const sourceAssignment = await this.getAssignmentDetails(assignmentId, teacherId);
      
      // Prepare new assignment data
      const newAssignmentData = {
        courseId: overrides.courseId || sourceAssignment.course_id,
        title: overrides.title || `${sourceAssignment.title} (Copy)`,
        description: sourceAssignment.description,
        instructions: sourceAssignment.instructions,
        totalPoints: sourceAssignment.total_points,
        deadline: overrides.deadline,
        category: sourceAssignment.category,
        submissionFormat: sourceAssignment.submission_format,
        gradingMethod: sourceAssignment.grading_method,
        gradingCriteria: sourceAssignment.gradingCriteria.map(criteria => ({
          name: criteria.criteria_name,
          description: criteria.description,
          maxPoints: criteria.max_points,
          weight: criteria.weight
        })),
        allowLateSubmissions: sourceAssignment.allow_late_submissions,
        latePenalty: sourceAssignment.late_penalty,
        maxAttempts: sourceAssignment.max_attempts,
        showGradingRubric: sourceAssignment.show_grading_rubric,
        autoPublishGrades: sourceAssignment.auto_publish_grades,
        resourceFiles: [] // Don't copy files, let teacher upload new ones
      };
      
      // Create the duplicated assignment
      const duplicatedAssignment = await this.createAssignment(newAssignmentData, teacherId);
      
      logger.info(`Assignment duplicated: ${assignmentId} -> ${duplicatedAssignment.id} by teacher ${teacherId}`);
      
      return duplicatedAssignment;
      
    } catch (error) {
      logger.error('Error duplicating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get assignment templates
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Assignment templates
   */
  async getAssignmentTemplates(teacherId, filters = {}) {
    try {
      const {
        category,
        search,
        isPublic,
        sortBy = 'usage_count',
        sortOrder = 'DESC'
      } = filters;
      
      const conditions = ['(created_by = ? OR is_public = true)'];
      const params = [teacherId];
      
      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }
      
      if (search) {
        conditions.push('(name LIKE ? OR description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (isPublic !== undefined) {
        conditions.push('is_public = ?');
        params.push(isPublic);
      }
      
      const whereClause = conditions.join(' AND ');
      
      const [templates] = await pool.query(
        `SELECT at.*, 
                CONCAT(u.first_name, ' ', u.last_name) as creator_name
         FROM assignment_templates at
         JOIN users u ON at.created_by = u.id
         WHERE ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}`,
        params
      );
      
      return templates.map(template => ({
        ...template,
        templateData: JSON.parse(template.template_data)
      }));
      
    } catch (error) {
      logger.error('Error getting assignment templates:', error);
      throw error;
    }
  }
  
  /**
   * Create assignment template
   * @param {Object} templateData - Template data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Created template
   */
  async createAssignmentTemplate(templateData, teacherId) {
    try {
      const {
        name,
        description,
        category,
        submissionFormat,
        gradingMethod,
        templateStructure,
        isPublic = false
      } = templateData;
      
      const [result] = await pool.query(
        `INSERT INTO assignment_templates 
         (created_by, name, description, category, submission_format, grading_method, 
          template_data, is_public)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          teacherId,
          name,
          description,
          category,
          submissionFormat,
          gradingMethod,
          JSON.stringify(templateStructure),
          isPublic
        ]
      );
      
      // Get the created template
      const [createdTemplate] = await pool.query(
        `SELECT at.*, 
                CONCAT(u.first_name, ' ', u.last_name) as creator_name
         FROM assignment_templates at
         JOIN users u ON at.created_by = u.id
         WHERE at.id = ?`,
        [result.insertId]
      );
      
      logger.info(`Assignment template created: ${name} by teacher ${teacherId}`);
      
      return {
        ...createdTemplate[0],
        templateData: JSON.parse(createdTemplate[0].template_data)
      };
      
    } catch (error) {
      logger.error('Error creating assignment template:', error);
      throw error;
    }
  }
  
  /**
   * Get assignment categories for a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Array>} Assignment categories
   */
  async getAssignmentCategories(courseId, teacherId) {
    try {
      // Verify course access
      const [courseCheck] = await pool.query(
        'SELECT id FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const [categories] = await pool.query(
        `SELECT category, 
                COUNT(*) as assignment_count,
                SUM(total_points) as total_points,
                AVG(total_points) as avg_points
         FROM assignments 
         WHERE course_id = ? AND is_active = true
         GROUP BY category
         ORDER BY category`,
        [courseId]
      );
      
      return categories;
      
    } catch (error) {
      logger.error('Error getting assignment categories:', error);
      throw error;
    }
  }
  
  /**
   * Get assignments with comprehensive filtering and sorting
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Assignments with pagination
   */
  async getAssignmentsByTeacher(teacherId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        page = 1,
        limit = 20,
        courseId,
        category,
        status = 'active',
        search = '',
        sortBy = 'deadline',
        sortOrder = 'DESC',
        gradingStatus
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = ['c.teacher_id = ?'];
      const params = [teacherId];
      
      if (courseId) {
        conditions.push('a.course_id = ?');
        params.push(courseId);
      }
      
      if (category) {
        conditions.push('a.category = ?');
        params.push(category);
      }
      
      if (status === 'active') {
        conditions.push('a.is_active = true');
      } else if (status === 'archived') {
        conditions.push('a.is_active = false');
      }
      
      if (search) {
        conditions.push('(a.title LIKE ? OR a.description LIKE ?)');
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm);
      }
      
      if (gradingStatus === 'pending') {
        conditions.push('EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.grade IS NULL)');
      } else if (gradingStatus === 'completed') {
        conditions.push('NOT EXISTS (SELECT 1 FROM submissions s WHERE s.assignment_id = a.id AND s.grade IS NULL)');
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Get assignments with statistics
      const [assignments] = await connection.query(
        `SELECT a.*, 
                c.code as course_code, c.title as course_title,
                COUNT(DISTINCT s.id) as total_submissions,
                COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
                COUNT(DISTINCT CASE WHEN s.grade IS NULL AND s.status = 'submitted' THEN s.id END) as pending_grading,
                AVG(s.normalized_grade) as average_grade,
                COUNT(DISTINCT e.student_id) as enrolled_students
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN submissions s ON a.id = s.assignment_id
         LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
         WHERE ${whereClause}
         GROUP BY a.id
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      // Get total count
      const [countResult] = await connection.query(
        `SELECT COUNT(DISTINCT a.id) as total
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE ${whereClause}`,
        params
      );
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      return {
        assignments: assignments.map(assignment => ({
          ...assignment,
          submissionRate: assignment.enrolled_students > 0 
            ? (assignment.total_submissions / assignment.enrolled_students) * 100 
            : 0,
          gradingProgress: assignment.total_submissions > 0 
            ? (assignment.graded_submissions / assignment.total_submissions) * 100 
            : 0
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      logger.error('Error getting assignments by teacher:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new AssignmentManagementService();
