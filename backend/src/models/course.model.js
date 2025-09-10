const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Course model for handling all course-related database operations
 */
class Course {
  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @returns {Promise<Object>} - Created course data
   */
  static async create(courseData) {
    try {
      const { code, title, description, credits, teacherId, startDate, endDate } = courseData;
      
      const [result] = await pool.query(
        `INSERT INTO courses 
         (code, title, description, credits, teacher_id, start_date, end_date, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [code, title, description, credits, teacherId, startDate, endDate, true]
      );
      
      return {
        id: result.insertId,
        code,
        title,
        description,
        credits,
        teacherId,
        startDate,
        endDate,
        isActive: true
      };
    } catch (error) {
      logger.error('Error creating course:', error);
      throw error;
    }
  }
  
  /**
   * Find a course by ID
   * @param {number} id - Course ID
   * @returns {Promise<Object|null>} - Course data or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT c.*, 
                u.first_name AS teacher_first_name, 
                u.last_name AS teacher_last_name, 
                u.email AS teacher_email
         FROM courses c
         JOIN users u ON c.teacher_id = u.id
         WHERE c.id = ?`,
        [id]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      logger.error('Error finding course by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all courses with pagination and filtering
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated courses and total count
   */
  static async getAll({ page = 1, limit = 10, teacherId, isActive, search }) {
    try {
      let query = `
        SELECT c.*, 
               u.first_name AS teacher_first_name, 
               u.last_name AS teacher_last_name, 
               u.email AS teacher_email,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrollment_count,
               (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS assignment_count
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
      `;
      
      const queryParams = [];
      const whereConditions = [];
      
      if (teacherId) {
        whereConditions.push('c.teacher_id = ?');
        queryParams.push(teacherId);
      }
      
      if (isActive !== undefined) {
        whereConditions.push('c.is_active = ?');
        queryParams.push(isActive);
      }
      
      if (search) {
        whereConditions.push('(c.code LIKE ? OR c.title LIKE ? OR c.description LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam);
      }
      
      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // Add pagination
      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), (Number(page) - 1) * Number(limit));
      
      // Get courses
      const [courses] = await pool.query(query, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) AS total FROM courses c';
      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
      
      return {
        courses,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult[0].total / Number(limit))
      };
    } catch (error) {
      logger.error('Error getting all courses:', error);
      throw error;
    }
  }
  
  /**
   * Get courses for a student
   * @param {number} studentId - Student ID
   * @returns {Promise<Array>} - Student's enrolled courses
   */
  static async getForStudent(studentId) {
    try {
      const [rows] = await pool.query(
        `SELECT c.*, 
                u.first_name AS teacher_first_name, 
                u.last_name AS teacher_last_name,
                e.status AS enrollment_status,
                e.final_grade
         FROM courses c
         JOIN enrollments e ON c.id = e.course_id
         JOIN users u ON c.teacher_id = u.id
         WHERE e.student_id = ?
         ORDER BY c.start_date DESC`,
        [studentId]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting courses for student:', error);
      throw error;
    }
  }
  
  /**
   * Get courses for a teacher
   * @param {number} teacherId - Teacher ID
   * @returns {Promise<Array>} - Teacher's courses
   */
  static async getForTeacher(teacherId) {
    try {
      const [rows] = await pool.query(
        `SELECT c.*, 
                (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS student_count,
                (SELECT COUNT(*) FROM assignments a WHERE a.course_id = c.id) AS assignment_count
         FROM courses c
         WHERE c.teacher_id = ?
         ORDER BY c.start_date DESC`,
        [teacherId]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting courses for teacher:', error);
      throw error;
    }
  }
  
  /**
   * Update a course
   * @param {number} id - Course ID
   * @param {Object} courseData - Updated course data
   * @returns {Promise<boolean>} - Success status
   */
  static async update(id, courseData) {
    try {
      const { code, title, description, credits, isActive, startDate, endDate, syllabusPath } = courseData;
      
      const [result] = await pool.query(
        `UPDATE courses 
         SET code = ?, 
             title = ?, 
             description = ?, 
             credits = ?, 
             is_active = ?,
             start_date = ?,
             end_date = ?,
             syllabus_path = ?
         WHERE id = ?`,
        [code, title, description, credits, isActive, startDate, endDate, syllabusPath, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating course:', error);
      throw error;
    }
  }
  
  /**
   * Delete a course
   * @param {number} id - Course ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM courses WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting course:', error);
      throw error;
    }
  }
  
  /**
   * Enroll a student in a course
   * @param {number} courseId - Course ID
   * @param {number} studentId - Student ID
   * @returns {Promise<boolean>} - Success status
   */
  static async enrollStudent(courseId, studentId) {
    try {
      // Check if already enrolled
      const [existingEnrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (existingEnrollments.length > 0) {
        return { success: false, message: 'Student already enrolled in this course' };
      }
      
      // Create enrollment
      await pool.query(
        'INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, ?)',
        [courseId, studentId, 'active']
      );
      
      return { success: true };
    } catch (error) {
      logger.error('Error enrolling student:', error);
      throw error;
    }
  }
  
  /**
   * Get students enrolled in a course
   * @param {number} courseId - Course ID
   * @returns {Promise<Array>} - Enrolled students
   */
  static async getEnrolledStudents(courseId) {
    try {
      const [rows] = await pool.query(
        `SELECT u.id, u.email, u.identifier, u.first_name, u.last_name, 
                e.status AS enrollment_status, e.enrollment_date, e.final_grade,
                sp.year_level, sp.major, sp.cumulative_gpa
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         WHERE e.course_id = ?
         ORDER BY u.last_name, u.first_name`,
        [courseId]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting enrolled students:', error);
      throw error;
    }
  }
  
  /**
   * Update student enrollment status
   * @param {number} courseId - Course ID
   * @param {number} studentId - Student ID
   * @param {Object} data - Updated enrollment data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateEnrollment(courseId, studentId, data) {
    try {
      const { status, finalGrade } = data;
      
      const [result] = await pool.query(
        'UPDATE enrollments SET status = ?, final_grade = ? WHERE course_id = ? AND student_id = ?',
        [status, finalGrade, courseId, studentId]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating enrollment:', error);
      throw error;
    }
  }
  
  /**
   * Get course categories
   * @param {number} courseId - Course ID
   * @returns {Promise<Array>} - Assignment categories
   */
  static async getCategories(courseId) {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM assignment_categories
         WHERE course_id = ?
         ORDER BY name`,
        [courseId]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting course categories:', error);
      throw error;
    }
  }
  
  /**
   * Create assignment category
   * @param {Object} categoryData - Category data
   * @returns {Promise<Object>} - Created category
   */
  static async createCategory(categoryData) {
    try {
      const { courseId, name, weight, description } = categoryData;
      
      const [result] = await pool.query(
        'INSERT INTO assignment_categories (course_id, name, weight, description) VALUES (?, ?, ?, ?)',
        [courseId, name, weight, description]
      );
      
      return {
        id: result.insertId,
        courseId,
        name,
        weight,
        description
      };
    } catch (error) {
      logger.error('Error creating assignment category:', error);
      throw error;
    }
  }
  
  /**
   * Update assignment category
   * @param {number} id - Category ID
   * @param {Object} categoryData - Updated category data
   * @returns {Promise<boolean>} - Success status
   */
  static async updateCategory(id, categoryData) {
    try {
      const { name, weight, description } = categoryData;
      
      const [result] = await pool.query(
        'UPDATE assignment_categories SET name = ?, weight = ?, description = ? WHERE id = ?',
        [name, weight, description, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating assignment category:', error);
      throw error;
    }
  }
  
  /**
   * Delete assignment category
   * @param {number} id - Category ID
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteCategory(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM assignment_categories WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting assignment category:', error);
      throw error;
    }
  }
}

module.exports = Course;
