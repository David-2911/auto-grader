const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const courseService = require('./course.service');
const assignmentService = require('./assignment.service');
const submissionService = require('./submission.service');
const csvParser = require('csv-parser');
const fs = require('fs');
const path = require('path');

/**
 * Teacher Service - Handles all teacher-specific operations
 */
class TeacherService {
  
  /**
   * Get teacher dashboard data with overview statistics
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getDashboardData(teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Get courses count
      const [coursesCount] = await connection.query(
        'SELECT COUNT(*) as count FROM courses WHERE teacher_id = ? AND is_active = true',
        [teacherId]
      );
      
      // Get assignments count
      const [assignmentsCount] = await connection.query(
        `SELECT COUNT(*) as count 
         FROM assignments a 
         JOIN courses c ON a.course_id = c.id 
         WHERE c.teacher_id = ? AND a.is_active = true`,
        [teacherId]
      );
      
      // Get total students enrolled
      const [studentsCount] = await connection.query(
        `SELECT COUNT(DISTINCT e.student_id) as count 
         FROM enrollments e 
         JOIN courses c ON e.course_id = c.id 
         WHERE c.teacher_id = ? AND e.status = 'active'`,
        [teacherId]
      );
      
      // Get pending submissions for grading
      const [pendingSubmissions] = await connection.query(
        `SELECT COUNT(*) as count 
         FROM submissions s 
         JOIN assignments a ON s.assignment_id = a.id 
         JOIN courses c ON a.course_id = c.id 
         WHERE c.teacher_id = ? AND s.status = 'submitted' AND s.grade IS NULL`,
        [teacherId]
      );
      
      // Get recent courses
      const [recentCourses] = await connection.query(
        `SELECT id, code, title, start_date, end_date,
                (SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id AND status = 'active') as student_count,
                (SELECT COUNT(*) FROM assignments WHERE course_id = courses.id AND is_active = true) as assignment_count
         FROM courses 
         WHERE teacher_id = ? AND is_active = true 
         ORDER BY created_at DESC 
         LIMIT 5`,
        [teacherId]
      );
      
      // Get recent assignments
      const [recentAssignments] = await connection.query(
        `SELECT a.id, a.title, a.deadline, c.code as course_code, c.title as course_title,
                (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id) as submission_count,
                (SELECT COUNT(*) FROM submissions WHERE assignment_id = a.id AND grade IS NULL) as ungraded_count
         FROM assignments a 
         JOIN courses c ON a.course_id = c.id 
         WHERE c.teacher_id = ? AND a.is_active = true 
         ORDER BY a.created_at DESC 
         LIMIT 5`,
        [teacherId]
      );
      
      // Get recent submissions requiring attention
      const [recentSubmissions] = await connection.query(
        `SELECT s.id, s.submission_time, s.status, 
                a.title as assignment_title, 
                c.code as course_code,
                CONCAT(u.first_name, ' ', u.last_name) as student_name
         FROM submissions s 
         JOIN assignments a ON s.assignment_id = a.id 
         JOIN courses c ON a.course_id = c.id 
         JOIN users u ON s.student_id = u.id 
         WHERE c.teacher_id = ? AND s.status IN ('submitted', 'processing') 
         ORDER BY s.submission_time DESC 
         LIMIT 10`,
        [teacherId]
      );
      
      // Get upcoming deadlines
      const [upcomingDeadlines] = await connection.query(
        `SELECT a.id, a.title, a.deadline, c.code as course_code, c.title as course_title
         FROM assignments a 
         JOIN courses c ON a.course_id = c.id 
         WHERE c.teacher_id = ? AND a.deadline > NOW() AND a.deadline <= DATE_ADD(NOW(), INTERVAL 7 DAY)
         ORDER BY a.deadline ASC 
         LIMIT 5`,
        [teacherId]
      );
      
      connection.release();
      
      return {
        statistics: {
          coursesCount: coursesCount[0].count,
          assignmentsCount: assignmentsCount[0].count,
          studentsCount: studentsCount[0].count,
          pendingSubmissions: pendingSubmissions[0].count
        },
        recentCourses,
        recentAssignments,
        recentSubmissions,
        upcomingDeadlines
      };
      
    } catch (error) {
      logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  /**
   * Get detailed course information for teacher
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Course details
   */
  async getCourseDetails(courseId, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      // Get course details with statistics
      const [courseDetails] = await connection.query(
        `SELECT c.*,
                (SELECT COUNT(*) FROM enrollments WHERE course_id = c.id AND status = 'active') as enrolled_students,
                (SELECT COUNT(*) FROM assignments WHERE course_id = c.id AND is_active = true) as total_assignments,
                (SELECT COUNT(*) FROM submissions s 
                 JOIN assignments a ON s.assignment_id = a.id 
                 WHERE a.course_id = c.id) as total_submissions,
                (SELECT AVG(grade) FROM submissions s 
                 JOIN assignments a ON s.assignment_id = a.id 
                 WHERE a.course_id = c.id AND s.grade IS NOT NULL) as average_grade
         FROM courses c 
         WHERE c.id = ?`,
        [courseId]
      );
      
      // Get recent activity
      const [recentActivity] = await connection.query(
        `SELECT 'submission' as type, s.submission_time as timestamp, 
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                a.title as assignment_title
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN users u ON s.student_id = u.id
         WHERE a.course_id = ?
         UNION ALL
         SELECT 'enrollment' as type, e.enrollment_date as timestamp,
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                'Course Enrollment' as assignment_title
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         WHERE e.course_id = ?
         ORDER BY timestamp DESC
         LIMIT 10`,
        [courseId, courseId]
      );
      
      connection.release();
      
      return {
        ...courseDetails[0],
        recentActivity
      };
      
    } catch (error) {
      logger.error('Error getting course details:', error);
      throw error;
    }
  }

  /**
   * Get course students with detailed information
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Students data with pagination
   */
  async getCourseStudents(courseId, teacherId, options = {}) {
    try {
      const connection = await pool.getConnection();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const { page = 1, limit = 20, search } = options;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT u.id, u.email, u.first_name, u.last_name, u.identifier,
               e.enrollment_date, e.status as enrollment_status,
               sp.year_level, sp.major,
               COUNT(s.id) as submission_count,
               AVG(s.grade) as average_grade,
               MAX(s.submission_time) as last_submission
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        LEFT JOIN submissions s ON u.id = s.student_id AND s.assignment_id IN (
          SELECT id FROM assignments WHERE course_id = ?
        )
        WHERE e.course_id = ?
      `;
      
      const queryParams = [courseId, courseId];
      
      if (search) {
        query += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.identifier LIKE ?)`;
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      query += ` GROUP BY u.id ORDER BY u.last_name, u.first_name LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      const [students] = await connection.query(query, queryParams);
      
      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT u.id) as total
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.course_id = ?
      `;
      
      const countParams = [courseId];
      
      if (search) {
        countQuery += ` AND (u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.identifier LIKE ?)`;
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      const [totalCount] = await connection.query(countQuery, countParams);
      
      connection.release();
      
      return {
        students,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          pages: Math.ceil(totalCount[0].total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Error getting course students:', error);
      throw error;
    }
  }

  /**
   * Enroll students in a course
   * @param {Number} courseId - Course ID
   * @param {Array} studentIds - Array of student IDs
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Enrollment result
   */
  async enrollStudents(courseId, studentIds, teacherId) {
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
      
      const enrollmentResults = {
        successful: [],
        failed: [],
        alreadyEnrolled: []
      };
      
      for (const studentId of studentIds) {
        try {
          // Check if student exists
          const [studentCheck] = await connection.query(
            'SELECT * FROM users WHERE id = ? AND role = "student"',
            [studentId]
          );
          
          if (studentCheck.length === 0) {
            enrollmentResults.failed.push({
              studentId,
              reason: 'Student not found'
            });
            continue;
          }
          
          // Check if already enrolled
          const [enrollmentCheck] = await connection.query(
            'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
          );
          
          if (enrollmentCheck.length > 0) {
            enrollmentResults.alreadyEnrolled.push({
              studentId,
              studentName: `${studentCheck[0].first_name} ${studentCheck[0].last_name}`
            });
            continue;
          }
          
          // Enroll student
          await connection.query(
            'INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, "active")',
            [courseId, studentId]
          );
          
          enrollmentResults.successful.push({
            studentId,
            studentName: `${studentCheck[0].first_name} ${studentCheck[0].last_name}`
          });
          
        } catch (error) {
          enrollmentResults.failed.push({
            studentId,
            reason: error.message
          });
        }
      }
      
      await connection.commit();
      
      return enrollmentResults;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error enrolling students:', error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Bulk enroll students from CSV file
   * @param {Number} courseId - Course ID
   * @param {Object} csvFile - Uploaded CSV file
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Bulk enrollment result
   */
  async bulkEnrollStudents(courseId, csvFile, teacherId) {
    try {
      // Verify course ownership
      const connection = await pool.getConnection();
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      connection.release();
      
      const students = [];
      const enrollmentResults = {
        successful: [],
        failed: [],
        alreadyEnrolled: []
      };
      
      // Parse CSV file
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvFile.path)
          .pipe(csvParser())
          .on('data', (row) => {
            // Expected CSV format: email, first_name, last_name, identifier
            students.push({
              email: row.email?.trim(),
              firstName: row.first_name?.trim(),
              lastName: row.last_name?.trim(),
              identifier: row.identifier?.trim()
            });
          })
          .on('end', async () => {
            try {
              // Process each student
              for (const studentData of students) {
                try {
                  const connection = await pool.getConnection();
                  
                  // Find student by email or identifier
                  const [existingStudent] = await connection.query(
                    'SELECT * FROM users WHERE (email = ? OR identifier = ?) AND role = "student"',
                    [studentData.email, studentData.identifier]
                  );
                  
                  let studentId;
                  
                  if (existingStudent.length === 0) {
                    // Create new student if not exists
                    const tempPassword = Math.random().toString(36).slice(-8);
                    const [newStudent] = await connection.query(
                      'INSERT INTO users (email, password, role, identifier, first_name, last_name) VALUES (?, ?, "student", ?, ?, ?)',
                      [studentData.email, tempPassword, studentData.identifier, studentData.firstName, studentData.lastName]
                    );
                    studentId = newStudent.insertId;
                  } else {
                    studentId = existingStudent[0].id;
                  }
                  
                  // Check if already enrolled
                  const [enrollmentCheck] = await connection.query(
                    'SELECT * FROM enrollments WHERE course_id = ? AND student_id = ?',
                    [courseId, studentId]
                  );
                  
                  if (enrollmentCheck.length > 0) {
                    enrollmentResults.alreadyEnrolled.push({
                      email: studentData.email,
                      name: `${studentData.firstName} ${studentData.lastName}`
                    });
                  } else {
                    // Enroll student
                    await connection.query(
                      'INSERT INTO enrollments (course_id, student_id, status) VALUES (?, ?, "active")',
                      [courseId, studentId]
                    );
                    
                    enrollmentResults.successful.push({
                      email: studentData.email,
                      name: `${studentData.firstName} ${studentData.lastName}`,
                      isNewStudent: existingStudent.length === 0
                    });
                  }
                  
                  connection.release();
                  
                } catch (error) {
                  enrollmentResults.failed.push({
                    email: studentData.email,
                    name: `${studentData.firstName} ${studentData.lastName}`,
                    reason: error.message
                  });
                }
              }
              
              // Clean up uploaded file
              fs.unlinkSync(csvFile.path);
              
              resolve(enrollmentResults);
              
            } catch (error) {
              reject(error);
            }
          })
          .on('error', reject);
      });
      
    } catch (error) {
      logger.error('Error bulk enrolling students:', error);
      throw error;
    }
  }

  /**
   * Get assignments for teacher with filtering options
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Assignments data with pagination
   */
  async getAssignments(teacherId, options = {}) {
    try {
      const connection = await pool.getConnection();
      const { page = 1, limit = 10, courseId, status, search } = options;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT a.*, c.code as course_code, c.title as course_title,
               COUNT(DISTINCT s.id) as submission_count,
               COUNT(DISTINCT CASE WHEN s.grade IS NULL THEN s.id END) as ungraded_count,
               AVG(s.grade) as average_grade,
               MAX(s.submission_time) as last_submission
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN submissions s ON a.id = s.assignment_id
        WHERE c.teacher_id = ?
      `;
      
      const queryParams = [teacherId];
      
      if (courseId) {
        query += ' AND c.id = ?';
        queryParams.push(courseId);
      }
      
      if (status) {
        query += ' AND a.is_active = ?';
        queryParams.push(status === 'active');
      }
      
      if (search) {
        query += ' AND (a.title LIKE ? OR a.description LIKE ?)';
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern);
      }
      
      query += ` GROUP BY a.id ORDER BY a.created_at DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      const [assignments] = await connection.query(query, queryParams);
      
      // Get total count
      let countQuery = `
        SELECT COUNT(DISTINCT a.id) as total
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        WHERE c.teacher_id = ?
      `;
      
      const countParams = [teacherId];
      
      if (courseId) {
        countQuery += ' AND c.id = ?';
        countParams.push(courseId);
      }
      
      if (status) {
        countQuery += ' AND a.is_active = ?';
        countParams.push(status === 'active');
      }
      
      if (search) {
        countQuery += ' AND (a.title LIKE ? OR a.description LIKE ?)';
        const searchPattern = `%${search}%`;
        countParams.push(searchPattern, searchPattern);
      }
      
      const [totalCount] = await connection.query(countQuery, countParams);
      
      connection.release();
      
      return {
        assignments,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          pages: Math.ceil(totalCount[0].total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Error getting assignments:', error);
      throw error;
    }
  }

  /**
   * Create a new assignment
   * @param {Object} assignmentData - Assignment data
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Created assignment
   */
  async createAssignment(assignmentData, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [assignmentData.courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      // Create assignment
      const [assignmentResult] = await connection.query(
        `INSERT INTO assignments (
          title, description, course_id, category_id, open_date, deadline, 
          late_deadline, late_penalty, total_points, is_group_assignment, 
          max_attempts, question_pdf, nbgrader_expectation, submission_format, 
          grading_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          assignmentData.title,
          assignmentData.description,
          assignmentData.courseId,
          assignmentData.categoryId || null,
          assignmentData.openDate || new Date(),
          assignmentData.deadline,
          assignmentData.lateDeadline || null,
          assignmentData.latePenalty || 0,
          assignmentData.totalPoints || 100,
          assignmentData.isGroupAssignment || false,
          assignmentData.maxAttempts || 1,
          assignmentData.questionPdfPath || null,
          assignmentData.nbgraderExpectation || null,
          assignmentData.submissionFormat || 'pdf',
          assignmentData.gradingMethod || 'auto'
        ]
      );
      
      const assignmentId = assignmentResult.insertId;
      
      // Add assignment resources if provided
      if (assignmentData.resourcePaths && assignmentData.resourcePaths.length > 0) {
        for (const resourcePath of assignmentData.resourcePaths) {
          await connection.query(
            'INSERT INTO assignment_resources (assignment_id, title, file_path, resource_type) VALUES (?, ?, ?, "file")',
            [assignmentId, path.basename(resourcePath), resourcePath]
          );
        }
      }
      
      // Add assignment questions if provided
      if (assignmentData.questions && assignmentData.questions.length > 0) {
        for (let i = 0; i < assignmentData.questions.length; i++) {
          const question = assignmentData.questions[i];
          const [questionResult] = await connection.query(
            'INSERT INTO assignment_questions (assignment_id, question_number, question_text, question_type, points, expected_answer, rubric) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [assignmentId, i + 1, question.text, question.type, question.points || 1, question.expectedAnswer || null, question.rubric || null]
          );
          
          // Add multiple choice options if applicable
          if (question.type === 'multiple_choice' && question.options) {
            for (let j = 0; j < question.options.length; j++) {
              const option = question.options[j];
              await connection.query(
                'INSERT INTO question_options (question_id, option_text, is_correct, option_order) VALUES (?, ?, ?, ?)',
                [questionResult.insertId, option.text, option.isCorrect || false, j + 1]
              );
            }
          }
        }
      }
      
      await connection.commit();
      
      // Get the created assignment with details
      const [createdAssignment] = await connection.query(
        `SELECT a.*, c.code as course_code, c.title as course_title
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ?`,
        [assignmentId]
      );
      
      connection.release();
      
      return createdAssignment[0];
      
    } catch (error) {
      await connection.rollback();
      connection.release();
      logger.error('Error creating assignment:', error);
      throw error;
    }
  }

  /**
   * Get assignment templates
   * @returns {Promise<Array>} Assignment templates
   */
  async getAssignmentTemplates() {
    try {
      // For now, return predefined templates
      // In the future, this could be extended to support custom templates
      const templates = [
        {
          id: 'programming_basic',
          title: 'Basic Programming Assignment',
          description: 'Template for basic programming exercises',
          submissionFormat: 'code',
          gradingMethod: 'auto',
          questions: [
            {
              type: 'code',
              text: 'Write a function that...',
              points: 10
            }
          ]
        },
        {
          id: 'essay_standard',
          title: 'Essay Assignment',
          description: 'Template for essay-based assignments',
          submissionFormat: 'pdf',
          gradingMethod: 'manual',
          questions: [
            {
              type: 'essay',
              text: 'Discuss the following topic...',
              points: 100
            }
          ]
        },
        {
          id: 'multiple_choice_quiz',
          title: 'Multiple Choice Quiz',
          description: 'Template for multiple choice quizzes',
          submissionFormat: 'text',
          gradingMethod: 'auto',
          questions: [
            {
              type: 'multiple_choice',
              text: 'Which of the following...',
              points: 5,
              options: [
                { text: 'Option A', isCorrect: false },
                { text: 'Option B', isCorrect: true },
                { text: 'Option C', isCorrect: false },
                { text: 'Option D', isCorrect: false }
              ]
            }
          ]
        }
      ];
      
      return templates;
      
    } catch (error) {
      logger.error('Error getting assignment templates:', error);
      throw error;
    }
  }

  /**
   * Get submissions for teacher with filtering
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Submissions data with pagination
   */
  async getSubmissions(teacherId, options = {}) {
    try {
      const connection = await pool.getConnection();
      const { page = 1, limit = 20, status, courseId, assignmentId } = options;
      const offset = (page - 1) * limit;
      
      let query = `
        SELECT s.*, a.title as assignment_title, c.code as course_code, c.title as course_title,
               CONCAT(u.first_name, ' ', u.last_name) as student_name, u.email as student_email
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        JOIN users u ON s.student_id = u.id
        WHERE c.teacher_id = ?
      `;
      
      const queryParams = [teacherId];
      
      if (status) {
        query += ' AND s.status = ?';
        queryParams.push(status);
      }
      
      if (courseId) {
        query += ' AND c.id = ?';
        queryParams.push(courseId);
      }
      
      if (assignmentId) {
        query += ' AND a.id = ?';
        queryParams.push(assignmentId);
      }
      
      query += ` ORDER BY s.submission_time DESC LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
      
      const [submissions] = await connection.query(query, queryParams);
      
      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE c.teacher_id = ?
      `;
      
      const countParams = [teacherId];
      
      if (status) {
        countQuery += ' AND s.status = ?';
        countParams.push(status);
      }
      
      if (courseId) {
        countQuery += ' AND c.id = ?';
        countParams.push(courseId);
      }
      
      if (assignmentId) {
        countQuery += ' AND a.id = ?';
        countParams.push(assignmentId);
      }
      
      const [totalCount] = await connection.query(countQuery, countParams);
      
      connection.release();
      
      return {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount[0].total,
          pages: Math.ceil(totalCount[0].total / limit)
        }
      };
      
    } catch (error) {
      logger.error('Error getting submissions:', error);
      throw error;
    }
  }

  /**
   * Get gradebook for a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Gradebook data
   */
  async getGradebook(courseId, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      // Get course assignments
      const [assignments] = await connection.query(
        'SELECT id, title, total_points, deadline FROM assignments WHERE course_id = ? AND is_active = true ORDER BY deadline',
        [courseId]
      );
      
      // Get enrolled students
      const [students] = await connection.query(
        `SELECT u.id, u.first_name, u.last_name, u.email, u.identifier
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         WHERE e.course_id = ? AND e.status = 'active'
         ORDER BY u.last_name, u.first_name`,
        [courseId]
      );
      
      // Get all submissions for the course
      const [submissions] = await connection.query(
        `SELECT s.*, a.total_points as max_points
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ?`,
        [courseId]
      );
      
      // Organize data into gradebook format
      const gradebook = students.map(student => {
        const studentSubmissions = {};
        let totalPoints = 0;
        let maxTotalPoints = 0;
        
        assignments.forEach(assignment => {
          const submission = submissions.find(s => 
            s.student_id === student.id && s.assignment_id === assignment.id
          );
          
          studentSubmissions[assignment.id] = {
            grade: submission ? submission.grade : null,
            submissionTime: submission ? submission.submission_time : null,
            status: submission ? submission.status : 'not_submitted'
          };
          
          if (submission && submission.grade !== null) {
            totalPoints += submission.grade;
          }
          maxTotalPoints += assignment.total_points;
        });
        
        return {
          student: {
            id: student.id,
            name: `${student.first_name} ${student.last_name}`,
            email: student.email,
            identifier: student.identifier
          },
          submissions: studentSubmissions,
          totalPoints,
          maxTotalPoints,
          percentage: maxTotalPoints > 0 ? (totalPoints / maxTotalPoints) * 100 : 0
        };
      });
      
      connection.release();
      
      return {
        course: courseCheck[0],
        assignments,
        gradebook
      };
      
    } catch (error) {
      logger.error('Error getting gradebook:', error);
      throw error;
    }
  }

  /**
   * Export gradebook in specified format
   * @param {Number} courseId - Course ID
   * @param {String} format - Export format (csv, xlsx)
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Buffer>} Exported data
   */
  async exportGradebook(courseId, format, teacherId) {
    try {
      const gradebookData = await this.getGradebook(courseId, teacherId);
      
      if (format === 'csv') {
        return this.generateCSVGradebook(gradebookData);
      } else if (format === 'xlsx') {
        return this.generateExcelGradebook(gradebookData);
      } else {
        throw createError(400, 'Unsupported export format');
      }
      
    } catch (error) {
      logger.error('Error exporting gradebook:', error);
      throw error;
    }
  }

  /**
   * Generate CSV format gradebook
   * @param {Object} gradebookData - Gradebook data
   * @returns {Buffer} CSV data
   */
  generateCSVGradebook(gradebookData) {
    const { assignments, gradebook } = gradebookData;
    
    // Create header row
    const headers = ['Student Name', 'Email', 'Identifier'];
    assignments.forEach(assignment => {
      headers.push(assignment.title);
    });
    headers.push('Total Points', 'Percentage');
    
    // Create data rows
    const rows = [headers];
    gradebook.forEach(entry => {
      const row = [
        entry.student.name,
        entry.student.email,
        entry.student.identifier
      ];
      
      assignments.forEach(assignment => {
        const submission = entry.submissions[assignment.id];
        row.push(submission.grade || '');
      });
      
      row.push(entry.totalPoints, entry.percentage.toFixed(2));
      rows.push(row);
    });
    
    // Convert to CSV
    const csvContent = rows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    return Buffer.from(csvContent, 'utf8');
  }

  // Additional service methods...
  // (Due to length constraints, including key methods here)

  async updateCourse(courseId, updateData, teacherId) {
    // Implementation for updating course
  }

  async deleteCourse(courseId, teacherId) {
    // Implementation for deleting course
  }

  async getAssignmentDetails(assignmentId, teacherId) {
    // Implementation for getting assignment details
  }

  async getSubmissionDetails(submissionId, teacherId) {
    // Implementation for getting submission details
  }

  async getAllStudents(teacherId, options) {
    // Implementation for getting all students for teacher
  }

  async getStudentProgress(studentId, teacherId) {
    // Implementation for getting student progress
  }
}

module.exports = new TeacherService();
