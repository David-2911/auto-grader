const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');
const moment = require('moment');

/**
 * Student Portal Service - Comprehensive student portal functionality
 * Provides students with access to assignments, submissions, grades, and academic progress
 */
class StudentPortalService {

  /**
   * Get student dashboard overview with current assignments, grades, and progress
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Dashboard data
   */
  async getStudentDashboard(studentId) {
    const connection = await pool.getConnection();
    
    try {
      // Get enrolled courses with recent activity
      const [courses] = await connection.query(`
        SELECT 
          c.id, c.code, c.title, c.semester, c.academic_year,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as submitted_assignments,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
          AVG(s.normalized_grade) as course_average,
          MAX(s.submission_time) as last_activity,
          e.enrollment_date
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users t ON c.teacher_id = t.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? AND e.status = 'active'
        GROUP BY c.id
        ORDER BY c.title
      `, [studentId, studentId]);

      // Get upcoming assignments (next 7 days)
      const [upcomingAssignments] = await connection.query(`
        SELECT 
          a.id, a.title, a.description, a.deadline, a.total_points,
          c.code as course_code, c.title as course_title,
          CASE WHEN s.id IS NOT NULL THEN true ELSE false END as is_submitted,
          s.status as submission_status,
          s.grade,
          TIMESTAMPDIFF(HOUR, NOW(), a.deadline) as hours_until_deadline
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? 
          AND a.is_active = true
          AND a.deadline > NOW()
          AND a.deadline <= DATE_ADD(NOW(), INTERVAL 7 DAY)
          AND e.status = 'active'
        ORDER BY a.deadline ASC
        LIMIT 10
      `, [studentId, studentId]);

      // Get recent grades (last 10)
      const [recentGrades] = await connection.query(`
        SELECT 
          a.title as assignment_title,
          c.code as course_code,
          c.title as course_title,
          s.grade,
          s.normalized_grade,
          a.total_points,
          s.graded_at,
          s.is_auto_graded
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.student_id = ? 
          AND s.grade IS NOT NULL
        ORDER BY s.graded_at DESC
        LIMIT 10
      `, [studentId]);

      // Get overall academic progress
      const [academicProgress] = await connection.query(`
        SELECT 
          COUNT(DISTINCT e.course_id) as total_courses,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as total_submissions,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
          AVG(s.normalized_grade) as overall_gpa,
          COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
          COUNT(CASE WHEN s.submission_time <= a.deadline THEN 1 END) as on_time_submissions
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? AND e.status = 'active'
      `, [studentId, studentId]);

      // Get notification count
      const [notificationCount] = await connection.query(`
        SELECT COUNT(*) as unread_count
        FROM notifications n
        WHERE n.user_id = ? AND n.is_read = false
      `, [studentId]);

      return {
        courses,
        upcomingAssignments,
        recentGrades,
        academicProgress: academicProgress[0],
        unreadNotifications: notificationCount[0]?.unread_count || 0,
        lastUpdated: new Date()
      };

    } catch (error) {
      logger.error('Error getting student dashboard:', error);
      throw createError(500, 'Failed to load dashboard');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's enrolled courses with detailed information
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Courses data
   */
  async getStudentCourses(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        semester,
        academicYear,
        status = 'active',
        includeCompleted = false
      } = filters;

      const conditions = ['e.student_id = ?'];
      const params = [studentId];

      if (semester) {
        conditions.push('c.semester = ?');
        params.push(semester);
      }

      if (academicYear) {
        conditions.push('c.academic_year = ?');
        params.push(academicYear);
      }

      if (!includeCompleted) {
        conditions.push('e.status = ?');
        params.push(status);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [courses] = await connection.query(`
        SELECT 
          c.id, c.code, c.title, c.description, c.credits,
          c.semester, c.academic_year, c.start_date, c.end_date,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name,
          t.email as teacher_email,
          tp.department as teacher_department, tp.office_location, tp.office_hours,
          e.enrollment_date, e.status as enrollment_status, e.final_grade,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as submitted_assignments,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
          AVG(s.normalized_grade) as course_average,
          COUNT(DISTINCT CASE WHEN a.deadline > NOW() THEN a.id END) as upcoming_assignments,
          MAX(s.submission_time) as last_activity
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users t ON c.teacher_id = t.id
        LEFT JOIN teacher_profiles tp ON t.id = tp.user_id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        ${whereClause}
        GROUP BY c.id, e.id
        ORDER BY c.semester DESC, c.academic_year DESC, c.title
      `, [...params, studentId]);

      // Get course performance trends for each course
      for (let course of courses) {
        const [performanceTrend] = await connection.query(`
          SELECT 
            a.title,
            s.normalized_grade,
            s.graded_at,
            a.deadline
          FROM submissions s
          JOIN assignments a ON s.assignment_id = a.id
          WHERE a.course_id = ? AND s.student_id = ? AND s.grade IS NOT NULL
          ORDER BY a.deadline ASC
        `, [course.id, studentId]);

        course.performanceTrend = performanceTrend;
      }

      return {
        courses,
        totalCourses: courses.length
      };

    } catch (error) {
      logger.error('Error getting student courses:', error);
      throw createError(500, 'Failed to load courses');
    } finally {
      connection.release();
    }
  }

  /**
   * Get assignments for a student with filtering options
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Assignments data
   */
  async getStudentAssignments(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        courseId,
        status, // 'upcoming', 'submitted', 'graded', 'overdue'
        page = 1,
        limit = 20,
        sortBy = 'deadline',
        sortOrder = 'ASC'
      } = filters;

      const offset = (page - 1) * limit;
      const conditions = [];
      const params = [studentId];

      // Base condition for student enrollment
      conditions.push(`
        EXISTS (
          SELECT 1 FROM enrollments e 
          WHERE e.course_id = a.course_id 
            AND e.student_id = ? 
            AND e.status = 'active'
        )
      `);

      if (courseId) {
        conditions.push('a.course_id = ?');
        params.push(courseId);
      }

      // Status-based filtering
      if (status) {
        switch (status) {
          case 'upcoming':
            conditions.push('a.deadline > NOW() AND s.id IS NULL');
            break;
          case 'submitted':
            conditions.push('s.id IS NOT NULL AND s.grade IS NULL');
            break;
          case 'graded':
            conditions.push('s.grade IS NOT NULL');
            break;
          case 'overdue':
            conditions.push('a.deadline < NOW() AND s.id IS NULL');
            break;
        }
      }

      conditions.push('a.is_active = true');
      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [assignments] = await connection.query(`
        SELECT 
          a.id, a.title, a.description, a.open_date, a.deadline, 
          a.late_deadline, a.late_penalty, a.total_points,
          a.is_group_assignment, a.max_attempts, a.submission_format,
          c.id as course_id, c.code as course_code, c.title as course_title,
          ac.name as category_name, ac.weight as category_weight,
          s.id as submission_id, s.status as submission_status,
          s.grade, s.normalized_grade, s.submission_time, s.is_late,
          s.submission_number, s.graded_at, s.is_auto_graded,
          CASE 
            WHEN s.id IS NULL AND a.deadline < NOW() THEN 'overdue'
            WHEN s.id IS NULL AND a.deadline > NOW() THEN 'pending'
            WHEN s.grade IS NOT NULL THEN 'graded'
            WHEN s.id IS NOT NULL THEN 'submitted'
            ELSE 'pending'
          END as assignment_status,
          TIMESTAMPDIFF(HOUR, NOW(), a.deadline) as hours_until_deadline,
          COUNT(ar.id) as resource_count
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_categories ac ON a.category_id = ac.id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        LEFT JOIN assignment_resources ar ON a.id = ar.assignment_id
        ${whereClause}
        GROUP BY a.id, s.id
        ORDER BY ${sortBy} ${sortOrder}
        LIMIT ? OFFSET ?
      `, [...params, studentId, limit, offset]);

      // Get total count
      const [countResult] = await connection.query(`
        SELECT COUNT(DISTINCT a.id) as total
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        ${whereClause}
      `, [...params, studentId]);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get assignment statistics
      const [stats] = await connection.query(`
        SELECT 
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN a.id END) as submitted_count,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN a.id END) as graded_count,
          COUNT(DISTINCT CASE WHEN a.deadline < NOW() AND s.id IS NULL THEN a.id END) as overdue_count,
          COUNT(DISTINCT CASE WHEN a.deadline > NOW() AND s.id IS NULL THEN a.id END) as upcoming_count,
          AVG(s.normalized_grade) as average_grade
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE EXISTS (
          SELECT 1 FROM enrollments e 
          WHERE e.course_id = a.course_id 
            AND e.student_id = ? 
            AND e.status = 'active'
        ) AND a.is_active = true
      `, [studentId, studentId]);

      return {
        assignments,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        statistics: stats[0]
      };

    } catch (error) {
      logger.error('Error getting student assignments:', error);
      throw createError(500, 'Failed to load assignments');
    } finally {
      connection.release();
    }
  }

  /**
   * Get detailed assignment information including questions and resources
   * @param {Number} studentId - Student ID
   * @param {Number} assignmentId - Assignment ID
   * @returns {Promise<Object>} Assignment details
   */
  async getAssignmentDetails(studentId, assignmentId) {
    const connection = await pool.getConnection();
    
    try {
      // Check if student is enrolled in the course
      const [enrollmentCheck] = await connection.query(`
        SELECT e.id 
        FROM enrollments e
        JOIN assignments a ON e.course_id = a.course_id
        WHERE e.student_id = ? AND a.id = ? AND e.status = 'active'
      `, [studentId, assignmentId]);

      if (enrollmentCheck.length === 0) {
        throw createError(403, 'Access denied to this assignment');
      }

      // Get assignment details
      const [assignment] = await connection.query(`
        SELECT 
          a.id, a.title, a.description, a.open_date, a.deadline, 
          a.late_deadline, a.late_penalty, a.total_points,
          a.is_group_assignment, a.max_attempts, a.submission_format,
          a.grading_method, a.question_pdf,
          c.id as course_id, c.code as course_code, c.title as course_title,
          ac.name as category_name, ac.weight as category_weight,
          s.id as submission_id, s.status as submission_status,
          s.grade, s.normalized_grade, s.submission_time, s.is_late,
          s.submission_number, s.graded_at, s.is_auto_graded,
          s.submission_pdf, s.submission_text, s.submission_code,
          s.error_message,
          CASE 
            WHEN s.id IS NULL AND a.deadline < NOW() THEN 'overdue'
            WHEN s.id IS NULL AND a.deadline > NOW() THEN 'pending'
            WHEN s.grade IS NOT NULL THEN 'graded'
            WHEN s.id IS NOT NULL THEN 'submitted'
            ELSE 'pending'
          END as assignment_status,
          TIMESTAMPDIFF(HOUR, NOW(), a.deadline) as hours_until_deadline
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_categories ac ON a.category_id = ac.id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE a.id = ?
      `, [studentId, assignmentId]);

      if (assignment.length === 0) {
        throw createError(404, 'Assignment not found');
      }

      const assignmentData = assignment[0];

      // Get assignment questions
      const [questions] = await connection.query(`
        SELECT 
          q.id, q.question_number, q.question_text, q.question_type,
          q.points, q.expected_answer,
          GROUP_CONCAT(
            CONCAT(qo.option_text, '|', qo.is_correct, '|', qo.option_order)
            ORDER BY qo.option_order
            SEPARATOR '||'
          ) as options
        FROM assignment_questions q
        LEFT JOIN question_options qo ON q.id = qo.question_id
        WHERE q.assignment_id = ?
        GROUP BY q.id
        ORDER BY q.question_number
      `, [assignmentId]);

      // Parse question options
      assignmentData.questions = questions.map(q => ({
        ...q,
        options: q.options ? q.options.split('||').map(opt => {
          const [text, isCorrect, order] = opt.split('|');
          return {
            text,
            isCorrect: isCorrect === '1',
            order: parseInt(order)
          };
        }) : []
      }));

      // Get assignment resources
      const [resources] = await connection.query(`
        SELECT id, title, description, file_path, external_url, resource_type
        FROM assignment_resources
        WHERE assignment_id = ?
        ORDER BY title
      `, [assignmentId]);

      assignmentData.resources = resources;

      // Get rubric criteria
      const [rubric] = await connection.query(`
        SELECT id, criterion_name, description, max_score, weight
        FROM rubric_criteria
        WHERE assignment_id = ?
        ORDER BY id
      `, [assignmentId]);

      assignmentData.rubric = rubric;

      // Get submission history (all attempts)
      const [submissionHistory] = await connection.query(`
        SELECT 
          id, submission_number, status, grade, normalized_grade,
          submission_time, graded_at, is_late, is_auto_graded
        FROM submissions
        WHERE assignment_id = ? AND student_id = ?
        ORDER BY submission_number DESC
      `, [assignmentId, studentId]);

      assignmentData.submissionHistory = submissionHistory;

      return assignmentData;

    } catch (error) {
      logger.error('Error getting assignment details:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load assignment details');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's academic profile and progress tracking
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Academic profile data
   */
  async getAcademicProfile(studentId) {
    const connection = await pool.getConnection();
    
    try {
      // Get student basic info and profile
      const [student] = await connection.query(`
        SELECT 
          u.id, u.identifier, u.first_name, u.last_name, u.email,
          u.profile_image, u.created_at as registration_date,
          sp.year_level, sp.major, sp.cumulative_gpa, sp.bio
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ? AND u.role = 'student'
      `, [studentId]);

      if (student.length === 0) {
        throw createError(404, 'Student not found');
      }

      const studentData = student[0];

      // Get comprehensive academic statistics
      const [academicStats] = await connection.query(`
        SELECT 
          COUNT(DISTINCT e.course_id) as total_courses,
          COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.course_id END) as active_courses,
          COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.course_id END) as completed_courses,
          SUM(DISTINCT c.credits) as total_credits,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as total_submissions,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
          AVG(s.normalized_grade) as overall_gpa,
          COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
          COUNT(CASE WHEN s.submission_time <= a.deadline THEN 1 END) as on_time_submissions,
          MIN(e.enrollment_date) as first_enrollment,
          MAX(s.submission_time) as last_activity
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ?
      `, [studentId, studentId]);

      studentData.academicStatistics = academicStats[0];

      // Get semester-wise performance
      const [semesterPerformance] = await connection.query(`
        SELECT 
          c.semester, c.academic_year,
          COUNT(DISTINCT c.id) as courses_taken,
          SUM(c.credits) as credits_earned,
          AVG(s.normalized_grade) as semester_gpa,
          COUNT(DISTINCT a.id) as assignments_completed
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ? AND s.grade IS NOT NULL
        WHERE e.student_id = ?
        GROUP BY c.semester, c.academic_year
        ORDER BY c.academic_year DESC, 
                 CASE c.semester 
                   WHEN 'Fall' THEN 3 
                   WHEN 'Spring' THEN 2 
                   WHEN 'Summer' THEN 1 
                   ELSE 0 
                 END DESC
      `, [studentId, studentId]);

      studentData.semesterPerformance = semesterPerformance;

      // Get course performance breakdown
      const [coursePerformance] = await connection.query(`
        SELECT 
          c.id, c.code, c.title, c.semester, c.academic_year, c.credits,
          e.final_grade, e.status as enrollment_status,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as submitted_assignments,
          AVG(s.normalized_grade) as course_average,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users t ON c.teacher_id = t.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ?
        GROUP BY c.id, e.id
        ORDER BY c.academic_year DESC, c.semester DESC, c.title
      `, [studentId, studentId]);

      studentData.coursePerformance = coursePerformance;

      // Get performance trends over time
      const [performanceTrends] = await connection.query(`
        SELECT 
          DATE(s.graded_at) as grade_date,
          AVG(s.normalized_grade) as daily_average,
          COUNT(s.id) as assignments_graded,
          c.code as course_code
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.student_id = ? 
          AND s.grade IS NOT NULL 
          AND s.graded_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
        GROUP BY DATE(s.graded_at), c.id
        ORDER BY grade_date ASC
      `, [studentId]);

      studentData.performanceTrends = performanceTrends;

      return studentData;

    } catch (error) {
      logger.error('Error getting academic profile:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load academic profile');
    } finally {
      connection.release();
    }
  }
}

module.exports = new StudentPortalService();
