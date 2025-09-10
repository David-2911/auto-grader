const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const fs = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

/**
 * Grade Book Management Service - Comprehensive grade book management for teachers
 */
class GradeBookService {
  
  /**
   * Get complete gradebook for a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Display options
   * @returns {Promise<Object>} Complete gradebook data
   */
  async getGradebook(courseId, teacherId, options = {}) {
    const connection = await pool.getConnection();
    
    try {
      // Verify course ownership
      const [courseCheck] = await connection.query(
        'SELECT * FROM courses WHERE id = ? AND teacher_id = ?',
        [courseId, teacherId]
      );
      
      if (courseCheck.length === 0) {
        throw createError(404, 'Course not found or access denied');
      }
      
      const course = courseCheck[0];
      
      // Get gradebook settings
      const [gradebookSettings] = await connection.query(
        'SELECT * FROM gradebook_settings WHERE course_id = ?',
        [courseId]
      );
      
      const settings = gradebookSettings[0] || {};
      
      // Get all assignments for the course
      const [assignments] = await connection.query(
        `SELECT id, title, total_points, deadline, category, 
                weight, is_extra_credit, is_active
         FROM assignments 
         WHERE course_id = ? AND is_active = true
         ORDER BY deadline ASC`,
        [courseId]
      );
      
      // Get all enrolled students
      const [students] = await connection.query(
        `SELECT u.id, u.identifier, u.first_name, u.last_name, u.email,
                e.enrollment_date, e.status
         FROM users u
         JOIN enrollments e ON u.id = e.student_id
         WHERE e.course_id = ? AND e.status = 'active'
         ORDER BY u.last_name, u.first_name`,
        [courseId]
      );
      
      // Get all grades for the course
      const [grades] = await connection.query(
        `SELECT s.student_id, s.assignment_id, s.grade, s.normalized_grade,
                s.submission_time, s.is_late, s.is_published
         FROM submissions s
         JOIN assignments a ON s.assignment_id = a.id
         WHERE a.course_id = ? AND s.grade IS NOT NULL`,
        [courseId]
      );
      
      // Organize grades by student and assignment
      const gradeMatrix = {};
      students.forEach(student => {
        gradeMatrix[student.id] = {};
        assignments.forEach(assignment => {
          gradeMatrix[student.id][assignment.id] = null;
        });
      });
      
      grades.forEach(grade => {
        if (gradeMatrix[grade.student_id]) {
          gradeMatrix[grade.student_id][grade.assignment_id] = {
            grade: grade.grade,
            normalizedGrade: grade.normalized_grade,
            submissionTime: grade.submission_time,
            isLate: grade.is_late,
            isPublished: grade.is_published
          };
        }
      });
      
      // Calculate student totals and course statistics
      const studentStats = students.map(student => {
        const studentGrades = gradeMatrix[student.id];
        const stats = this.calculateStudentGrades(studentGrades, assignments, settings);
        
        return {
          ...student,
          grades: studentGrades,
          ...stats
        };
      });
      
      // Calculate assignment statistics
      const assignmentStats = assignments.map(assignment => {
        const assignmentGrades = students.map(student => 
          gradeMatrix[student.id][assignment.id]
        ).filter(grade => grade !== null);
        
        return {
          ...assignment,
          submissionCount: assignmentGrades.length,
          averageGrade: assignmentGrades.length > 0 
            ? assignmentGrades.reduce((sum, g) => sum + g.normalizedGrade, 0) / assignmentGrades.length 
            : 0,
          minGrade: assignmentGrades.length > 0 
            ? Math.min(...assignmentGrades.map(g => g.normalizedGrade)) 
            : 0,
          maxGrade: assignmentGrades.length > 0 
            ? Math.max(...assignmentGrades.map(g => g.normalizedGrade)) 
            : 0,
          submissionRate: (assignmentGrades.length / students.length) * 100
        };
      });
      
      // Calculate course-wide statistics
      const courseStats = this.calculateCourseStatistics(studentStats, assignmentStats);
      
      return {
        course,
        settings,
        assignments: assignmentStats,
        students: studentStats,
        statistics: courseStats,
        metadata: {
          totalStudents: students.length,
          totalAssignments: assignments.length,
          lastUpdated: new Date()
        }
      };
      
    } catch (error) {
      logger.error('Error getting gradebook:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update gradebook settings
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} settings - New settings
   * @returns {Promise<Object>} Updated settings
   */
  async updateGradebookSettings(courseId, teacherId, settings) {
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
      
      const {
        gradingScale,
        weightAssignments,
        dropLowestScores,
        latePenaltyType,
        latePenaltyValue,
        gracePeriodHours,
        autoPublishGrades,
        showStatisticsToStudents,
        roundingMethod,
        extraCreditPolicy
      } = settings;
      
      // Update or insert settings
      await connection.query(
        `INSERT INTO gradebook_settings 
         (course_id, grading_scale, weight_assignments, drop_lowest_scores,
          late_penalty_type, late_penalty_value, grace_period_hours,
          auto_publish_grades, show_statistics_to_students, rounding_method)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         grading_scale = VALUES(grading_scale),
         weight_assignments = VALUES(weight_assignments),
         drop_lowest_scores = VALUES(drop_lowest_scores),
         late_penalty_type = VALUES(late_penalty_type),
         late_penalty_value = VALUES(late_penalty_value),
         grace_period_hours = VALUES(grace_period_hours),
         auto_publish_grades = VALUES(auto_publish_grades),
         show_statistics_to_students = VALUES(show_statistics_to_students),
         rounding_method = VALUES(rounding_method),
         updated_at = NOW()`,
        [
          courseId,
          JSON.stringify(gradingScale || {}),
          weightAssignments,
          dropLowestScores || 0,
          latePenaltyType || 'percentage',
          latePenaltyValue || 0,
          gracePeriodHours || 0,
          autoPublishGrades || false,
          showStatisticsToStudents || true,
          roundingMethod || 'round_nearest'
        ]
      );
      
      await connection.commit();
      
      // Get updated settings
      const [updatedSettings] = await connection.query(
        'SELECT * FROM gradebook_settings WHERE course_id = ?',
        [courseId]
      );
      
      logger.info(`Gradebook settings updated for course ${courseId} by teacher ${teacherId}`);
      
      return {
        ...updatedSettings[0],
        gradingScale: JSON.parse(updatedSettings[0].grading_scale || '{}')
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating gradebook settings:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Export gradebook to CSV
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export file information
   */
  async exportGradebook(courseId, teacherId, options = {}) {
    try {
      const {
        includePersonalInfo = true,
        includeStatistics = true,
        format = 'csv',
        fileName
      } = options;
      
      // Get gradebook data
      const gradebook = await this.getGradebook(courseId, teacherId);
      
      // Generate filename if not provided
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const defaultFileName = `gradebook-${gradebook.course.code}-${timestamp}.csv`;
      const exportFileName = fileName || defaultFileName;
      
      // Prepare export data
      const exportData = [];
      
      // Header row
      const headers = ['Student ID', 'Last Name', 'First Name'];
      if (includePersonalInfo) {
        headers.push('Email');
      }
      
      // Add assignment columns
      gradebook.assignments.forEach(assignment => {
        headers.push(`${assignment.title} (${assignment.total_points}pts)`);
      });
      
      if (includeStatistics) {
        headers.push('Total Points', 'Percentage', 'Letter Grade', 'Assignments Completed');
      }
      
      exportData.push(headers);
      
      // Data rows
      gradebook.students.forEach(student => {
        const row = [
          student.identifier,
          student.last_name,
          student.first_name
        ];
        
        if (includePersonalInfo) {
          row.push(student.email);
        }
        
        // Add grades for each assignment
        gradebook.assignments.forEach(assignment => {
          const grade = student.grades[assignment.id];
          row.push(grade ? grade.grade : '');
        });
        
        if (includeStatistics) {
          row.push(
            student.totalPointsEarned || 0,
            student.percentageGrade ? student.percentageGrade.toFixed(2) + '%' : '',
            student.letterGrade || '',
            student.completedAssignments || 0
          );
        }
        
        exportData.push(row);
      });
      
      // Create export directory if it doesn't exist
      const exportDir = path.join(__dirname, '../../storage/gradebook_exports');
      await fs.mkdir(exportDir, { recursive: true });
      
      const exportPath = path.join(exportDir, exportFileName);
      
      // Write CSV file
      if (format === 'csv') {
        const csvContent = exportData.map(row => 
          row.map(cell => `"${cell}"`).join(',')
        ).join('\n');
        
        await fs.writeFile(exportPath, csvContent, 'utf8');
      }
      
      logger.info(`Gradebook exported for course ${courseId} by teacher ${teacherId}: ${exportFileName}`);
      
      return {
        fileName: exportFileName,
        filePath: exportPath,
        fileSize: (await fs.stat(exportPath)).size,
        exportDate: new Date(),
        rowCount: exportData.length - 1, // Exclude header
        columnCount: headers.length
      };
      
    } catch (error) {
      logger.error('Error exporting gradebook:', error);
      throw error;
    }
  }
  
  /**
   * Import grades from CSV
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @param {String} filePath - Path to CSV file
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import results
   */
  async importGrades(courseId, teacherId, filePath, options = {}) {
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
      
      const {
        updateExisting = true,
        createMissingAssignments = false,
        validateStudents = true
      } = options;
      
      // Read and parse CSV file
      const csvData = [];
      await new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv())
          .on('data', (row) => csvData.push(row))
          .on('end', resolve)
          .on('error', reject);
      });
      
      if (csvData.length === 0) {
        throw createError(400, 'CSV file is empty or invalid');
      }
      
      // Get existing students and assignments
      const [existingStudents] = await connection.query(
        `SELECT u.id, u.identifier, u.email
         FROM users u
         JOIN enrollments e ON u.id = e.student_id
         WHERE e.course_id = ? AND e.status = 'active'`,
        [courseId]
      );
      
      const [existingAssignments] = await connection.query(
        'SELECT id, title FROM assignments WHERE course_id = ? AND is_active = true',
        [courseId]
      );
      
      const studentMap = new Map();
      existingStudents.forEach(student => {
        studentMap.set(student.identifier, student);
        studentMap.set(student.email, student);
      });
      
      const assignmentMap = new Map();
      existingAssignments.forEach(assignment => {
        assignmentMap.set(assignment.title, assignment);
      });
      
      const results = {
        successful: [],
        failed: [],
        warnings: [],
        created: [],
        updated: []
      };
      
      // Process each row
      for (const row of csvData) {
        try {
          // Identify student
          const studentIdentifier = row['Student ID'] || row['student_id'] || row['identifier'];
          const studentEmail = row['Email'] || row['email'];
          
          const student = studentMap.get(studentIdentifier) || studentMap.get(studentEmail);
          
          if (!student && validateStudents) {
            results.failed.push({
              row: row,
              error: 'Student not found or not enrolled in course'
            });
            continue;
          }
          
          // Process each grade column
          for (const [columnName, gradeValue] of Object.entries(row)) {
            if (columnName.includes('Student') || columnName.includes('Email') || 
                columnName.includes('Name') || !gradeValue || gradeValue === '') {
              continue;
            }
            
            // Extract assignment title and points from column name
            const assignmentTitle = columnName.replace(/\s*\([^)]*\)$/, '').trim();
            const assignment = assignmentMap.get(assignmentTitle);
            
            if (!assignment && !createMissingAssignments) {
              results.warnings.push({
                message: `Assignment "${assignmentTitle}" not found`,
                row: row
              });
              continue;
            }
            
            // Parse grade value
            const grade = parseFloat(gradeValue);
            if (isNaN(grade)) {
              results.warnings.push({
                message: `Invalid grade value "${gradeValue}" for assignment "${assignmentTitle}"`,
                row: row
              });
              continue;
            }
            
            // Create or update submission
            let assignmentId = assignment ? assignment.id : null;
            
            if (!assignment && createMissingAssignments) {
              // Create new assignment
              const [newAssignment] = await connection.query(
                `INSERT INTO assignments (course_id, title, total_points, deadline, is_active)
                 VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), true)`,
                [courseId, assignmentTitle, Math.max(grade, 100)]
              );
              
              assignmentId = newAssignment.insertId;
              results.created.push({
                type: 'assignment',
                title: assignmentTitle,
                id: assignmentId
              });
            }
            
            if (assignmentId && student) {
              // Check if submission exists
              const [existingSubmission] = await connection.query(
                'SELECT id, grade FROM submissions WHERE assignment_id = ? AND student_id = ?',
                [assignmentId, student.id]
              );
              
              if (existingSubmission.length > 0 && !updateExisting) {
                results.warnings.push({
                  message: `Submission already exists for student ${student.identifier}, assignment "${assignmentTitle}"`,
                  row: row
                });
                continue;
              }
              
              const normalizedGrade = assignment ? (grade / assignment.total_points) * 100 : grade;
              
              if (existingSubmission.length > 0) {
                // Update existing submission
                await connection.query(
                  `UPDATE submissions 
                   SET grade = ?, normalized_grade = ?, graded_by = ?, graded_at = NOW()
                   WHERE id = ?`,
                  [grade, normalizedGrade, teacherId, existingSubmission[0].id]
                );
                
                results.updated.push({
                  studentId: student.id,
                  assignmentId,
                  previousGrade: existingSubmission[0].grade,
                  newGrade: grade
                });
              } else {
                // Create new submission
                await connection.query(
                  `INSERT INTO submissions 
                   (assignment_id, student_id, grade, normalized_grade, status, 
                    graded_by, graded_at, submission_time)
                   VALUES (?, ?, ?, ?, 'graded', ?, NOW(), NOW())`,
                  [assignmentId, student.id, grade, normalizedGrade, teacherId]
                );
                
                results.successful.push({
                  studentId: student.id,
                  assignmentId,
                  grade
                });
              }
            }
          }
          
        } catch (rowError) {
          logger.error('Error processing CSV row:', rowError);
          results.failed.push({
            row: row,
            error: rowError.message
          });
        }
      }
      
      await connection.commit();
      
      logger.info(`Grades imported for course ${courseId} by teacher ${teacherId}: ${results.successful.length} successful, ${results.failed.length} failed`);
      
      return results;
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error importing grades:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get gradebook statistics
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Gradebook statistics
   */
  async getGradebookStatistics(courseId, teacherId) {
    try {
      const gradebook = await this.getGradebook(courseId, teacherId);
      
      const stats = {
        course: gradebook.statistics,
        assignments: gradebook.assignments.map(assignment => ({
          id: assignment.id,
          title: assignment.title,
          submissionRate: assignment.submissionRate,
          averageGrade: assignment.averageGrade,
          difficulty: this.calculateAssignmentDifficulty(assignment),
          gradeDistribution: this.calculateGradeDistribution(
            gradebook.students.map(s => s.grades[assignment.id]).filter(g => g !== null)
          )
        })),
        students: {
          totalCount: gradebook.students.length,
          passingCount: gradebook.students.filter(s => s.percentageGrade >= 60).length,
          averageGrade: gradebook.statistics.courseAverage,
          gradeDistribution: this.calculateGradeDistribution(
            gradebook.students.map(s => ({ normalizedGrade: s.percentageGrade }))
          )
        }
      };
      
      return stats;
      
    } catch (error) {
      logger.error('Error getting gradebook statistics:', error);
      throw error;
    }
  }
  
  /**
   * Recalculate grades for all students in a course
   * @param {Number} courseId - Course ID
   * @param {Number} teacherId - Teacher ID
   * @returns {Promise<Object>} Recalculation results
   */
  async recalculateGrades(courseId, teacherId) {
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
      
      // Get gradebook settings
      const [settings] = await connection.query(
        'SELECT * FROM gradebook_settings WHERE course_id = ?',
        [courseId]
      );
      
      const gradebookSettings = settings[0] || {};
      
      // Get all assignments and their weights
      const [assignments] = await connection.query(
        'SELECT * FROM assignments WHERE course_id = ? AND is_active = true',
        [courseId]
      );
      
      // Get all students
      const [students] = await connection.query(
        `SELECT u.id
         FROM users u
         JOIN enrollments e ON u.id = e.student_id
         WHERE e.course_id = ? AND e.status = 'active'`,
        [courseId]
      );
      
      let recalculatedCount = 0;
      
      for (const student of students) {
        // Get all grades for this student
        const [grades] = await connection.query(
          `SELECT s.assignment_id, s.grade, s.normalized_grade, s.is_late,
                  a.total_points, a.weight, a.category, a.deadline
           FROM submissions s
           JOIN assignments a ON s.assignment_id = a.id
           WHERE a.course_id = ? AND s.student_id = ? AND s.grade IS NOT NULL`,
          [courseId, student.id]
        );
        
        // Recalculate grades based on current settings
        const recalculatedGrades = this.applyGradingPolicies(grades, assignments, gradebookSettings);
        
        // Update any grades that changed due to policy updates
        for (const updatedGrade of recalculatedGrades) {
          if (updatedGrade.changed) {
            await connection.query(
              'UPDATE submissions SET normalized_grade = ? WHERE assignment_id = ? AND student_id = ?',
              [updatedGrade.normalizedGrade, updatedGrade.assignmentId, student.id]
            );
            recalculatedCount++;
          }
        }
      }
      
      // Update course statistics
      await connection.query('CALL UpdateCourseStatistics(?)', [courseId]);
      
      await connection.commit();
      
      logger.info(`Grades recalculated for course ${courseId} by teacher ${teacherId}: ${recalculatedCount} grades updated`);
      
      return {
        success: true,
        recalculatedCount,
        affectedStudents: students.length,
        message: 'Grades recalculated successfully'
      };
      
    } catch (error) {
      await connection.rollback();
      logger.error('Error recalculating grades:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Calculate student grades based on assignments and settings
   * @param {Object} studentGrades - Student's grades
   * @param {Array} assignments - Course assignments
   * @param {Object} settings - Gradebook settings
   * @returns {Object} Calculated statistics
   */
  calculateStudentGrades(studentGrades, assignments, settings) {
    const completedAssignments = Object.values(studentGrades).filter(grade => grade !== null);
    const totalPointsEarned = completedAssignments.reduce((sum, grade) => sum + grade.grade, 0);
    const totalPossiblePoints = assignments.reduce((sum, assignment) => sum + assignment.total_points, 0);
    
    let percentageGrade = 0;
    if (totalPossiblePoints > 0) {
      if (settings.weight_assignments && assignments.some(a => a.weight)) {
        // Weighted calculation
        let weightedSum = 0;
        let totalWeight = 0;
        
        assignments.forEach(assignment => {
          const grade = studentGrades[assignment.id];
          if (grade) {
            const weight = assignment.weight || 1;
            weightedSum += grade.normalizedGrade * weight;
            totalWeight += weight;
          }
        });
        
        percentageGrade = totalWeight > 0 ? weightedSum / totalWeight : 0;
      } else {
        // Simple percentage calculation
        percentageGrade = (totalPointsEarned / totalPossiblePoints) * 100;
      }
    }
    
    // Apply rounding
    if (settings.rounding_method === 'round_up') {
      percentageGrade = Math.ceil(percentageGrade);
    } else if (settings.rounding_method === 'round_down') {
      percentageGrade = Math.floor(percentageGrade);
    } else if (settings.rounding_method === 'round_nearest') {
      percentageGrade = Math.round(percentageGrade);
    }
    
    // Calculate letter grade
    const letterGrade = this.calculateLetterGrade(percentageGrade, settings.grading_scale);
    
    return {
      totalPointsEarned,
      totalPossiblePoints,
      percentageGrade,
      letterGrade,
      completedAssignments: completedAssignments.length,
      pendingAssignments: assignments.length - completedAssignments.length,
      lateSubmissions: completedAssignments.filter(grade => grade.isLate).length
    };
  }
  
  /**
   * Calculate course-wide statistics
   * @param {Array} students - Student data
   * @param {Array} assignments - Assignment data
   * @returns {Object} Course statistics
   */
  calculateCourseStatistics(students, assignments) {
    const validGrades = students.filter(s => s.percentageGrade !== undefined && s.percentageGrade !== null);
    
    return {
      courseAverage: validGrades.length > 0 
        ? validGrades.reduce((sum, s) => sum + s.percentageGrade, 0) / validGrades.length 
        : 0,
      passingRate: validGrades.length > 0 
        ? (validGrades.filter(s => s.percentageGrade >= 60).length / validGrades.length) * 100 
        : 0,
      completionRate: students.length > 0 
        ? (students.reduce((sum, s) => sum + s.completedAssignments, 0) / (students.length * assignments.length)) * 100 
        : 0,
      averageSubmissionRate: assignments.length > 0 
        ? assignments.reduce((sum, a) => sum + a.submissionRate, 0) / assignments.length 
        : 0
    };
  }
  
  /**
   * Calculate letter grade from percentage
   * @param {Number} percentage - Grade percentage
   * @param {Object} gradingScale - Custom grading scale
   * @returns {String} Letter grade
   */
  calculateLetterGrade(percentage, gradingScale) {
    const defaultScale = {
      'A': 90,
      'B': 80,
      'C': 70,
      'D': 60,
      'F': 0
    };
    
    const scale = gradingScale ? JSON.parse(gradingScale) : defaultScale;
    
    for (const [letter, threshold] of Object.entries(scale).sort((a, b) => b[1] - a[1])) {
      if (percentage >= threshold) {
        return letter;
      }
    }
    
    return 'F';
  }
  
  /**
   * Calculate assignment difficulty based on performance
   * @param {Object} assignment - Assignment data
   * @returns {String} Difficulty level
   */
  calculateAssignmentDifficulty(assignment) {
    if (assignment.averageGrade >= 85) return 'Easy';
    if (assignment.averageGrade >= 70) return 'Medium';
    if (assignment.averageGrade >= 60) return 'Hard';
    return 'Very Hard';
  }
  
  /**
   * Calculate grade distribution
   * @param {Array} grades - Array of grade objects
   * @returns {Object} Grade distribution
   */
  calculateGradeDistribution(grades) {
    const distribution = {
      'A (90-100)': 0,
      'B (80-89)': 0,
      'C (70-79)': 0,
      'D (60-69)': 0,
      'F (0-59)': 0
    };
    
    grades.forEach(grade => {
      const score = grade.normalizedGrade;
      if (score >= 90) distribution['A (90-100)']++;
      else if (score >= 80) distribution['B (80-89)']++;
      else if (score >= 70) distribution['C (70-79)']++;
      else if (score >= 60) distribution['D (60-69)']++;
      else distribution['F (0-59)']++;
    });
    
    return distribution;
  }
  
  /**
   * Apply grading policies to recalculate grades
   * @param {Array} grades - Student grades
   * @param {Array} assignments - Course assignments
   * @param {Object} settings - Gradebook settings
   * @returns {Array} Updated grades
   */
  applyGradingPolicies(grades, assignments, settings) {
    const updatedGrades = [];
    
    grades.forEach(grade => {
      let normalizedGrade = grade.normalized_grade;
      let changed = false;
      
      // Apply late penalty
      if (grade.is_late && settings.late_penalty_value > 0) {
        if (settings.late_penalty_type === 'percentage') {
          const penalty = normalizedGrade * (settings.late_penalty_value / 100);
          normalizedGrade = Math.max(0, normalizedGrade - penalty);
          changed = true;
        } else if (settings.late_penalty_type === 'points') {
          const assignment = assignments.find(a => a.id === grade.assignment_id);
          if (assignment) {
            const penaltyPercentage = (settings.late_penalty_value / assignment.total_points) * 100;
            normalizedGrade = Math.max(0, normalizedGrade - penaltyPercentage);
            changed = true;
          }
        }
      }
      
      updatedGrades.push({
        assignmentId: grade.assignment_id,
        normalizedGrade,
        changed: changed && Math.abs(normalizedGrade - grade.normalized_grade) > 0.01
      });
    });
    
    return updatedGrades;
  }
}

module.exports = new GradeBookService();
