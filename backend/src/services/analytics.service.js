const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

/**
 * Analytics Service - Provides comprehensive analytics for teachers
 */
class AnalyticsService {

  /**
   * Get class performance analytics for a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Class performance data
   */
  async getClassPerformance(courseId, teacherId) {
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
      
      // Get overall class statistics
      const [classStats] = await connection.query(
        `SELECT 
           COUNT(DISTINCT e.student_id) as total_students,
           COUNT(DISTINCT a.id) as total_assignments,
           COUNT(DISTINCT s.id) as total_submissions,
           AVG(s.normalized_grade) as class_average,
           MIN(s.normalized_grade) as lowest_grade,
           MAX(s.normalized_grade) as highest_grade,
           STDDEV(s.normalized_grade) as grade_stddev
         FROM courses c
         LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
         LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
         LEFT JOIN submissions s ON a.id = s.assignment_id AND s.grade IS NOT NULL
         WHERE c.id = ?`,
        [courseId]
      );
      
      // Get grade distribution
      const [gradeDistribution] = await connection.query(
        `SELECT 
           CASE 
             WHEN s.normalized_grade >= 90 THEN 'A'
             WHEN s.normalized_grade >= 80 THEN 'B'
             WHEN s.normalized_grade >= 70 THEN 'C'
             WHEN s.normalized_grade >= 60 THEN 'D'
             ELSE 'F'
           END as grade_band,
           COUNT(*) as count,
           ROUND((COUNT(*) * 100.0 / (SELECT COUNT(*) FROM submissions s2 
                                      JOIN assignments a2 ON s2.assignment_id = a2.id 
                                      WHERE a2.course_id = ? AND s2.grade IS NOT NULL)), 2) as percentage
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND s.grade IS NOT NULL
         GROUP BY grade_band
         ORDER BY 
           CASE grade_band
             WHEN 'A' THEN 1
             WHEN 'B' THEN 2
             WHEN 'C' THEN 3
             WHEN 'D' THEN 4
             WHEN 'F' THEN 5
           END`,
        [courseId, courseId]
      );
      
      // Get assignment performance
      const [assignmentPerformance] = await connection.query(
        `SELECT 
           a.id, a.title, a.total_points, a.deadline,
           COUNT(s.id) as submission_count,
           COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_count,
           AVG(s.normalized_grade) as average_grade,
           MIN(s.normalized_grade) as min_grade,
           MAX(s.normalized_grade) as max_grade,
           STDDEV(s.normalized_grade) as grade_stddev,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions
         FROM assignments a
         LEFT JOIN submissions s ON a.id = s.assignment_id
         WHERE a.course_id = ? AND a.is_active = true
         GROUP BY a.id
         ORDER BY a.deadline DESC`,
        [courseId]
      );
      
      // Get student performance summary
      const [studentPerformance] = await connection.query(
        `SELECT 
           u.id, CONCAT(u.first_name, ' ', u.last_name) as student_name,
           u.identifier,
           COUNT(s.id) as submissions_count,
           COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
           AVG(s.normalized_grade) as average_grade,
           SUM(s.normalized_grade) as total_points,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
           MAX(s.submission_time) as last_submission_time
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN submissions s ON u.id = s.student_id
         LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = ?
         WHERE e.course_id = ? AND e.status = 'active'
         GROUP BY u.id
         ORDER BY average_grade DESC`,
        [courseId, courseId]
      );
      
      // Get submission trends over time
      const [submissionTrends] = await connection.query(
        `SELECT 
           DATE(s.submission_time) as submission_date,
           COUNT(*) as submissions_count,
           AVG(s.normalized_grade) as average_grade
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND s.submission_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(s.submission_time)
         ORDER BY submission_date`,
        [courseId]
      );
      
      // Get engagement metrics
      const [engagementMetrics] = await connection.query(
        `SELECT 
           COUNT(DISTINCT s.student_id) as active_students,
           COUNT(DISTINCT CASE WHEN s.submission_time >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN s.student_id END) as weekly_active,
           AVG(CASE WHEN s.submission_time <= a.deadline THEN 1 ELSE 0 END) * 100 as on_time_percentage,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions_count
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ?`,
        [courseId]
      );
      
      connection.release();
      
      return {
        classStatistics: classStats[0],
        gradeDistribution,
        assignmentPerformance,
        studentPerformance,
        submissionTrends,
        engagementMetrics: engagementMetrics[0]
      };
      
    } catch (error) {
      logger.error('Error getting class performance:', error);
      throw error;
    }
  }

  /**
   * Get assignment difficulty analysis
   * @param {Number} assignmentId - Assignment ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Assignment difficulty analysis
   */
  async getAssignmentDifficulty(assignmentId, teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Verify assignment ownership
      const [assignmentCheck] = await connection.query(
        `SELECT a.*, c.teacher_id FROM assignments a
         JOIN courses c ON a.course_id = c.id
         WHERE a.id = ? AND c.teacher_id = ?`,
        [assignmentId, teacherId]
      );
      
      if (assignmentCheck.length === 0) {
        throw createError(404, 'Assignment not found or access denied');
      }
      
      const assignment = assignmentCheck[0];
      
      // Get basic difficulty metrics
      const [difficultyMetrics] = await connection.query(
        `SELECT 
           COUNT(*) as total_submissions,
           COUNT(CASE WHEN grade IS NOT NULL THEN 1 END) as graded_submissions,
           AVG(normalized_grade) as average_grade,
           STDDEV(normalized_grade) as grade_stddev,
           MIN(normalized_grade) as min_grade,
           MAX(normalized_grade) as max_grade,
           COUNT(CASE WHEN normalized_grade >= 90 THEN 1 END) as excellent_count,
           COUNT(CASE WHEN normalized_grade >= 70 AND normalized_grade < 90 THEN 1 END) as good_count,
           COUNT(CASE WHEN normalized_grade >= 50 AND normalized_grade < 70 THEN 1 END) as average_count,
           COUNT(CASE WHEN normalized_grade < 50 THEN 1 END) as poor_count,
           AVG(TIMESTAMPDIFF(HOUR, ?, submission_time)) as avg_completion_time_hours
         FROM submissions 
         WHERE assignment_id = ? AND grade IS NOT NULL`,
        [assignment.open_date, assignmentId]
      );
      
      // Get question-level difficulty (if available)
      const [questionDifficulty] = await connection.query(
        `SELECT 
           aq.id, aq.question_number, aq.question_text, aq.points,
           COUNT(gr.id) as response_count,
           AVG(gr.score) as average_score,
           STDDEV(gr.score) as score_stddev,
           MIN(gr.score) as min_score,
           MAX(gr.score) as max_score,
           COUNT(CASE WHEN gr.score = aq.points THEN 1 END) as perfect_scores
         FROM assignment_questions aq
         LEFT JOIN grading_results gr ON aq.id = gr.question_id
         WHERE aq.assignment_id = ?
         GROUP BY aq.id
         ORDER BY aq.question_number`,
        [assignmentId]
      );
      
      // Get time-to-completion analysis
      const [timeAnalysis] = await connection.query(
        `SELECT 
           CASE 
             WHEN TIMESTAMPDIFF(HOUR, ?, submission_time) <= 24 THEN '0-24h'
             WHEN TIMESTAMPDIFF(HOUR, ?, submission_time) <= 72 THEN '24-72h'
             WHEN TIMESTAMPDIFF(HOUR, ?, submission_time) <= 168 THEN '3-7d'
             ELSE '7d+'
           END as time_range,
           COUNT(*) as submission_count,
           AVG(normalized_grade) as average_grade
         FROM submissions
         WHERE assignment_id = ? AND grade IS NOT NULL
         GROUP BY time_range
         ORDER BY 
           CASE time_range
             WHEN '0-24h' THEN 1
             WHEN '24-72h' THEN 2
             WHEN '3-7d' THEN 3
             WHEN '7d+' THEN 4
           END`,
        [assignment.open_date, assignment.open_date, assignment.open_date, assignmentId]
      );
      
      // Get common mistakes/feedback patterns
      const [commonFeedback] = await connection.query(
        `SELECT 
           feedback, COUNT(*) as frequency,
           AVG(score) as average_score
         FROM grading_results 
         WHERE submission_id IN (
           SELECT id FROM submissions WHERE assignment_id = ?
         ) AND feedback IS NOT NULL AND feedback != ''
         GROUP BY feedback
         HAVING COUNT(*) > 1
         ORDER BY frequency DESC
         LIMIT 10`,
        [assignmentId]
      );
      
      // Calculate difficulty index (0-1, where 1 is hardest)
      const avgGrade = difficultyMetrics[0].average_grade || 0;
      const maxPoints = assignment.total_points;
      const difficultyIndex = 1 - (avgGrade / maxPoints);
      
      // Determine difficulty level
      let difficultyLevel;
      if (difficultyIndex < 0.2) difficultyLevel = 'Very Easy';
      else if (difficultyIndex < 0.4) difficultyLevel = 'Easy';
      else if (difficultyIndex < 0.6) difficultyLevel = 'Moderate';
      else if (difficultyIndex < 0.8) difficultyLevel = 'Hard';
      else difficultyLevel = 'Very Hard';
      
      connection.release();
      
      return {
        assignment: {
          id: assignment.id,
          title: assignment.title,
          totalPoints: assignment.total_points,
          deadline: assignment.deadline
        },
        difficultyMetrics: difficultyMetrics[0],
        difficultyIndex,
        difficultyLevel,
        questionDifficulty,
        timeAnalysis,
        commonFeedback,
        recommendations: this.generateDifficultyRecommendations(difficultyMetrics[0], difficultyIndex)
      };
      
    } catch (error) {
      logger.error('Error getting assignment difficulty:', error);
      throw error;
    }
  }

  /**
   * Get student progress analytics across all courses
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Student progress analytics
   */
  async getStudentProgressAnalytics(courseId, teacherId) {
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
      
      // Get detailed student progress
      const [studentProgress] = await connection.query(
        `SELECT 
           u.id, CONCAT(u.first_name, ' ', u.last_name) as student_name,
           u.identifier, u.email,
           COUNT(DISTINCT s.id) as total_submissions,
           COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
           AVG(s.normalized_grade) as current_average,
           SUM(s.normalized_grade) as total_points_earned,
           SUM(a.total_points) as total_possible_points,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
           MAX(s.submission_time) as last_activity,
           DATEDIFF(NOW(), MAX(s.submission_time)) as days_since_last_activity,
           
           -- Trend analysis (last 4 assignments)
           (SELECT AVG(s2.normalized_grade) 
            FROM submissions s2 
            JOIN assignments a2 ON s2.assignment_id = a2.id 
            WHERE s2.student_id = u.id AND a2.course_id = ? 
            AND s2.grade IS NOT NULL 
            ORDER BY a2.deadline DESC LIMIT 4) as recent_average,
            
           -- Improvement trend
           CASE 
             WHEN (SELECT AVG(s2.normalized_grade) 
                   FROM submissions s2 
                   JOIN assignments a2 ON s2.assignment_id = a2.id 
                   WHERE s2.student_id = u.id AND a2.course_id = ? 
                   AND s2.grade IS NOT NULL 
                   ORDER BY a2.deadline DESC LIMIT 2) >
                  (SELECT AVG(s2.normalized_grade) 
                   FROM submissions s2 
                   JOIN assignments a2 ON s2.assignment_id = a2.id 
                   WHERE s2.student_id = u.id AND a2.course_id = ? 
                   AND s2.grade IS NOT NULL 
                   ORDER BY a2.deadline DESC LIMIT 2 OFFSET 2)
             THEN 'improving'
             WHEN (SELECT AVG(s2.normalized_grade) 
                   FROM submissions s2 
                   JOIN assignments a2 ON s2.assignment_id = a2.id 
                   WHERE s2.student_id = u.id AND a2.course_id = ? 
                   AND s2.grade IS NOT NULL 
                   ORDER BY a2.deadline DESC LIMIT 2) <
                  (SELECT AVG(s2.normalized_grade) 
                   FROM submissions s2 
                   JOIN assignments a2 ON s2.assignment_id = a2.id 
                   WHERE s2.student_id = u.id AND a2.course_id = ? 
                   AND s2.grade IS NOT NULL 
                   ORDER BY a2.deadline DESC LIMIT 2 OFFSET 2)
             THEN 'declining'
             ELSE 'stable'
           END as trend
           
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN submissions s ON u.id = s.student_id
         LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = ?
         WHERE e.course_id = ? AND e.status = 'active'
         GROUP BY u.id
         ORDER BY current_average DESC`,
        [courseId, courseId, courseId, courseId, courseId, courseId, courseId]
      );
      
      // Get at-risk students
      const [atRiskStudents] = await connection.query(
        `SELECT 
           u.id, CONCAT(u.first_name, ' ', u.last_name) as student_name,
           u.email,
           AVG(s.normalized_grade) as average_grade,
           COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
           DATEDIFF(NOW(), MAX(s.submission_time)) as days_inactive,
           'low_performance' as risk_factor
         FROM enrollments e
         JOIN users u ON e.student_id = u.id
         LEFT JOIN submissions s ON u.id = s.student_id
         LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = ?
         WHERE e.course_id = ? AND e.status = 'active'
         GROUP BY u.id
         HAVING average_grade < 60 OR late_submissions > 2 OR days_inactive > 7
         ORDER BY average_grade ASC`,
        [courseId, courseId]
      );
      
      // Get class participation trends
      const [participationTrends] = await connection.query(
        `SELECT 
           DATE(s.submission_time) as date,
           COUNT(DISTINCT s.student_id) as active_students,
           COUNT(*) as total_submissions,
           AVG(s.normalized_grade) as average_grade
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND s.submission_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(s.submission_time)
         ORDER BY date`,
        [courseId]
      );
      
      // Get grade improvement patterns
      const [improvementPatterns] = await connection.query(
        `SELECT 
           student_trend,
           COUNT(*) as student_count,
           AVG(current_average) as avg_performance
         FROM (
           SELECT 
             u.id,
             AVG(s.normalized_grade) as current_average,
             CASE 
               WHEN (SELECT AVG(s2.normalized_grade) 
                     FROM submissions s2 
                     JOIN assignments a2 ON s2.assignment_id = a2.id 
                     WHERE s2.student_id = u.id AND a2.course_id = ? 
                     AND s2.grade IS NOT NULL 
                     ORDER BY a2.deadline DESC LIMIT 3) >
                    (SELECT AVG(s2.normalized_grade) 
                     FROM submissions s2 
                     JOIN assignments a2 ON s2.assignment_id = a2.id 
                     WHERE s2.student_id = u.id AND a2.course_id = ? 
                     AND s2.grade IS NOT NULL 
                     ORDER BY a2.deadline ASC LIMIT 3)
               THEN 'improving'
               WHEN (SELECT AVG(s2.normalized_grade) 
                     FROM submissions s2 
                     JOIN assignments a2 ON s2.assignment_id = a2.id 
                     WHERE s2.student_id = u.id AND a2.course_id = ? 
                     AND s2.grade IS NOT NULL 
                     ORDER BY a2.deadline DESC LIMIT 3) <
                    (SELECT AVG(s2.normalized_grade) 
                     FROM submissions s2 
                     JOIN assignments a2 ON s2.assignment_id = a2.id 
                     WHERE s2.student_id = u.id AND a2.course_id = ? 
                     AND s2.grade IS NOT NULL 
                     ORDER BY a2.deadline ASC LIMIT 3)
               THEN 'declining'
               ELSE 'stable'
             END as student_trend
           FROM enrollments e
           JOIN users u ON e.student_id = u.id
           LEFT JOIN submissions s ON u.id = s.student_id
           LEFT JOIN assignments a ON s.assignment_id = a.id AND a.course_id = ?
           WHERE e.course_id = ? AND e.status = 'active'
           GROUP BY u.id
           HAVING COUNT(s.id) >= 3
         ) trend_analysis
         GROUP BY student_trend`,
        [courseId, courseId, courseId, courseId, courseId, courseId]
      );
      
      connection.release();
      
      return {
        studentProgress,
        atRiskStudents,
        participationTrends,
        improvementPatterns,
        insights: this.generateProgressInsights(studentProgress, atRiskStudents)
      };
      
    } catch (error) {
      logger.error('Error getting student progress analytics:', error);
      throw error;
    }
  }

  /**
   * Get grading trends and workload analytics for teacher
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Grading trends data
   */
  async getGradingTrends(teacherId) {
    try {
      const connection = await pool.getConnection();
      
      // Get grading workload over time
      const [gradingWorkload] = await connection.query(
        `SELECT 
           DATE(s.graded_at) as grading_date,
           COUNT(*) as submissions_graded,
           AVG(TIMESTAMPDIFF(HOUR, s.submission_time, s.graded_at)) as avg_turnaround_hours,
           COUNT(CASE WHEN s.is_auto_graded = true THEN 1 END) as auto_graded,
           COUNT(CASE WHEN s.is_auto_graded = false THEN 1 END) as manually_graded
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE c.teacher_id = ? AND s.graded_at IS NOT NULL
         AND s.graded_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
         GROUP BY DATE(s.graded_at)
         ORDER BY grading_date`,
        [teacherId]
      );
      
      // Get grading consistency metrics
      const [gradingConsistency] = await connection.query(
        `SELECT 
           a.id as assignment_id, a.title as assignment_title,
           COUNT(*) as total_graded,
           AVG(s.grade) as average_grade,
           STDDEV(s.grade) as grade_stddev,
           MIN(s.grade) as min_grade,
           MAX(s.grade) as max_grade,
           AVG(TIMESTAMPDIFF(HOUR, s.submission_time, s.graded_at)) as avg_turnaround
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE c.teacher_id = ? AND s.graded_at IS NOT NULL
         GROUP BY a.id
         ORDER BY a.deadline DESC
         LIMIT 10`,
        [teacherId]
      );
      
      // Get pending grading queue
      const [pendingGrading] = await connection.query(
        `SELECT 
           a.id as assignment_id, a.title as assignment_title,
           c.code as course_code,
           COUNT(*) as pending_count,
           MIN(s.submission_time) as oldest_submission,
           MAX(s.submission_time) as newest_submission,
           DATEDIFF(NOW(), MIN(s.submission_time)) as days_pending
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE c.teacher_id = ? AND s.grade IS NULL AND s.status = 'submitted'
         GROUP BY a.id
         ORDER BY days_pending DESC`,
        [teacherId]
      );
      
      // Get ML vs Manual grading comparison
      const [gradingComparison] = await connection.query(
        `SELECT 
           s.is_auto_graded,
           COUNT(*) as count,
           AVG(s.grade) as average_grade,
           AVG(TIMESTAMPDIFF(MINUTE, s.submission_time, s.graded_at)) as avg_turnaround_minutes
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         JOIN courses c ON a.course_id = c.id
         WHERE c.teacher_id = ? AND s.graded_at IS NOT NULL
         AND s.graded_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
         GROUP BY s.is_auto_graded`,
        [teacherId]
      );
      
      connection.release();
      
      return {
        gradingWorkload,
        gradingConsistency,
        pendingGrading,
        gradingComparison,
        recommendations: this.generateGradingRecommendations(gradingWorkload, pendingGrading)
      };
      
    } catch (error) {
      logger.error('Error getting grading trends:', error);
      throw error;
    }
  }

  /**
   * Generate difficulty-based recommendations
   * @param {Object} metrics - Difficulty metrics
   * @param {Number} difficultyIndex - Difficulty index (0-1)
   * @returns {Array} Recommendations
   */
  generateDifficultyRecommendations(metrics, difficultyIndex) {
    const recommendations = [];
    
    if (difficultyIndex > 0.8) {
      recommendations.push({
        type: 'difficulty',
        message: 'This assignment appears very challenging. Consider providing additional resources or breaking it into smaller parts.',
        priority: 'high'
      });
    }
    
    if (metrics.grade_stddev > 20) {
      recommendations.push({
        type: 'consistency',
        message: 'High grade variance detected. Review grading criteria or provide clearer instructions.',
        priority: 'medium'
      });
    }
    
    if (metrics.avg_completion_time_hours > 72) {
      recommendations.push({
        type: 'timing',
        message: 'Students are taking longer than expected. Consider extending the deadline or providing hints.',
        priority: 'medium'
      });
    }
    
    return recommendations;
  }

  /**
   * Generate progress-based insights
   * @param {Array} studentProgress - Student progress data
   * @param {Array} atRiskStudents - At-risk students data
   * @returns {Array} Insights
   */
  generateProgressInsights(studentProgress, atRiskStudents) {
    const insights = [];
    
    const improvingStudents = studentProgress.filter(s => s.trend === 'improving').length;
    const decliningStudents = studentProgress.filter(s => s.trend === 'declining').length;
    
    if (improvingStudents > decliningStudents) {
      insights.push({
        type: 'positive',
        message: `${improvingStudents} students are showing improvement trends`,
        data: { improving: improvingStudents, declining: decliningStudents }
      });
    } else if (decliningStudents > improvingStudents) {
      insights.push({
        type: 'concern',
        message: `${decliningStudents} students are showing declining performance`,
        data: { improving: improvingStudents, declining: decliningStudents }
      });
    }
    
    if (atRiskStudents.length > 0) {
      insights.push({
        type: 'alert',
        message: `${atRiskStudents.length} students need attention`,
        data: { count: atRiskStudents.length }
      });
    }
    
    return insights;
  }

  /**
   * Generate grading recommendations
   * @param {Array} gradingWorkload - Grading workload data
   * @param {Array} pendingGrading - Pending grading data
   * @returns {Array} Recommendations
   */
  generateGradingRecommendations(gradingWorkload, pendingGrading) {
    const recommendations = [];
    
    const totalPending = pendingGrading.reduce((sum, item) => sum + item.pending_count, 0);
    
    if (totalPending > 20) {
      recommendations.push({
        type: 'workload',
        message: `You have ${totalPending} submissions pending grading. Consider enabling auto-grading for suitable assignments.`,
        priority: 'high'
      });
    }
    
    const oldestPending = Math.max(...pendingGrading.map(item => item.days_pending));
    if (oldestPending > 7) {
      recommendations.push({
        type: 'timing',
        message: `Some submissions have been pending for ${oldestPending} days. Students are waiting for feedback.`,
        priority: 'high'
      });
    }
    
    return recommendations;
  }
}

module.exports = new AnalyticsService();
