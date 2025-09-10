const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const moment = require('moment');

/**
 * Student Grade and Feedback Service - Handles grade viewing, feedback display, and performance analytics
 */
class StudentGradeFeedbackService {

  /**
   * Get student's grades overview with statistics and trends
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Grades overview
   */
  async getGradesOverview(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        courseId,
        semester,
        academicYear,
        includeUngraded = false
      } = filters;

      const conditions = ['s.student_id = ?'];
      const params = [studentId];

      if (courseId) {
        conditions.push('c.id = ?');
        params.push(courseId);
      }

      if (semester) {
        conditions.push('c.semester = ?');
        params.push(semester);
      }

      if (academicYear) {
        conditions.push('c.academic_year = ?');
        params.push(academicYear);
      }

      if (!includeUngraded) {
        conditions.push('s.grade IS NOT NULL');
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Get detailed grades with assignment and course information
      const [grades] = await connection.query(`
        SELECT 
          s.id as submission_id, s.grade, s.normalized_grade, s.graded_at,
          s.is_late, s.is_auto_graded, s.submission_time,
          a.id as assignment_id, a.title as assignment_title, a.total_points,
          a.deadline, a.submission_format, a.late_penalty,
          c.id as course_id, c.code as course_code, c.title as course_title,
          c.semester, c.academic_year,
          ac.name as category_name, ac.weight as category_weight,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name,
          COUNT(gr.id) as feedback_items_count,
          AVG(gr.score/gr.max_score * 100) as question_average
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        JOIN users t ON c.teacher_id = t.id
        LEFT JOIN assignment_categories ac ON a.category_id = ac.id
        LEFT JOIN grading_results gr ON s.id = gr.submission_id
        ${whereClause}
        GROUP BY s.id
        ORDER BY s.graded_at DESC, a.deadline DESC
      `, params);

      // Calculate grade statistics
      const gradeStats = this.calculateGradeStatistics(grades);

      // Get course-wise performance
      const [coursePerformance] = await connection.query(`
        SELECT 
          c.id, c.code, c.title, c.semester, c.academic_year,
          COUNT(s.id) as graded_assignments,
          AVG(s.normalized_grade) as course_average,
          MAX(s.normalized_grade) as highest_grade,
          MIN(s.normalized_grade) as lowest_grade,
          SUM(CASE WHEN s.normalized_grade >= 90 THEN 1 ELSE 0 END) as a_grades,
          SUM(CASE WHEN s.normalized_grade >= 80 AND s.normalized_grade < 90 THEN 1 ELSE 0 END) as b_grades,
          SUM(CASE WHEN s.normalized_grade >= 70 AND s.normalized_grade < 80 THEN 1 ELSE 0 END) as c_grades,
          SUM(CASE WHEN s.normalized_grade < 70 THEN 1 ELSE 0 END) as below_c_grades
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = ? AND s.grade IS NOT NULL AND e.status = 'active'
        GROUP BY c.id
        ORDER BY c.academic_year DESC, c.semester DESC, c.title
      `, [studentId]);

      // Get recent feedback summary
      const [recentFeedback] = await connection.query(`
        SELECT 
          gr.feedback, gr.score, gr.max_score, gr.confidence_level,
          a.title as assignment_title, c.code as course_code,
          s.graded_at
        FROM grading_results gr
        JOIN submissions s ON gr.submission_id = s.id
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.student_id = ? AND gr.feedback IS NOT NULL AND gr.feedback != ''
        ORDER BY s.graded_at DESC
        LIMIT 10
      `, [studentId]);

      return {
        grades,
        statistics: gradeStats,
        coursePerformance,
        recentFeedback,
        summary: {
          totalGradedAssignments: grades.length,
          overallGPA: gradeStats.overallAverage,
          lastGradedDate: grades.length > 0 ? grades[0].graded_at : null
        }
      };

    } catch (error) {
      logger.error('Error getting grades overview:', error);
      throw createError(500, 'Failed to load grades overview');
    } finally {
      connection.release();
    }
  }

  /**
   * Get detailed feedback for a specific submission
   * @param {Number} studentId - Student ID
   * @param {Number} submissionId - Submission ID
   * @returns {Promise<Object>} Detailed feedback
   */
  async getSubmissionFeedback(studentId, submissionId) {
    const connection = await pool.getConnection();
    
    try {
      // Get submission and assignment details
      const [submission] = await connection.query(`
        SELECT 
          s.id, s.grade, s.normalized_grade, s.graded_at, s.is_auto_graded,
          s.submission_time, s.is_late,
          a.id as assignment_id, a.title as assignment_title, a.total_points,
          a.deadline, a.late_penalty, a.grading_method,
          c.code as course_code, c.title as course_title,
          grader.first_name as grader_first_name, grader.last_name as grader_last_name
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

      // Get question-level feedback
      const [questionFeedback] = await connection.query(`
        SELECT 
          gr.id, gr.score, gr.max_score, gr.feedback, gr.confidence_level,
          gr.grading_notes,
          aq.question_number, aq.question_text, aq.question_type, aq.points,
          aq.expected_answer
        FROM grading_results gr
        LEFT JOIN assignment_questions aq ON gr.question_id = aq.id
        WHERE gr.submission_id = ?
        ORDER BY aq.question_number ASC, gr.id ASC
      `, [submissionId]);

      // Get rubric-based feedback
      const [rubricFeedback] = await connection.query(`
        SELECT 
          ra.score, ra.comments,
          rc.criterion_name, rc.description, rc.max_score, rc.weight
        FROM rubric_assessments ra
        JOIN rubric_criteria rc ON ra.criterion_id = rc.id
        WHERE ra.submission_id = ?
        ORDER BY rc.id
      `, [submissionId]);

      // Get annotations and visual feedback
      const [annotations] = await connection.query(`
        SELECT 
          sa.id, sa.page_number, sa.x_position, sa.y_position,
          sa.width, sa.height, sa.annotation_text, sa.created_at,
          u.first_name as annotator_first_name, u.last_name as annotator_last_name
        FROM submission_annotations sa
        JOIN users u ON sa.created_by = u.id
        WHERE sa.submission_id = ?
        ORDER BY sa.page_number, sa.y_position
      `, [submissionId]);

      // Get class performance comparison
      const [classComparison] = await connection.query(`
        SELECT 
          AVG(s.normalized_grade) as class_average,
          MAX(s.normalized_grade) as class_max,
          MIN(s.normalized_grade) as class_min,
          STDDEV(s.normalized_grade) as class_std_dev,
          COUNT(s.id) as total_submissions,
          SUM(CASE WHEN s.normalized_grade >= ? THEN 1 ELSE 0 END) as students_with_same_or_lower_grade
        FROM submissions s
        WHERE s.assignment_id = ? AND s.grade IS NOT NULL
      `, [submissionData.normalized_grade, submissionData.assignment_id]);

      // Calculate feedback insights
      const feedbackInsights = this.generateFeedbackInsights(
        questionFeedback, 
        rubricFeedback, 
        submissionData
      );

      return {
        submission: submissionData,
        questionFeedback,
        rubricFeedback,
        annotations,
        classComparison: classComparison[0],
        insights: feedbackInsights,
        improvementSuggestions: this.generateImprovementSuggestions(
          questionFeedback, 
          rubricFeedback
        )
      };

    } catch (error) {
      logger.error('Error getting submission feedback:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load feedback');
    } finally {
      connection.release();
    }
  }

  /**
   * Get grade trends and performance analytics
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Performance analytics
   */
  async getPerformanceAnalytics(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        timeRange = '6_months', // 1_month, 3_months, 6_months, 1_year, all
        courseId,
        categoryId
      } = filters;

      // Calculate date range
      let dateCondition = '';
      const params = [studentId];

      if (timeRange !== 'all') {
        const timeRangeMap = {
          '1_month': 1,
          '3_months': 3,
          '6_months': 6,
          '1_year': 12
        };
        const months = timeRangeMap[timeRange] || 6;
        dateCondition = 'AND s.graded_at >= DATE_SUB(NOW(), INTERVAL ? MONTH)';
        params.push(months);
      }

      if (courseId) {
        dateCondition += ' AND c.id = ?';
        params.push(courseId);
      }

      if (categoryId) {
        dateCondition += ' AND a.category_id = ?';
        params.push(categoryId);
      }

      // Get grade trends over time
      const [gradeTrends] = await connection.query(`
        SELECT 
          DATE(s.graded_at) as grade_date,
          AVG(s.normalized_grade) as daily_average,
          COUNT(s.id) as assignments_graded,
          c.code as course_code,
          c.title as course_title
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.student_id = ? AND s.grade IS NOT NULL ${dateCondition}
        GROUP BY DATE(s.graded_at), c.id
        ORDER BY grade_date ASC
      `, params);

      // Get performance by assignment category
      const [categoryPerformance] = await connection.query(`
        SELECT 
          ac.name as category_name,
          ac.weight as category_weight,
          COUNT(s.id) as assignments_count,
          AVG(s.normalized_grade) as average_grade,
          MAX(s.normalized_grade) as best_grade,
          MIN(s.normalized_grade) as worst_grade,
          STDDEV(s.normalized_grade) as grade_consistency
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        LEFT JOIN assignment_categories ac ON a.category_id = ac.id
        WHERE s.student_id = ? AND s.grade IS NOT NULL ${dateCondition}
        GROUP BY ac.id, ac.name
        ORDER BY average_grade DESC
      `, params);

      // Get improvement areas analysis
      const [weakAreas] = await connection.query(`
        SELECT 
          aq.question_type,
          COUNT(gr.id) as question_count,
          AVG(gr.score/gr.max_score * 100) as average_score,
          COUNT(CASE WHEN gr.score/gr.max_score < 0.7 THEN 1 END) as below_threshold_count
        FROM grading_results gr
        JOIN submissions s ON gr.submission_id = s.id
        LEFT JOIN assignment_questions aq ON gr.question_id = aq.id
        WHERE s.student_id = ? AND s.grade IS NOT NULL ${dateCondition}
        GROUP BY aq.question_type
        HAVING question_count >= 3
        ORDER BY average_score ASC
      `, params);

      // Get strength areas analysis
      const [strongAreas] = await connection.query(`
        SELECT 
          aq.question_type,
          COUNT(gr.id) as question_count,
          AVG(gr.score/gr.max_score * 100) as average_score,
          COUNT(CASE WHEN gr.score/gr.max_score >= 0.9 THEN 1 END) as excellent_count
        FROM grading_results gr
        JOIN submissions s ON gr.submission_id = s.id
        LEFT JOIN assignment_questions aq ON gr.question_id = aq.id
        WHERE s.student_id = ? AND s.grade IS NOT NULL ${dateCondition}
        GROUP BY aq.question_type
        HAVING question_count >= 3
        ORDER BY average_score DESC
      `, params);

      // Get submission timing analysis
      const [timingAnalysis] = await connection.query(`
        SELECT 
          CASE 
            WHEN TIMESTAMPDIFF(HOUR, s.submission_time, a.deadline) > 24 THEN 'early'
            WHEN TIMESTAMPDIFF(HOUR, s.submission_time, a.deadline) > 0 THEN 'on_time'
            ELSE 'late'
          END as submission_timing,
          COUNT(s.id) as submission_count,
          AVG(s.normalized_grade) as average_grade
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ? AND s.grade IS NOT NULL ${dateCondition}
        GROUP BY submission_timing
      `, params);

      // Calculate overall performance metrics
      const [overallMetrics] = await connection.query(`
        SELECT 
          COUNT(s.id) as total_graded,
          AVG(s.normalized_grade) as overall_average,
          MAX(s.normalized_grade) as highest_grade,
          MIN(s.normalized_grade) as lowest_grade,
          STDDEV(s.normalized_grade) as grade_consistency,
          COUNT(CASE WHEN s.is_late THEN 1 END) as late_submissions,
          COUNT(CASE WHEN s.normalized_grade >= 90 THEN 1 END) as a_grades,
          COUNT(CASE WHEN s.normalized_grade >= 80 AND s.normalized_grade < 90 THEN 1 END) as b_grades,
          COUNT(CASE WHEN s.normalized_grade >= 70 AND s.normalized_grade < 80 THEN 1 END) as c_grades,
          COUNT(CASE WHEN s.normalized_grade < 70 THEN 1 END) as below_c_grades
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ? AND s.grade IS NOT NULL ${dateCondition}
      `, params);

      return {
        gradeTrends,
        categoryPerformance,
        weakAreas,
        strongAreas,
        timingAnalysis,
        overallMetrics: overallMetrics[0],
        recommendations: this.generatePerformanceRecommendations({
          gradeTrends,
          categoryPerformance,
          weakAreas,
          timingAnalysis,
          overallMetrics: overallMetrics[0]
        })
      };

    } catch (error) {
      logger.error('Error getting performance analytics:', error);
      throw createError(500, 'Failed to load performance analytics');
    } finally {
      connection.release();
    }
  }

  /**
   * Get comparative performance against class average
   * @param {Number} studentId - Student ID
   * @param {Number} courseId - Course ID (optional)
   * @returns {Promise<Object>} Comparative performance data
   */
  async getComparativePerformance(studentId, courseId = null) {
    const connection = await pool.getConnection();
    
    try {
      const courseCondition = courseId ? 'AND c.id = ?' : '';
      const params = courseId ? [studentId, courseId, studentId, courseId] : [studentId, studentId];

      // Get student's performance
      const [studentPerformance] = await connection.query(`
        SELECT 
          c.id as course_id, c.code, c.title,
          COUNT(s.id) as assignments_completed,
          AVG(s.normalized_grade) as student_average,
          MAX(s.normalized_grade) as student_max,
          MIN(s.normalized_grade) as student_min
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE e.student_id = ? AND s.grade IS NOT NULL ${courseCondition}
        GROUP BY c.id
      `, params);

      // Get class averages
      const [classAverages] = await connection.query(`
        SELECT 
          c.id as course_id,
          COUNT(DISTINCT s.student_id) as total_students,
          COUNT(s.id) as total_submissions,
          AVG(s.normalized_grade) as class_average,
          MAX(s.normalized_grade) as class_max,
          MIN(s.normalized_grade) as class_min,
          STDDEV(s.normalized_grade) as class_std_dev
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.grade IS NOT NULL ${courseCondition}
        GROUP BY c.id
      `, courseId ? [courseId] : []);

      // Calculate percentile rankings
      const comparativeData = studentPerformance.map(student => {
        const classData = classAverages.find(cls => cls.course_id === student.course_id);
        
        if (!classData) return student;

        // Calculate z-score and percentile
        const zScore = classData.class_std_dev > 0 ? 
          (student.student_average - classData.class_average) / classData.class_std_dev : 0;
        
        const percentile = this.calculatePercentile(zScore);

        return {
          ...student,
          classAverage: classData.class_average,
          classMax: classData.class_max,
          classMin: classData.class_min,
          totalClassStudents: classData.total_students,
          zScore: zScore,
          percentile: percentile,
          performanceLevel: this.categorizePerformance(percentile),
          comparison: {
            aboveAverage: student.student_average > classData.class_average,
            difference: student.student_average - classData.class_average,
            percentageDifference: classData.class_average > 0 ? 
              ((student.student_average - classData.class_average) / classData.class_average * 100) : 0
          }
        };
      });

      return {
        courses: comparativeData,
        summary: {
          totalCourses: comparativeData.length,
          averagePercentile: comparativeData.length > 0 ? 
            comparativeData.reduce((sum, course) => sum + course.percentile, 0) / comparativeData.length : 0,
          coursesAboveAverage: comparativeData.filter(course => course.comparison.aboveAverage).length,
          strongestCourse: comparativeData.length > 0 ? 
            comparativeData.reduce((max, course) => course.percentile > max.percentile ? course : max) : null,
          weakestCourse: comparativeData.length > 0 ? 
            comparativeData.reduce((min, course) => course.percentile < min.percentile ? course : min) : null
        }
      };

    } catch (error) {
      logger.error('Error getting comparative performance:', error);
      throw createError(500, 'Failed to load comparative performance');
    } finally {
      connection.release();
    }
  }

  /**
   * Calculate grade statistics from grades array
   * @param {Array} grades - Array of grade objects
   * @returns {Object} Grade statistics
   */
  calculateGradeStatistics(grades) {
    if (grades.length === 0) {
      return {
        overallAverage: 0,
        highestGrade: 0,
        lowestGrade: 0,
        gradeDistribution: { A: 0, B: 0, C: 0, D: 0, F: 0 },
        totalAssignments: 0,
        lateSubmissions: 0,
        onTimeSubmissions: 0
      };
    }

    const gradedAssignments = grades.filter(g => g.normalized_grade !== null);
    const gradeValues = gradedAssignments.map(g => g.normalized_grade);

    const overallAverage = gradeValues.reduce((sum, grade) => sum + grade, 0) / gradeValues.length;
    const highestGrade = Math.max(...gradeValues);
    const lowestGrade = Math.min(...gradeValues);

    const gradeDistribution = {
      A: gradeValues.filter(g => g >= 90).length,
      B: gradeValues.filter(g => g >= 80 && g < 90).length,
      C: gradeValues.filter(g => g >= 70 && g < 80).length,
      D: gradeValues.filter(g => g >= 60 && g < 70).length,
      F: gradeValues.filter(g => g < 60).length
    };

    return {
      overallAverage: Math.round(overallAverage * 100) / 100,
      highestGrade,
      lowestGrade,
      gradeDistribution,
      totalAssignments: grades.length,
      lateSubmissions: grades.filter(g => g.is_late).length,
      onTimeSubmissions: grades.filter(g => !g.is_late).length
    };
  }

  /**
   * Generate feedback insights from grading results
   * @param {Array} questionFeedback - Question-level feedback
   * @param {Array} rubricFeedback - Rubric-based feedback
   * @param {Object} submissionData - Submission data
   * @returns {Object} Feedback insights
   */
  generateFeedbackInsights(questionFeedback, rubricFeedback, submissionData) {
    const insights = {
      strengths: [],
      weaknesses: [],
      overallPerformance: '',
      confidenceLevel: 'medium'
    };

    // Analyze question-level performance
    if (questionFeedback.length > 0) {
      const scores = questionFeedback.map(q => q.score / q.max_score);
      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      const highPerformingQuestions = questionFeedback.filter(q => (q.score / q.max_score) >= 0.8);
      const lowPerformingQuestions = questionFeedback.filter(q => (q.score / q.max_score) < 0.6);

      // Identify strengths
      if (highPerformingQuestions.length > 0) {
        const questionTypes = [...new Set(highPerformingQuestions.map(q => q.question_type))];
        insights.strengths.push(`Strong performance in ${questionTypes.join(', ')} questions`);
      }

      // Identify weaknesses
      if (lowPerformingQuestions.length > 0) {
        const questionTypes = [...new Set(lowPerformingQuestions.map(q => q.question_type))];
        insights.weaknesses.push(`Needs improvement in ${questionTypes.join(', ')} questions`);
      }

      // Overall performance assessment
      if (averageScore >= 0.9) {
        insights.overallPerformance = 'Excellent work! Your understanding of the material is very strong.';
      } else if (averageScore >= 0.8) {
        insights.overallPerformance = 'Good performance overall with room for minor improvements.';
      } else if (averageScore >= 0.7) {
        insights.overallPerformance = 'Satisfactory work with several areas for improvement.';
      } else {
        insights.overallPerformance = 'This assignment shows significant areas for improvement.';
      }

      // Calculate confidence level
      const confidenceLevels = questionFeedback
        .filter(q => q.confidence_level !== null)
        .map(q => q.confidence_level);
      
      if (confidenceLevels.length > 0) {
        const avgConfidence = confidenceLevels.reduce((sum, conf) => sum + conf, 0) / confidenceLevels.length;
        insights.confidenceLevel = avgConfidence >= 0.8 ? 'high' : avgConfidence >= 0.6 ? 'medium' : 'low';
      }
    }

    // Analyze rubric performance
    if (rubricFeedback.length > 0) {
      const rubricScores = rubricFeedback.map(r => r.score / r.max_score);
      const topCriteria = rubricFeedback
        .filter(r => (r.score / r.max_score) >= 0.8)
        .map(r => r.criterion_name);
      
      const weakCriteria = rubricFeedback
        .filter(r => (r.score / r.max_score) < 0.6)
        .map(r => r.criterion_name);

      if (topCriteria.length > 0) {
        insights.strengths.push(`Excellent performance in: ${topCriteria.join(', ')}`);
      }

      if (weakCriteria.length > 0) {
        insights.weaknesses.push(`Focus on improving: ${weakCriteria.join(', ')}`);
      }
    }

    return insights;
  }

  /**
   * Generate improvement suggestions based on feedback
   * @param {Array} questionFeedback - Question-level feedback
   * @param {Array} rubricFeedback - Rubric-based feedback
   * @returns {Array} Improvement suggestions
   */
  generateImprovementSuggestions(questionFeedback, rubricFeedback) {
    const suggestions = [];

    // Analyze question types that need improvement
    const lowPerformingQuestions = questionFeedback.filter(q => (q.score / q.max_score) < 0.7);
    
    const questionTypeGroups = lowPerformingQuestions.reduce((groups, question) => {
      const type = question.question_type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(question);
      return groups;
    }, {});

    Object.entries(questionTypeGroups).forEach(([type, questions]) => {
      switch (type) {
        case 'multiple_choice':
          suggestions.push({
            area: 'Multiple Choice Questions',
            suggestion: 'Review the material more carefully and eliminate obviously incorrect answers before choosing.',
            priority: 'medium'
          });
          break;
        case 'essay':
          suggestions.push({
            area: 'Essay Writing',
            suggestion: 'Focus on structuring your arguments better and providing more detailed explanations.',
            priority: 'high'
          });
          break;
        case 'code':
          suggestions.push({
            area: 'Programming',
            suggestion: 'Practice more coding problems and review algorithm fundamentals.',
            priority: 'high'
          });
          break;
        case 'short_answer':
          suggestions.push({
            area: 'Short Answers',
            suggestion: 'Be more concise and directly address what the question is asking.',
            priority: 'medium'
          });
          break;
      }
    });

    // Analyze rubric areas that need improvement
    const lowRubricAreas = rubricFeedback.filter(r => (r.score / r.max_score) < 0.7);
    
    lowRubricAreas.forEach(rubric => {
      suggestions.push({
        area: rubric.criterion_name,
        suggestion: rubric.comments || `Focus on improving your ${rubric.criterion_name.toLowerCase()}.`,
        priority: rubric.weight > 0.3 ? 'high' : 'medium'
      });
    });

    // Add general suggestions if no specific feedback available
    if (suggestions.length === 0) {
      suggestions.push({
        area: 'General Study Habits',
        suggestion: 'Continue your good work and maintain consistent study habits.',
        priority: 'low'
      });
    }

    return suggestions.slice(0, 5); // Limit to top 5 suggestions
  }

  /**
   * Generate performance recommendations based on analytics
   * @param {Object} analyticsData - Performance analytics data
   * @returns {Array} Performance recommendations
   */
  generatePerformanceRecommendations(analyticsData) {
    const recommendations = [];
    const { gradeTrends, categoryPerformance, weakAreas, timingAnalysis, overallMetrics } = analyticsData;

    // Analyze grade trends
    if (gradeTrends.length >= 5) {
      const recentTrend = gradeTrends.slice(-5);
      const isImproving = recentTrend[recentTrend.length - 1].daily_average > recentTrend[0].daily_average;
      
      if (isImproving) {
        recommendations.push({
          type: 'positive',
          message: 'Your grades are showing an upward trend. Keep up the good work!',
          priority: 'low'
        });
      } else {
        recommendations.push({
          type: 'improvement',
          message: 'Your recent performance shows some decline. Consider reviewing your study methods.',
          priority: 'high'
        });
      }
    }

    // Analyze category performance
    if (categoryPerformance.length > 0) {
      const weakestCategory = categoryPerformance
        .filter(cat => cat.assignments_count >= 2)
        .sort((a, b) => a.average_grade - b.average_grade)[0];
      
      if (weakestCategory && weakestCategory.average_grade < 75) {
        recommendations.push({
          type: 'improvement',
          message: `Focus more attention on ${weakestCategory.category_name} assignments.`,
          priority: 'high'
        });
      }
    }

    // Analyze timing patterns
    if (timingAnalysis.length > 0) {
      const lateSubmissions = timingAnalysis.find(t => t.submission_timing === 'late');
      if (lateSubmissions && lateSubmissions.submission_count > 2) {
        recommendations.push({
          type: 'improvement',
          message: 'Try to submit assignments earlier to avoid late penalties and stress.',
          priority: 'medium'
        });
      }
    }

    // Overall performance recommendations
    if (overallMetrics.overall_average >= 90) {
      recommendations.push({
        type: 'positive',
        message: 'Excellent academic performance! Continue challenging yourself.',
        priority: 'low'
      });
    } else if (overallMetrics.overall_average < 70) {
      recommendations.push({
        type: 'improvement',
        message: 'Consider seeking additional help from your instructors or tutoring services.',
        priority: 'high'
      });
    }

    return recommendations;
  }

  /**
   * Calculate percentile from z-score
   * @param {Number} zScore - Z-score value
   * @returns {Number} Percentile (0-100)
   */
  calculatePercentile(zScore) {
    // Approximate percentile calculation using error function
    const percentile = 50 * (1 + this.erf(zScore / Math.sqrt(2)));
    return Math.round(Math.max(0, Math.min(100, percentile)));
  }

  /**
   * Approximate error function for percentile calculation
   * @param {Number} x - Input value
   * @returns {Number} Error function result
   */
  erf(x) {
    // Abramowitz and Stegun approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  /**
   * Categorize performance level based on percentile
   * @param {Number} percentile - Percentile value
   * @returns {String} Performance category
   */
  categorizePerformance(percentile) {
    if (percentile >= 90) return 'excellent';
    if (percentile >= 75) return 'above_average';
    if (percentile >= 50) return 'average';
    if (percentile >= 25) return 'below_average';
    return 'needs_improvement';
  }
}

module.exports = new StudentGradeFeedbackService();
