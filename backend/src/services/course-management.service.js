const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');

/**
 * Course Management Service - Comprehensive course management for teachers
 */
class CourseManagementService {
  
  /**
   * Create a new course with detailed metadata
   * @param {Object} courseData - Course creation data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Created course
   */
  async createCourse(courseData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const {
        code,
        title,
        description,
        credits,
        startDate,
        endDate,
        semester,
        academicYear,
        maxEnrollment,
        prerequisiteCourses,
        gradingPolicy,
        enrollmentRequirements,
        courseObjectives,
        department,
        level
      } = courseData;
      
      // Create the course
      const [courseResult] = await connection.query(
        `INSERT INTO courses 
         (code, title, description, credits, teacher_id, start_date, end_date, 
          semester, academic_year, max_enrollment, department, level, is_active, created_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        [code, title, description, credits, teacherId, startDate, endDate, 
         semester, academicYear, maxEnrollment, department, level, true]
      );
      
      const courseId = courseResult.insertId;
      
      // Insert course metadata
      if (gradingPolicy) {
        await connection.query(
          `INSERT INTO gradebook_settings 
           (course_id, grading_scale, weight_assignments, drop_lowest_scores, 
            late_penalty_type, late_penalty_value, grace_period_hours, 
            auto_publish_grades, show_statistics_to_students, rounding_method) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            courseId,
            JSON.stringify(gradingPolicy.scale || {}),
            gradingPolicy.weightAssignments || true,
            gradingPolicy.dropLowestScores || 0,
            gradingPolicy.latePenaltyType || 'percentage',
            gradingPolicy.latePenaltyValue || 0,
            gradingPolicy.gracePeriodHours || 0,
            gradingPolicy.autoPublishGrades || false,
            gradingPolicy.showStatisticsToStudents || true,
            gradingPolicy.roundingMethod || 'round_nearest'
          ]
        );
      }
      
      // Insert prerequisites
      if (prerequisiteCourses && prerequisiteCourses.length > 0) {
        const prerequisiteValues = prerequisiteCourses.map(prereqId => [courseId, prereqId]);
        await connection.query(
          'INSERT INTO course_prerequisites (course_id, prerequisite_course_id) VALUES ?',
          [prerequisiteValues]
        );
      }
      
      // Insert course objectives and requirements as metadata
      if (courseObjectives || enrollmentRequirements) {
        await connection.query(
          `INSERT INTO course_metadata 
           (course_id, metadata_type, metadata_value) 
           VALUES (?, 'objectives', ?), (?, 'enrollment_requirements', ?)`,
          [courseId, JSON.stringify(courseObjectives || []), 
           courseId, JSON.stringify(enrollmentRequirements || {})]
        );
      }
      
      // Initialize course statistics
      await connection.query(
        `INSERT INTO course_statistics 
         (course_id, total_students, active_students, total_assignments, 
          total_submissions, average_grade, completion_rate, late_submission_rate) 
         VALUES (?, 0, 0, 0, 0, NULL, NULL, NULL)`,
        [courseId]
      );
      
      // Create default announcement for course creation
      await connection.query(
        `INSERT INTO announcements 
         (course_id, author_id, title, content, priority, is_published, published_at) 
         VALUES (?, ?, ?, ?, 'normal', true, NOW())`,
        [
          courseId,
          teacherId,
          'Welcome to the Course',
          `Welcome to ${title}! This course has been created and is ready for enrollment.`
        ]
      );
      
      await connection.commit();
      
      // Return the complete course data
      const [courseDetails] = await connection.query(
        `SELECT c.*, 
                u.first_name as teacher_first_name, 
                u.last_name as teacher_last_name,
                u.email as teacher_email
         FROM courses c 
         JOIN users u ON c.teacher_id = u.id 
         WHERE c.id = ?`,
        [courseId]
      );
      
      logger.info(`Course created: ${title} (ID: ${courseId}) by teacher ${teacherId}`);
      
      return courseDetails[0];
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error creating course:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update course with comprehensive validation
   * @param {Number} courseId - Course ID
   * @param {Object} updateData - Course update data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Updated course
   */
  async updateCourse(courseId, updateData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT id FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      // Check if course is currently active (has enrolled students)
      const [enrollmentCheck] = await connection.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = "active"',
        [courseId]
      );
      
      const hasActiveEnrollments = enrollmentCheck[0].count > 0;
      
      // Prepare update fields
      const allowedFields = [
        'title', 'description', 'credits', 'start_date', 'end_date',
        'semester', 'academic_year', 'max_enrollment', 'department', 'level'
      ];
      
      const updateFields = [];
      const updateValues = [];
      
      for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
          // Prevent certain changes if course has active enrollments
          if (hasActiveEnrollments && ['code', 'credits'].includes(field)) {
            logger.warn(`Cannot update ${field} for course with active enrollments`);
            continue;
          }
          
          updateFields.push(`${field} = ?`);
          updateValues.push(updateData[field]);
        }
      }
      
      if (updateFields.length > 0) {
        updateValues.push(courseId);
        await connection.query(
          `UPDATE courses SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
          updateValues
        );
      }
      
      // Update grading policy if provided
      if (updateData.gradingPolicy) {
        await connection.query(
          `UPDATE gradebook_settings SET 
           grading_scale = ?, weight_assignments = ?, drop_lowest_scores = ?,
           late_penalty_type = ?, late_penalty_value = ?, grace_period_hours = ?,
           auto_publish_grades = ?, show_statistics_to_students = ?, rounding_method = ?,
           updated_at = NOW()
           WHERE course_id = ?`,
          [
            JSON.stringify(updateData.gradingPolicy.scale || {}),
            updateData.gradingPolicy.weightAssignments,
            updateData.gradingPolicy.dropLowestScores,
            updateData.gradingPolicy.latePenaltyType,
            updateData.gradingPolicy.latePenaltyValue,
            updateData.gradingPolicy.gracePeriodHours,
            updateData.gradingPolicy.autoPublishGrades,
            updateData.gradingPolicy.showStatisticsToStudents,
            updateData.gradingPolicy.roundingMethod,
            courseId
          ]
        );
      }
      
      await connection.commit();
      
      // Get updated course details
      const [updatedCourse] = await connection.query(
        `SELECT c.*, 
                u.first_name as teacher_first_name, 
                u.last_name as teacher_last_name
         FROM courses c 
         JOIN users u ON c.teacher_id = u.id 
         WHERE c.id = ?`,
        [courseId]
      );
      
      logger.info(`Course updated: ${courseId} by teacher ${teacherId}`);
      
      return updatedCourse[0];
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating course:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get course details with comprehensive analytics
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Course details with analytics
   */
  async getCourseDetails(courseId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      // Get comprehensive course data
      const [courseData] = await connection.query(
        `SELECT c.*, 
                u.first_name as teacher_first_name, 
                u.last_name as teacher_last_name,
                u.email as teacher_email,
                cs.total_students,
                cs.active_students,
                cs.total_assignments,
                cs.total_submissions,
                cs.average_grade,
                cs.completion_rate,
                cs.late_submission_rate,
                gs.grading_scale,
                gs.weight_assignments,
                gs.drop_lowest_scores,
                gs.late_penalty_type,
                gs.late_penalty_value,
                gs.grace_period_hours,
                gs.auto_publish_grades,
                gs.show_statistics_to_students,
                gs.rounding_method
         FROM courses c 
         JOIN users u ON c.teacher_id = u.id 
         LEFT JOIN course_statistics cs ON c.id = cs.course_id
         LEFT JOIN gradebook_settings gs ON c.id = gs.course_id
         WHERE c.id = ?`,
        [courseId]
      );
      
      // Get student enrollment data
      const [enrollmentData] = await connection.query(
        `SELECT e.*, 
                u.identifier, u.first_name, u.last_name, u.email,
                COUNT(DISTINCT s.id) as submitted_assignments,
                AVG(s.normalized_grade) as average_grade,
                COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN assignments a ON a.course_id = e.course_id AND a.is_active = true
         LEFT JOIN submissions s ON s.assignment_id = a.id AND s.student_id = e.student_id
         WHERE e.course_id = ? AND e.status = 'active'
         GROUP BY e.student_id, u.id
         ORDER BY u.last_name, u.first_name`,
        [courseId]
      );
      
      // Get assignment data
      const [assignmentData] = await connection.query(
        `SELECT a.*, 
                COUNT(DISTINCT s.id) as submission_count,
                COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_count,
                AVG(s.normalized_grade) as average_grade
         FROM assignments a
         LEFT JOIN submissions s ON a.id = s.assignment_id
         WHERE a.course_id = ? AND a.is_active = true
         GROUP BY a.id
         ORDER BY a.deadline DESC`,
        [courseId]
      );
      
      // Get recent activity
      const [recentActivity] = await connection.query(
        `(
          SELECT 'submission' as type, s.submission_time as timestamp,
                 CONCAT(u.first_name, ' ', u.last_name) as actor_name,
                 a.title as description, s.id as related_id
          FROM submissions s
          JOIN assignments a ON s.assignment_id = a.id
          JOIN users u ON s.student_id = u.id
          WHERE a.course_id = ?
          ORDER BY s.submission_time DESC
          LIMIT 5
         )
         UNION ALL
         (
          SELECT 'enrollment' as type, e.enrollment_date as timestamp,
                 CONCAT(u.first_name, ' ', u.last_name) as actor_name,
                 'Enrolled in course' as description, e.id as related_id
          FROM enrollments e
          JOIN users u ON e.student_id = u.id
          WHERE e.course_id = ?
          ORDER BY e.enrollment_date DESC
          LIMIT 5
         )
         ORDER BY timestamp DESC
         LIMIT 10`,
        [courseId, courseId]
      );
      
      // Get announcements
      const [announcements] = await connection.query(
        `SELECT * FROM announcements 
         WHERE course_id = ? AND is_published = true 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [courseId]
      );
      
      const result = {
        ...courseData[0],
        students: enrollmentData,
        assignments: assignmentData,
        recentActivity,
        announcements,
        gradingPolicy: {
          scale: courseData[0].grading_scale ? JSON.parse(courseData[0].grading_scale) : {},
          weightAssignments: courseData[0].weight_assignments,
          dropLowestScores: courseData[0].drop_lowest_scores,
          latePenaltyType: courseData[0].late_penalty_type,
          latePenaltyValue: courseData[0].late_penalty_value,
          gracePeriodHours: courseData[0].grace_period_hours,
          autoPublishGrades: courseData[0].auto_publish_grades,
          showStatisticsToStudents: courseData[0].show_statistics_to_students,
          roundingMethod: courseData[0].rounding_method
        }
      };
      
      // Remove redundant fields
      delete result.grading_scale;
      delete result.weight_assignments;
      delete result.drop_lowest_scores;
      delete result.late_penalty_type;
      delete result.late_penalty_value;
      delete result.grace_period_hours;
      delete result.auto_publish_grades;
      delete result.show_statistics_to_students;
      delete result.rounding_method;
      
      return result;
      
    } catch (error) {
      logger.error('Error getting course details:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Archive a course and all related data
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Archive operation result
   */
  async archiveCourse(courseId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      // Archive the course
      await connection.query(
        'UPDATE courses SET is_active = false, archived_at = NOW() WHERE id = ?',
        [courseId]
      );
      
      // Archive all assignments
      await connection.query(
        'UPDATE assignments SET is_active = false WHERE course_id = ?',
        [courseId]
      );
      
      // Change enrollment status to archived
      await connection.query(
        'UPDATE enrollments SET status = "archived" WHERE course_id = ?',
        [courseId]
      );
      
      await connection.commit();
      
      logger.info(`Course archived: ${courseId} by teacher ${teacherId}`);
      
      return {
        success: true,
        message: 'Course archived successfully',
        courseId
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error archiving course:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Duplicate an existing course
   * @param {Number} courseId - Source course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} newCourseData - New course data overrides
   * @returns {Promise<Object>} Duplicated course
   */
  async duplicateCourse(courseId, teacherId, newCourseData = {}) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get source course data
      const [sourceCourse] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (sourceCourse.length === 0) {
        throw createError(404, 'Source course not found or access denied');
      }
      
      const source = sourceCourse[0];
      
      // Create new course with overrides
      const newCourse = {
        code: newCourseData.code || `${source.code}_COPY`,
        title: newCourseData.title || `${source.title} (Copy)`,
        description: source.description,
        credits: source.credits,
        department: source.department,
        level: source.level,
        startDate: newCourseData.startDate,
        endDate: newCourseData.endDate,
        semester: newCourseData.semester,
        academicYear: newCourseData.academicYear,
        maxEnrollment: source.max_enrollment
      };
      
      // Create the duplicated course
      const duplicatedCourse = await this.createCourse(newCourse, teacherId);
      const newCourseId = duplicatedCourse.id;
      
      // Copy gradebook settings
      const [gradebookSettings] = await connection.query(
        'SELECT * FROM gradebook_settings WHERE course_id = ?',
        [courseId]
      );
      
      if (gradebookSettings.length > 0) {
        const settings = gradebookSettings[0];
        await connection.query(
          `UPDATE gradebook_settings SET 
           grading_scale = ?, weight_assignments = ?, drop_lowest_scores = ?,
           late_penalty_type = ?, late_penalty_value = ?, grace_period_hours = ?,
           auto_publish_grades = ?, show_statistics_to_students = ?, rounding_method = ?
           WHERE course_id = ?`,
          [
            settings.grading_scale,
            settings.weight_assignments,
            settings.drop_lowest_scores,
            settings.late_penalty_type,
            settings.late_penalty_value,
            settings.grace_period_hours,
            settings.auto_publish_grades,
            settings.show_statistics_to_students,
            settings.rounding_method,
            newCourseId
          ]
        );
      }
      
      // Copy assignment templates (but not actual assignments with submissions)
      const [assignments] = await connection.query(
        'SELECT * FROM assignments WHERE course_id = ? AND is_active = true',
        [courseId]
      );
      
      for (const assignment of assignments) {
        await connection.query(
          `INSERT INTO assignment_templates 
           (created_by, name, description, category, submission_format, grading_method, template_data)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            teacherId,
            assignment.title,
            assignment.description,
            assignment.category || 'General',
            assignment.submission_format || 'pdf',
            assignment.grading_method || 'auto',
            JSON.stringify({
              totalPoints: assignment.total_points,
              instructions: assignment.instructions,
              gradingCriteria: assignment.grading_criteria
            })
          ]
        );
      }
      
      await connection.commit();
      
      logger.info(`Course duplicated: ${courseId} -> ${newCourseId} by teacher ${teacherId}`);
      
      return duplicatedCourse;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error duplicating course:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get course templates created by teacher
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Array>} Course templates
   */
  async getCourseTemplates(teacherId) {
    try {
      const [templates] = await pool.query(
        `SELECT * FROM assignment_templates 
         WHERE created_by = ? OR is_public = true 
         ORDER BY usage_count DESC, created_at DESC`,
        [teacherId]
      );
      
      return templates;
      
    } catch (error) {
      logger.error('Error getting course templates:', error);
      throw error;
    }
  }
}

module.exports = new CourseManagementService();
