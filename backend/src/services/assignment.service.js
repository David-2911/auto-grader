const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const path = require('path');
const fs = require('fs').promises;

/**
 * Assignment Service - Handles assignment business logic
 */
class AssignmentService {

  /**
   * Get assignments for teacher
   */
  async getTeacherAssignments(teacherId, filters = {}) {
    try {
      const connection = await pool.getConnection();
      
      let query = `
        SELECT a.*, c.title as course_title, c.code as course_code,
               COUNT(DISTINCT s.id) as submission_count,
               COUNT(DISTINCT e.student_id) as total_students
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN submissions s ON a.id = s.assignment_id
        LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
        WHERE c.teacher_id = ?
      `;
      
      const params = [teacherId];
      
      if (filters.courseId) {
        query += ' AND a.course_id = ?';
        params.push(filters.courseId);
      }
      
      if (filters.status) {
        query += ' AND a.status = ?';
        params.push(filters.status);
      }
      
      if (filters.dueAfter) {
        query += ' AND a.due_date >= ?';
        params.push(filters.dueAfter);
      }
      
      if (filters.dueBefore) {
        query += ' AND a.due_date <= ?';
        params.push(filters.dueBefore);
      }
      
      query += ' GROUP BY a.id ORDER BY a.created_at DESC';
      
      if (filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }
      
      const [assignments] = await connection.query(query, params);
      connection.release();
      
      return assignments;
    } catch (error) {
      logger.error('Error in getTeacherAssignments:', error);
      throw error;
    }
  }

  /**
   * Get assignments for student
   */
  async getStudentAssignments(studentId, filters = {}) {
    try {
      const connection = await pool.getConnection();
      
      let query = `
        SELECT a.*, c.title as course_title, c.code as course_code,
               s.id as submission_id, s.status as submission_status,
               s.submitted_at, s.grade, s.feedback
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? AND e.status = 'active' AND a.status = 'published'
      `;
      
      const params = [studentId, studentId];
      
      if (filters.courseId) {
        query += ' AND a.course_id = ?';
        params.push(filters.courseId);
      }
      
      if (filters.status) {
        if (filters.status === 'submitted') {
          query += ' AND s.id IS NOT NULL';
        } else if (filters.status === 'pending') {
          query += ' AND s.id IS NULL AND a.due_date > NOW()';
        } else if (filters.status === 'overdue') {
          query += ' AND s.id IS NULL AND a.due_date < NOW()';
        }
      }
      
      query += ' ORDER BY a.due_date ASC';
      
      if (filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }
      
      const [assignments] = await connection.query(query, params);
      connection.release();
      
      return assignments;
    } catch (error) {
      logger.error('Error in getStudentAssignments:', error);
      throw error;
    }
  }

  /**
   * Get all assignments (admin view)
   */
  async getAllAssignments(filters = {}) {
    try {
      const connection = await pool.getConnection();
      
      let query = `
        SELECT a.*, c.title as course_title, c.code as course_code,
               CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
               COUNT(DISTINCT s.id) as submission_count
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        LEFT JOIN submissions s ON a.id = s.assignment_id
        WHERE 1=1
      `;
      
      const params = [];
      
      if (filters.courseId) {
        query += ' AND a.course_id = ?';
        params.push(filters.courseId);
      }
      
      if (filters.status) {
        query += ' AND a.status = ?';
        params.push(filters.status);
      }
      
      query += ' GROUP BY a.id ORDER BY a.created_at DESC';
      
      if (filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }
      
      const [assignments] = await connection.query(query, params);
      connection.release();
      
      return assignments;
    } catch (error) {
      logger.error('Error in getAllAssignments:', error);
      throw error;
    }
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(assignmentId, userId, userRole) {
    try {
      const connection = await pool.getConnection();
      
      let query = `
        SELECT a.*, c.title as course_title, c.code as course_code,
               CONCAT(u.first_name, ' ', u.last_name) as teacher_name
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON c.teacher_id = u.id
        WHERE a.id = ?
      `;
      
      const params = [assignmentId];
      
      // Add access control based on user role
      if (userRole === 'teacher') {
        query += ' AND c.teacher_id = ?';
        params.push(userId);
      } else if (userRole === 'student') {
        query += ' AND a.status = "published" AND EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.student_id = ? AND e.status = "active")';
        params.push(userId);
      }
      
      const [assignments] = await connection.query(query, params);
      connection.release();
      
      return assignments[0] || null;
    } catch (error) {
      logger.error('Error in getAssignmentById:', error);
      throw error;
    }
  }

  /**
   * Create new assignment
   */
  async createAssignment(assignmentData) {
    try {
      const connection = await pool.getConnection();
      
      const query = `
        INSERT INTO assignments (
          course_id, title, description, type, total_points, 
          due_date, instructions, question_pdf_path, status, 
          created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `;
      
      const params = [
        assignmentData.courseId,
        assignmentData.title,
        assignmentData.description || '',
        assignmentData.type || 'homework',
        assignmentData.totalPoints || 100,
        assignmentData.dueDate,
        assignmentData.instructions || '',
        assignmentData.questionPdfPath || null,
        assignmentData.status || 'draft',
        assignmentData.createdBy
      ];
      
      const [result] = await connection.query(query, params);
      connection.release();
      
      return await this.getAssignmentById(result.insertId, assignmentData.createdBy, 'teacher');
    } catch (error) {
      logger.error('Error in createAssignment:', error);
      throw error;
    }
  }

  /**
   * Update assignment
   */
  async updateAssignment(assignmentId, updateData, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // First check if assignment belongs to teacher
      const [existing] = await connection.query(
        'SELECT a.id FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = ? AND c.teacher_id = ?',
        [assignmentId, teacherId]
      );
      
      if (existing.length === 0) {
        connection.release();
        return null;
      }
      
      const fields = [];
      const params = [];
      
      if (updateData.title !== undefined) {
        fields.push('title = ?');
        params.push(updateData.title);
      }
      
      if (updateData.description !== undefined) {
        fields.push('description = ?');
        params.push(updateData.description);
      }
      
      if (updateData.type !== undefined) {
        fields.push('type = ?');
        params.push(updateData.type);
      }
      
      if (updateData.totalPoints !== undefined) {
        fields.push('total_points = ?');
        params.push(updateData.totalPoints);
      }
      
      if (updateData.dueDate !== undefined) {
        fields.push('due_date = ?');
        params.push(updateData.dueDate);
      }
      
      if (updateData.instructions !== undefined) {
        fields.push('instructions = ?');
        params.push(updateData.instructions);
      }
      
      if (updateData.status !== undefined) {
        fields.push('status = ?');
        params.push(updateData.status);
      }
      
      if (fields.length === 0) {
        connection.release();
        return await this.getAssignmentById(assignmentId, teacherId, 'teacher');
      }
      
      fields.push('updated_at = NOW()');
      params.push(assignmentId);
      
      const query = `UPDATE assignments SET ${fields.join(', ')} WHERE id = ?`;
      
      await connection.query(query, params);
      connection.release();
      
      return await this.getAssignmentById(assignmentId, teacherId, 'teacher');
    } catch (error) {
      logger.error('Error in updateAssignment:', error);
      throw error;
    }
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(assignmentId, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Check if assignment belongs to teacher
      const [existing] = await connection.query(
        'SELECT a.id FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = ? AND c.teacher_id = ?',
        [assignmentId, teacherId]
      );
      
      if (existing.length === 0) {
        connection.release();
        return false;
      }
      
      // Soft delete
      await connection.query(
        'UPDATE assignments SET status = "deleted", updated_at = NOW() WHERE id = ?',
        [assignmentId]
      );
      
      connection.release();
      return true;
    } catch (error) {
      logger.error('Error in deleteAssignment:', error);
      throw error;
    }
  }

  /**
   * Get question PDF path
   */
  async getQuestionPdfPath(assignmentId, userId, userRole) {
    try {
      const assignment = await this.getAssignmentById(assignmentId, userId, userRole);
      
      if (!assignment || !assignment.question_pdf_path) {
        return null;
      }
      
      const fullPath = path.join(process.cwd(), 'storage', assignment.question_pdf_path);
      
      // Check if file exists
      try {
        await fs.access(fullPath);
        return fullPath;
      } catch (error) {
        return null;
      }
    } catch (error) {
      logger.error('Error in getQuestionPdfPath:', error);
      throw error;
    }
  }

  /**
   * Submit assignment
   */
  async submitAssignment(submissionData) {
    try {
      const connection = await pool.getConnection();
      
      // Check if assignment exists and is accessible to student
      const assignment = await this.getAssignmentById(
        submissionData.assignmentId,
        submissionData.studentId,
        'student'
      );
      
      if (!assignment) {
        connection.release();
        throw createError('Assignment not found or not accessible', 404);
      }
      
      // Check if submission already exists
      const [existing] = await connection.query(
        'SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?',
        [submissionData.assignmentId, submissionData.studentId]
      );
      
      if (existing.length > 0) {
        connection.release();
        throw createError('Assignment already submitted', 400);
      }
      
      const query = `
        INSERT INTO submissions (
          assignment_id, student_id, submission_text, file_paths,
          submitted_at, status
        ) VALUES (?, ?, ?, ?, NOW(), 'submitted')
      `;
      
      const filePaths = submissionData.files.map(file => file.path).join(',');
      
      const params = [
        submissionData.assignmentId,
        submissionData.studentId,
        submissionData.submissionText || '',
        filePaths
      ];
      
      const [result] = await connection.query(query, params);
      connection.release();
      
      return {
        id: result.insertId,
        assignmentId: submissionData.assignmentId,
        studentId: submissionData.studentId,
        status: 'submitted',
        submittedAt: new Date()
      };
    } catch (error) {
      logger.error('Error in submitAssignment:', error);
      throw error;
    }
  }

  /**
   * Get assignment submissions
   */
  async getAssignmentSubmissions(assignmentId, teacherId, filters = {}) {
    try {
      const connection = await pool.getConnection();
      
      // Verify teacher owns the assignment
      const [assignment] = await connection.query(
        'SELECT a.id FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.id = ? AND c.teacher_id = ?',
        [assignmentId, teacherId]
      );
      
      if (assignment.length === 0) {
        connection.release();
        throw createError('Assignment not found or unauthorized', 404);
      }
      
      let query = `
        SELECT s.*, CONCAT(u.first_name, ' ', u.last_name) as student_name,
               u.email as student_email, sp.student_id as student_identifier
        FROM submissions s
        JOIN users u ON s.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE s.assignment_id = ?
      `;
      
      const params = [assignmentId];
      
      if (filters.status) {
        query += ' AND s.status = ?';
        params.push(filters.status);
      }
      
      if (filters.studentId) {
        query += ' AND s.student_id = ?';
        params.push(filters.studentId);
      }
      
      query += ' ORDER BY s.submitted_at DESC';
      
      if (filters.limit) {
        const offset = (filters.page - 1) * filters.limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(filters.limit, offset);
      }
      
      const [submissions] = await connection.query(query, params);
      connection.release();
      
      return submissions;
    } catch (error) {
      logger.error('Error in getAssignmentSubmissions:', error);
      throw error;
    }
  }

  /**
   * Grade submission
   */
  async gradeSubmission(submissionId, gradeData, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Verify teacher can grade this submission
      const [submission] = await connection.query(
        `SELECT s.id FROM submissions s 
         JOIN assignments a ON s.assignment_id = a.id 
         JOIN courses c ON a.course_id = c.id 
         WHERE s.id = ? AND c.teacher_id = ?`,
        [submissionId, teacherId]
      );
      
      if (submission.length === 0) {
        connection.release();
        throw createError('Submission not found or unauthorized', 404);
      }
      
      const query = `
        UPDATE submissions SET 
          grade = ?, feedback = ?, status = 'graded',
          graded_at = NOW(), graded_by = ?
        WHERE id = ?
      `;
      
      const params = [
        gradeData.grade,
        gradeData.feedback || '',
        gradeData.gradedBy,
        submissionId
      ];
      
      await connection.query(query, params);
      connection.release();
      
      return {
        id: submissionId,
        grade: gradeData.grade,
        feedback: gradeData.feedback,
        gradedAt: new Date(),
        gradedBy: gradeData.gradedBy
      };
    } catch (error) {
      logger.error('Error in gradeSubmission:', error);
      throw error;
    }
  }
}

module.exports = new AssignmentService();
