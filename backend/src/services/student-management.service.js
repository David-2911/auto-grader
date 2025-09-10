const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');

/**
 * Student Management Service - Comprehensive student management for teachers
 */
class StudentManagementService {
  
  /**
   * Get all students enrolled in teacher's courses
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Students data with pagination
   */
  async getStudentsByTeacher(teacherId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        page = 1,
        limit = 20,
        search = '',
        courseId,
        status = 'active',
        sortBy = 'last_name',
        sortOrder = 'ASC'
      } = filters;
      
      const offset = (page - 1) * limit;
      
      // Build query conditions
      const conditions = ['c.teacher_id = ?'];
      const params = [teacherId];
      
      if (courseId) {
        conditions.push('e.course_id = ?');
        params.push(courseId);
      }
      
      if (status) {
        conditions.push('e.status = ?');
        params.push(status);
      }
      
      if (search) {
        conditions.push(
          '(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR u.identifier LIKE ?)'
        );
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }
      
      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      
      // Get students with comprehensive data
      const [students] = await connection.query(
        `SELECT DISTINCT
                u.id, u.identifier, u.first_name, u.last_name, u.email,
                u.created_at as registration_date,
                COUNT(DISTINCT e.course_id) as enrolled_courses,
                COUNT(DISTINCT a.id) as total_assignments,
                COUNT(DISTINCT s.id) as submitted_assignments,
                COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
                AVG(s.normalized_grade) as overall_average,
                COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
                MAX(s.submission_time) as last_activity,
                GROUP_CONCAT(DISTINCT c.code ORDER BY c.code) as course_codes
         FROM users u
         JOIN enrollments e ON u.id = e.student_id
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
         LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = u.id
         ${whereClause}
         GROUP BY u.id
         ORDER BY ${sortBy} ${sortOrder}
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      );
      
      // Get total count
      const [countResult] = await connection.query(
        `SELECT COUNT(DISTINCT u.id) as total
         FROM users u
         JOIN enrollments e ON u.id = e.student_id
         JOIN courses c ON e.course_id = c.id
         ${whereClause}`,
        params.slice(0, -2) // Remove limit and offset
      );
      
      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);
      
      return {
        students,
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
      logger.error('Error getting students by teacher:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get detailed student profile and performance
   * @param {Number} studentId - Student ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Student profile with comprehensive data
   */
  async getStudentProfile(studentId, teacherId) {
    const connection = await pool.getConnection();
    
    try {
      // Verify teacher has access to this student
      const [accessCheck] = await connection.query(
        `SELECT DISTINCT u.id 
         FROM users u
         JOIN enrollments e ON u.id = e.student_id
         JOIN courses c ON e.course_id = c.id
         WHERE u.id = ? AND c.teacher_id = ? AND e.status = 'active'`,
        [studentId, teacherId]
      );
      
      if (accessCheck.length === 0) {
        throw createError(404, 'Student not found or access denied');
      }
      
      // Get basic student information
      const [studentInfo] = await connection.query(
        `SELECT u.*, 
                COUNT(DISTINCT e.course_id) as enrolled_courses,
                MIN(e.enrollment_date) as first_enrollment
         FROM users u
         LEFT JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
         WHERE u.id = ?
         GROUP BY u.id`,
        [studentId]
      );
      
      // Get course enrollments with performance
      const [courseEnrollments] = await connection.query(
        `SELECT c.id, c.code, c.title, c.credits,
                e.enrollment_date, e.status,
                COUNT(DISTINCT a.id) as total_assignments,
                COUNT(DISTINCT s.id) as submitted_assignments,
                COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
                AVG(s.normalized_grade) as course_average,
                SUM(s.points_earned) as total_points_earned,
                SUM(a.total_points) as total_possible_points,
                COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
         LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
         WHERE e.student_id = ? AND c.teacher_id = ?
         GROUP BY c.id, e.id
         ORDER BY e.enrollment_date DESC`,
        [studentId, teacherId]
      );
      
      // Get recent submissions
      const [recentSubmissions] = await connection.query(
        `SELECT s.*, a.title as assignment_title, a.total_points,
                c.code as course_code, c.title as course_title
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.student_id = ? AND c.teacher_id = ?
         ORDER BY s.submission_time DESC
         LIMIT 10`,
        [studentId, teacherId]
      );
      
      // Get attendance records
      const [attendanceRecords] = await connection.query(
        `SELECT att.*, c.code as course_code, c.title as course_title
         FROM attendance att
         JOIN courses c ON att.course_id = c.id
         WHERE att.student_id = ? AND c.teacher_id = ?
         ORDER BY att.attendance_date DESC
         LIMIT 20`,
        [studentId, teacherId]
      );
      
      // Get teacher notes about this student
      const [teacherNotes] = await connection.query(
        `SELECT sn.*, c.code as course_code
         FROM student_notes sn
         LEFT JOIN courses c ON sn.course_id = c.id
         WHERE sn.student_id = ? AND sn.teacher_id = ?
         ORDER BY sn.created_at DESC`,
        [studentId, teacherId]
      );
      
      // Get learning analytics
      const [analytics] = await connection.query(
        `SELECT la.*, c.code as course_code
         FROM learning_analytics la
         JOIN courses c ON la.course_id = c.id
         WHERE la.student_id = ? AND c.teacher_id = ?
         ORDER BY la.calculation_date DESC
         LIMIT 50`,
        [studentId, teacherId]
      );
      
      // Calculate overall performance metrics
      const overallMetrics = this.calculateStudentMetrics(courseEnrollments, recentSubmissions);
      
      return {
        student: studentInfo[0],
        courseEnrollments,
        recentSubmissions,
        attendanceRecords,
        teacherNotes,
        analytics,
        metrics: overallMetrics
      };
      
    } catch (error) {
      logger.error('Error getting student profile:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Add or update student note
   * @param {Number} studentId - Student ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created/updated note
   */
  async addStudentNote(studentId, teacherId, noteData) {
    const connection = await pool.getConnection();
    
    try {
      // Verify teacher has access to this student
      const [accessCheck] = await connection.query(
        `SELECT DISTINCT c.id 
         FROM courses c
         JOIN enrollments e ON c.id = e.course_id
         WHERE e.student_id = ? AND c.teacher_id = ? AND e.status = 'active'`,
        [studentId, teacherId]
      );
      
      if (accessCheck.length === 0) {
        throw createError(404, 'Student not found or access denied');
      }
      
      const {
        title,
        content,
        noteType = 'general',
        courseId,
        isPrivate = true
      } = noteData;
      
      // Validate course access if courseId provided
      if (courseId) {
        const [courseCheck] = await connection.query(
          'SELECT id FROM courses WHERE id = ? AND teacher_id = ?',
          [courseId, teacherId]
        );
        
        if (courseCheck.length === 0) {
          throw createError(400, 'Invalid course ID or access denied');
        }
      }
      
      const [result] = await connection.query(
        `INSERT INTO student_notes 
         (student_id, teacher_id, course_id, note_type, title, content, is_private)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [studentId, teacherId, courseId, noteType, title, content, isPrivate]
      );
      
      // Get the created note
      const [createdNote] = await connection.query(
        `SELECT sn.*, c.code as course_code,
                CONCAT(u.first_name, ' ', u.last_name) as student_name
         FROM student_notes sn
         LEFT JOIN courses c ON sn.course_id = c.id
         JOIN users u ON sn.student_id = u.id
         WHERE sn.id = ?`,
        [result.insertId]
      );
      
      logger.info(`Student note added: Student ${studentId} by teacher ${teacherId}`);
      
      return createdNote[0];
      
    } catch (error) {
      logger.error('Error adding student note:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Record attendance for students
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} attendanceData - Attendance data
   * @returns {Promise<Object>} Attendance records
   */
  async recordAttendance(courseId, teacherId, attendanceData) {
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
      
      const { date, attendanceRecords, notes } = attendanceData;
      
      // Delete existing attendance for the date to allow updates
      await connection.query(
        'DELETE FROM attendance WHERE course_id = ? AND attendance_date = ?',
        [courseId, date]
      );
      
      // Insert new attendance records
      const attendanceValues = attendanceRecords.map(record => [
        courseId,
        record.studentId,
        date,
        record.status,
        record.notes || notes,
        teacherId
      ]);
      
      if (attendanceValues.length > 0) {
        await connection.query(
          `INSERT INTO attendance 
           (course_id, student_id, attendance_date, status, notes, recorded_by)
           VALUES ?`,
          [attendanceValues]
        );
      }
      
      await connection.commit();
      
      // Get the recorded attendance with student names
      const [recordedAttendance] = await connection.query(
        `SELECT att.*, 
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.identifier as student_identifier
         FROM attendance att
         JOIN users u ON att.student_id = u.id
         WHERE att.course_id = ? AND att.attendance_date = ?
         ORDER BY u.last_name, u.first_name`,
        [courseId, date]
      );
      
      logger.info(`Attendance recorded for course ${courseId} on ${date} by teacher ${teacherId}`);
      
      return {
        date,
        courseId,
        records: recordedAttendance
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error recording attendance:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get attendance records for a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Attendance data
   */
  async getCourseAttendance(courseId, teacherId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT id, title FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const {
        startDate,
        endDate,
        studentId,
        status
      } = filters;
      
      // Build query conditions
      const conditions = ['att.course_id = ?'];
      const params = [courseId];
      
      if (startDate) {
        conditions.push('att.attendance_date >= ?');
        params.push(startDate);
      }
      
      if (endDate) {
        conditions.push('att.attendance_date <= ?');
        params.push(endDate);
      }
      
      if (studentId) {
        conditions.push('att.student_id = ?');
        params.push(studentId);
      }
      
      if (status) {
        conditions.push('att.status = ?');
        params.push(status);
      }
      
      const whereClause = conditions.join(' AND ');
      
      // Get attendance records
      const [attendanceRecords] = await connection.query(
        `SELECT att.*, 
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.identifier as student_identifier
         FROM attendance att
         JOIN users u ON att.student_id = u.id
         WHERE ${whereClause}
         ORDER BY att.attendance_date DESC, u.last_name, u.first_name`,
        params
      );
      
      // Get attendance summary by student
      const [attendanceSummary] = await connection.query(
        `SELECT att.student_id,
                CONCAT(u.first_name, ' ', u.last_name) as student_name,
                u.identifier,
                COUNT(*) as total_records,
                SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) as present_count,
                SUM(CASE WHEN att.status = 'absent' THEN 1 ELSE 0 END) as absent_count,
                SUM(CASE WHEN att.status = 'late' THEN 1 ELSE 0 END) as late_count,
                SUM(CASE WHEN att.status = 'excused' THEN 1 ELSE 0 END) as excused_count,
                ROUND((SUM(CASE WHEN att.status = 'present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)), 2) as attendance_rate
         FROM attendance att
         JOIN users u ON att.student_id = u.id
         WHERE ${whereClause}
         GROUP BY att.student_id, u.first_name, u.last_name, u.identifier
         ORDER BY u.last_name, u.first_name`,
        params
      );
      
      return {
        course: courseCheck[0],
        records: attendanceRecords,
        summary: attendanceSummary
      };
      
    } catch (error) {
      logger.error('Error getting course attendance:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Bulk enroll students in a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Array} studentData - Array of student data or identifiers
   * @returns {Promise<Object>} Enrollment results
   */
  async bulkEnrollStudents(courseId, teacherId, studentData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT id, max_enrollment FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const course = courseCheck[0];
      
      // Get current enrollment count
      const [currentEnrollment] = await connection.query(
        'SELECT COUNT(*) as count FROM enrollments WHERE course_id = ? AND status = "active"',
        [courseId]
      );
      
      const currentCount = currentEnrollment[0].count;
      const maxEnrollment = course.max_enrollment;
      
      if (maxEnrollment && currentCount + studentData.length > maxEnrollment) {
        throw createError(400, `Enrollment limit exceeded. Current: ${currentCount}, Max: ${maxEnrollment}`);
      }
      
      const enrollmentResults = {
        successful: [],
        failed: [],
        duplicate: []
      };
      
      for (const student of studentData) {
        try {
          let studentId;
          
          // Handle different input formats
          if (typeof student === 'object') {
            // Student object with identifier or email
            const identifier = student.identifier || student.email;
            const [studentRecord] = await connection.query(
              'SELECT id FROM users WHERE (identifier = ? OR email = ?) AND role = "student"',
              [identifier, identifier]
            );
            
            if (studentRecord.length === 0) {
              enrollmentResults.failed.push({
                identifier,
                reason: 'Student not found'
              });
              continue;
            }
            
            studentId = studentRecord[0].id;
          } else {
            // Direct student ID or identifier
            const [studentRecord] = await connection.query(
              'SELECT id FROM users WHERE (id = ? OR identifier = ? OR email = ?) AND role = "student"',
              [student, student, student]
            );
            
            if (studentRecord.length === 0) {
              enrollmentResults.failed.push({
                identifier: student,
                reason: 'Student not found'
              });
              continue;
            }
            
            studentId = studentRecord[0].id;
          }
          
          // Check if already enrolled
          const [existingEnrollment] = await connection.query(
            'SELECT id, status FROM enrollments WHERE course_id = ? AND student_id = ?',
            [courseId, studentId]
          );
          
          if (existingEnrollment.length > 0) {
            if (existingEnrollment[0].status === 'active') {
              enrollmentResults.duplicate.push({
                studentId,
                reason: 'Already enrolled'
              });
              continue;
            } else {
              // Reactivate enrollment
              await connection.query(
                'UPDATE enrollments SET status = "active", enrollment_date = NOW() WHERE course_id = ? AND student_id = ?',
                [courseId, studentId]
              );
              
              enrollmentResults.successful.push({
                studentId,
                action: 'reactivated'
              });
            }
          } else {
            // Create new enrollment
            await connection.query(
              'INSERT INTO enrollments (course_id, student_id, status, enrollment_date) VALUES (?, ?, "active", NOW())',
              [courseId, studentId]
            );
            
            enrollmentResults.successful.push({
              studentId,
              action: 'enrolled'
            });
          }
          
        } catch (studentError) {
          logger.error('Error enrolling individual student:', studentError);
          enrollmentResults.failed.push({
            identifier: typeof student === 'object' ? student.identifier : student,
            reason: studentError.message
          });
        }
      }
      
      await connection.commit();
      
      // Update course statistics
      await this.updateCourseStatistics(courseId);
      
      logger.info(`Bulk enrollment completed for course ${courseId}: ${enrollmentResults.successful.length} successful, ${enrollmentResults.failed.length} failed`);
      
      return enrollmentResults;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error in bulk enrollment:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Calculate student performance metrics
   * @param {Array} courseEnrollments - Course enrollment data
   * @param {Array} recentSubmissions - Recent submission data
   * @returns {Object} Calculated metrics
   */
  calculateStudentMetrics(courseEnrollments, recentSubmissions) {
    const metrics = {
      overallGPA: 0,
      completionRate: 0,
      onTimeSubmissionRate: 0,
      improvementTrend: 'stable',
      lastActivityDays: 0,
      strongSubjects: [],
      needsAttention: []
    };
    
    if (courseEnrollments.length === 0) return metrics;
    
    // Calculate overall GPA
    const validGrades = courseEnrollments.filter(course => course.course_average !== null);
    if (validGrades.length > 0) {
      metrics.overallGPA = validGrades.reduce((sum, course) => sum + course.course_average, 0) / validGrades.length;
    }
    
    // Calculate completion rate
    const totalAssignments = courseEnrollments.reduce((sum, course) => sum + course.total_assignments, 0);
    const submittedAssignments = courseEnrollments.reduce((sum, course) => sum + course.submitted_assignments, 0);
    metrics.completionRate = totalAssignments > 0 ? (submittedAssignments / totalAssignments) * 100 : 0;
    
    // Calculate on-time submission rate
    const totalSubmissions = courseEnrollments.reduce((sum, course) => sum + course.submitted_assignments, 0);
    const lateSubmissions = courseEnrollments.reduce((sum, course) => sum + course.late_submissions, 0);
    metrics.onTimeSubmissionRate = totalSubmissions > 0 ? ((totalSubmissions - lateSubmissions) / totalSubmissions) * 100 : 100;
    
    // Identify strong subjects and areas needing attention
    courseEnrollments.forEach(course => {
      if (course.course_average !== null) {
        if (course.course_average >= 85) {
          metrics.strongSubjects.push(course.code);
        } else if (course.course_average < 70) {
          metrics.needsAttention.push(course.code);
        }
      }
    });
    
    // Calculate days since last activity
    if (recentSubmissions.length > 0) {
      const lastSubmission = new Date(recentSubmissions[0].submission_time);
      const now = new Date();
      metrics.lastActivityDays = Math.floor((now - lastSubmission) / (1000 * 60 * 60 * 24));
    }
    
    return metrics;
  }
  
  /**
   * Update course statistics
   * @param {Number} courseId - Course ID
   * @returns {Promise<void>}
   */
  async updateCourseStatistics(courseId) {
    try {
      await pool.query('CALL UpdateCourseStatistics(?)', [courseId]);
    } catch (error) {
      logger.error('Error updating course statistics:', error);
      // Don't throw error as this is a background operation
    }
  }
}

module.exports = new StudentManagementService();
