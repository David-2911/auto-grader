const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Report Service - Generates comprehensive reports for teachers
 */
class ReportService {

  /**
   * Generate course performance report
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Report options
   * @returns {Promise<Object>} Report data
   */
  async generateCoursePerformanceReport(courseId, teacherId, options = {}) {
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
      
      const course = courseCheck[0];
      
      // Get course overview statistics
      const [courseStats] = await connection.query(
        `SELECT 
           COUNT(DISTINCT e.student_id) as total_students,
           COUNT(DISTINCT a.id) as total_assignments,
           COUNT(DISTINCT s.id) as total_submissions,
           AVG(s.normalized_grade) as class_average,
           MIN(s.normalized_grade) as lowest_grade,
           MAX(s.normalized_grade) as highest_grade,
           STDDEV(s.normalized_grade) as grade_stddev,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
           AVG(TIMESTAMPDIFF(HOUR, a.open_date, s.submission_time)) as avg_completion_hours
         FROM courses c
         LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
         LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
         LEFT JOIN submissions s ON a.id = s.assignment_id AND s.grade IS NOT NULL
         WHERE c.id = ?`,
        [courseId]
      );
      
      // Get detailed student performance
      const [studentPerformance] = await connection.query(
        `SELECT 
           u.id, u.identifier, CONCAT(u.first_name, ' ', u.last_name) as student_name,
           u.email, sp.year_level, sp.major,
           COUNT(DISTINCT s.id) as total_submissions,
           COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
           AVG(s.normalized_grade) as average_grade,
           SUM(s.normalized_grade) as total_points_earned,
           (SELECT SUM(total_points) FROM assignments WHERE course_id = ? AND is_active = true) as total_possible_points,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
           MAX(s.submission_time) as last_submission,
           
           -- Grade trend (last 3 assignments)
           (SELECT AVG(s2.normalized_grade) 
            FROM submissions s2 
            JOIN assignments a2 ON s2.assignment_id = a2.id 
            WHERE s2.student_id = u.id AND a2.course_id = ? 
            AND s2.grade IS NOT NULL 
            ORDER BY a2.deadline DESC LIMIT 3) as recent_average,
            
           -- Attendance/participation score
           (COUNT(DISTINCT s.id) * 100.0 / COUNT(DISTINCT a.id)) as participation_rate
           
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN student_profiles sp ON u.id = sp.user_id
         LEFT JOIN submissions s ON u.id = s.student_id
         LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = ?
         WHERE e.course_id = ? AND e.status = 'active'
         GROUP BY u.id
         ORDER BY average_grade DESC`,
        [courseId, courseId, courseId, courseId]
      );
      
      // Get assignment breakdown
      const [assignmentBreakdown] = await connection.query(
        `SELECT 
           a.id, a.title, a.total_points, a.deadline, a.submission_format,
           ac.name as category_name,
           COUNT(s.id) as submission_count,
           COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count,
           AVG(s.normalized_grade) as average_grade,
           MIN(s.normalized_grade) as min_grade,
           MAX(s.normalized_grade) as max_grade,
           STDDEV(s.normalized_grade) as grade_stddev,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_count,
           AVG(TIMESTAMPDIFF(HOUR, a.open_date, s.submission_time)) as avg_completion_hours,
           
           -- Difficulty analysis
           CASE 
             WHEN AVG(s.normalized_grade) >= 85 THEN 'Easy'
             WHEN AVG(s.normalized_grade) >= 70 THEN 'Moderate'
             WHEN AVG(s.normalized_grade) >= 50 THEN 'Hard'
             ELSE 'Very Hard'
           END as difficulty_level
           
         FROM assignments a
         LEFT JOIN assignment_categories ac ON a.category_id = ac.id
         LEFT JOIN submissions s ON a.id = s.assignment_id
         WHERE a.course_id = ? AND a.is_active = true
         GROUP BY a.id
         ORDER BY a.deadline`,
        [courseId]
      );
      
      // Get grade distribution
      const [gradeDistribution] = await connection.query(
        `SELECT 
           CASE 
             WHEN AVG(s.normalized_grade) >= 90 THEN 'A (90-100%)'
             WHEN AVG(s.normalized_grade) >= 80 THEN 'B (80-89%)'
             WHEN AVG(s.normalized_grade) >= 70 THEN 'C (70-79%)'
             WHEN AVG(s.normalized_grade) >= 60 THEN 'D (60-69%)'
             ELSE 'F (Below 60%)'
           END as grade_band,
           COUNT(DISTINCT s.student_id) as student_count
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND s.grade IS NOT NULL
         GROUP BY s.student_id
         HAVING AVG(s.normalized_grade) IS NOT NULL`,
        [courseId]
      );
      
      // Get final grade distribution
      const finalGrades = this.calculateFinalGrades(gradeDistribution);
      
      // Get weekly progress trends
      const [weeklyTrends] = await connection.query(
        `SELECT 
           YEARWEEK(s.submission_time) as week,
           COUNT(*) as submissions_count,
           AVG(s.normalized_grade) as average_grade,
           COUNT(DISTINCT s.student_id) as active_students
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND s.submission_time >= DATE_SUB(NOW(), INTERVAL 12 WEEK)
         GROUP BY YEARWEEK(s.submission_time)
         ORDER BY week`,
        [courseId]
      );
      
      // Get most common feedback themes
      const [feedbackAnalysis] = await connection.query(
        `SELECT 
           LEFT(gr.feedback, 100) as feedback_snippet,
           COUNT(*) as frequency,
           AVG(gr.score) as avg_score_for_feedback
         FROM grading_results gr
         JOIN submissions s ON gr.submission_id = s.id
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND gr.feedback IS NOT NULL AND gr.feedback != ''
         GROUP BY LEFT(gr.feedback, 100)
         HAVING COUNT(*) > 1
         ORDER BY frequency DESC
         LIMIT 10`,
        [courseId]
      );
      
      connection.release();
      
      const reportData = {
        course: {
          id: course.id,
          code: course.code,
          title: course.title,
          startDate: course.start_date,
          endDate: course.end_date
        },
        summary: courseStats[0],
        studentPerformance,
        assignmentBreakdown,
        gradeDistribution: finalGrades,
        weeklyTrends,
        feedbackAnalysis,
        metadata: {
          generatedAt: new Date(),
          generatedBy: teacherId,
          reportType: 'course_performance'
        }
      };
      
      return reportData;
      
    } catch (error) {
      logger.error('Error generating course performance report:', error);
      throw error;
    }
  }

  /**
   * Generate assignment results report
   * @param {Number} assignmentId - Assignment ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Assignment report data
   */
  async generateAssignmentReport(assignmentId, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Verify assignment ownership
      const [assignmentCheck] = await connection.query(
        `SELECT a.*, c.teacher_id, c.code as course_code, c.title as course_title
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ? AND c.teacher_id = ?`,
        [assignmentId, teacherId]
      );
      
      if (assignmentCheck.length === 0) {
        throw createError(404, 'Assignment not found or access denied');
      }
      
      const assignment = assignmentCheck[0];
      
      // Get assignment statistics
      const [assignmentStats] = await connection.query(
        `SELECT 
           COUNT(*) as total_submissions,
           COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_submissions,
           COUNT(CASE WHEN grade IS NULL THEN 1 END) as pending_submissions,
           AVG(normalized_grade) as average_grade,
           MIN(normalized_grade) as min_grade,
           MAX(normalized_grade) as max_grade,
           STDDEV(normalized_grade) as grade_stddev,
           COUNT(CASE WHEN submission_time > ? THEN 1 END) as late_submissions,
           COUNT(CASE WHEN is_auto_graded = true THEN 1 END) as auto_graded,
           COUNT(CASE WHEN is_auto_graded = false THEN 1 END) as manually_graded,
           AVG(TIMESTAMPDIFF(HOUR, ?, submission_time)) as avg_completion_hours
         FROM submissions 
         WHERE assignment_id = ?`,
        [assignment.deadline, assignment.open_date, assignmentId]
      );
      
      // Get detailed student results
      const [studentResults] = await connection.query(
        `SELECT 
           u.id, u.identifier, CONCAT(u.first_name, ' ', u.last_name) as student_name,
           u.email,
           s.id as submission_id,
           s.submission_time,
           s.grade,
           s.normalized_grade,
           s.is_late,
           s.is_auto_graded,
           s.status,
           TIMESTAMPDIFF(HOUR, ?, s.submission_time) as completion_hours,
           gr.feedback,
           gr.confidence_level,
           
           -- Late penalty applied
           CASE 
             WHEN s.is_late THEN ROUND(((s.grade - s.normalized_grade) / s.grade) * 100, 2)
             ELSE 0
           END as late_penalty_applied
           
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN submissions s ON u.id = s.student_id AND s.assignment_id = ?
         LEFT JOIN grading_results gr ON s.id = gr.submission_id AND gr.question_id IS NULL
         WHERE e.course_id = ? AND e.status = 'active'
         ORDER BY s.normalized_grade DESC, u.last_name`,
        [assignment.open_date, assignmentId, assignment.course_id]
      );
      
      // Get question-level analysis (if available)
      const [questionAnalysis] = await connection.query(
        `SELECT 
           aq.id, aq.question_number, aq.question_text, aq.points as max_points,
           aq.question_type,
           COUNT(gr.id) as response_count,
           AVG(gr.score) as average_score,
           MIN(gr.score) as min_score,
           MAX(gr.score) as max_score,
           STDDEV(gr.score) as score_stddev,
           COUNT(CASE WHEN gr.score = aq.points THEN 1 END) as perfect_scores,
           ROUND((AVG(gr.score) / aq.points) * 100, 2) as success_rate
         FROM assignment_questions aq
         LEFT JOIN grading_results gr ON aq.id = gr.question_id
         WHERE aq.assignment_id = ?
         GROUP BY aq.id
         ORDER BY aq.question_number`,
        [assignmentId]
      );
      
      // Get submission timeline
      const [submissionTimeline] = await connection.query(
        `SELECT 
           DATE(submission_time) as submission_date,
           COUNT(*) as submissions_count,
           AVG(normalized_grade) as daily_average
         FROM submissions
         WHERE assignment_id = ? AND submission_time IS NOT NULL
         GROUP BY DATE(submission_time)
         ORDER BY submission_date`,
        [assignmentId]
      );
      
      // Get grade distribution for this assignment
      const [gradeDistribution] = await connection.query(
        `SELECT 
           CASE 
             WHEN normalized_grade >= 90 THEN 'A (90-100%)'
             WHEN normalized_grade >= 80 THEN 'B (80-89%)'
             WHEN normalized_grade >= 70 THEN 'C (70-79%)'
             WHEN normalized_grade >= 60 THEN 'D (60-69%)'
             ELSE 'F (Below 60%)'
           END as grade_band,
           COUNT(*) as count,
           ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM submissions WHERE assignment_id = ? AND grade IS NOT NULL)), 2) as percentage
         FROM submissions
         WHERE assignment_id = ? AND grade IS NOT NULL
         GROUP BY grade_band
         ORDER BY 
           CASE grade_band
             WHEN 'A (90-100%)' THEN 1
             WHEN 'B (80-89%)' THEN 2
             WHEN 'C (70-79%)' THEN 3
             WHEN 'D (60-69%)' THEN 4
             WHEN 'F (Below 60%)' THEN 5
           END`,
        [assignmentId, assignmentId]
      );
      
      // Get common feedback patterns
      const [feedbackPatterns] = await connection.query(
        `SELECT 
           feedback,
           COUNT(*) as frequency,
           AVG(score) as avg_score_with_feedback,
           MIN(score) as min_score_with_feedback,
           MAX(score) as max_score_with_feedback
         FROM grading_results
         WHERE submission_id IN (SELECT id FROM submissions WHERE assignment_id = ?)
         AND feedback IS NOT NULL AND feedback != ''
         GROUP BY feedback
         HAVING COUNT(*) > 1
         ORDER BY frequency DESC
         LIMIT 15`,
        [assignmentId]
      );
      
      connection.release();
      
      const reportData = {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          description: assignment.description,
          totalPoints: assignment.total_points,
          deadline: assignment.deadline,
          course: {
            code: assignment.course_code,
            title: assignment.course_title
          }
        },
        statistics: assignmentStats[0],
        studentResults,
        questionAnalysis,
        submissionTimeline,
        gradeDistribution,
        feedbackPatterns,
        insights: this.generateAssignmentInsights(assignmentStats[0], questionAnalysis, studentResults),
        metadata: {
          generatedAt: new Date(),
          generatedBy: teacherId,
          reportType: 'assignment_results'
        }
      };
      
      return reportData;
      
    } catch (error) {
      logger.error('Error generating assignment report:', error);
      throw error;
    }
  }

  /**
   * Generate student progress report
   * @param {Number} studentId - Student ID
   * @param {Number} teacherId - Teacher ID
   * @param {Number} courseId - Course ID (optional)
   * @returns {Promise<Object>} Student progress report
   */
  async generateStudentProgressReport(studentId, teacherId, courseId = null) {
    try {
      const connection = await pool.getConnection();
      
      // Get student information
      const [student] = await connection.query(
        'SELECT * FROM users WHERE id = ? AND role = "student"',
        [studentId]
      );
      
      if (student.length === 0) {
        throw createError(404, 'Student not found');
      }
      
      // Verify teacher has access to this student
      let courseFilter = '';
      let courseParams = [];
      
      if (courseId) {
        const [courseCheck] = await connection.query(
          'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
          [courseId, teacherId]
        );
        
        if (courseCheck.length === 0) {
          throw createError(403, 'Access denied to this course');
        }
        
        courseFilter = 'AND c.id = ?';
        courseParams = [courseId];
      } else {
        courseFilter = 'AND c.teacher_id = ?';
        courseParams = [teacherId];
      }
      
      // Get student's course enrollments
      const [enrollments] = await connection.query(
        `SELECT c.id, c.code, c.title, c.start_date, c.end_date,
                e.enrollment_date, e.status as enrollment_status
         FROM enrollments e
         JOIN courses c ON e.course_id = c.id
         WHERE e.student_id = ? ${courseFilter}
         ORDER BY e.enrollment_date DESC`,
        [studentId, ...courseParams]
      );
      
      // Get overall performance across all teacher's courses
      const [overallPerformance] = await connection.query(
        `SELECT 
           COUNT(DISTINCT a.id) as total_assignments,
           COUNT(DISTINCT s.id) as total_submissions,
           COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
           AVG(s.normalized_grade) as overall_average,
           SUM(s.normalized_grade) as total_points_earned,
           SUM(a.total_points) as total_possible_points,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
           MAX(s.submission_time) as last_submission,
           MIN(s.submission_time) as first_submission
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.student_id = ? ${courseFilter}`,
        [studentId, ...courseParams]
      );
      
      // Get performance by course
      const [coursePerformance] = await connection.query(
        `SELECT 
           c.id, c.code, c.title,
           COUNT(DISTINCT a.id) as assignments_count,
           COUNT(DISTINCT s.id) as submissions_count,
           COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_count,
           AVG(s.normalized_grade) as course_average,
           SUM(s.normalized_grade) as points_earned,
           SUM(a.total_points) as points_possible,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_count,
           MAX(s.submission_time) as last_activity
         FROM courses c
         LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
         LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
         WHERE c.id IN (SELECT course_id FROM enrollments WHERE student_id = ?) ${courseFilter}
         GROUP BY c.id
         ORDER BY c.title`,
        [studentId, studentId, ...courseParams]
      );
      
      // Get assignment-level details
      const [assignmentDetails] = await connection.query(
        `SELECT 
           a.id, a.title, a.total_points, a.deadline,
           c.code as course_code, c.title as course_title,
           s.id as submission_id,
           s.submission_time,
           s.grade,
           s.normalized_grade,
           s.is_late,
           s.status as submission_status,
           gr.feedback,
           gr.confidence_level,
           CASE 
             WHEN s.submission_time IS NULL THEN 'not_submitted'
             WHEN s.grade IS NULL THEN 'pending_grade'
             WHEN s.normalized_grade >= 90 THEN 'excellent'
             WHEN s.normalized_grade >= 70 THEN 'good'
             WHEN s.normalized_grade >= 50 THEN 'average'
             ELSE 'needs_improvement'
           END as performance_level
         FROM assignments a
         JOIN courses c ON a.course_id = c.id
         LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
         LEFT JOIN grading_results gr ON s.id = gr.submission_id AND gr.question_id IS NULL
         WHERE c.id IN (SELECT course_id FROM enrollments WHERE student_id = ?) ${courseFilter}
         AND a.is_active = true
         ORDER BY a.deadline DESC`,
        [studentId, studentId, ...courseParams]
      );
      
      // Get progress trends
      const [progressTrends] = await connection.query(
        `SELECT 
           DATE(s.submission_time) as submission_date,
           AVG(s.normalized_grade) as daily_average,
           COUNT(*) as submissions_count
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.student_id = ? ${courseFilter}
         AND s.grade IS NOT NULL
         AND s.submission_time >= DATE_SUB(NOW(), INTERVAL 90 DAY)
         GROUP BY DATE(s.submission_time)
         ORDER BY submission_date`,
        [studentId, ...courseParams]
      );
      
      // Get strength and weakness analysis
      const [strengthsWeaknesses] = await connection.query(
        `SELECT 
           ac.name as category_name,
           COUNT(*) as assignments_count,
           AVG(s.normalized_grade) as category_average,
           CASE 
             WHEN AVG(s.normalized_grade) >= 80 THEN 'strength'
             WHEN AVG(s.normalized_grade) >= 60 THEN 'average'
             ELSE 'weakness'
           END as performance_area
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN assignment_categories ac ON a.category_id = ac.id
         JOIN courses c ON a.course_id = c.id
         WHERE s.student_id = ? ${courseFilter}
         AND s.grade IS NOT NULL
         GROUP BY ac.id, ac.name
         HAVING COUNT(*) >= 2
         ORDER BY category_average DESC`,
        [studentId, ...courseParams]
      );
      
      connection.release();
      
      const reportData = {
        student: {
          id: student[0].id,
          name: `${student[0].first_name} ${student[0].last_name}`,
          email: student[0].email,
          identifier: student[0].identifier
        },
        enrollments,
        overallPerformance: overallPerformance[0],
        coursePerformance,
        assignmentDetails,
        progressTrends,
        strengthsWeaknesses,
        recommendations: this.generateStudentRecommendations(overallPerformance[0], strengthsWeaknesses, assignmentDetails),
        metadata: {
          generatedAt: new Date(),
          generatedBy: teacherId,
          reportType: 'student_progress',
          courseId: courseId
        }
      };
      
      return reportData;
      
    } catch (error) {
      logger.error('Error generating student progress report:', error);
      throw error;
    }
  }

  /**
   * Export report to Excel format
   * @param {Object} reportData - Report data
   * @param {String} reportType - Type of report
   * @returns {Promise<Buffer>} Excel file buffer
   */
  async exportToExcel(reportData, reportType) {
    try {
      const workbook = new ExcelJS.Workbook();
      
      switch (reportType) {
        case 'course_performance':
          await this.createCoursePerformanceExcel(workbook, reportData);
          break;
        case 'assignment_results':
          await this.createAssignmentResultsExcel(workbook, reportData);
          break;
        case 'student_progress':
          await this.createStudentProgressExcel(workbook, reportData);
          break;
        default:
          throw createError(400, 'Unsupported report type for Excel export');
      }
      
      const buffer = await workbook.xlsx.writeBuffer();
      return buffer;
      
    } catch (error) {
      logger.error('Error exporting to Excel:', error);
      throw error;
    }
  }

  /**
   * Create course performance Excel worksheet
   * @param {Object} workbook - ExcelJS workbook
   * @param {Object} reportData - Report data
   */
  async createCoursePerformanceExcel(workbook, reportData) {
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Course Summary');
    summarySheet.addRow(['Course Performance Report']);
    summarySheet.addRow([]);
    summarySheet.addRow(['Course:', reportData.course.title]);
    summarySheet.addRow(['Course Code:', reportData.course.code]);
    summarySheet.addRow(['Generated:', reportData.metadata.generatedAt]);
    summarySheet.addRow([]);
    summarySheet.addRow(['Total Students:', reportData.summary.total_students]);
    summarySheet.addRow(['Total Assignments:', reportData.summary.total_assignments]);
    summarySheet.addRow(['Class Average:', reportData.summary.class_average?.toFixed(2)]);
    summarySheet.addRow(['Lowest Grade:', reportData.summary.lowest_grade?.toFixed(2)]);
    summarySheet.addRow(['Highest Grade:', reportData.summary.highest_grade?.toFixed(2)]);
    
    // Student Performance sheet
    const studentSheet = workbook.addWorksheet('Student Performance');
    const studentHeaders = [
      'Student Name', 'ID', 'Email', 'Submissions', 'Average Grade', 
      'Total Points', 'Late Submissions', 'Participation Rate'
    ];
    studentSheet.addRow(studentHeaders);
    
    reportData.studentPerformance.forEach(student => {
      studentSheet.addRow([
        student.student_name,
        student.identifier,
        student.email,
        student.graded_submissions,
        student.average_grade?.toFixed(2),
        student.total_points_earned?.toFixed(2),
        student.late_submissions,
        student.participation_rate?.toFixed(1) + '%'
      ]);
    });
    
    // Assignment Breakdown sheet
    const assignmentSheet = workbook.addWorksheet('Assignment Breakdown');
    const assignmentHeaders = [
      'Assignment', 'Total Points', 'Submissions', 'Average Grade', 
      'Min Grade', 'Max Grade', 'Late Count', 'Difficulty Level'
    ];
    assignmentSheet.addRow(assignmentHeaders);
    
    reportData.assignmentBreakdown.forEach(assignment => {
      assignmentSheet.addRow([
        assignment.title,
        assignment.total_points,
        assignment.submission_count,
        assignment.average_grade?.toFixed(2),
        assignment.min_grade?.toFixed(2),
        assignment.max_grade?.toFixed(2),
        assignment.late_count,
        assignment.difficulty_level
      ]);
    });
  }

  /**
   * Generate assignment insights
   * @param {Object} stats - Assignment statistics
   * @param {Array} questionAnalysis - Question analysis data
   * @param {Array} studentResults - Student results data
   * @returns {Object} Assignment insights
   */
  generateAssignmentInsights(stats, questionAnalysis, studentResults) {
    const insights = {
      difficulty: 'moderate',
      participation: 'good',
      timeManagement: 'good',
      commonIssues: [],
      recommendations: []
    };
    
    // Determine difficulty
    if (stats.average_grade >= 85) {
      insights.difficulty = 'easy';
    } else if (stats.average_grade <= 50) {
      insights.difficulty = 'very_hard';
    } else if (stats.average_grade <= 65) {
      insights.difficulty = 'hard';
    }
    
    // Analyze participation
    const submissionRate = (stats.total_submissions / studentResults.length) * 100;
    if (submissionRate >= 90) {
      insights.participation = 'excellent';
    } else if (submissionRate >= 70) {
      insights.participation = 'good';
    } else {
      insights.participation = 'poor';
    }
    
    // Time management analysis
    const lateRate = (stats.late_submissions / stats.total_submissions) * 100;
    if (lateRate <= 10) {
      insights.timeManagement = 'excellent';
    } else if (lateRate <= 25) {
      insights.timeManagement = 'good';
    } else {
      insights.timeManagement = 'poor';
    }
    
    // Generate recommendations
    if (insights.difficulty === 'very_hard') {
      insights.recommendations.push('Consider providing additional resources or breaking down complex topics');
    }
    
    if (insights.participation === 'poor') {
      insights.recommendations.push('Review assignment instructions and consider extending deadline');
    }
    
    if (insights.timeManagement === 'poor') {
      insights.recommendations.push('Consider earlier deadline reminders and time management guidance');
    }
    
    return insights;
  }

  /**
   * Generate student recommendations
   * @param {Object} performance - Overall performance data
   * @param {Array} strengths - Strengths and weaknesses
   * @param {Array} assignments - Assignment details
   * @returns {Array} Recommendations
   */
  generateStudentRecommendations(performance, strengths, assignments) {
    const recommendations = [];
    
    if (performance.overall_average < 60) {
      recommendations.push({
        priority: 'high',
        type: 'performance',
        message: 'Student needs immediate academic intervention and support'
      });
    }
    
    const lateRate = (performance.late_submissions / performance.total_submissions) * 100;
    if (lateRate > 25) {
      recommendations.push({
        priority: 'medium',
        type: 'time_management',
        message: 'Student would benefit from time management coaching'
      });
    }
    
    const weakAreas = strengths.filter(s => s.performance_area === 'weakness');
    if (weakAreas.length > 0) {
      recommendations.push({
        priority: 'medium',
        type: 'skill_development',
        message: `Focus on improving: ${weakAreas.map(w => w.category_name).join(', ')}`
      });
    }
    
    return recommendations;
  }

  /**
   * Calculate final grades from grade distribution
   * @param {Array} gradeDistribution - Raw grade distribution data
   * @returns {Array} Formatted final grades
   */
  calculateFinalGrades(gradeDistribution) {
    const gradeMap = new Map();
    
    gradeDistribution.forEach(item => {
      const grade = item.grade_band;
      gradeMap.set(grade, (gradeMap.get(grade) || 0) + item.student_count);
    });
    
    const total = Array.from(gradeMap.values()).reduce((sum, count) => sum + count, 0);
    
    return Array.from(gradeMap.entries()).map(([grade, count]) => ({
      grade_band: grade,
      count: count,
      percentage: total > 0 ? ((count / total) * 100).toFixed(2) : 0
    }));
  }
}

module.exports = new ReportService();
