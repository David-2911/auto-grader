const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const mlService = require('./ml.service');
const notificationService = require('./notification.service');

/**
 * Grading Service - Handles submission grading with ML integration
 */
class GradingService {

  /**
   * Grade a submission manually with optional ML assistance
   * @param {Number} submissionId - Submission ID
   * @param {Object} gradingData - Grading data
   * @param {Number} graderId - Teacher/grader ID
   * @returns {Promise<Object>} Grading result
   */
  async gradeSubmission(submissionId, gradingData, graderId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get submission details
      const [submission] = await connection.query(
        `SELECT s.*, a.total_points, a.course_id, a.grading_method,
                c.teacher_id, u.first_name, u.last_name, u.email
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         JOIN users u ON s.student_id = u.id
         WHERE s.id = ?`,
        [submissionId]
      );
      
      if (submission.length === 0) {
        throw createError(404, 'Submission not found');
      }
      
      const submissionData = submission[0];
      
      // Verify grader has permission
      if (submissionData.teacher_id !== graderId) {
        throw createError(403, 'Permission denied to grade this submission');
      }
      
      const {
        grade,
        feedback,
        rubricScores = {},
        annotations = [],
        adjustments = {},
        confidenceOverride,
        gradingNotes
      } = gradingData;
      
      // Validate grade
      if (grade < 0 || grade > submissionData.total_points) {
        throw createError(400, `Grade must be between 0 and ${submissionData.total_points}`);
      }
      
      // Calculate normalized grade (applying late penalties if applicable)
      let normalizedGrade = grade;
      if (submissionData.is_late && submissionData.late_penalty > 0) {
        normalizedGrade = grade * (1 - submissionData.late_penalty / 100);
      }
      
      // Update submission with grade
      await connection.query(
        `UPDATE submissions 
         SET grade = ?, normalized_grade = ?, status = 'graded', 
             graded_at = NOW(), graded_by = ?, is_auto_graded = false
         WHERE id = ?`,
        [grade, normalizedGrade, graderId, submissionId]
      );
      
      // Store detailed grading results
      await connection.query(
        `INSERT INTO grading_results 
         (submission_id, score, max_score, feedback, confidence_level, grading_notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [submissionId, grade, submissionData.total_points, feedback, confidenceOverride, gradingNotes]
      );
      
      // Store rubric assessments if provided
      if (Object.keys(rubricScores).length > 0) {
        for (const [criterionId, score] of Object.entries(rubricScores)) {
          await connection.query(
            'INSERT INTO rubric_assessments (submission_id, criterion_id, score, comments) VALUES (?, ?, ?, ?)',
            [submissionId, criterionId, score.value, score.comments || null]
          );
        }
      }
      
      // Store annotations if provided
      if (annotations.length > 0) {
        for (const annotation of annotations) {
          await connection.query(
            `INSERT INTO submission_annotations 
             (submission_id, page_number, x_position, y_position, width, height, annotation_text, created_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              submissionId,
              annotation.pageNumber || null,
              annotation.x || null,
              annotation.y || null,
              annotation.width || null,
              annotation.height || null,
              annotation.text,
              graderId
            ]
          );
        }
      }
      
      await connection.commit();
      
      // Send notification to student
      await notificationService.sendGradeNotification({
        studentId: submissionData.student_id,
        studentEmail: submissionData.email,
        studentName: `${submissionData.first_name} ${submissionData.last_name}`,
        assignmentTitle: submissionData.title,
        grade: normalizedGrade,
        totalPoints: submissionData.total_points,
        feedback: feedback
      });
      
      logger.info(`Submission ${submissionId} graded by teacher ${graderId}: ${grade}/${submissionData.total_points}`);
      
      return {
        submissionId,
        grade,
        normalizedGrade,
        feedback,
        gradedAt: new Date(),
        gradedBy: graderId
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error grading submission:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Auto-grade all submissions for an assignment using ML
   * @param {Number} assignmentId - Assignment ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Auto-grading results
   */
  async autoGradeAssignment(assignmentId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      // Verify assignment ownership
      const [assignment] = await connection.query(
        `SELECT a.*, c.teacher_id, c.title as course_title
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ? AND c.teacher_id = ?`,
        [assignmentId, teacherId]
      );
      
      if (assignment.length === 0) {
        throw createError(404, 'Assignment not found or access denied');
      }
      
      const assignmentData = assignment[0];
      
      // Get ungraded submissions
      const [submissions] = await connection.query(
        `SELECT s.*, u.first_name, u.last_name, u.email
         FROM submissions s
         JOIN users u ON s.student_id = u.id
         WHERE s.assignment_id = ? AND s.grade IS NULL AND s.status = 'submitted'`,
        [assignmentId]
      );
      
      if (submissions.length === 0) {
        return {
          message: 'No ungraded submissions found',
          processed: 0,
          successful: 0,
          failed: 0
        };
      }
      
      const results = {
        processed: submissions.length,
        successful: 0,
        failed: 0,
        details: []
      };
      
      // Process each submission
      for (const submission of submissions) {
        try {
          await connection.query(
            'UPDATE submissions SET status = "processing", processing_started_at = NOW() WHERE id = ?',
            [submission.id]
          );
          
          // Call ML service for grading
          const mlResult = await mlService.gradeSubmission({
            submissionId: submission.id,
            assignmentId: assignmentId,
            submissionText: submission.submission_text,
            submissionPdf: submission.submission_pdf,
            submissionCode: submission.submission_code,
            gradingMethod: assignmentData.grading_method,
            totalPoints: assignmentData.total_points,
            expectations: assignmentData.nbgrader_expectation
          });
          
          // Apply late penalty if applicable
          let normalizedGrade = mlResult.grade;
          if (submission.is_late && assignmentData.late_penalty > 0) {
            normalizedGrade = mlResult.grade * (1 - assignmentData.late_penalty / 100);
          }
          
          // Update submission with ML grade
          await connection.query(
            `UPDATE submissions 
             SET grade = ?, normalized_grade = ?, status = 'graded', 
                 graded_at = NOW(), is_auto_graded = true
             WHERE id = ?`,
            [mlResult.grade, normalizedGrade, submission.id]
          );
          
          // Store detailed grading results
          await connection.query(
            `INSERT INTO grading_results 
             (submission_id, score, max_score, feedback, confidence_level, grading_notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              submission.id,
              mlResult.grade,
              assignmentData.total_points,
              mlResult.feedback,
              mlResult.confidence,
              'Auto-graded using ML service'
            ]
          );
          
          // Store question-level results if available
          if (mlResult.questionResults && mlResult.questionResults.length > 0) {
            for (const questionResult of mlResult.questionResults) {
              await connection.query(
                `INSERT INTO grading_results 
                 (submission_id, question_id, score, max_score, feedback, confidence_level)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [
                  submission.id,
                  questionResult.questionId,
                  questionResult.score,
                  questionResult.maxScore,
                  questionResult.feedback,
                  questionResult.confidence
                ]
              );
            }
          }
          
          // Send notification to student if auto-notification is enabled
          await notificationService.sendGradeNotification({
            studentId: submission.student_id,
            studentEmail: submission.email,
            studentName: `${submission.first_name} ${submission.last_name}`,
            assignmentTitle: assignmentData.title,
            grade: normalizedGrade,
            totalPoints: assignmentData.total_points,
            feedback: mlResult.feedback,
            isAutoGraded: true
          });
          
          results.successful++;
          results.details.push({
            submissionId: submission.id,
            studentName: `${submission.first_name} ${submission.last_name}`,
            grade: mlResult.grade,
            normalizedGrade: normalizedGrade,
            confidence: mlResult.confidence,
            status: 'success'
          });
          
        } catch (error) {
          // Update submission status to error
          await connection.query(
            'UPDATE submissions SET status = "error", error_message = ? WHERE id = ?',
            [error.message, submission.id]
          );
          
          results.failed++;
          results.details.push({
            submissionId: submission.id,
            studentName: `${submission.first_name} ${submission.last_name}`,
            error: error.message,
            status: 'failed'
          });
          
          logger.error(`Error auto-grading submission ${submission.id}:`, error);
        }
      }
      
      logger.info(`Auto-grading completed for assignment ${assignmentId}: ${results.successful} successful, ${results.failed} failed`);
      
      return results;
      
    } catch (error) {
      logger.error('Error auto-grading assignment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Request re-grading of a submission
   * @param {Number} submissionId - Submission ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} regradeOptions - Re-grading options
   * @returns {Promise<Object>} Re-grading result
   */
  async requestRegrade(submissionId, teacherId, regradeOptions = {}) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Get submission details
      const [submission] = await connection.query(
        `SELECT s.*, a.title as assignment_title, a.total_points, a.grading_method,
                c.teacher_id, u.first_name, u.last_name
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         JOIN users u ON s.student_id = u.id
         WHERE s.id = ?`,
        [submissionId]
      );
      
      if (submission.length === 0) {
        throw createError(404, 'Submission not found');
      }
      
      const submissionData = submission[0];
      
      // Verify teacher permission
      if (submissionData.teacher_id !== teacherId) {
        throw createError(403, 'Permission denied to regrade this submission');
      }
      
      // Store previous grade for history
      if (submissionData.grade !== null) {
        await connection.query(
          `INSERT INTO grade_history 
           (submission_id, previous_grade, previous_feedback, changed_by, change_reason, changed_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [
            submissionId,
            submissionData.grade,
            submissionData.feedback || '',
            teacherId,
            regradeOptions.reason || 'Re-grade requested'
          ]
        );
      }
      
      // Reset submission for re-grading
      await connection.query(
        `UPDATE submissions 
         SET status = 'submitted', grade = NULL, normalized_grade = NULL, 
             graded_at = NULL, graded_by = NULL, is_auto_graded = false,
             processing_started_at = NULL, error_message = NULL
         WHERE id = ?`,
        [submissionId]
      );
      
      // Clear previous grading results
      await connection.query(
        'DELETE FROM grading_results WHERE submission_id = ?',
        [submissionId]
      );
      
      await connection.query(
        'DELETE FROM rubric_assessments WHERE submission_id = ?',
        [submissionId]
      );
      
      await connection.commit();
      
      // If auto re-grade is requested, trigger ML grading
      if (regradeOptions.autoRegrade && submissionData.grading_method === 'auto') {
        try {
          await this.autoGradeSubmission(submissionData.assignment_id, submissionId);
        } catch (error) {
          logger.error('Error during auto re-grade:', error);
          // Don't throw here, let the manual re-grade proceed
        }
      }
      
      logger.info(`Re-grade requested for submission ${submissionId} by teacher ${teacherId}`);
      
      return {
        submissionId,
        message: 'Re-grade request processed successfully',
        autoRegraded: regradeOptions.autoRegrade || false
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
   * Auto-grade a single submission
   * @param {Number} assignmentId - Assignment ID
   * @param {Number} submissionId - Submission ID
   * @returns {Promise<Object>} Grading result
   */
  async autoGradeSubmission(assignmentId, submissionId) {
    const connection = await pool.getConnection();
    
    try {
      // Get assignment and submission details
      const [data] = await connection.query(
        `SELECT s.*, a.total_points, a.grading_method, a.nbgrader_expectation, a.title as assignment_title,
                u.first_name, u.last_name, u.email
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN users u ON s.student_id = u.id
         WHERE s.id = ? AND a.id = ?`,
        [submissionId, assignmentId]
      );
      
      if (data.length === 0) {
        throw createError(404, 'Submission or assignment not found');
      }
      
      const submissionData = data[0];
      
      // Update status to processing
      await connection.query(
        'UPDATE submissions SET status = "processing", processing_started_at = NOW() WHERE id = ?',
        [submissionId]
      );
      
      // Call ML service for grading
      const mlResult = await mlService.gradeSubmission({
        submissionId: submissionId,
        assignmentId: assignmentId,
        submissionText: submissionData.submission_text,
        submissionPdf: submissionData.submission_pdf,
        submissionCode: submissionData.submission_code,
        gradingMethod: submissionData.grading_method,
        totalPoints: submissionData.total_points,
        expectations: submissionData.nbgrader_expectation
      });
      
      // Apply late penalty if applicable
      let normalizedGrade = mlResult.grade;
      if (submissionData.is_late) {
        // Get assignment late penalty
        const [penalty] = await connection.query(
          'SELECT late_penalty FROM assignments WHERE id = ?',
          [assignmentId]
        );
        
        if (penalty.length > 0 && penalty[0].late_penalty > 0) {
          normalizedGrade = mlResult.grade * (1 - penalty[0].late_penalty / 100);
        }
      }
      
      // Update submission with grade
      await connection.query(
        `UPDATE submissions 
         SET grade = ?, normalized_grade = ?, status = 'graded', 
             graded_at = NOW(), is_auto_graded = true
         WHERE id = ?`,
        [mlResult.grade, normalizedGrade, submissionId]
      );
      
      // Store grading results
      await connection.query(
        `INSERT INTO grading_results 
         (submission_id, score, max_score, feedback, confidence_level, grading_notes)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          submissionId,
          mlResult.grade,
          submissionData.total_points,
          mlResult.feedback,
          mlResult.confidence,
          'Auto-graded using ML service'
        ]
      );
      
      connection.release();
      
      return {
        submissionId,
        grade: mlResult.grade,
        normalizedGrade: normalizedGrade,
        feedback: mlResult.feedback,
        confidence: mlResult.confidence,
        gradedAt: new Date()
      };
      
    } catch (error) {
      // Update submission status to error
      await connection.query(
        'UPDATE submissions SET status = "error", error_message = ? WHERE id = ?',
        [error.message, submissionId]
      );
      
      connection.release();
      logger.error('Error auto-grading submission:', error);
      throw error;
    }
  }

  /**
   * Bulk grade multiple submissions
   * @param {Array} submissionIds - Array of submission IDs
   * @param {Object} gradingData - Common grading data
   * @param {Number} graderId - Grader ID
   * @returns {Promise<Object>} Bulk grading results
   */
  async bulkGradeSubmissions(submissionIds, gradingData, graderId) {
    const results = {
      successful: 0,
      failed: 0,
      details: []
    };
    
    for (const submissionId of submissionIds) {
      try {
        await this.gradeSubmission(submissionId, gradingData, graderId);
        results.successful++;
        results.details.push({
          submissionId,
          status: 'success'
        });
      } catch (error) {
        results.failed++;
        results.details.push({
          submissionId,
          status: 'failed',
          error: error.message
        });
        logger.error(`Error bulk grading submission ${submissionId}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get grading history for a submission
   * @param {Number} submissionId - Submission ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Array>} Grading history
   */
  async getGradingHistory(submissionId, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Verify permission
      const [submission] = await connection.query(
        `SELECT s.id FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.id = ? AND c.teacher_id = ?`,
        [submissionId, teacherId]
      );
      
      if (submission.length === 0) {
        throw createError(404, 'Submission not found or access denied');
      }
      
      // Get grading history
      const [history] = await connection.query(
        `SELECT gh.*, CONCAT(u.first_name, ' ', u.last_name) as changer_name
         FROM grade_history gh
         LEFT JOIN users u ON gh.changed_by = u.id
         WHERE gh.submission_id = ?
         ORDER BY gh.changed_at DESC`,
        [submissionId]
      );
      
      connection.release();
      
      return history;
      
    } catch (error) {
      logger.error('Error getting grading history:', error);
      throw error;
    }
  }
}

module.exports = new GradingService();
