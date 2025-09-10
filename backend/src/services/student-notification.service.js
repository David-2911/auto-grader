const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const moment = require('moment');

/**
 * Student Notification Service - Handles notifications, alerts, and communication for students
 */
class StudentNotificationService {

  /**
   * Get student's notifications with filtering and pagination
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Notifications data
   */
  async getStudentNotifications(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        page = 1,
        limit = 20,
        type, // 'assignment', 'grade', 'announcement', 'reminder', 'system'
        isRead, // true, false, or undefined for all
        priority, // 'high', 'medium', 'low'
        dateRange = '30_days'
      } = filters;

      const offset = (page - 1) * limit;
      const conditions = ['user_id = ?'];
      const params = [studentId];

      if (type) {
        conditions.push('type = ?');
        params.push(type);
      }

      if (isRead !== undefined) {
        conditions.push('is_read = ?');
        params.push(isRead);
      }

      if (priority) {
        conditions.push('priority = ?');
        params.push(priority);
      }

      // Add date range filter
      if (dateRange !== 'all') {
        const dateRangeMap = {
          '7_days': 7,
          '30_days': 30,
          '90_days': 90
        };
        const days = dateRangeMap[dateRange] || 30;
        conditions.push('created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        params.push(days);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      // Get notifications
      const [notifications] = await connection.query(`
        SELECT 
          n.id, n.title, n.message, n.type, n.priority, n.is_read,
          n.reference_id, n.reference_type, n.metadata, n.created_at,
          n.read_at, n.scheduled_for,
          CASE 
            WHEN n.reference_type = 'assignment' THEN a.title
            WHEN n.reference_type = 'course' THEN c.title
            WHEN n.reference_type = 'submission' THEN CONCAT('Submission for ', a2.title)
            ELSE NULL
          END as reference_title,
          CASE 
            WHEN n.reference_type = 'assignment' THEN c2.code
            WHEN n.reference_type = 'course' THEN c.code
            WHEN n.reference_type = 'submission' THEN c3.code
            ELSE NULL
          END as course_code
        FROM notifications n
        LEFT JOIN assignments a ON n.reference_type = 'assignment' AND n.reference_id = a.id
        LEFT JOIN courses c ON n.reference_type = 'course' AND n.reference_id = c.id
        LEFT JOIN courses c2 ON n.reference_type = 'assignment' AND a.course_id = c2.id
        LEFT JOIN submissions s ON n.reference_type = 'submission' AND n.reference_id = s.id
        LEFT JOIN assignments a2 ON s.assignment_id = a2.id
        LEFT JOIN courses c3 ON a2.course_id = c3.id
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset]);

      // Get total count
      const [countResult] = await connection.query(`
        SELECT COUNT(*) as total
        FROM notifications
        ${whereClause}
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get notification summary
      const [summary] = await connection.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
          COUNT(CASE WHEN type = 'assignment' THEN 1 END) as assignment_notifications,
          COUNT(CASE WHEN type = 'grade' THEN 1 END) as grade_notifications,
          COUNT(CASE WHEN type = 'announcement' THEN 1 END) as announcement_notifications,
          COUNT(CASE WHEN priority = 'high' AND is_read = false THEN 1 END) as urgent_unread
        FROM notifications
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      `, [studentId]);

      return {
        notifications,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        summary: summary[0]
      };

    } catch (error) {
      logger.error('Error getting student notifications:', error);
      throw createError(500, 'Failed to load notifications');
    } finally {
      connection.release();
    }
  }

  /**
   * Mark notification as read
   * @param {Number} studentId - Student ID
   * @param {Number} notificationId - Notification ID
   * @returns {Promise<Object>} Update result
   */
  async markNotificationAsRead(studentId, notificationId) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE id = ? AND user_id = ? AND is_read = false
      `, [notificationId, studentId]);

      if (result.affectedRows === 0) {
        throw createError(404, 'Notification not found or already read');
      }

      return {
        success: true,
        message: 'Notification marked as read'
      };

    } catch (error) {
      logger.error('Error marking notification as read:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to mark notification as read');
    } finally {
      connection.release();
    }
  }

  /**
   * Mark multiple notifications as read
   * @param {Number} studentId - Student ID
   * @param {Array} notificationIds - Array of notification IDs
   * @returns {Promise<Object>} Update result
   */
  async markMultipleNotificationsAsRead(studentId, notificationIds) {
    const connection = await pool.getConnection();
    
    try {
      if (!Array.isArray(notificationIds) || notificationIds.length === 0) {
        throw createError(400, 'Valid notification IDs array is required');
      }

      const placeholders = notificationIds.map(() => '?').join(',');
      const [result] = await connection.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE id IN (${placeholders}) AND user_id = ? AND is_read = false
      `, [...notificationIds, studentId]);

      return {
        success: true,
        message: `${result.affectedRows} notification(s) marked as read`,
        updatedCount: result.affectedRows
      };

    } catch (error) {
      logger.error('Error marking multiple notifications as read:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to mark notifications as read');
    } finally {
      connection.release();
    }
  }

  /**
   * Mark all notifications as read
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Update result
   */
  async markAllNotificationsAsRead(studentId) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        UPDATE notifications 
        SET is_read = true, read_at = NOW()
        WHERE user_id = ? AND is_read = false
      `, [studentId]);

      return {
        success: true,
        message: `All ${result.affectedRows} unread notification(s) marked as read`,
        updatedCount: result.affectedRows
      };

    } catch (error) {
      logger.error('Error marking all notifications as read:', error);
      throw createError(500, 'Failed to mark all notifications as read');
    } finally {
      connection.release();
    }
  }

  /**
   * Delete notification
   * @param {Number} studentId - Student ID
   * @param {Number} notificationId - Notification ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteNotification(studentId, notificationId) {
    const connection = await pool.getConnection();
    
    try {
      const [result] = await connection.query(`
        DELETE FROM notifications 
        WHERE id = ? AND user_id = ?
      `, [notificationId, studentId]);

      if (result.affectedRows === 0) {
        throw createError(404, 'Notification not found');
      }

      return {
        success: true,
        message: 'Notification deleted successfully'
      };

    } catch (error) {
      logger.error('Error deleting notification:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to delete notification');
    } finally {
      connection.release();
    }
  }

  /**
   * Get upcoming deadlines and reminders
   * @param {Number} studentId - Student ID
   * @param {Object} options - Options for deadline filtering
   * @returns {Promise<Object>} Upcoming deadlines
   */
  async getUpcomingDeadlines(studentId, options = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        daysAhead = 7,
        includeCompleted = false
      } = options;

      const completedCondition = includeCompleted ? '' : 'AND s.id IS NULL';

      const [deadlines] = await connection.query(`
        SELECT 
          a.id, a.title, a.description, a.deadline, a.total_points,
          a.late_deadline, a.late_penalty,
          c.id as course_id, c.code as course_code, c.title as course_title,
          s.id as submission_id, s.status as submission_status,
          TIMESTAMPDIFF(HOUR, NOW(), a.deadline) as hours_until_deadline,
          TIMESTAMPDIFF(DAY, NOW(), a.deadline) as days_until_deadline,
          CASE 
            WHEN a.deadline < NOW() THEN 'overdue'
            WHEN TIMESTAMPDIFF(HOUR, NOW(), a.deadline) <= 24 THEN 'urgent'
            WHEN TIMESTAMPDIFF(HOUR, NOW(), a.deadline) <= 72 THEN 'soon'
            ELSE 'upcoming'
          END as urgency_level
        FROM assignments a
        JOIN courses c ON a.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = ?
        WHERE e.student_id = ? 
          AND e.status = 'active'
          AND a.is_active = true
          AND a.deadline <= DATE_ADD(NOW(), INTERVAL ? DAY)
          ${completedCondition}
        ORDER BY a.deadline ASC
      `, [studentId, studentId, daysAhead]);

      // Group deadlines by urgency
      const groupedDeadlines = {
        overdue: deadlines.filter(d => d.urgency_level === 'overdue'),
        urgent: deadlines.filter(d => d.urgency_level === 'urgent'),
        soon: deadlines.filter(d => d.urgency_level === 'soon'),
        upcoming: deadlines.filter(d => d.urgency_level === 'upcoming')
      };

      // Get deadline statistics
      const stats = {
        total: deadlines.length,
        overdue: groupedDeadlines.overdue.length,
        urgent: groupedDeadlines.urgent.length,
        thisWeek: deadlines.filter(d => d.days_until_deadline <= 7).length,
        nextWeek: deadlines.filter(d => d.days_until_deadline > 7 && d.days_until_deadline <= 14).length
      };

      return {
        deadlines: groupedDeadlines,
        statistics: stats,
        recommendations: this.generateDeadlineRecommendations(groupedDeadlines)
      };

    } catch (error) {
      logger.error('Error getting upcoming deadlines:', error);
      throw createError(500, 'Failed to load upcoming deadlines');
    } finally {
      connection.release();
    }
  }

  /**
   * Get course announcements for student
   * @param {Number} studentId - Student ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Course announcements
   */
  async getCourseAnnouncements(studentId, filters = {}) {
    const connection = await pool.getConnection();
    
    try {
      const {
        courseId,
        page = 1,
        limit = 10,
        dateRange = '30_days'
      } = filters;

      const offset = (page - 1) * limit;
      const conditions = ['e.student_id = ?'];
      const params = [studentId];

      if (courseId) {
        conditions.push('ca.course_id = ?');
        params.push(courseId);
      }

      // Add date range filter
      if (dateRange !== 'all') {
        const dateRangeMap = {
          '7_days': 7,
          '30_days': 30,
          '90_days': 90
        };
        const days = dateRangeMap[dateRange] || 30;
        conditions.push('ca.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)');
        params.push(days);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const [announcements] = await connection.query(`
        SELECT 
          ca.id, ca.title, ca.content, ca.priority, ca.is_pinned,
          ca.expires_at, ca.created_at,
          c.id as course_id, c.code as course_code, c.title as course_title,
          t.first_name as teacher_first_name, t.last_name as teacher_last_name,
          CASE WHEN car.id IS NOT NULL THEN true ELSE false END as is_read
        FROM course_announcements ca
        JOIN courses c ON ca.course_id = c.id
        JOIN users t ON c.teacher_id = t.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN course_announcement_reads car ON ca.id = car.announcement_id AND car.student_id = ?
        ${whereClause}
        AND e.status = 'active'
        AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
        ORDER BY ca.is_pinned DESC, ca.created_at DESC
        LIMIT ? OFFSET ?
      `, [studentId, ...params, limit, offset]);

      // Get total count
      const [countResult] = await connection.query(`
        SELECT COUNT(DISTINCT ca.id) as total
        FROM course_announcements ca
        JOIN courses c ON ca.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        ${whereClause}
        AND e.status = 'active'
        AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
      `, params);

      const total = countResult[0].total;
      const totalPages = Math.ceil(total / limit);

      // Get unread count
      const [unreadCount] = await connection.query(`
        SELECT COUNT(DISTINCT ca.id) as unread
        FROM course_announcements ca
        JOIN courses c ON ca.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        LEFT JOIN course_announcement_reads car ON ca.id = car.announcement_id AND car.student_id = ?
        WHERE e.student_id = ? 
          AND e.status = 'active'
          AND (ca.expires_at IS NULL OR ca.expires_at > NOW())
          AND car.id IS NULL
      `, [studentId, studentId]);

      return {
        announcements,
        pagination: {
          page,
          limit,
          total,
          totalPages
        },
        unreadCount: unreadCount[0].unread
      };

    } catch (error) {
      logger.error('Error getting course announcements:', error);
      throw createError(500, 'Failed to load course announcements');
    } finally {
      connection.release();
    }
  }

  /**
   * Mark course announcement as read
   * @param {Number} studentId - Student ID
   * @param {Number} announcementId - Announcement ID
   * @returns {Promise<Object>} Update result
   */
  async markAnnouncementAsRead(studentId, announcementId) {
    const connection = await pool.getConnection();
    
    try {
      // Check if student has access to this announcement
      const [announcement] = await connection.query(`
        SELECT ca.id
        FROM course_announcements ca
        JOIN courses c ON ca.course_id = c.id
        JOIN enrollments e ON c.id = e.course_id
        WHERE ca.id = ? AND e.student_id = ? AND e.status = 'active'
      `, [announcementId, studentId]);

      if (announcement.length === 0) {
        throw createError(404, 'Announcement not found or access denied');
      }

      // Insert or update read status
      await connection.query(`
        INSERT INTO course_announcement_reads (announcement_id, student_id, read_at)
        VALUES (?, ?, NOW())
        ON DUPLICATE KEY UPDATE read_at = NOW()
      `, [announcementId, studentId]);

      return {
        success: true,
        message: 'Announcement marked as read'
      };

    } catch (error) {
      logger.error('Error marking announcement as read:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to mark announcement as read');
    } finally {
      connection.release();
    }
  }

  /**
   * Create custom reminder for student
   * @param {Number} studentId - Student ID
   * @param {Object} reminderData - Reminder data
   * @returns {Promise<Object>} Created reminder
   */
  async createCustomReminder(studentId, reminderData) {
    const connection = await pool.getConnection();
    
    try {
      const {
        title,
        message,
        reminderDateTime,
        assignmentId, // optional
        courseId // optional
      } = reminderData;

      // Validate input
      if (!title || !message || !reminderDateTime) {
        throw createError(400, 'Title, message, and reminder date/time are required');
      }

      const reminderDate = new Date(reminderDateTime);
      if (reminderDate <= new Date()) {
        throw createError(400, 'Reminder date must be in the future');
      }

      // Validate assignment/course access if provided
      if (assignmentId) {
        const [assignment] = await connection.query(`
          SELECT a.id, a.title, c.title as course_title
          FROM assignments a
          JOIN courses c ON a.course_id = c.id
          JOIN enrollments e ON c.id = e.course_id
          WHERE a.id = ? AND e.student_id = ? AND e.status = 'active'
        `, [assignmentId, studentId]);

        if (assignment.length === 0) {
          throw createError(404, 'Assignment not found or access denied');
        }
      }

      if (courseId) {
        const [course] = await connection.query(`
          SELECT c.id
          FROM courses c
          JOIN enrollments e ON c.id = e.course_id
          WHERE c.id = ? AND e.student_id = ? AND e.status = 'active'
        `, [courseId, studentId]);

        if (course.length === 0) {
          throw createError(404, 'Course not found or access denied');
        }
      }

      // Create the reminder notification
      const [result] = await connection.query(`
        INSERT INTO notifications 
        (user_id, title, message, type, priority, reference_id, reference_type, 
         scheduled_for, metadata)
        VALUES (?, ?, ?, 'reminder', 'medium', ?, ?, ?, ?)
      `, [
        studentId,
        title,
        message,
        assignmentId || courseId || null,
        assignmentId ? 'assignment' : (courseId ? 'course' : 'custom'),
        reminderDate,
        JSON.stringify({ custom_reminder: true, created_by_student: true })
      ]);

      return {
        success: true,
        reminderId: result.insertId,
        message: 'Reminder created successfully',
        scheduledFor: reminderDate
      };

    } catch (error) {
      logger.error('Error creating custom reminder:', error);
      if (error.statusCode) throw error;
      throw createError(500, 'Failed to create reminder');
    } finally {
      connection.release();
    }
  }

  /**
   * Get notification statistics and insights
   * @param {Number} studentId - Student ID
   * @returns {Promise<Object>} Notification statistics
   */
  async getNotificationStatistics(studentId) {
    const connection = await pool.getConnection();
    
    try {
      // Get overall notification statistics
      const [overallStats] = await connection.query(`
        SELECT 
          COUNT(*) as total_notifications,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as this_week,
          COUNT(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 END) as this_month,
          AVG(CASE WHEN is_read = true THEN TIMESTAMPDIFF(HOUR, created_at, read_at) END) as avg_read_time_hours
        FROM notifications
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)
      `, [studentId]);

      // Get notification type breakdown
      const [typeBreakdown] = await connection.query(`
        SELECT 
          type,
          COUNT(*) as count,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
          COUNT(CASE WHEN priority = 'high' THEN 1 END) as high_priority_count
        FROM notifications
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY type
        ORDER BY count DESC
      `, [studentId]);

      // Get daily notification trend (last 7 days)
      const [dailyTrend] = await connection.query(`
        SELECT 
          DATE(created_at) as notification_date,
          COUNT(*) as daily_count,
          COUNT(CASE WHEN is_read = true THEN 1 END) as read_count
        FROM notifications
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY notification_date ASC
      `, [studentId]);

      // Get priority distribution
      const [priorityDistribution] = await connection.query(`
        SELECT 
          priority,
          COUNT(*) as count,
          COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count
        FROM notifications
        WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        GROUP BY priority
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'medium' THEN 2 
            WHEN 'low' THEN 3 
          END
      `, [studentId]);

      return {
        overall: overallStats[0],
        typeBreakdown,
        dailyTrend,
        priorityDistribution,
        insights: this.generateNotificationInsights(overallStats[0], typeBreakdown)
      };

    } catch (error) {
      logger.error('Error getting notification statistics:', error);
      throw createError(500, 'Failed to load notification statistics');
    } finally {
      connection.release();
    }
  }

  /**
   * Generate deadline recommendations based on upcoming deadlines
   * @param {Object} groupedDeadlines - Deadlines grouped by urgency
   * @returns {Array} Recommendations
   */
  generateDeadlineRecommendations(groupedDeadlines) {
    const recommendations = [];

    if (groupedDeadlines.overdue.length > 0) {
      recommendations.push({
        type: 'urgent',
        message: `You have ${groupedDeadlines.overdue.length} overdue assignment(s). Contact your instructor immediately.`,
        priority: 'high',
        actions: ['Contact instructor', 'Submit late if possible', 'Request extension']
      });
    }

    if (groupedDeadlines.urgent.length > 0) {
      recommendations.push({
        type: 'urgent',
        message: `${groupedDeadlines.urgent.length} assignment(s) due within 24 hours. Focus on these immediately.`,
        priority: 'high',
        actions: ['Prioritize urgent assignments', 'Set reminders', 'Minimize distractions']
      });
    }

    if (groupedDeadlines.soon.length > 0) {
      recommendations.push({
        type: 'planning',
        message: `${groupedDeadlines.soon.length} assignment(s) due within 3 days. Plan your time accordingly.`,
        priority: 'medium',
        actions: ['Create study schedule', 'Gather resources', 'Start early']
      });
    }

    if (groupedDeadlines.upcoming.length > 3) {
      recommendations.push({
        type: 'planning',
        message: `You have ${groupedDeadlines.upcoming.length} upcoming assignments. Consider creating a study calendar.`,
        priority: 'low',
        actions: ['Create study calendar', 'Break down large assignments', 'Set intermediate goals']
      });
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'positive',
        message: 'Great job staying on top of your assignments! Keep up the good work.',
        priority: 'low',
        actions: ['Maintain current pace', 'Help classmates', 'Review past assignments']
      });
    }

    return recommendations;
  }

  /**
   * Generate notification insights
   * @param {Object} overallStats - Overall notification statistics
   * @param {Array} typeBreakdown - Notification type breakdown
   * @returns {Array} Insights
   */
  generateNotificationInsights(overallStats, typeBreakdown) {
    const insights = [];

    // Reading behavior insights
    if (overallStats.avg_read_time_hours) {
      if (overallStats.avg_read_time_hours > 24) {
        insights.push({
          type: 'behavior',
          message: `You typically read notifications after ${Math.round(overallStats.avg_read_time_hours)} hours. Consider checking more frequently for time-sensitive updates.`,
          suggestion: 'Enable push notifications for urgent messages'
        });
      } else if (overallStats.avg_read_time_hours < 2) {
        insights.push({
          type: 'behavior',
          message: 'You\'re very responsive to notifications! This helps you stay on top of important updates.',
          suggestion: 'Continue this excellent communication habit'
        });
      }
    }

    // Unread accumulation
    if (overallStats.unread_count > 10) {
      insights.push({
        type: 'organization',
        message: `You have ${overallStats.unread_count} unread notifications. Consider setting aside time to review them.`,
        suggestion: 'Mark non-essential notifications as read to focus on important ones'
      });
    }

    // Most common notification types
    if (typeBreakdown.length > 0) {
      const topType = typeBreakdown[0];
      insights.push({
        type: 'pattern',
        message: `Most of your notifications are ${topType.type}-related (${topType.count} this month).`,
        suggestion: `Consider customizing your ${topType.type} notification settings if needed`
      });
    }

    return insights;
  }

  /**
   * Send immediate notification to student
   * @param {Number} studentId - Student ID
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} Sent notification
   */
  async sendImmediateNotification(studentId, notificationData) {
    const connection = await pool.getConnection();
    
    try {
      const {
        title,
        message,
        type = 'system',
        priority = 'medium',
        referenceId = null,
        referenceType = null,
        metadata = {}
      } = notificationData;

      const [result] = await connection.query(`
        INSERT INTO notifications 
        (user_id, title, message, type, priority, reference_id, reference_type, metadata)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [studentId, title, message, type, priority, referenceId, referenceType, JSON.stringify(metadata)]);

      // Here you would integrate with your push notification service
      // For now, we'll just log it
      logger.info(`Immediate notification sent to student ${studentId}: ${title}`);

      return {
        success: true,
        notificationId: result.insertId,
        message: 'Notification sent successfully'
      };

    } catch (error) {
      logger.error('Error sending immediate notification:', error);
      throw createError(500, 'Failed to send notification');
    } finally {
      connection.release();
    }
  }
}

module.exports = new StudentNotificationService();
