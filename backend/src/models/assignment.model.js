const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Assignment model for handling all assignment-related database operations
 */
class Assignment {
  /**
   * Create a new assignment
   * @param {Object} assignmentData - Assignment data
   * @returns {Promise<Object>} - Created assignment data
   */
  static async create(assignmentData) {
    try {
      const { 
        title, 
        description, 
        courseId, 
        categoryId, 
        openDate, 
        deadline, 
        lateDeadline, 
        latePenalty,
        totalPoints, 
        isGroupAssignment, 
        maxAttempts,
        questionPdf, 
        nbgraderExpectation,
        submissionFormat,
        gradingMethod
      } = assignmentData;
      
      const [result] = await pool.query(
        `INSERT INTO assignments (
          title, description, course_id, category_id, open_date, deadline, 
          late_deadline, late_penalty, total_points, is_active, 
          is_group_assignment, max_attempts, question_pdf, 
          nbgrader_expectation, submission_format, grading_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          title, description, courseId, categoryId, openDate, deadline, 
          lateDeadline, latePenalty, totalPoints, true, 
          isGroupAssignment, maxAttempts, questionPdf, 
          nbgraderExpectation, submissionFormat, gradingMethod
        ]
      );
      
      return {
        id: result.insertId,
        title,
        description,
        courseId,
        categoryId,
        openDate,
        deadline,
        lateDeadline,
        latePenalty,
        totalPoints,
        isActive: true,
        isGroupAssignment,
        maxAttempts,
        questionPdf,
        nbgraderExpectation,
        submissionFormat,
        gradingMethod
      };
    } catch (error) {
      logger.error('Error creating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Find an assignment by ID
   * @param {number} id - Assignment ID
   * @returns {Promise<Object|null>} - Assignment data or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT a.*, 
                c.title AS course_title, 
                c.code AS course_code,
                ac.name AS category_name,
                ac.weight AS category_weight,
                (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count,
                (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') AS graded_count
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN assignment_categories ac ON a.category_id = ac.id
         WHERE a.id = ?`,
        [id]
      );
      
      if (!rows.length) return null;
      
      // Get assignment questions if they exist
      const [questions] = await pool.query(
        `SELECT * FROM assignment_questions
         WHERE assignment_id = ?
         ORDER BY question_number`,
        [id]
      );
      
      // Get assignment rubric criteria if they exist
      const [rubrics] = await pool.query(
        `SELECT * FROM rubric_criteria
         WHERE assignment_id = ?
         ORDER BY id`,
        [id]
      );
      
      // Get assignment resources if they exist
      const [resources] = await pool.query(
        `SELECT * FROM assignment_resources
         WHERE assignment_id = ?
         ORDER BY id`,
        [id]
      );
      
      return {
        ...rows[0],
        questions,
        rubrics,
        resources
      };
    } catch (error) {
      logger.error('Error finding assignment by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all assignments with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated assignments and total count
   */
  static async getAll({ page = 1, limit = 10, courseId, categoryId, isActive, search }) {
    try {
      let query = `
        SELECT a.*, 
               c.title AS course_title, 
               c.code AS course_code,
               ac.name AS category_name,
               (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count,
               (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') AS graded_count
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_categories ac ON a.category_id = ac.id
      `;
      
      const queryParams = [];
      const whereConditions = [];
      
      if (courseId) {
        whereConditions.push('a.course_id = ?');
        queryParams.push(courseId);
      }
      
      if (categoryId) {
        whereConditions.push('a.category_id = ?');
        queryParams.push(categoryId);
      }
      
      if (isActive !== undefined) {
        whereConditions.push('a.is_active = ?');
        queryParams.push(isActive);
      }
      
      if (search) {
        whereConditions.push('(a.title LIKE ? OR a.description LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam);
      }
      
      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // Add pagination
      query += ' ORDER BY a.deadline DESC LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), (Number(page) - 1) * Number(limit));
      
      // Get assignments
      const [assignments] = await pool.query(query, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) AS total FROM assignments a';
      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
      
      return {
        assignments,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult[0].total / Number(limit))
      };
    } catch (error) {
      logger.error('Error getting all assignments:', error);
      throw error;
    }
  }
  
  /**
   * Get assignments for a student
   * @param {number} studentId - Student ID
   * @param {number} courseId - Optional course ID to filter by
   * @returns {Promise<Array>} - Student's assignments
   */
  static async getForStudent(studentId, courseId = null) {
    try {
      let query = `
        SELECT a.*, 
               c.title AS course_title, 
               c.code AS course_code,
               ac.name AS category_name,
               s.id AS submission_id,
               s.submission_time,
               s.status AS submission_status,
               s.grade,
               s.normalized_grade,
               s.is_late
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id AND e.student_id = ?
        LEFT JOIN assignment_categories ac ON a.category_id = ac.id
        LEFT JOIN (
          SELECT * FROM submissions 
          WHERE student_id = ? 
          ORDER BY submission_time DESC
        ) s ON a.id = s.assignment_id
      `;
      
      const queryParams = [studentId, studentId];
      
      if (courseId) {
        query += ' WHERE a.course_id = ?';
        queryParams.push(courseId);
      }
      
      query += ' ORDER BY a.deadline ASC';
      
      const [rows] = await pool.query(query, queryParams);
      
      return rows;
    } catch (error) {
      logger.error('Error getting assignments for student:', error);
      throw error;
    }
  }
  
  /**
   * Get assignments for a course
   * @param {number} courseId - Course ID
   * @returns {Promise<Array>} - Course assignments
   */
  static async getForCourse(courseId) {
    try {
      const [rows] = await pool.query(
        `SELECT a.*, 
                ac.name AS category_name,
                (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id) AS submission_count,
                (SELECT COUNT(*) FROM submissions s WHERE s.assignment_id = a.id AND s.status = 'graded') AS graded_count
         FROM assignments a
         LEFT JOIN assignment_categories ac ON a.category_id = ac.id
         WHERE a.course_id = ?
         ORDER BY a.deadline ASC`,
        [courseId]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting assignments for course:', error);
      throw error;
    }
  }
  
  /**
   * Update an assignment
   * @param {number} id - Assignment ID
   * @param {Object} assignmentData - Updated assignment data
   * @returns {Promise<boolean>} - Success status
   */
  static async update(id, assignmentData) {
    try {
      const { 
        title, 
        description, 
        categoryId, 
        openDate, 
        deadline, 
        lateDeadline, 
        latePenalty,
        totalPoints, 
        isActive,
        isGroupAssignment, 
        maxAttempts,
        questionPdf, 
        nbgraderExpectation,
        submissionFormat,
        gradingMethod
      } = assignmentData;
      
      const [result] = await pool.query(
        `UPDATE assignments 
         SET title = ?, 
             description = ?, 
             category_id = ?, 
             open_date = ?, 
             deadline = ?,
             late_deadline = ?,
             late_penalty = ?,
             total_points = ?,
             is_active = ?,
             is_group_assignment = ?,
             max_attempts = ?,
             question_pdf = ?,
             nbgrader_expectation = ?,
             submission_format = ?,
             grading_method = ?
         WHERE id = ?`,
        [
          title, 
          description, 
          categoryId, 
          openDate, 
          deadline, 
          lateDeadline, 
          latePenalty,
          totalPoints, 
          isActive,
          isGroupAssignment, 
          maxAttempts,
          questionPdf, 
          nbgraderExpectation,
          submissionFormat,
          gradingMethod,
          id
        ]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating assignment:', error);
      throw error;
    }
  }
  
  /**
   * Delete an assignment
   * @param {number} id - Assignment ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM assignments WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting assignment:', error);
      throw error;
    }
  }
  
  /**
   * Add a question to an assignment
   * @param {Object} questionData - Question data
   * @returns {Promise<Object>} - Created question
   */
  static async addQuestion(questionData) {
    try {
      const { 
        assignmentId, 
        questionNumber, 
        questionText, 
        questionType, 
        points, 
        expectedAnswer, 
        rubric 
      } = questionData;
      
      const [result] = await pool.query(
        `INSERT INTO assignment_questions 
         (assignment_id, question_number, question_text, question_type, points, expected_answer, rubric) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [assignmentId, questionNumber, questionText, questionType, points, expectedAnswer, rubric]
      );
      
      // If it's a multiple choice question, add options
      if (questionType === 'multiple_choice' && questionData.options && questionData.options.length > 0) {
        const questionId = result.insertId;
        
        for (let i = 0; i < questionData.options.length; i++) {
          const option = questionData.options[i];
          
          await pool.query(
            `INSERT INTO question_options 
             (question_id, option_text, is_correct, option_order) 
             VALUES (?, ?, ?, ?)`,
            [questionId, option.text, option.isCorrect, i + 1]
          );
        }
      }
      
      return {
        id: result.insertId,
        assignmentId,
        questionNumber,
        questionText,
        questionType,
        points,
        expectedAnswer,
        rubric
      };
    } catch (error) {
      logger.error('Error adding question:', error);
      throw error;
    }
  }
  
  /**
   * Update a question
   * @param {number} id - Question ID
   * @param {Object} questionData - Updated question data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateQuestion(id, questionData) {
    try {
      const { 
        questionNumber, 
        questionText, 
        questionType, 
        points, 
        expectedAnswer, 
        rubric 
      } = questionData;
      
      const [result] = await pool.query(
        `UPDATE assignment_questions 
         SET question_number = ?, 
             question_text = ?, 
             question_type = ?, 
             points = ?, 
             expected_answer = ?,
             rubric = ?
         WHERE id = ?`,
        [questionNumber, questionText, questionType, points, expectedAnswer, rubric, id]
      );
      
      // If it's a multiple choice question, update options
      if (questionType === 'multiple_choice' && questionData.options && questionData.options.length > 0) {
        // Delete existing options
        await pool.query('DELETE FROM question_options WHERE question_id = ?', [id]);
        
        // Add new options
        for (let i = 0; i < questionData.options.length; i++) {
          const option = questionData.options[i];
          
          await pool.query(
            `INSERT INTO question_options 
             (question_id, option_text, is_correct, option_order) 
             VALUES (?, ?, ?, ?)`,
            [id, option.text, option.isCorrect, i + 1]
          );
        }
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating question:', error);
      throw error;
    }
  }
  
  /**
   * Delete a question
   * @param {number} id - Question ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteQuestion(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM assignment_questions WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting question:', error);
      throw error;
    }
  }
  
  /**
   * Add a rubric criterion to an assignment
   * @param {Object} criterionData - Rubric criterion data
   * @returns {Promise<Object>} - Created criterion
   */
  static async addRubricCriterion(criterionData) {
    try {
      const { assignmentId, criterionName, description, maxScore, weight } = criterionData;
      
      const [result] = await pool.query(
        `INSERT INTO rubric_criteria 
         (assignment_id, criterion_name, description, max_score, weight) 
         VALUES (?, ?, ?, ?, ?)`,
        [assignmentId, criterionName, description, maxScore, weight]
      );
      
      return {
        id: result.insertId,
        assignmentId,
        criterionName,
        description,
        maxScore,
        weight
      };
    } catch (error) {
      logger.error('Error adding rubric criterion:', error);
      throw error;
    }
  }
  
  /**
   * Update a rubric criterion
   * @param {number} id - Criterion ID
   * @param {Object} criterionData - Updated criterion data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateRubricCriterion(id, criterionData) {
    try {
      const { criterionName, description, maxScore, weight } = criterionData;
      
      const [result] = await pool.query(
        `UPDATE rubric_criteria 
         SET criterion_name = ?, 
             description = ?, 
             max_score = ?, 
             weight = ?
         WHERE id = ?`,
        [criterionName, description, maxScore, weight, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating rubric criterion:', error);
      throw error;
    }
  }
  
  /**
   * Delete a rubric criterion
   * @param {number} id - Criterion ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteRubricCriterion(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM rubric_criteria WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting rubric criterion:', error);
      throw error;
    }
  }
  
  /**
   * Add a resource to an assignment
   * @param {Object} resourceData - Resource data
   * @returns {Promise<Object>} - Created resource
   */
  static async addResource(resourceData) {
    try {
      const { assignmentId, title, description, filePath, externalUrl, resourceType } = resourceData;
      
      const [result] = await pool.query(
        `INSERT INTO assignment_resources 
         (assignment_id, title, description, file_path, external_url, resource_type) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [assignmentId, title, description, filePath, externalUrl, resourceType]
      );
      
      return {
        id: result.insertId,
        assignmentId,
        title,
        description,
        filePath,
        externalUrl,
        resourceType
      };
    } catch (error) {
      logger.error('Error adding resource:', error);
      throw error;
    }
  }
  
  /**
   * Update a resource
   * @param {number} id - Resource ID
   * @param {Object} resourceData - Updated resource data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateResource(id, resourceData) {
    try {
      const { title, description, filePath, externalUrl, resourceType } = resourceData;
      
      const [result] = await pool.query(
        `UPDATE assignment_resources 
         SET title = ?, 
             description = ?, 
             file_path = ?, 
             external_url = ?,
             resource_type = ?
         WHERE id = ?`,
        [title, description, filePath, externalUrl, resourceType, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating resource:', error);
      throw error;
    }
  }
  
  /**
   * Delete a resource
   * @param {number} id - Resource ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteResource(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM assignment_resources WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting resource:', error);
      throw error;
    }
  }
}

module.exports = Assignment;
