const studentPortalService = require('../services/student-portal.service');
const studentSubmissionService = require('../services/student-submission.service');
const studentGradeFeedbackService = require('../services/student-grade-feedback.service');
const studentProfileService = require('../services/student-profile.service');
const studentNotificationService = require('../services/student-notification.service');
const studentSupportService = require('../services/student-support.service');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

/**
 * Student Controller - Handles all student portal endpoints
 */
class StudentController {

  // ==========================================
  // Dashboard and Overview
  // ==========================================

  /**
   * Get student dashboard overview
   */
  async getDashboard(req, res, next) {
    try {
      const studentId = req.user.id;
      const dashboard = await studentPortalService.getStudentDashboard(studentId);
      
      res.success(dashboard, 'Dashboard loaded successfully');
    } catch (error) {
      logger.error('Error in getDashboard:', error);
      next(error);
    }
  }

  /**
   * Get student's enrolled courses
   */
  async getCourses(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        semester: req.query.semester,
        academicYear: req.query.academicYear,
        status: req.query.status,
        includeCompleted: req.query.includeCompleted === 'true'
      };

      const courses = await studentPortalService.getStudentCourses(studentId, filters);
      
      res.success(courses, 'Courses loaded successfully');
    } catch (error) {
      logger.error('Error in getCourses:', error);
      next(error);
    }
  }

  // ==========================================
  // Assignment Management
  // ==========================================

  /**
   * Get student's assignments
   */
  async getAssignments(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        courseId: req.query.courseId,
        status: req.query.status,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'deadline',
        sortOrder: req.query.sortOrder || 'ASC'
      };

      const assignments = await studentPortalService.getStudentAssignments(studentId, filters);
      
      res.success(assignments, 'Assignments loaded successfully');
    } catch (error) {
      logger.error('Error in getAssignments:', error);
      next(error);
    }
  }

  /**
   * Get assignment details
   */
  async getAssignmentDetails(req, res, next) {
    try {
      const studentId = req.user.id;
      const assignmentId = parseInt(req.params.assignmentId);

      const assignment = await studentPortalService.getAssignmentDetails(studentId, assignmentId);
      
      res.success(assignment, 'Assignment details loaded successfully');
    } catch (error) {
      logger.error('Error in getAssignmentDetails:', error);
      next(error);
    }
  }

  // ==========================================
  // Submission Management
  // ==========================================

  /**
   * Submit assignment
   */
  async submitAssignment(req, res, next) {
    try {
      const studentId = req.user.id;
      const assignmentId = parseInt(req.params.assignmentId);
      const submissionData = req.body;
      const files = req.files || {};

      const result = await studentSubmissionService.submitAssignment(
        studentId, 
        assignmentId, 
        submissionData, 
        files
      );
      
      res.success(result, 'Assignment submitted successfully');
    } catch (error) {
      logger.error('Error in submitAssignment:', error);
      next(error);
    }
  }

  /**
   * Get submission details
   */
  async getSubmissionDetails(req, res, next) {
    try {
      const studentId = req.user.id;
      const submissionId = parseInt(req.params.submissionId);

      const submission = await studentSubmissionService.getSubmissionDetails(studentId, submissionId);
      
      res.success(submission, 'Submission details loaded successfully');
    } catch (error) {
      logger.error('Error in getSubmissionDetails:', error);
      next(error);
    }
  }

  /**
   * Get submission history for an assignment
   */
  async getSubmissionHistory(req, res, next) {
    try {
      const studentId = req.user.id;
      const assignmentId = parseInt(req.params.assignmentId);

      const history = await studentSubmissionService.getSubmissionHistory(studentId, assignmentId);
      
      res.success(history, 'Submission history loaded successfully');
    } catch (error) {
      logger.error('Error in getSubmissionHistory:', error);
      next(error);
    }
  }

  /**
   * Download submission file
   */
  async downloadSubmissionFile(req, res, next) {
    try {
      const studentId = req.user.id;
      const submissionId = parseInt(req.params.submissionId);

      const fileData = await studentSubmissionService.downloadSubmissionFile(studentId, submissionId);
      
      res.setHeader('Content-Type', fileData.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileData.originalName}"`);
      res.send(fileData.fileBuffer);
    } catch (error) {
      logger.error('Error in downloadSubmissionFile:', error);
      next(error);
    }
  }

  /**
   * Resubmit assignment
   */
  async resubmitAssignment(req, res, next) {
    try {
      const studentId = req.user.id;
      const assignmentId = parseInt(req.params.assignmentId);
      const submissionData = req.body;
      const files = req.files || {};

      const result = await studentSubmissionService.resubmitAssignment(
        studentId, 
        assignmentId, 
        submissionData, 
        files
      );
      
      res.success(result, 'Assignment resubmitted successfully');
    } catch (error) {
      logger.error('Error in resubmitAssignment:', error);
      next(error);
    }
  }

  /**
   * Get submission progress
   */
  async getSubmissionProgress(req, res, next) {
    try {
      const studentId = req.user.id;
      const submissionId = parseInt(req.params.submissionId);

      const progress = await studentSubmissionService.getSubmissionProgress(studentId, submissionId);
      
      res.success(progress, 'Submission progress loaded successfully');
    } catch (error) {
      logger.error('Error in getSubmissionProgress:', error);
      next(error);
    }
  }

  // ==========================================
  // Grades and Feedback
  // ==========================================

  /**
   * Get grades overview
   */
  async getGradesOverview(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        courseId: req.query.courseId,
        semester: req.query.semester,
        academicYear: req.query.academicYear,
        includeUngraded: req.query.includeUngraded === 'true'
      };

      const grades = await studentGradeFeedbackService.getGradesOverview(studentId, filters);
      
      res.success(grades, 'Grades overview loaded successfully');
    } catch (error) {
      logger.error('Error in getGradesOverview:', error);
      next(error);
    }
  }

  /**
   * Get submission feedback
   */
  async getSubmissionFeedback(req, res, next) {
    try {
      const studentId = req.user.id;
      const submissionId = parseInt(req.params.submissionId);

      const feedback = await studentGradeFeedbackService.getSubmissionFeedback(studentId, submissionId);
      
      res.success(feedback, 'Submission feedback loaded successfully');
    } catch (error) {
      logger.error('Error in getSubmissionFeedback:', error);
      next(error);
    }
  }

  /**
   * Get performance analytics
   */
  async getPerformanceAnalytics(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        timeRange: req.query.timeRange || '6_months',
        courseId: req.query.courseId,
        categoryId: req.query.categoryId
      };

      const analytics = await studentGradeFeedbackService.getPerformanceAnalytics(studentId, filters);
      
      res.success(analytics, 'Performance analytics loaded successfully');
    } catch (error) {
      logger.error('Error in getPerformanceAnalytics:', error);
      next(error);
    }
  }

  /**
   * Get comparative performance
   */
  async getComparativePerformance(req, res, next) {
    try {
      const studentId = req.user.id;
      const courseId = req.query.courseId ? parseInt(req.query.courseId) : null;

      const comparison = await studentGradeFeedbackService.getComparativePerformance(studentId, courseId);
      
      res.success(comparison, 'Comparative performance loaded successfully');
    } catch (error) {
      logger.error('Error in getComparativePerformance:', error);
      next(error);
    }
  }

  // ==========================================
  // Profile Management
  // ==========================================

  /**
   * Get student profile
   */
  async getProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const profile = await studentProfileService.getStudentProfile(studentId);
      
      res.success(profile, 'Profile loaded successfully');
    } catch (error) {
      logger.error('Error in getProfile:', error);
      next(error);
    }
  }

  /**
   * Update student profile
   */
  async updateProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const profileData = req.body;

      const updatedProfile = await studentProfileService.updateStudentProfile(studentId, profileData);
      
      res.success(updatedProfile, 'Profile updated successfully');
    } catch (error) {
      logger.error('Error in updateProfile:', error);
      next(error);
    }
  }

  /**
   * Update profile image
   */
  async updateProfileImage(req, res, next) {
    try {
      const studentId = req.user.id;
      const imageFile = req.file;

      if (!imageFile) {
        throw createError(400, 'Profile image file is required');
      }

      const result = await studentProfileService.updateProfileImage(studentId, imageFile);
      
      res.success(result, 'Profile image updated successfully');
    } catch (error) {
      logger.error('Error in updateProfileImage:', error);
      next(error);
    }
  }

  /**
   * Change password
   */
  async changePassword(req, res, next) {
    try {
      const studentId = req.user.id;
      const passwordData = req.body;

      const result = await studentProfileService.changePassword(studentId, passwordData);
      
      res.success(result, 'Password changed successfully');
    } catch (error) {
      logger.error('Error in changePassword:', error);
      next(error);
    }
  }

  /**
   * Get academic record
   */
  async getAcademicRecord(req, res, next) {
    try {
      const studentId = req.user.id;
      const academicRecord = await studentProfileService.getAcademicRecord(studentId);
      
      res.success(academicRecord, 'Academic record loaded successfully');
    } catch (error) {
      logger.error('Error in getAcademicRecord:', error);
      next(error);
    }
  }

  /**
   * Get academic profile with progress tracking
   */
  async getAcademicProfile(req, res, next) {
    try {
      const studentId = req.user.id;
      const academicProfile = await studentPortalService.getAcademicProfile(studentId);
      
      res.success(academicProfile, 'Academic profile loaded successfully');
    } catch (error) {
      logger.error('Error in getAcademicProfile:', error);
      next(error);
    }
  }

  // ==========================================
  // Notifications
  // ==========================================

  /**
   * Get notifications
   */
  async getNotifications(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        type: req.query.type,
        isRead: req.query.isRead !== undefined ? req.query.isRead === 'true' : undefined,
        priority: req.query.priority,
        dateRange: req.query.dateRange || '30_days'
      };

      const notifications = await studentNotificationService.getStudentNotifications(studentId, filters);
      
      res.success(notifications, 'Notifications loaded successfully');
    } catch (error) {
      logger.error('Error in getNotifications:', error);
      next(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(req, res, next) {
    try {
      const studentId = req.user.id;
      const notificationId = parseInt(req.params.notificationId);

      const result = await studentNotificationService.markNotificationAsRead(studentId, notificationId);
      
      res.success(result, 'Notification marked as read');
    } catch (error) {
      logger.error('Error in markNotificationAsRead:', error);
      next(error);
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleNotificationsAsRead(req, res, next) {
    try {
      const studentId = req.user.id;
      const { notificationIds } = req.body;

      const result = await studentNotificationService.markMultipleNotificationsAsRead(studentId, notificationIds);
      
      res.success(result, 'Notifications marked as read');
    } catch (error) {
      logger.error('Error in markMultipleNotificationsAsRead:', error);
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(req, res, next) {
    try {
      const studentId = req.user.id;

      const result = await studentNotificationService.markAllNotificationsAsRead(studentId);
      
      res.success(result, 'All notifications marked as read');
    } catch (error) {
      logger.error('Error in markAllNotificationsAsRead:', error);
      next(error);
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(req, res, next) {
    try {
      const studentId = req.user.id;
      const notificationId = parseInt(req.params.notificationId);

      const result = await studentNotificationService.deleteNotification(studentId, notificationId);
      
      res.success(result, 'Notification deleted');
    } catch (error) {
      logger.error('Error in deleteNotification:', error);
      next(error);
    }
  }

  /**
   * Get upcoming deadlines
   */
  async getUpcomingDeadlines(req, res, next) {
    try {
      const studentId = req.user.id;
      const options = {
        daysAhead: parseInt(req.query.daysAhead) || 7,
        includeCompleted: req.query.includeCompleted === 'true'
      };

      const deadlines = await studentNotificationService.getUpcomingDeadlines(studentId, options);
      
      res.success(deadlines, 'Upcoming deadlines loaded successfully');
    } catch (error) {
      logger.error('Error in getUpcomingDeadlines:', error);
      next(error);
    }
  }

  /**
   * Get course announcements
   */
  async getCourseAnnouncements(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        courseId: req.query.courseId,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        dateRange: req.query.dateRange || '30_days'
      };

      const announcements = await studentNotificationService.getCourseAnnouncements(studentId, filters);
      
      res.success(announcements, 'Course announcements loaded successfully');
    } catch (error) {
      logger.error('Error in getCourseAnnouncements:', error);
      next(error);
    }
  }

  /**
   * Mark announcement as read
   */
  async markAnnouncementAsRead(req, res, next) {
    try {
      const studentId = req.user.id;
      const announcementId = parseInt(req.params.announcementId);

      const result = await studentNotificationService.markAnnouncementAsRead(studentId, announcementId);
      
      res.success(result, 'Announcement marked as read');
    } catch (error) {
      logger.error('Error in markAnnouncementAsRead:', error);
      next(error);
    }
  }

  /**
   * Create custom reminder
   */
  async createCustomReminder(req, res, next) {
    try {
      const studentId = req.user.id;
      const reminderData = req.body;

      const result = await studentNotificationService.createCustomReminder(studentId, reminderData);
      
      res.success(result, 'Custom reminder created successfully');
    } catch (error) {
      logger.error('Error in createCustomReminder:', error);
      next(error);
    }
  }

  /**
   * Get notification preferences
   */
  async getNotificationPreferences(req, res, next) {
    try {
      const studentId = req.user.id;
      const preferences = await studentProfileService.getNotificationPreferences(studentId);
      
      res.success(preferences, 'Notification preferences loaded successfully');
    } catch (error) {
      logger.error('Error in getNotificationPreferences:', error);
      next(error);
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(req, res, next) {
    try {
      const studentId = req.user.id;
      const { preferences } = req.body;

      const result = await studentProfileService.updateNotificationPreferences(studentId, preferences);
      
      res.success(result, 'Notification preferences updated successfully');
    } catch (error) {
      logger.error('Error in updateNotificationPreferences:', error);
      next(error);
    }
  }

  /**
   * Get notification statistics
   */
  async getNotificationStatistics(req, res, next) {
    try {
      const studentId = req.user.id;
      const statistics = await studentNotificationService.getNotificationStatistics(studentId);
      
      res.success(statistics, 'Notification statistics loaded successfully');
    } catch (error) {
      logger.error('Error in getNotificationStatistics:', error);
      next(error);
    }
  }

  // ==========================================
  // Support and Help
  // ==========================================

  /**
   * Create support ticket
   */
  async createSupportTicket(req, res, next) {
    try {
      const studentId = req.user.id;
      const ticketData = req.body;

      const result = await studentSupportService.createSupportTicket(studentId, ticketData);
      
      res.success(result, 'Support ticket created successfully');
    } catch (error) {
      logger.error('Error in createSupportTicket:', error);
      next(error);
    }
  }

  /**
   * Get support tickets
   */
  async getSupportTickets(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        status: req.query.status,
        category: req.query.category,
        priority: req.query.priority,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sortBy: req.query.sortBy || 'created_at',
        sortOrder: req.query.sortOrder || 'DESC'
      };

      const tickets = await studentSupportService.getStudentSupportTickets(studentId, filters);
      
      res.success(tickets, 'Support tickets loaded successfully');
    } catch (error) {
      logger.error('Error in getSupportTickets:', error);
      next(error);
    }
  }

  /**
   * Get support ticket details
   */
  async getSupportTicketDetails(req, res, next) {
    try {
      const studentId = req.user.id;
      const ticketId = parseInt(req.params.ticketId);

      const ticket = await studentSupportService.getTicketDetails(studentId, ticketId);
      
      res.success(ticket, 'Support ticket details loaded successfully');
    } catch (error) {
      logger.error('Error in getSupportTicketDetails:', error);
      next(error);
    }
  }

  /**
   * Add message to support ticket
   */
  async addTicketMessage(req, res, next) {
    try {
      const studentId = req.user.id;
      const ticketId = parseInt(req.params.ticketId);
      const messageData = req.body;

      const result = await studentSupportService.addTicketMessage(studentId, ticketId, messageData);
      
      res.success(result, 'Message added to support ticket');
    } catch (error) {
      logger.error('Error in addTicketMessage:', error);
      next(error);
    }
  }

  /**
   * Close support ticket
   */
  async closeSupportTicket(req, res, next) {
    try {
      const studentId = req.user.id;
      const ticketId = parseInt(req.params.ticketId);
      const closeData = req.body;

      const result = await studentSupportService.closeTicket(studentId, ticketId, closeData);
      
      res.success(result, 'Support ticket closed successfully');
    } catch (error) {
      logger.error('Error in closeSupportTicket:', error);
      next(error);
    }
  }

  /**
   * Get FAQs
   */
  async getFAQs(req, res, next) {
    try {
      const category = req.query.category;
      const faqs = await studentSupportService.getFAQs(category);
      
      res.success(faqs, 'FAQs loaded successfully');
    } catch (error) {
      logger.error('Error in getFAQs:', error);
      next(error);
    }
  }

  /**
   * Search support resources
   */
  async searchSupportResources(req, res, next) {
    try {
      const query = req.query.q;
      const filters = {
        category: req.query.category,
        type: req.query.type
      };

      const results = await studentSupportService.searchSupportResources(query, filters);
      
      res.success(results, 'Support resources search completed');
    } catch (error) {
      logger.error('Error in searchSupportResources:', error);
      next(error);
    }
  }

  // ==========================================
  // Activity and History
  // ==========================================

  /**
   * Get activity log
   */
  async getActivityLog(req, res, next) {
    try {
      const studentId = req.user.id;
      const filters = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        actionType: req.query.actionType,
        dateRange: req.query.dateRange || '30_days'
      };

      const activityLog = await studentProfileService.getActivityLog(studentId, filters);
      
      res.success(activityLog, 'Activity log loaded successfully');
    } catch (error) {
      logger.error('Error in getActivityLog:', error);
      next(error);
    }
  }
}

module.exports = new StudentController();
