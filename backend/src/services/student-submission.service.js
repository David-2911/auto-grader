const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const moment = require('moment');

/**
 * Student Submission Service - Handles assignment submissions, file uploads, and resubmissions
 */
class StudentSubmissionService {

  /**
   * Submit an assignment with file upload and validation
   * @param {Number} studentId - Student ID
   * @param {Number} assignmentId - Assignment ID
   * @param {Object} submissionData - Submission data
   * @param {Object} files - Uploaded files
   * @returns {Promise<Object>} Submission result
   */
  async submitAssignment(studentId, assignmentId, submissionData, files = {}) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Verify student enrollment and assignment accessibility
      const [assignment] = await connection.query(`
        SELECT 
          a.id, a.title, a.deadline, a.late_deadline, a.max_attempts,
          a.submission_format, a.total_points, a.is_active,
          c.id as course_id, c.title as course_title,
          e.id as enrollment_id
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE a.id = ? AND e.student_id = ? AND e.status = 'active' AND a.is_active = true
      `, [assignmentId, studentId]);

      if (assignment.length === 0) {
        throw createError(403, 'Assignment not accessible or student not enrolled');
      }

      const assignmentData = assignment[0];
      const currentTime = new Date();
      const deadline = new Date(assignmentData.deadline);
      const lateDeadline = assignmentData.late_deadline ? new Date(assignmentData.late_deadline) : null;

      // Check if assignment is still accepting submissions
      if (currentTime > deadline && (!lateDeadline || currentTime > lateDeadline)) {
        throw createError(400, 'Assignment deadline has passed');
      }

      // Check existing submissions count
      const [existingSubmissions] = await connection.query(`
        SELECT COUNT(*) as submission_count, MAX(submission_number) as last_number
        FROM submissions
        WHERE assignment_id = ? AND student_id = ?
      `, [assignmentId, studentId]);

      const submissionCount = existingSubmissions[0].submission_count;
      const nextSubmissionNumber = (existingSubmissions[0].last_number || 0) + 1;

      if (submissionCount >= assignmentData.max_attempts) {
        throw createError(400, `Maximum submission attempts (${assignmentData.max_attempts}) reached`);
      }

      // Determine if submission is late
      const isLate = currentTime > deadline;

      // Process file uploads based on submission format
      let submissionPath = null;
      let submissionText = submissionData.submissionText || null;
      let submissionCode = submissionData.submissionCode || null;

      if (files && files.submissionFile) {
        const uploadDir = path.join(__dirname, '../../storage/submission_documents');
        await fs.mkdir(uploadDir, { recursive: true });

        const fileName = `${studentId}_${assignmentId}_${nextSubmissionNumber}_${Date.now()}_${files.submissionFile.originalname}`;
        submissionPath = path.join(uploadDir, fileName);

        await fs.writeFile(submissionPath, files.submissionFile.buffer);
        submissionPath = fileName; // Store relative path
      }

      // Validate submission format
      this.validateSubmissionFormat(assignmentData.submission_format, {
        submissionText,
        submissionCode,
        submissionFile: submissionPath
      });

      // Create submission record
      const [submissionResult] = await connection.query(`
        INSERT INTO submissions 
        (assignment_id, student_id, submission_number, submission_pdf, 
         submission_text, submission_code, status, is_late, submission_time)
        VALUES (?, ?, ?, ?, ?, ?, 'submitted', ?, NOW())
      `, [
        assignmentId,
        studentId,
        nextSubmissionNumber,
        submissionPath,
        submissionText,
        submissionCode,
        isLate
      ]);

      const submissionId = submissionResult.insertId;

      // Create notification for successful submission
      await connection.query(`
        INSERT INTO notifications 
        (user_id, title, message, type, reference_id, reference_type)
        VALUES (?, ?, ?, 'submission', ?, 'submission')
      `, [
        studentId,
        'Assignment Submitted Successfully',
        `Your submission for "${assignmentData.title}" has been received and is being processed.`,
        submissionId
      ]);

      // Log submission activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description, reference_id, reference_type, metadata)
        VALUES (?, 'submission_created', ?, ?, 'submission', ?)
      `, [
        studentId,
        `Submitted assignment: ${assignmentData.title}`,
        submissionId,
        JSON.stringify({
          assignment_id: assignmentId,
          submission_number: nextSubmissionNumber,
          is_late: isLate,
          submission_format: assignmentData.submission_format
        })
      ]);

      // Start auto-grading process if applicable
      if (assignmentData.submission_format === 'code' || submissionCode) {
        await this.triggerAutoGrading(submissionId);
      }

      await connection.commit();

      // Return submission details
      const [newSubmission] = await connection.query(`
        SELECT 
          s.id, s.submission_number, s.status, s.is_late, s.submission_time,
          s.submission_pdf, s.submission_text, s.submission_code,
          a.title as assignment_title, a.total_points
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = ?
      `, [submissionId]);

      return {
        submission: newSubmission[0],
        message: isLate ? 
          'Assignment submitted successfully (late submission)' : 
          'Assignment submitted successfully',
        nextSteps: [
          'Your submission is being processed',
          'You will be notified when grading is complete',
          assignmentData.max_attempts > nextSubmissionNumber ? 
            `You have ${assignmentData.max_attempts - nextSubmissionNumber} attempt(s) remaining` : 
            'This was your final submission attempt'
        ]
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error submitting assignment:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to submit assignment');
    } finally {
      connection.release();
    }
  }

  /**
   * Get submission details and status
   * @param {Number} studentId - Student ID
   * @param {Number} submissionId - Submission ID
   * @returns {Promise<Object>} Submission details
   */
  async getSubmissionDetails(studentId, submissionId) {
    const connection = await pool.getConnection();
    
    try {
      const [submission] = await connection.query(`
        SELECT 
          s.id, s.assignment_id, s.submission_number, s.status, s.grade,
          s.normalized_grade, s.submission_time, s.graded_at, s.is_late,
          s.is_auto_graded, s.error_message, s.submission_pdf,
          s.submission_text, s.submission_code, s.processing_started_at,
          a.title as assignment_title, a.total_points, a.deadline,
          a.max_attempts, a.submission_format,
          c.code as course_code, c.title as course_title,
          grader.first_name as grader_first_name,
          grader.last_name as grader_last_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN users grader ON s.graded_by = grader.id
        WHERE s.id = ? AND s.student_id = ?
      `, [submissionId, studentId]);

      if (submission.length === 0) {
        throw createError(404, 'Submission not found');
      }

      const submissionData = submission[0];

      // Get detailed grading results
      const [gradingResults] = await connection.query(`
        SELECT 
          gr.id, gr.question_id, gr.score, gr.max_score, gr.feedback,
          gr.confidence_level, gr.grading_notes,
          aq.question_number, aq.question_text, aq.question_type
        FROM grading_results gr
        LEFT JOIN assignment_questions aq ON gr.question_id = aq.id
        WHERE gr.submission_id = ?
        ORDER BY aq.question_number ASC, gr.id ASC
      `, [submissionId]);

      submissionData.gradingResults = gradingResults;

      // Get rubric assessments
      const [rubricAssessments] = await connection.query(`
        SELECT 
          ra.id, ra.score, ra.comments,
          rc.criterion_name, rc.description, rc.max_score, rc.weight
        FROM rubric_assessments ra
        JOIN rubric_criteria rc ON ra.criterion_id = rc.id
        WHERE ra.submission_id = ?
        ORDER BY rc.id
      `, [submissionId]);

      submissionData.rubricAssessments = rubricAssessments;

      // Get annotations and feedback
      const [annotations] = await connection.query(`
        SELECT 
          sa.id, sa.page_number, sa.x_position, sa.y_position,
          sa.width, sa.height, sa.annotation_text, sa.created_at,
          u.first_name as annotator_first_name,
          u.last_name as annotator_last_name
        FROM submission_annotations sa
        JOIN users u ON sa.created_by = u.id
        WHERE sa.submission_id = ?
        ORDER BY sa.page_number, sa.y_position
      `, [submissionId]);

      submissionData.annotations = annotations;

      // Get submission file download URL if exists
      if (submissionData.submission_pdf) {
        submissionData.fileDownloadUrl = `/api/student/submissions/${submissionId}/download`;
      }

      // Calculate processing status
      submissionData.processingStatus = this.calculateProcessingStatus(submissionData);

      return submissionData;

    } catch (error) {
      logger.error('Error getting submission details:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load submission details');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's submission history for an assignment
   * @param {Number} studentId - Student ID
   * @param {Number} assignmentId - Assignment ID
   * @returns {Promise<Object>} Submission history
   */
  async getSubmissionHistory(studentId, assignmentId) {
    const connection = await pool.getConnection();
    
    try {
      // Verify access
      const [accessCheck] = await connection.query(`
        SELECT a.title, a.max_attempts, a.deadline, a.late_deadline
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE a.id = ? AND e.student_id = ? AND e.status = 'active'
      `, [assignmentId, studentId]);

      if (accessCheck.length === 0) {
        throw createError(403, 'Access denied to this assignment');
      }

      const assignmentInfo = accessCheck[0];

      // Get all submissions for this assignment
      const [submissions] = await connection.query(`
        SELECT 
          s.id, s.submission_number, s.status, s.grade, s.normalized_grade,
          s.submission_time, s.graded_at, s.is_late, s.is_auto_graded,
          s.error_message, s.processing_started_at,
          COUNT(gr.id) as question_count,
          AVG(gr.score/gr.max_score * 100) as average_question_score
        FROM submissions s
        LEFT JOIN grading_results gr ON s.id = gr.submission_id
        WHERE s.assignment_id = ? AND s.student_id = ?
        GROUP BY s.id
        ORDER BY s.submission_number DESC
      `, [assignmentId, studentId]);

      // Get performance comparison data
      const [performanceComparison] = await connection.query(`
        SELECT 
          AVG(normalized_grade) as class_average,
          MAX(normalized_grade) as class_max,
          MIN(normalized_grade) as class_min,
          COUNT(DISTINCT student_id) as total_submissions
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.assignment_id = ? AND s.grade IS NOT NULL
      `, [assignmentId]);

      // Calculate submission statistics
      const stats = {
        totalAttempts: submissions.length,
        attemptsRemaining: Math.max(0, assignmentInfo.max_attempts - submissions.length),
        bestGrade: submissions.length > 0 ? Math.max(...submissions.filter(s => s.grade).map(s => s.normalized_grade || 0)) : null,
        latestGrade: submissions.length > 0 && submissions[0].grade ? submissions[0].normalized_grade : null,
        averageGrade: submissions.length > 0 ? 
          submissions.filter(s => s.grade).reduce((acc, s) => acc + (s.normalized_grade || 0), 0) / 
          submissions.filter(s => s.grade).length : null,
        onTimeSubmissions: submissions.filter(s => !s.is_late).length,
        lateSubmissions: submissions.filter(s => s.is_late).length
      };

      return {
        assignmentInfo,
        submissions,
        statistics: stats,
        classPerformance: performanceComparison[0],
        canSubmit: stats.attemptsRemaining > 0 && 
                   (new Date() < new Date(assignmentInfo.late_deadline || assignmentInfo.deadline))
      };

    } catch (error) {
      logger.error('Error getting submission history:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load submission history');
    } finally {
      connection.release();
    }
  }

  /**
   * Download submission file
   * @param {Number} studentId - Student ID
   * @param {Number} submissionId - Submission ID
   * @returns {Promise<Object>} File data and metadata
   */
  async downloadSubmissionFile(studentId, submissionId) {
    const connection = await pool.getConnection();
    
    try {
      const [submission] = await connection.query(`
        SELECT s.submission_pdf, a.title as assignment_title
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = ? AND s.student_id = ?
      `, [submissionId, studentId]);

      if (submission.length === 0) {
        throw createError(404, 'Submission not found');
      }

      if (!submission[0].submission_pdf) {
        throw createError(404, 'No file associated with this submission');
      }

      const filePath = path.join(__dirname, '../../storage/submission_documents', submission[0].submission_pdf);
      
      try {
        await fs.access(filePath);
        const fileBuffer = await fs.readFile(filePath);
        
        return {
          fileBuffer,
          fileName: submission[0].submission_pdf,
          originalName: `${submission[0].assignment_title}_submission.pdf`,
          mimeType: 'application/pdf'
        };
      } catch (fileError) {
        logger.error('File not found:', fileError);
        throw createError(404, 'Submission file not found on server');
      }

    } catch (error) {
      logger.error('Error downloading submission file:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to download submission file');
    } finally {
      connection.release();
    }
  }

  /**
   * Resubmit an assignment (create new submission)
   * @param {Number} studentId - Student ID
   * @param {Number} assignmentId - Assignment ID
   * @param {Object} submissionData - New submission data
   * @param {Object} files - New uploaded files
   * @returns {Promise<Object>} Resubmission result
   */
  async resubmitAssignment(studentId, assignmentId, submissionData, files = {}) {
    // Add resubmission tracking
    const connection = await pool.getConnection();
    
    try {
      // Get previous submission for tracking
      const [previousSubmission] = await connection.query(`
        SELECT id, submission_number, grade
        FROM submissions
        WHERE assignment_id = ? AND student_id = ?
        ORDER BY submission_number DESC
        LIMIT 1
      `, [assignmentId, studentId]);

      // Call regular submit method
      const result = await this.submitAssignment(studentId, assignmentId, submissionData, files);

      // Add resubmission tracking log
      if (previousSubmission.length > 0) {
        await connection.query(`
          INSERT INTO activity_logs 
          (user_id, action_type, description, reference_id, reference_type, metadata)
          VALUES (?, 'assignment_resubmitted', ?, ?, 'submission', ?)
        `, [
          studentId,
          `Resubmitted assignment (attempt ${result.submission.submission_number})`,
          result.submission.id,
          JSON.stringify({
            assignment_id: assignmentId,
            previous_submission_id: previousSubmission[0].id,
            previous_grade: previousSubmission[0].grade,
            new_submission_number: result.submission.submission_number
          })
        ]);
      }

      return {
        ...result,
        isResubmission: true,
        previousAttempts: previousSubmission.length
      };

    } catch (error) {
      logger.error('Error resubmitting assignment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Get submission progress and real-time status updates
   * @param {Number} studentId - Student ID
   * @param {Number} submissionId - Submission ID
   * @returns {Promise<Object>} Processing status
   */
  async getSubmissionProgress(studentId, submissionId) {
    const connection = await pool.getConnection();
    
    try {
      const [submission] = await connection.query(`
        SELECT 
          s.id, s.status, s.processing_started_at, s.graded_at,
          s.error_message, s.is_auto_graded,
          a.title as assignment_title, a.grading_method
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.id = ? AND s.student_id = ?
      `, [submissionId, studentId]);

      if (submission.length === 0) {
        throw createError(404, 'Submission not found');
      }

      const submissionData = submission[0];
      const status = this.calculateProcessingStatus(submissionData);

      // Get any processing logs
      const [processingLogs] = await connection.query(`
        SELECT message, created_at, level
        FROM processing_logs
        WHERE submission_id = ?
        ORDER BY created_at ASC
      `, [submissionId]);

      return {
        submissionId,
        status: submissionData.status,
        processingStatus: status,
        estimatedCompletionTime: this.estimateCompletionTime(submissionData),
        logs: processingLogs,
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error('Error getting submission progress:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to get submission progress');
    } finally {
      connection.release();
    }
  }

  /**
   * Validate submission format based on assignment requirements
   * @param {String} requiredFormat - Required submission format
   * @param {Object} submissionData - Submission data to validate
   */
  validateSubmissionFormat(requiredFormat, submissionData) {
    const { submissionText, submissionCode, submissionFile } = submissionData;

    switch (requiredFormat) {
      case 'pdf':
        if (!submissionFile) {
          throw createError(400, 'PDF file is required for this assignment');
        }
        break;
      case 'code':
        if (!submissionCode && !submissionFile) {
          throw createError(400, 'Code submission is required for this assignment');
        }
        break;
      case 'text':
        if (!submissionText) {
          throw createError(400, 'Text submission is required for this assignment');
        }
        break;
      case 'notebook':
        if (!submissionFile) {
          throw createError(400, 'Notebook file is required for this assignment');
        }
        break;
      default:
        // Allow any format if not specified
        if (!submissionText && !submissionCode && !submissionFile) {
          throw createError(400, 'At least one form of submission is required');
        }
    }
  }

  /**
   * Calculate processing status based on submission data
   * @param {Object} submissionData - Submission data
   * @returns {Object} Processing status
   */
  calculateProcessingStatus(submissionData) {
    const { status, processing_started_at, graded_at, error_message } = submissionData;

    if (error_message) {
      return {
        stage: 'error',
        message: 'Processing failed',
        details: error_message,
        progress: 0
      };
    }

    switch (status) {
      case 'submitted':
        return {
          stage: 'queued',
          message: 'Submission queued for processing',
          progress: 10
        };
      case 'processing':
        const processingTime = processing_started_at ? 
          (new Date() - new Date(processing_started_at)) / 1000 : 0;
        const estimatedTotal = 300; // 5 minutes estimated
        const progress = Math.min(90, 20 + (processingTime / estimatedTotal * 70));
        
        return {
          stage: 'processing',
          message: 'Processing submission and grading',
          progress: Math.round(progress)
        };
      case 'graded':
        return {
          stage: 'completed',
          message: 'Grading completed',
          progress: 100,
          completedAt: graded_at
        };
      default:
        return {
          stage: 'unknown',
          message: 'Status unknown',
          progress: 0
        };
    }
  }

  /**
   * Estimate completion time for processing
   * @param {Object} submissionData - Submission data
   * @returns {Date|null} Estimated completion time
   */
  estimateCompletionTime(submissionData) {
    if (submissionData.status === 'graded') return null;
    
    const now = new Date();
    const estimatedMinutes = submissionData.grading_method === 'auto' ? 5 : 60;
    
    return new Date(now.getTime() + estimatedMinutes * 60000);
  }

  /**
   * Trigger auto-grading process (placeholder for ML integration)
   * @param {Number} submissionId - Submission ID
   */
  async triggerAutoGrading(submissionId) {
    const connection = await pool.getConnection();
    
    try {
      // Update submission status to processing
      await connection.query(`
        UPDATE submissions 
        SET status = 'processing', processing_started_at = NOW()
        WHERE id = ?
      `, [submissionId]);

      // Here you would integrate with your ML grading service
      // For now, we'll just log the trigger
      logger.info(`Auto-grading triggered for submission ${submissionId}`);

      // Add processing log
      await connection.query(`
        INSERT INTO processing_logs (submission_id, message, level)
        VALUES (?, 'Auto-grading process started', 'info')
      `, [submissionId]);

    } catch (error) {
      logger.error('Error triggering auto-grading:', error);
    } finally {
      connection.release();
    }
  }
}

module.exports = new StudentSubmissionService();
