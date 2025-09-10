const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

/**
 * Grading Oversight Service - Comprehensive grading management for teachers
 */
class GradingOversightService {
  
  /**
   * Get submissions requiring grading
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Submissions with pagination
   */
  async getSubmissionsForGrading(teacherId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        page = 1,
        limit = 20,
        courseId,
        assignmentId,
        status = 'submitted',
        priority = 'all',
        sortBy = 'submission_time',
        sortOrder = 'DESC'
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = ['c.teacher_id = ?'];
      const params = [teacherId];
      
      if (courseId) {
        conditions.push('a.course_id = ?');
        params.push(courseId);
      }
      
      if (assignmentId) {
        conditions.push('s.assignment_id = ?');
        params.push(assignmentId);
      }
      
      if (status === 'ungraded') {
        conditions.push('s.grade IS NULL AND s.status = "submitted"');
      } else if (status === 'graded') {
        conditions.push('s.grade IS NOT NULL');
      } else if (status === 'needs_review') {
        conditions.push('s.needs_manual_review = true');
      }
      
      if (priority === 'late') {
        conditions.push('s.submission_time > a.deadline');
      } else if (priority === 'recent') {
        conditions.push('s.submission_time >= DATE_SUB(NOW(), INTERVAL 24 HOUR)');
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Get submissions with detailed information
      const [submissions] = await connection.query(
        `SELECT s.*, 
                a.title as assignment_title, a.total_points, a.deadline,
                c.code as course_code, c.title as course_title,
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.identifier as student_identifier, u.email as student_email,
                CASE WHEN s.submission_time > a.deadline THEN 1 ELSE 0 END as is_late,
                TIMESTAMPDIFF(HOUR, a.deadline, s.submission_time) as hours_late,
                gr.ml_confidence, gr.auto_grade, gr.feedback_summary
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         JOIN users u ON s.student_id = u.id
         LEFT JOIN grading_results gr ON s.id = gr.submission_id
         WHERE ${whereClause}
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      // Get total count
      const [countResult] = await connection.query(
        `SELECT COUNT(*) as total
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE ${whereClause}`,
        params
      );
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      return {
        submissions,
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
      logger.error('Error getting submissions for grading:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Grade a submission with detailed feedback
   * @param {Number} submissionId - Submission ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} gradingData - Grading data
   * @returns {Promise<Object>} Graded submission
   */
  async gradeSubmission(submissionId, teacherId, gradingData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify submission access
      const [submissionCheck] = await connection.query(
        `SELECT s.*, a.title as assignment_title, a.total_points, a.auto_publish_grades,
                c.teacher_id, c.title as course_title
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.id = ? AND c.teacher_id = ?`,
        [submissionId, teacherId]
      );
      
      if (submissionCheck.length === 0) {
        throw createError(404, 'Submission not found or access denied');
      }
      
      const submission = submissionCheck[0];
      
      // Store previous grade for history
      const previousGrade = submission.grade;
      const previousFeedback = submission.feedback;
      
      const {
        grade,
        feedback,
        criteriaGrades = [],
        adjustments = [],
        publishGrade = submission.auto_publish_grades,
        sendNotification = true
      } = gradingData;
      
      // Validate grade
      if (grade < 0 || grade > submission.total_points) {
        throw createError(400, `Grade must be between 0 and ${submission.total_points}`);
      }
      
      // Calculate normalized grade (percentage)
      const normalizedGrade = (grade / submission.total_points) * 100;
      
      // Update submission
      await connection.query(
        `UPDATE submissions 
         SET grade = ?, normalized_grade = ?, feedback = ?, 
             graded_by = ?, graded_at = NOW(), 
             is_published = ?, needs_manual_review = false,
             updated_at = NOW()
         WHERE id = ?`,
        [grade, normalizedGrade, feedback, teacherId, publishGrade, submissionId]
      );
      
      // Store grade history if grade changed
      if (previousGrade !== null && previousGrade !== grade) {
        await connection.query(
          `INSERT INTO grade_history 
           (submission_id, previous_grade, new_grade, previous_feedback, new_feedback, 
            changed_by, change_reason)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            submissionId,
            previousGrade,
            grade,
            previousFeedback,
            feedback,
            teacherId,
            'Manual grading by teacher'
          ]
        );
      }
      
      // Store criteria-based grades if provided
      if (criteriaGrades.length > 0) {
        // Remove existing criteria grades
        await connection.query(
          'DELETE FROM submission_criteria_grades WHERE submission_id = ?',
          [submissionId]
        );
        
        // Insert new criteria grades
        const criteriaValues = criteriaGrades.map(criteria => [
          submissionId,
          criteria.criteriaId,
          criteria.points,
          criteria.feedback
        ]);
        
        await connection.query(
          `INSERT INTO submission_criteria_grades 
           (submission_id, criteria_id, points_awarded, feedback)
           VALUES ?`,
          [criteriaValues]
        );
      }
      
      // Store grading adjustments
      if (adjustments.length > 0) {
        const adjustmentValues = adjustments.map(adj => [
          submissionId,
          adj.type,
          adj.value,
          adj.reason,
          teacherId
        ]);
        
        await connection.query(
          `INSERT INTO grading_adjustments 
           (submission_id, adjustment_type, adjustment_value, reason, applied_by)
           VALUES ?`,
          [adjustmentValues]
        );
      }
      
      // Send notification to student if requested
      if (sendNotification && publishGrade) {
        await connection.query(
          `INSERT INTO notifications 
           (recipient_id, sender_id, type, subject, message, submission_id, 
            assignment_id, course_id, priority, status)
           VALUES (?, ?, 'grade', ?, ?, ?, ?, ?, 'normal', 'sent')`,
          [
            submission.student_id,
            teacherId,
            `Grade Available: ${submission.assignment_title}`,
            `Your assignment "${submission.assignment_title}" has been graded. Grade: ${grade}/${submission.total_points} (${normalizedGrade.toFixed(1)}%)`,
            submissionId,
            submission.assignment_id,
            submission.course_id
          ]
        );
      }
      
      await connection.commit();
      
      // Get updated submission with full details
      const gradedSubmission = await this.getSubmissionDetails(submissionId, teacherId);
      
      logger.info(`Submission graded: ${submissionId} by teacher ${teacherId}, grade: ${grade}/${submission.total_points}`);
      
      return gradedSubmission;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error grading submission:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get detailed submission information for grading
   * @param {Number} submissionId - Submission ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Submission details
   */
  async getSubmissionDetails(submissionId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      // Get submission with comprehensive data
      const [submissionData] = await connection.query(
        `SELECT s.*, 
                a.title as assignment_title, a.total_points, a.deadline, 
                a.grading_method, a.show_grading_rubric,
                c.code as course_code, c.title as course_title,
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.identifier as student_identifier, u.email as student_email,
                CONCAT(g.first_name, ' ', g.last_name) as grader_name,
                gr.ml_confidence, gr.auto_grade, gr.feedback_summary,
                gr.extracted_text, gr.processing_time,
                CASE WHEN s.submission_time > a.deadline THEN 1 ELSE 0 END as is_late,
                TIMESTAMPDIFF(HOUR, a.deadline, s.submission_time) as hours_late
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         JOIN users u ON s.student_id = u.id
         LEFT JOIN users g ON s.graded_by = g.id
         LEFT JOIN grading_results gr ON s.id = gr.submission_id
         WHERE s.id = ? AND c.teacher_id = ?`,
        [submissionId, teacherId]
      );
      
      if (submissionData.length === 0) {
        throw createError(404, 'Submission not found or access denied');
      }
      
      const submission = submissionData[0];
      
      // Get grading criteria for the assignment
      const [gradingCriteria] = await connection.query(
        'SELECT * FROM grading_criteria WHERE assignment_id = ? ORDER BY criteria_name',
        [submission.assignment_id]
      );
      
      // Get criteria-based grades if they exist
      const [criteriaGrades] = await connection.query(
        `SELECT scg.*, gc.criteria_name, gc.max_points
         FROM submission_criteria_grades scg
         JOIN grading_criteria gc ON scg.criteria_id = gc.id
         WHERE scg.submission_id = ?`,
        [submissionId]
      );
      
      // Get grading adjustments
      const [adjustments] = await connection.query(
        `SELECT ga.*, CONCAT(u.first_name, ' ', u.last_name) as applied_by_name
         FROM grading_adjustments ga
         JOIN users u ON ga.applied_by = u.id
         WHERE ga.submission_id = ?
         ORDER BY ga.applied_at DESC`,
        [submissionId]
      );
      
      // Get grade history
      const [gradeHistory] = await connection.query(
        `SELECT gh.*, CONCAT(u.first_name, ' ', u.last_name) as changed_by_name
         FROM grade_history gh
         JOIN users u ON gh.changed_by = u.id
         WHERE gh.submission_id = ?
         ORDER BY gh.changed_at DESC`,
        [submissionId]
      );
      
      // Get student's other submissions for this assignment (for comparison)
      const [otherSubmissions] = await connection.query(
        `SELECT id, submission_time, grade, normalized_grade
         FROM submissions 
         WHERE assignment_id = ? AND student_id = ? AND id != ?
         ORDER BY submission_time DESC`,
        [submission.assignment_id, submission.student_id, submissionId]
      );
      
      return {
        ...submission,
        gradingCriteria,
        criteriaGrades,
        adjustments,
        gradeHistory,
        otherSubmissions
      };
      
    } catch (error) {
      logger.error('Error getting submission details:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Request automatic regrading of a submission
   * @param {Number} submissionId - Submission ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Regrading options
   * @returns {Promise<Object>} Regrading result
   */
  async requestRegrade(submissionId, teacherId, options = {}) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify submission access
      const [submissionCheck] = await connection.query(
        `SELECT s.*, a.grading_method
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.id = ? AND c.teacher_id = ?`,
        [submissionId, teacherId]
      );
      
      if (submissionCheck.length === 0) {
        throw createError(404, 'Submission not found or access denied');
      }
      
      const submission = submissionCheck[0];
      
      if (submission.grading_method !== 'auto' && submission.grading_method !== 'hybrid') {
        throw createError(400, 'Automatic regrading not available for manual grading assignments');
      }
      
      // Store current grade for comparison
      const previousGrade = submission.grade;
      const previousFeedback = submission.feedback;
      
      // Mark submission for reprocessing
      await connection.query(
        `UPDATE submissions 
         SET status = 'processing', needs_manual_review = false, updated_at = NOW()
         WHERE id = ?`,
        [submissionId]
      );
      
      // Add to grading queue (this would typically be handled by a job queue)
      await connection.query(
        `INSERT INTO grading_queue 
         (submission_id, priority, requested_by, processing_options)
         VALUES (?, 'high', ?, ?)`,
        [submissionId, teacherId, JSON.stringify(options)]
      );
      
      await connection.commit();
      
      logger.info(`Regrade requested for submission ${submissionId} by teacher ${teacherId}`);
      
      return {
        success: true,
        message: 'Submission queued for regrading',
        submissionId,
        previousGrade,
        estimatedProcessingTime: '2-5 minutes'
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error requesting regrade:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Bulk grade multiple submissions
   * @param {Number} teacherId - Teacher ID
   * @param {Array} gradingData - Array of grading data for multiple submissions
   * @returns {Promise<Object>} Bulk grading results
   */
  async bulkGradeSubmissions(teacherId, gradingData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      const results = {
        successful: [],
        failed: [],
        total: gradingData.length
      };
      
      for (const gradeData of gradingData) {
        try {
          const { submissionId, grade, feedback, publishGrade = false } = gradeData;
          
          // Verify submission access
          const [submissionCheck] = await connection.query(
            `SELECT s.*, a.total_points
             FROM submissions s
             JOIN assignments a ON s.assignment_id = a.id
             JOIN courses c ON a.course_id = c.id
             WHERE s.id = ? AND c.teacher_id = ?`,
            [submissionId, teacherId]
          );
          
          if (submissionCheck.length === 0) {
            results.failed.push({
              submissionId,
              error: 'Submission not found or access denied'
            });
            continue;
          }
          
          const submission = submissionCheck[0];
          
          // Validate grade
          if (grade < 0 || grade > submission.total_points) {
            results.failed.push({
              submissionId,
              error: `Grade must be between 0 and ${submission.total_points}`
            });
            continue;
          }
          
          const normalizedGrade = (grade / submission.total_points) * 100;
          
          // Update submission
          await connection.query(
            `UPDATE submissions 
             SET grade = ?, normalized_grade = ?, feedback = ?, 
                 graded_by = ?, graded_at = NOW(), 
                 is_published = ?, updated_at = NOW()
             WHERE id = ?`,
            [grade, normalizedGrade, feedback, teacherId, publishGrade, submissionId]
          );
          
          results.successful.push({
            submissionId,
            grade,
            normalizedGrade
          });
          
        } catch (error) {
          logger.error(`Error grading submission ${gradeData.submissionId}:`, error);
          results.failed.push({
            submissionId: gradeData.submissionId,
            error: error.message
          });
        }
      }
      
      await connection.commit();
      
      logger.info(`Bulk grading completed by teacher ${teacherId}: ${results.successful.length} successful, ${results.failed.length} failed`);
      
      return results;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error in bulk grading:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get grading statistics for teacher dashboard
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Grading statistics
   */
  async getGradingStatistics(teacherId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const { timeframe = '30', courseId } = filters;
      
      const conditions = ['c.teacher_id = ?'];
      const params = [teacherId];
      
      if (courseId) {
        conditions.push('a.course_id = ?');
        params.push(courseId);
      }
      
      // Add timeframe filter
      conditions.push('s.submission_time >= DATE_SUB(NOW(), INTERVAL ? DAY)');
      params.push(parseInt(timeframe));
      
      const whereClause = conditions.join(' AND ');
      
      // Get overall statistics
      const [overallStats] = await connection.query(
        `SELECT 
           COUNT(DISTINCT s.id) as total_submissions,
           COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
           COUNT(DISTINCT CASE WHEN s.grade IS NULL AND s.status = 'submitted' THEN s.id END) as pending_grading,
           AVG(s.normalized_grade) as average_grade,
           COUNT(DISTINCT CASE WHEN s.submission_time > a.deadline THEN s.id END) as late_submissions,
           AVG(TIMESTAMPDIFF(HOUR, s.submission_time, s.graded_at)) as avg_grading_time_hours
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE ${whereClause}`,
        params
      );
      
      // Get grading by assignment
      const [assignmentStats] = await connection.query(
        `SELECT 
           a.id, a.title, a.total_points,
           COUNT(s.id) as total_submissions,
           COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
           AVG(s.normalized_grade) as average_grade,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN submissions s ON a.id = s.assignment_id 
         WHERE ${whereClause}
         GROUP BY a.id
         ORDER BY a.deadline DESC
         LIMIT 10`,
        params
      );
      
      // Get daily grading activity
      const [dailyActivity] = await connection.query(
        `SELECT 
           DATE(s.graded_at) as grading_date,
           COUNT(*) as submissions_graded,
           AVG(s.normalized_grade) as avg_grade
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE ${whereClause} AND s.graded_at IS NOT NULL
         GROUP BY DATE(s.graded_at)
         ORDER BY grading_date DESC
         LIMIT 30`,
        params
      );
      
      return {
        overall: overallStats[0],
        byAssignment: assignmentStats,
        dailyActivity,
        gradingProgress: overallStats[0].total_submissions > 0 
          ? (overallStats[0].graded_submissions / overallStats[0].total_submissions) * 100 
          : 0
      };
      
    } catch (error) {
      logger.error('Error getting grading statistics:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
}

module.exports = new GradingOversightService();
