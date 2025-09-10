const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Submission model for handling all submission-related database operations
 */
class Submission {
  /**
   * Create a new submission
   * @param {Object} submissionData - Submission data
   * @returns {Promise<Object>} - Created submission data
   */
  static async create(submissionData) {
    try {
      const { 
        assignmentId, 
        studentId, 
        submissionNumber,
        submissionPdf, 
        submissionText,
        submissionCode,
        submissionNotebook,
        isLate
      } = submissionData;
      
      // Check assignment deadline to determine if submission is late
      const [assignments] = await pool.query(
        'SELECT deadline, late_deadline FROM assignments WHERE id = ?',
        [assignmentId]
      );
      
      if (!assignments.length) {
        throw new Error('Assignment not found');
      }
      
      const assignment = assignments[0];
      const now = new Date();
      const deadline = new Date(assignment.deadline);
      const lateDeadline = assignment.late_deadline ? new Date(assignment.late_deadline) : null;
      
      // Check if submission is allowed (not past late deadline)
      if (lateDeadline && now > lateDeadline) {
        throw new Error('Submission deadline has passed');
      }
      
      // Set late flag based on deadline
      const submissionIsLate = isLate !== undefined ? isLate : now > deadline;
      
      // Get the submission number if not provided
      let actualSubmissionNumber = submissionNumber;
      if (!actualSubmissionNumber) {
        const [existingSubmissions] = await pool.query(
          'SELECT MAX(submission_number) as maxNum FROM submissions WHERE assignment_id = ? AND student_id = ?',
          [assignmentId, studentId]
        );
        
        actualSubmissionNumber = existingSubmissions[0].maxNum ? existingSubmissions[0].maxNum + 1 : 1;
      }
      
      const [result] = await pool.query(
        `INSERT INTO submissions (
          assignment_id, student_id, submission_number, submission_pdf, 
          submission_text, submission_code, submission_notebook, 
          status, is_late
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assignmentId, studentId, actualSubmissionNumber, submissionPdf, 
          submissionText, submissionCode, submissionNotebook, 
          'submitted', submissionIsLate
        ]
      );
      
      return {
        id: result.insertId,
        assignmentId,
        studentId,
        submissionNumber: actualSubmissionNumber,
        submissionPdf,
        submissionText,
        submissionCode,
        submissionNotebook,
        status: 'submitted',
        isLate: submissionIsLate,
        submissionTime: new Date()
      };
    } catch (error) {
      logger.error('Error creating submission:', error);
      throw error;
    }
  }
  
  /**
   * Find a submission by ID
   * @param {number} id - Submission ID
   * @returns {Promise<Object|null>} - Submission data or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT s.*, 
                a.title AS assignment_title, 
                a.total_points AS assignment_total_points,
                c.id AS course_id,
                c.title AS course_title,
                c.code AS course_code,
                u.first_name AS student_first_name,
                u.last_name AS student_last_name,
                u.email AS student_email
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         JOIN users u ON s.student_id = u.id
         WHERE s.id = ?`,
        [id]
      );
      
      if (!rows.length) return null;
      
      // Get grading results
      const [gradingResults] = await pool.query(
        `SELECT gr.*, aq.question_text, aq.question_number, aq.question_type
         FROM grading_results gr
         LEFT JOIN assignment_questions aq ON gr.question_id = aq.id
         WHERE gr.submission_id = ?
         ORDER BY aq.question_number`,
        [id]
      );
      
      // Get rubric assessments
      const [rubricAssessments] = await pool.query(
        `SELECT ra.*, rc.criterion_name, rc.max_score, rc.weight
         FROM rubric_assessments ra
         JOIN rubric_criteria rc ON ra.criterion_id = rc.id
         WHERE ra.submission_id = ?`,
        [id]
      );
      
      // Get annotations
      const [annotations] = await pool.query(
        `SELECT sa.*, u.first_name, u.last_name
         FROM submission_annotations sa
         JOIN users u ON sa.created_by = u.id
         WHERE sa.submission_id = ?
         ORDER BY sa.created_at`,
        [id]
      );
      
      return {
        ...rows[0],
        gradingResults,
        rubricAssessments,
        annotations
      };
    } catch (error) {
      logger.error('Error finding submission by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all submissions with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated submissions and total count
   */
  static async getAll({ page = 1, limit = 10, assignmentId, studentId, status, isGraded }) {
    try {
      let query = `
        SELECT s.*, 
               a.title AS assignment_title,
               c.id AS course_id,
               c.title AS course_title,
               c.code AS course_code,
               u.first_name AS student_first_name,
               u.last_name AS student_last_name,
               u.email AS student_email,
               u.identifier AS student_identifier
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON s.student_id = u.id
      `;
      
      const queryParams = [];
      const whereConditions = [];
      
      if (assignmentId) {
        whereConditions.push('s.assignment_id = ?');
        queryParams.push(assignmentId);
      }
      
      if (studentId) {
        whereConditions.push('s.student_id = ?');
        queryParams.push(studentId);
      }
      
      if (status) {
        whereConditions.push('s.status = ?');
        queryParams.push(status);
      }
      
      if (isGraded !== undefined) {
        if (isGraded) {
          whereConditions.push('s.grade IS NOT NULL');
        } else {
          whereConditions.push('s.grade IS NULL');
        }
      }
      
      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // Add pagination
      query += ' ORDER BY s.submission_time DESC LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), (Number(page) - 1) * Number(limit));
      
      // Get submissions
      const [submissions] = await pool.query(query, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) AS total FROM submissions s';
      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
      
      return {
        submissions,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult[0].total / Number(limit))
      };
    } catch (error) {
      logger.error('Error getting all submissions:', error);
      throw error;
    }
  }
  
  /**
   * Get submissions for an assignment
   * @param {number} assignmentId - Assignment ID
   * @returns {Promise<Array>} - Assignment submissions
   */
  static async getForAssignment(assignmentId) {
    try {
      const [rows] = await pool.query(
        `SELECT s.*, 
                u.first_name AS student_first_name,
                u.last_name AS student_last_name,
                u.email AS student_email,
                u.identifier AS student_identifier
         FROM submissions s
         JOIN users u ON s.student_id = u.id
         WHERE s.assignment_id = ?
         ORDER BY s.submission_time DESC`,
        [assignmentId]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting submissions for assignment:', error);
      throw error;
    }
  }
  
  /**
   * Get submissions for a student
   * @param {number} studentId - Student ID
   * @param {number} courseId - Optional course ID to filter by
   * @returns {Promise<Array>} - Student submissions
   */
  static async getForStudent(studentId, courseId = null) {
    try {
      let query = `
        SELECT s.*, 
               a.title AS assignment_title,
               a.deadline AS assignment_deadline,
               a.total_points AS assignment_total_points,
               c.id AS course_id,
               c.title AS course_title,
               c.code AS course_code
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.student_id = ?
      `;
      
      const queryParams = [studentId];
      
      if (courseId) {
        query += ' AND c.id = ?';
        queryParams.push(courseId);
      }
      
      query += ' ORDER BY s.submission_time DESC';
      
      const [rows] = await pool.query(query, queryParams);
      
      return rows;
    } catch (error) {
      logger.error('Error getting submissions for student:', error);
      throw error;
    }
  }
  
  /**
   * Update submission status
   * @param {number} id - Submission ID
   * @param {string} status - New status
   * @returns {Promise<boolean>} - Success status
   */
  static async updateStatus(id, status) {
    try {
      let query = 'UPDATE submissions SET status = ?';
      const queryParams = [status];
      
      // If status is 'processing', set processing_started_at
      if (status === 'processing') {
        query += ', processing_started_at = CURRENT_TIMESTAMP';
      }
      // If status is 'graded', set graded_at
      else if (status === 'graded') {
        query += ', graded_at = CURRENT_TIMESTAMP';
      }
      
      query += ' WHERE id = ?';
      queryParams.push(id);
      
      const [result] = await pool.query(query, queryParams);
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating submission status:', error);
      throw error;
    }
  }
  
  /**
   * Update submission with grade and feedback
   * @param {number} id - Submission ID
   * @param {Object} gradeData - Grade data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateGrade(id, gradeData) {
    try {
      const { 
        grade, 
        normalizedGrade, 
        gradedBy,
        isAutoGraded
      } = gradeData;
      
      const [result] = await pool.query(
        `UPDATE submissions 
         SET grade = ?, 
             normalized_grade = ?, 
             graded_by = ?, 
             is_auto_graded = ?,
             status = 'graded',
             graded_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [grade, normalizedGrade, gradedBy, isAutoGraded, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating submission grade:', error);
      throw error;
    }
  }
  
  /**
   * Add grading result for a submission
   * @param {Object} resultData - Grading result data
   * @returns {Promise<Object>} - Created result
   */
  static async addGradingResult(resultData) {
    try {
      const { 
        submissionId, 
        questionId, 
        score, 
        maxScore, 
        feedback, 
        confidenceLevel,
        gradingNotes
      } = resultData;
      
      const [result] = await pool.query(
        `INSERT INTO grading_results 
         (submission_id, question_id, score, max_score, feedback, confidence_level, grading_notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [submissionId, questionId, score, maxScore, feedback, confidenceLevel, gradingNotes]
      );
      
      return {
        id: result.insertId,
        submissionId,
        questionId,
        score,
        maxScore,
        feedback,
        confidenceLevel,
        gradingNotes
      };
    } catch (error) {
      logger.error('Error adding grading result:', error);
      throw error;
    }
  }
  
  /**
   * Update grading result
   * @param {number} id - Grading result ID
   * @param {Object} resultData - Updated result data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateGradingResult(id, resultData) {
    try {
      const { score, feedback, confidenceLevel, gradingNotes } = resultData;
      
      const [result] = await pool.query(
        `UPDATE grading_results 
         SET score = ?, 
             feedback = ?, 
             confidence_level = ?, 
             grading_notes = ?
         WHERE id = ?`,
        [score, feedback, confidenceLevel, gradingNotes, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating grading result:', error);
      throw error;
    }
  }
  
  /**
   * Add rubric assessment for a submission
   * @param {Object} assessmentData - Rubric assessment data
   * @returns {Promise<Object>} - Created assessment
   */
  static async addRubricAssessment(assessmentData) {
    try {
      const { submissionId, criterionId, score, comments } = assessmentData;
      
      const [result] = await pool.query(
        `INSERT INTO rubric_assessments 
         (submission_id, criterion_id, score, comments) 
         VALUES (?, ?, ?, ?)`,
        [submissionId, criterionId, score, comments]
      );
      
      return {
        id: result.insertId,
        submissionId,
        criterionId,
        score,
        comments
      };
    } catch (error) {
      logger.error('Error adding rubric assessment:', error);
      throw error;
    }
  }
  
  /**
   * Update rubric assessment
   * @param {number} id - Assessment ID
   * @param {Object} assessmentData - Updated assessment data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateRubricAssessment(id, assessmentData) {
    try {
      const { score, comments } = assessmentData;
      
      const [result] = await pool.query(
        `UPDATE rubric_assessments 
         SET score = ?, 
             comments = ?
         WHERE id = ?`,
        [score, comments, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating rubric assessment:', error);
      throw error;
    }
  }
  
  /**
   * Add annotation to a submission
   * @param {Object} annotationData - Annotation data
   * @returns {Promise<Object>} - Created annotation
   */
  static async addAnnotation(annotationData) {
    try {
      const { 
        submissionId, 
        pageNumber, 
        xPosition, 
        yPosition, 
        width, 
        height, 
        annotationText, 
        createdBy 
      } = annotationData;
      
      const [result] = await pool.query(
        `INSERT INTO submission_annotations 
         (submission_id, page_number, x_position, y_position, width, height, annotation_text, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [submissionId, pageNumber, xPosition, yPosition, width, height, annotationText, createdBy]
      );
      
      return {
        id: result.insertId,
        submissionId,
        pageNumber,
        xPosition,
        yPosition,
        width,
        height,
        annotationText,
        createdBy,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error adding annotation:', error);
      throw error;
    }
  }
  
  /**
   * Delete annotation
   * @param {number} id - Annotation ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteAnnotation(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM submission_annotations WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting annotation:', error);
      throw error;
    }
  }
  
  /**
   * Record ML model usage for a submission
   * @param {Object} usageData - Model usage data
   * @returns {Promise<Object>} - Created usage record
   */
  static async recordModelUsage(usageData) {
    try {
      const { 
        modelId, 
        submissionId, 
        processingTimeMs, 
        resultConfidence, 
        status, 
        errorMessage 
      } = usageData;
      
      const [result] = await pool.query(
        `INSERT INTO model_usage 
         (model_id, submission_id, processing_time_ms, result_confidence, status, error_message) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [modelId, submissionId, processingTimeMs, resultConfidence, status, errorMessage]
      );
      
      return {
        id: result.insertId,
        modelId,
        submissionId,
        processingTimeMs,
        resultConfidence,
        status,
        errorMessage,
        usedAt: new Date()
      };
    } catch (error) {
      logger.error('Error recording model usage:', error);
      throw error;
    }
  }
  
  /**
   * Track error in submission processing
   * @param {number} id - Submission ID
   * @param {string} errorMessage - Error message
   * @returns {Promise<boolean>} - Success status
   */
  static async trackError(id, errorMessage) {
    try {
      const [result] = await pool.query(
        `UPDATE submissions 
         SET status = 'error', 
             error_message = ?
         WHERE id = ?`,
        [errorMessage, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error tracking submission error:', error);
      throw error;
    }
  }
}

module.exports = Submission;
