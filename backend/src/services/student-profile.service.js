const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs').promises;

/**
 * Student Profile Management Service - Handles student profile, preferences, and account management
 */
class StudentProfileService {

  /**
   * Get comprehensive student profile information
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Student profile data
   */
  async getStudentProfile(studentId) {
    const connection = await pool.getConnection();
    
    try {
      // Get basic student information
      const [student] = await connection.query(`
        SELECT 
          u.id, u.identifier, u.first_name, u.last_name, u.email,
          u.profile_image, u.is_active, u.last_login, u.created_at,
          sp.year_level, sp.major, sp.cumulative_gpa, sp.bio
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id
        WHERE u.id = ? AND u.role = 'student'
      `, [studentId]);

      if (student.length === 0) {
        throw createError(404, 'Student profile not found');
      }

      const studentData = student[0];

      // Get academic statistics
      const [academicStats] = await connection.query(`
        SELECT 
          COUNT(DISTINCT e.course_id) as total_courses,
          COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.course_id END) as active_courses,
          COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.course_id END) as completed_courses,
          SUM(DISTINCT CASE WHEN e.status = 'completed' THEN c.credits ELSE 0 END) as completed_credits,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as total_submissions,
          COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_submissions,
          AVG(s.normalized_grade) as current_gpa,
          MIN(e.enrollment_date) as first_enrollment_date,
          MAX(s.submission_time) as last_activity_date
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ?
      `, [studentId, studentId]);

      studentData.academicStatistics = academicStats[0];

      // Get current enrolled courses
      const [currentCourses] = await connection.query(`
        SELECT 
          c.id, c.code, c.title, c.semester, c.academic_year, c.credits,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name,
          e.enrollment_date,
          COUNT(DISTINCT a.id) as total_assignments,
          COUNT(DISTINCT s.id) as submitted_assignments,
          AVG(s.normalized_grade) as course_average
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN users t ON c.teacher_id = t.id
        LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? AND e.status = 'active'
        GROUP BY c.id
        ORDER BY c.title
      `, [studentId, studentId]);

      studentData.currentCourses = currentCourses;

      // Get recent activity (last 10 submissions)
      const [recentActivity] = await connection.query(`
        SELECT 
          s.id as submission_id, s.submission_time, s.grade, s.status,
          a.title as assignment_title, a.deadline,
          c.code as course_code, c.title as course_title
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN courses c ON a.course_id = c.id
        WHERE s.student_id = ?
        ORDER BY s.submission_time DESC
        LIMIT 10
      `, [studentId]);

      studentData.recentActivity = recentActivity;

      // Get notification preferences
      const [notificationPrefs] = await connection.query(`
        SELECT 
          notification_type, is_enabled, delivery_method
        FROM user_notification_preferences
        WHERE user_id = ?
      `, [studentId]);

      studentData.notificationPreferences = notificationPrefs;

      return studentData;

    } catch (error) {
      logger.error('Error getting student profile:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to load student profile');
    } finally {
      connection.release();
    }
  }

  /**
   * Update student profile information
   * @param {Number} studentId - Student ID
   * @param {Object} profileData - Profile update data
   * @returns {Promise<Object>} Updated profile
   */
  async updateStudentProfile(studentId, profileData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      const {
        firstName,
        lastName,
        email,
        yearLevel,
        major,
        bio,
        notificationPreferences
      } = profileData;

      // Update basic user information
      if (firstName || lastName || email) {
        const userUpdateFields = [];
        const userUpdateValues = [];

        if (firstName) {
          userUpdateFields.push('first_name = ?');
          userUpdateValues.push(firstName);
        }
        if (lastName) {
          userUpdateFields.push('last_name = ?');
          userUpdateValues.push(lastName);
        }
        if (email) {
          // Check if email is already taken
          const [existingUser] = await connection.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, studentId]
          );
          
          if (existingUser.length > 0) {
            throw createError(400, 'Email address is already in use');
          }

          userUpdateFields.push('email = ?');
          userUpdateValues.push(email);
        }

        if (userUpdateFields.length > 0) {
          userUpdateFields.push('updated_at = NOW()');
          userUpdateValues.push(studentId);

          await connection.query(`
            UPDATE users 
            SET ${userUpdateFields.join(', ')}
            WHERE id = ?
          `, userUpdateValues);
        }
      }

      // Update student profile specific information
      if (yearLevel || major || bio !== undefined) {
        // Check if student profile exists
        const [existingProfile] = await connection.query(
          'SELECT id FROM student_profiles WHERE user_id = ?',
          [studentId]
        );

        if (existingProfile.length > 0) {
          // Update existing profile
          const profileUpdateFields = [];
          const profileUpdateValues = [];

          if (yearLevel) {
            profileUpdateFields.push('year_level = ?');
            profileUpdateValues.push(yearLevel);
          }
          if (major) {
            profileUpdateFields.push('major = ?');
            profileUpdateValues.push(major);
          }
          if (bio !== undefined) {
            profileUpdateFields.push('bio = ?');
            profileUpdateValues.push(bio);
          }

          if (profileUpdateFields.length > 0) {
            profileUpdateValues.push(studentId);
            await connection.query(`
              UPDATE student_profiles 
              SET ${profileUpdateFields.join(', ')}
              WHERE user_id = ?
            `, profileUpdateValues);
          }
        } else {
          // Create new profile
          await connection.query(`
            INSERT INTO student_profiles (user_id, year_level, major, bio)
            VALUES (?, ?, ?, ?)
          `, [studentId, yearLevel || null, major || null, bio || null]);
        }
      }

      // Update notification preferences
      if (notificationPreferences && Array.isArray(notificationPreferences)) {
        // Delete existing preferences
        await connection.query(
          'DELETE FROM user_notification_preferences WHERE user_id = ?',
          [studentId]
        );

        // Insert new preferences
        if (notificationPreferences.length > 0) {
          const prefValues = notificationPreferences.map(pref => [
            studentId,
            pref.notificationType,
            pref.isEnabled,
            pref.deliveryMethod || 'email'
          ]);

          await connection.query(`
            INSERT INTO user_notification_preferences 
            (user_id, notification_type, is_enabled, delivery_method)
            VALUES ?
          `, [prefValues]);
        }
      }

      // Log profile update activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description, metadata)
        VALUES (?, 'profile_updated', 'Student updated their profile', ?)
      `, [studentId, JSON.stringify(profileData)]);

      await connection.commit();

      // Return updated profile
      return await this.getStudentProfile(studentId);

    } catch (error) {
      await connection.rollback();
      logger.error('Error updating student profile:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to update profile');
    } finally {
      connection.release();
    }
  }

  /**
   * Update student profile image
   * @param {Number} studentId - Student ID
   * @param {Object} imageFile - Image file data
   * @returns {Promise<Object>} Upload result
   */
  async updateProfileImage(studentId, imageFile) {
    const connection = await pool.getConnection();
    
    try {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(imageFile.mimetype)) {
        throw createError(400, 'Invalid file type. Only JPEG, PNG, and GIF images are allowed.');
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (imageFile.size > maxSize) {
        throw createError(400, 'File size too large. Maximum size is 5MB.');
      }

      // Create upload directory if it doesn't exist
      const uploadDir = path.join(__dirname, '../../storage/profile_images');
      await fs.mkdir(uploadDir, { recursive: true });

      // Generate unique filename
      const fileExtension = path.extname(imageFile.originalname);
      const fileName = `student_${studentId}_${Date.now()}${fileExtension}`;
      const filePath = path.join(uploadDir, fileName);

      // Save file
      await fs.writeFile(filePath, imageFile.buffer);

      // Get current profile image to delete old one
      const [currentUser] = await connection.query(
        'SELECT profile_image FROM users WHERE id = ?',
        [studentId]
      );

      // Update database
      await connection.query(
        'UPDATE users SET profile_image = ?, updated_at = NOW() WHERE id = ?',
        [fileName, studentId]
      );

      // Delete old profile image if exists
      if (currentUser[0]?.profile_image) {
        const oldImagePath = path.join(uploadDir, currentUser[0].profile_image);
        try {
          await fs.unlink(oldImagePath);
        } catch (deleteError) {
          logger.warn('Failed to delete old profile image:', deleteError);
        }
      }

      // Log activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description)
        VALUES (?, 'profile_image_updated', 'Student updated their profile image')
      `, [studentId]);

      return {
        success: true,
        profileImage: fileName,
        imageUrl: `/storage/profile_images/${fileName}`,
        message: 'Profile image updated successfully'
      };

    } catch (error) {
      logger.error('Error updating profile image:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to update profile image');
    } finally {
      connection.release();
    }
  }

  /**
   * Change student password
   * @param {Number} studentId - Student ID
   * @param {Object} passwordData - Password change data
   * @returns {Promise<Object>} Password change result
   */
  async changePassword(studentId, passwordData) {
    const connection = await pool.getConnection();
    
    try {
      const { currentPassword, newPassword, confirmPassword } = passwordData;

      // Validate input
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw createError(400, 'All password fields are required');
      }

      if (newPassword !== confirmPassword) {
        throw createError(400, 'New password and confirmation do not match');
      }

      if (newPassword.length < 8) {
        throw createError(400, 'New password must be at least 8 characters long');
      }

      // Get current password hash
      const [user] = await connection.query(
        'SELECT password FROM users WHERE id = ?',
        [studentId]
      );

      if (user.length === 0) {
        throw createError(404, 'User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user[0].password);
      if (!isCurrentPasswordValid) {
        throw createError(400, 'Current password is incorrect');
      }

      // Hash new password
      const saltRounds = 12;
      const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await connection.query(
        'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
        [hashedNewPassword, studentId]
      );

      // Log activity (without password details)
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description)
        VALUES (?, 'password_changed', 'Student changed their password')
      `, [studentId]);

      // Invalidate all existing refresh tokens for security
      await connection.query(
        'DELETE FROM refresh_tokens WHERE user_id = ?',
        [studentId]
      );

      return {
        success: true,
        message: 'Password changed successfully. Please log in again with your new password.'
      };

    } catch (error) {
      logger.error('Error changing password:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to change password');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's academic record summary
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Academic record
   */
  async getAcademicRecord(studentId) {
    const connection = await pool.getConnection();
    
    try {
      // Get semester-wise academic record
      const [semesterRecords] = await connection.query(`
        SELECT 
          c.semester, c.academic_year,
          COUNT(DISTINCT c.id) as courses_taken,
          SUM(c.credits) as credits_attempted,
          SUM(CASE WHEN e.final_grade IS NOT NULL THEN c.credits ELSE 0 END) as credits_earned,
          AVG(CASE 
            WHEN e.final_grade = 'A+' THEN 4.0
            WHEN e.final_grade = 'A' THEN 4.0
            WHEN e.final_grade = 'A-' THEN 3.7
            WHEN e.final_grade = 'B+' THEN 3.3
            WHEN e.final_grade = 'B' THEN 3.0
            WHEN e.final_grade = 'B-' THEN 2.7
            WHEN e.final_grade = 'C+' THEN 2.3
            WHEN e.final_grade = 'C' THEN 2.0
            WHEN e.final_grade = 'C-' THEN 1.7
            WHEN e.final_grade = 'D' THEN 1.0
            WHEN e.final_grade = 'F' THEN 0.0
            ELSE NULL
          END) as semester_gpa,
          GROUP_CONCAT(
            CONCAT(c.code, ':', e.final_grade, ':', c.credits)
            ORDER BY c.code
            SEPARATOR '|'
          ) as courses_detail
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ? AND e.status IN ('completed', 'active')
        GROUP BY c.semester, c.academic_year
        ORDER BY c.academic_year DESC, 
                 CASE c.semester 
                   WHEN 'Fall' THEN 3 
                   WHEN 'Spring' THEN 2 
                   WHEN 'Summer' THEN 1 
                   ELSE 0 
                 END DESC
      `, [studentId]);

      // Parse course details for each semester
      const academicRecord = semesterRecords.map(record => {
        const courses = record.courses_detail ? 
          record.courses_detail.split('|').map(courseStr => {
            const [code, grade, credits] = courseStr.split(':');
            return { code, grade, credits: parseInt(credits) };
          }) : [];

        return {
          ...record,
          courses,
          courses_detail: undefined // Remove raw string
        };
      });

      // Calculate cumulative statistics
      const [cumulativeStats] = await connection.query(`
        SELECT 
          COUNT(DISTINCT e.course_id) as total_courses,
          SUM(c.credits) as total_credits_attempted,
          SUM(CASE WHEN e.final_grade IS NOT NULL AND e.final_grade != 'F' THEN c.credits ELSE 0 END) as total_credits_earned,
          COUNT(CASE WHEN e.final_grade = 'A+' OR e.final_grade = 'A' THEN 1 END) as a_grades,
          COUNT(CASE WHEN e.final_grade LIKE 'B%' THEN 1 END) as b_grades,
          COUNT(CASE WHEN e.final_grade LIKE 'C%' THEN 1 END) as c_grades,
          COUNT(CASE WHEN e.final_grade = 'D' THEN 1 END) as d_grades,
          COUNT(CASE WHEN e.final_grade = 'F' THEN 1 END) as f_grades,
          MIN(e.enrollment_date) as first_enrollment,
          MAX(CASE WHEN e.status = 'completed' THEN e.enrollment_date END) as last_completion
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ? AND e.status IN ('completed', 'active')
      `, [studentId]);

      // Calculate cumulative GPA
      const [gpaCalculation] = await connection.query(`
        SELECT 
          SUM(
            CASE 
              WHEN e.final_grade = 'A+' THEN 4.0 * c.credits
              WHEN e.final_grade = 'A' THEN 4.0 * c.credits
              WHEN e.final_grade = 'A-' THEN 3.7 * c.credits
              WHEN e.final_grade = 'B+' THEN 3.3 * c.credits
              WHEN e.final_grade = 'B' THEN 3.0 * c.credits
              WHEN e.final_grade = 'B-' THEN 2.7 * c.credits
              WHEN e.final_grade = 'C+' THEN 2.3 * c.credits
              WHEN e.final_grade = 'C' THEN 2.0 * c.credits
              WHEN e.final_grade = 'C-' THEN 1.7 * c.credits
              WHEN e.final_grade = 'D' THEN 1.0 * c.credits
              WHEN e.final_grade = 'F' THEN 0.0 * c.credits
              ELSE 0
            END
          ) as total_grade_points,
          SUM(CASE WHEN e.final_grade IS NOT NULL THEN c.credits ELSE 0 END) as total_graded_credits
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = ? AND e.status IN ('completed', 'active')
      `, [studentId]);

      const cumulativeGPA = gpaCalculation[0].total_graded_credits > 0 ? 
        (gpaCalculation[0].total_grade_points / gpaCalculation[0].total_graded_credits).toFixed(2) : 0;

      // Get academic standing information
      const academicStanding = this.calculateAcademicStanding(
        parseFloat(cumulativeGPA),
        cumulativeStats[0].total_credits_earned
      );

      return {
        semesterRecords: academicRecord,
        cumulativeStatistics: {
          ...cumulativeStats[0],
          cumulative_gpa: parseFloat(cumulativeGPA),
          academic_standing: academicStanding
        },
        graduationProgress: this.calculateGraduationProgress(cumulativeStats[0].total_credits_earned)
      };

    } catch (error) {
      logger.error('Error getting academic record:', error);
      throw createError(500, 'Failed to load academic record');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's notification preferences
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Notification preferences
   */
  async getNotificationPreferences(studentId) {
    const connection = await pool.getConnection();
    
    try {
      const [preferences] = await connection.query(`
        SELECT notification_type, is_enabled, delivery_method, created_at, updated_at
        FROM user_notification_preferences
        WHERE user_id = ?
        ORDER BY notification_type
      `, [studentId]);

      // If no preferences exist, return defaults
      if (preferences.length === 0) {
        return this.getDefaultNotificationPreferences();
      }

      return {
        preferences,
        lastUpdated: preferences.length > 0 ? 
          Math.max(...preferences.map(p => new Date(p.updated_at).getTime())) : null
      };

    } catch (error) {
      logger.error('Error getting notification preferences:', error);
      throw createError(500, 'Failed to load notification preferences');
    } finally {
      connection.release();
    }
  }

  /**
   * Update student's notification preferences
   * @param {Number} studentId - Student ID
   * @param {Array} preferences - Notification preferences array
   * @returns {Promise<Object>} Update result
   */
  async updateNotificationPreferences(studentId, preferences) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Validate preferences format
      if (!Array.isArray(preferences)) {
        throw createError(400, 'Preferences must be an array');
      }

      const validTypes = [
        'assignment_due', 'grade_published', 'course_announcement',
        'submission_confirmed', 'feedback_available', 'course_reminder'
      ];

      const validMethods = ['email', 'sms', 'push', 'none'];

      for (const pref of preferences) {
        if (!validTypes.includes(pref.notificationType)) {
          throw createError(400, `Invalid notification type: ${pref.notificationType}`);
        }
        if (!validMethods.includes(pref.deliveryMethod)) {
          throw createError(400, `Invalid delivery method: ${pref.deliveryMethod}`);
        }
      }

      // Delete existing preferences
      await connection.query(
        'DELETE FROM user_notification_preferences WHERE user_id = ?',
        [studentId]
      );

      // Insert new preferences
      if (preferences.length > 0) {
        const prefValues = preferences.map(pref => [
          studentId,
          pref.notificationType,
          pref.isEnabled,
          pref.deliveryMethod
        ]);

        await connection.query(`
          INSERT INTO user_notification_preferences 
          (user_id, notification_type, is_enabled, delivery_method)
          VALUES ?
        `, [prefValues]);
      }

      // Log activity
      await connection.query(`
        INSERT INTO activity_logs 
        (user_id, action_type, description)
        VALUES (?, 'notification_preferences_updated', 'Student updated notification preferences')
      `, [studentId]);

      await connection.commit();

      return {
        success: true,
        message: 'Notification preferences updated successfully',
        preferences: await this.getNotificationPreferences(studentId)
      };

    } catch (error) {
      await connection.rollback();
      logger.error('Error updating notification preferences:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to update notification preferences');
    } finally {
      connection.release();
    }
  }

  /**
   * Get student's activity log
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Activity log
   */
  async getActivityLog(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        page = 1,
        limit = 50,
        actionType,
        dateRange = '30_days'
      } = filters;

      const offset = (page - 1) * limit;
      const conditions = ['user_id = ?'];
      const params = [studentId];

      if (actionType) {
        conditions.push('action_type = ?');
        params.push(actionType);
      }

      // Add date range filter
      if (dateRange !== 'all') {
        const dateRangeMap = {
          '7_days': 7,
          '30_days': 30,
          '90_days': 90,
          '1_year': 365
        };
        const days = dateRangeMap[dateRange] || 30;
        conditions.push('created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        params.push(days);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [activities] = await connection.query(`
        SELECT 
          id, action_type, description, reference_id, reference_type,
          metadata, created_at
        FROM activity_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Get total count
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as total
        FROM activity_logs
        ${whereClause}
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get activity summary
      const [activitySummary] = await connection.query(`
        SELECT 
          action_type,
          COUNT(*) as count,
          MAX(created_at) as last_occurrence
        FROM activity_logs
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY action_type
        ORDER BY count DESC
      `, [studentId]);

      return {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        summary: activitySummary
      };

    } catch (error) {
      logger.error('Error getting activity log:', error);
      throw createError(500, 'Failed to load activity log');
    } finally {
      connection.release();
    }
  }

  /**
   * Calculate academic standing based on GPA and credits
   * @param {Number} gpa - Cumulative GPA
   * @param {Number} credits - Total credits earned
   * @returns {String} Academic standing
   */
  calculateAcademicStanding(gpa, credits) {
    if (gpa >= 3.5) {
      return 'Dean\'s List';
    } else if (gpa >= 3.0) {
      return 'Good Standing';
    } else if (gpa >= 2.0) {
      return 'Satisfactory';
    } else if (gpa >= 1.0) {
      return 'Academic Warning';
    } else {
      return 'Academic Probation';
    }
  }

  /**
   * Calculate graduation progress
   * @param {Number} creditsEarned - Total credits earned
   * @returns {Object} Graduation progress information
   */
  calculateGraduationProgress(creditsEarned) {
    const totalCreditsRequired = 120; // Typical bachelor's degree requirement
    const progressPercentage = Math.min(100, (creditsEarned / totalCreditsRequired) * 100);
    
    let classLevel = 'Freshman';
    if (creditsEarned >= 90) {
      classLevel = 'Senior';
    } else if (creditsEarned >= 60) {
      classLevel = 'Junior';
    } else if (creditsEarned >= 30) {
      classLevel = 'Sophomore';
    }

    return {
      creditsEarned,
      creditsRequired: totalCreditsRequired,
      creditsRemaining: Math.max(0, totalCreditsRequired - creditsEarned),
      progressPercentage: Math.round(progressPercentage * 100) / 100,
      classLevel,
      estimatedGraduation: this.estimateGraduationDate(creditsEarned, totalCreditsRequired)
    };
  }

  /**
   * Estimate graduation date based on current progress
   * @param {Number} creditsEarned - Credits earned
   * @param {Number} totalRequired - Total credits required
   * @returns {String} Estimated graduation date
   */
  estimateGraduationDate(creditsEarned, totalRequired) {
    const creditsRemaining = totalRequired - creditsEarned;
    const averageCreditsPerSemester = 15; // Typical full-time load
    const semestersRemaining = Math.ceil(creditsRemaining / averageCreditsPerSemester);
    
    const currentDate = new Date();
    const estimatedDate = new Date(currentDate);
    estimatedDate.setMonth(estimatedDate.getMonth() + (semestersRemaining * 6)); // 6 months per semester
    
    return estimatedDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long' 
    });
  }

  /**
   * Get default notification preferences
   * @returns {Object} Default preferences
   */
  getDefaultNotificationPreferences() {
    return {
      preferences: [
        { notificationType: 'assignment_due', isEnabled: true, deliveryMethod: 'email' },
        { notificationType: 'grade_published', isEnabled: true, deliveryMethod: 'email' },
        { notificationType: 'course_announcement', isEnabled: true, deliveryMethod: 'email' },
        { notificationType: 'submission_confirmed', isEnabled: true, deliveryMethod: 'email' },
        { notificationType: 'feedback_available', isEnabled: true, deliveryMethod: 'email' },
        { notificationType: 'course_reminder', isEnabled: false, deliveryMethod: 'email' }
      ],
      lastUpdated: null
    };
  }
}

module.exports = new StudentProfileService();
