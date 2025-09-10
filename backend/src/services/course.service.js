const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

/**
 * Course Service - Handles all course-related operations
 */
class CourseService {
  /**
   * Create a new course
   * @param {Object} courseData - Course data
   * @param {Number} teacherId - ID of the teacher creating the course
   * @returns {Promise<Object>} - Created course
   */
  async createCourse(courseData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if course code already exists
      const [existingCourses] = await connection.query(
        'SELECT * FROM courses WHERE code = ?',
        [courseData.code]
      );
      
      if (existingCourses.length > 0) {
        throw createError(409, 'Course with this code already exists');
      }
      
      // Insert course
      const [courseResult] = await connection.query(
        `INSERT INTO courses (
          code, title, description, credits, is_active, 
          start_date, end_date, teacher_id, syllabus_path
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          courseData.code,
          courseData.title,
          courseData.description || null,
          courseData.credits || 3,
          courseData.isActive !== undefined ? courseData.isActive : true,
          courseData.startDate || null,
          courseData.endDate || null,
          teacherId,
          courseData.syllabusPath || null
        ]
      );
      
      const courseId = courseResult.insertId;
      
      // Add course categories if provided
      if (courseData.categories && Array.isArray(courseData.categories)) {
        for (const category of courseData.categories) {
          await connection.query(
            'INSERT INTO assignment_categories (course_id, name, weight, description) VALUES (?, ?, ?, ?)',
            [
              courseId,
              category.name,
              category.weight || 0,
              category.description || null
            ]
          );
        }
      }
      
      await connection.commit();
      
      // Get created course
      return this.getCourseById(courseId);
    } catch (error) {
      await connection.rollback();
      logger.error('Error creating course:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get course by ID with related data
   * @param {Number} courseId - Course ID
   * @param {Boolean} includeAssignments - Whether to include assignments
   * @returns {Promise<Object>} - Course data
   */
  async getCourseById(courseId, includeAssignments = false) {
    try {
      // Get base course data
      const [courses] = await pool.query(
        `SELECT c.*, 
         CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
         u.email as teacher_email
         FROM courses c
         JOIN users u ON c.teacher_id = u.id
         WHERE c.id = ?`,
        [courseId]
      );
      
      if (courses.length === 0) {
        throw createError(404, 'Course not found');
      }
      
      const course = courses[0];
      
      // Get course categories
      const [categories] = await pool.query(
        'SELECT * FROM assignment_categories WHERE course_id = ? ORDER BY weight DESC',
        [courseId]
      );
      
      course.categories = categories;
      
      // Get course assistants
      const [assistants] = await pool.query(
        `SELECT ca.*, CONCAT(u.first_name, ' ', u.last_name) as assistant_name, u.email
         FROM course_assistants ca
         JOIN users u ON ca.teacher_id = u.id
         WHERE ca.course_id = ?`,
        [courseId]
      );
      
      course.assistants = assistants;
      
      // Get enrollment count
      const [enrollmentCount] = await pool.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = "active"',
        [courseId]
      );
      
      course.enrollmentCount = enrollmentCount[0].count;
      
      // Get assignments if requested
      if (includeAssignments) {
        const [assignments] = await pool.query(
          `SELECT a.*, ac.name as category_name 
           FROM assignments a
           LEFT JOIN assignment_categories ac ON a.category_id = ac.id
           WHERE a.course_id = ?
           ORDER BY a.deadline ASC`,
          [courseId]
        );
        
        course.assignments = assignments;
      }
      
      return course;
    } catch (error) {
      logger.error('Error getting course by ID:', error);
      throw error;
    }
  }
  
  /**
   * Update course data
   * @param {Number} courseId - Course ID
   * @param {Object} courseData - Updated course data
   * @returns {Promise<Object>} - Updated course
   */
  async updateCourse(courseId, courseData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if course exists
      const [courses] = await connection.query(
        'SELECT * FROM courses WHERE id = ?',
        [courseId]
      );
      
      if (courses.length === 0) {
        throw createError(404, 'Course not found');
      }
      
      // Check if updating to an existing course code
      if (courseData.code) {
        const [existingCourses] = await connection.query(
          'SELECT * FROM courses WHERE code = ? AND id != ?',
          [courseData.code, courseId]
        );
        
        if (existingCourses.length > 0) {
          throw createError(409, 'Course with this code already exists');
        }
      }
      
      // Update course data
      const updates = {};
      
      // Only include fields that are provided
      if (courseData.code !== undefined) updates.code = courseData.code;
      if (courseData.title !== undefined) updates.title = courseData.title;
      if (courseData.description !== undefined) updates.description = courseData.description;
      if (courseData.credits !== undefined) updates.credits = courseData.credits;
      if (courseData.isActive !== undefined) updates.is_active = courseData.isActive;
      if (courseData.startDate !== undefined) updates.start_date = courseData.startDate;
      if (courseData.endDate !== undefined) updates.end_date = courseData.endDate;
      if (courseData.teacherId !== undefined) updates.teacher_id = courseData.teacherId;
      if (courseData.syllabusPath !== undefined) updates.syllabus_path = courseData.syllabusPath;
      
      // If there are updates, apply them
      if (Object.keys(updates).length > 0) {
        await connection.query(
          'UPDATE courses SET ? WHERE id = ?',
          [updates, courseId]
        );
      }
      
      await connection.commit();
      
      // Get updated course
      return this.getCourseById(courseId);
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating course:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Delete course
   * @param {Number} courseId - Course ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteCourse(courseId) {
    try {
      // Check if course exists
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ?',
        [courseId]
      );
      
      if (courses.length === 0) {
        throw createError(404, 'Course not found');
      }
      
      // Delete course (cascade will delete categories, assignments, submissions)
      await pool.query(
        'DELETE FROM courses WHERE id = ?',
        [courseId]
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting course:', error);
      throw error;
    }
  }
  
  /**
   * Get courses with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated courses
   */
  async getCourses(options = {}) {
    try {
      const limit = options.limit || 10;
      const page = options.page || 1;
      const offset = (page - 1) * limit;
      const teacherId = options.teacherId;
      const isActive = options.isActive;
      const search = options.search;
      
      // Build base query
      let query = `
        SELECT c.*, 
        CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
        u.email as teacher_email,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = "active") as enrollment_count
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
      `;
      
      // Build where clause
      const whereClauses = [];
      const queryParams = [];
      
      if (teacherId) {
        whereClauses.push('c.teacher_id = ?');
        queryParams.push(teacherId);
      }
      
      if (isActive !== undefined) {
        whereClauses.push('c.is_active = ?');
        queryParams.push(isActive);
      }
      
      if (search) {
        whereClauses.push('(c.code LIKE ? OR c.title LIKE ? OR c.description LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }
      
      // Add where clause to query if needed
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      // Add pagination
      query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      // Execute query
      const [courses] = await pool.query(query, queryParams);
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM courses c';
      
      if (whereClauses.length > 0) {
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = countResult[0].total;
      
      return {
        data: courses,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting courses:', error);
      throw error;
    }
  }
  
  /**
   * Get courses for a specific student
   * @param {Number} studentId - Student ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated courses
   */
  async getStudentCourses(studentId, options = {}) {
    try {
      const limit = options.limit || 10;
      const page = options.page || 1;
      const offset = (page - 1) * limit;
      const status = options.status || 'active';
      const search = options.search;
      
      // Build base query
      let query = `
        SELECT c.*, 
        CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
        u.email as teacher_email,
        e.status as enrollment_status,
        e.final_grade
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = ?
      `;
      
      // Build where clause
      const whereClauses = ['e.student_id = ?'];
      const queryParams = [studentId];
      
      if (status && status !== 'all') {
        whereClauses.push('e.status = ?');
        queryParams.push(status);
      }
      
      if (search) {
        whereClauses.push('(c.code LIKE ? OR c.title LIKE ? OR c.description LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern);
      }
      
      // Update query with where clause
      query = `
        SELECT c.*, 
        CONCAT(u.first_name, ' ', u.last_name) as teacher_name,
        u.email as teacher_email,
        e.status as enrollment_status,
        e.final_grade
        FROM courses c
        JOIN users u ON c.teacher_id = u.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE ${whereClauses.join(' AND ')}
      `;
      
      // Add pagination
      query += ' ORDER BY c.start_date DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      // Execute query
      const [courses] = await pool.query(query, queryParams);
      
      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM courses c
        JOIN enrollments e ON c.id = e.course_id
        WHERE ${whereClauses.join(' AND ')}
      `;
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = countResult[0].total;
      
      return {
        data: courses,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting student courses:', error);
      throw error;
    }
  }
  
  /**
   * Enroll a student in a course
   * @param {Number} courseId - Course ID
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} - Enrollment data
   */
  async enrollStudent(courseId, studentId) {
    try {
      // Check if course exists
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ?',
        [courseId]
      );
      
      if (courses.length === 0) {
        throw createError(404, 'Course not found');
      }
      
      // Check if student exists
      const [students] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND role = "student"',
        [studentId]
      );
      
      if (students.length === 0) {
        throw createError(404, 'Student not found');
      }
      
      // Check if already enrolled
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length > 0) {
        // If already enrolled but withdrawn, update status
        if (enrollments[0].status === 'withdrawn') {
          await pool.query(
            'UPDATE enrollments SET status = "active" WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
          );
          
          return {
            id: enrollments[0].id,
            courseId,
            studentId,
            status: 'active',
            message: 'Re-enrolled in course'
          };
        }
        
        throw createError(409, 'Student already enrolled in this course');
      }
      
      // Create enrollment
      const [result] = await pool.query(
        'INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, "active")',
        [courseId, studentId]
      );
      
      return {
        id: result.insertId,
        courseId,
        studentId,
        status: 'active',
        message: 'Enrolled in course successfully'
      };
    } catch (error) {
      logger.error('Error enrolling student:', error);
      throw error;
    }
  }
  
  /**
   * Update student enrollment status
   * @param {Number} courseId - Course ID
   * @param {Number} studentId - Student ID
   * @param {String} status - New status
   * @returns {Promise<Object>} - Updated enrollment
   */
  async updateEnrollmentStatus(courseId, studentId, status) {
    try {
      // Check if enrollment exists
      const [enrollments] = await pool.query(
        'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
        [courseId, studentId]
      );
      
      if (enrollments.length === 0) {
        throw createError(404, 'Enrollment not found');
      }
      
      // Update status
      await pool.query(
        'UPDATE enrollments SET status = ? WHERE course_id = ? AND student_id = ?',
        [status, courseId, studentId]
      );
      
      return {
        id: enrollments[0].id,
        courseId,
        studentId,
        status,
        message: `Enrollment status updated to ${status}`
      };
    } catch (error) {
      logger.error('Error updating enrollment status:', error);
      throw error;
    }
  }
  
  /**
   * Add a teacher as course assistant
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {String} role - Assistant role
   * @returns {Promise<Object>} - Assistant data
   */
  async addCourseAssistant(courseId, teacherId, role = 'TA') {
    try {
      // Check if course exists
      const [courses] = await pool.query(
        'SELECT * FROM courses WHERE id = ?',
        [courseId]
      );
      
      if (courses.length === 0) {
        throw createError(404, 'Course not found');
      }
      
      // Check if teacher exists
      const [teachers] = await pool.query(
        'SELECT * FROM users WHERE id = ? AND role = "teacher"',
        [teacherId]
      );
      
      if (teachers.length === 0) {
        throw createError(404, 'Teacher not found');
      }
      
      // Check if already an assistant
      const [assistants] = await pool.query(
        'SELECT * FROM course_assistants WHERE course_id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (assistants.length > 0) {
        throw createError(409, 'Teacher is already an assistant for this course');
      }
      
      // Add assistant
      const [result] = await pool.query(
        'INSERT INTO course_assistants (course_id, teacher_id, role) VALUES (?, ?, ?)',
        [courseId, teacherId, role]
      );
      
      return {
        id: result.insertId,
        courseId,
        teacherId,
        role,
        message: 'Teacher added as course assistant'
      };
    } catch (error) {
      logger.error('Error adding course assistant:', error);
      throw error;
    }
  }
}

module.exports = new CourseService();
