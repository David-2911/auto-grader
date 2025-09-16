const express = require('express');
const router = express.Router();
const studentController = require('../controllers/student.controller');
const authMiddleware = require('../middleware/auth.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const { validateResult } = require('../middleware/validator.middleware');
const { body, param, query } = require('express-validator');

// Apply authentication middleware to all student routes
router.use(authMiddleware.authenticate);
router.use(authMiddleware.authorize('student'));

// ==========================================
// Dashboard and Overview Routes
// ==========================================

/**
 * @swagger
 * /api/student/dashboard:
 *   get:
 *     summary: Get student dashboard overview
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 courses:
 *                   type: array
 *                 upcomingAssignments:
 *                   type: array
 *                 recentGrades:
 *                   type: array
 *                 academicProgress:
 *                   type: object
 */
router.get('/dashboard', studentController.getDashboard);

/**
 * @swagger
 * /api/student/courses:
 *   get:
 *     summary: Get student's enrolled courses
 *     tags: [Student Portal]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter by semester
 *       - in: query
 *         name: academicYear
 *         schema:
 *           type: string
 *         description: Filter by academic year
 *       - in: query
 *         name: includeCompleted
 *         schema:
 *           type: boolean
 *         description: Include completed courses
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 */
router.get('/courses', [
  query('semester').optional().isString().trim(),
  query('academicYear').optional().isString().trim(),
  query('includeCompleted').optional().isBoolean(),
  validateResult
], studentController.getCourses);

// ==========================================
// Assignment Routes
// ==========================================

/**
 * @swagger
 * /api/student/assignments:
 *   get:
 *     summary: Get student's assignments
 *     tags: [Student Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [upcoming, submitted, graded, overdue]
 *         description: Filter by assignment status
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Assignments retrieved successfully
 */
router.get('/assignments', [
  query('courseId').optional().isInt({ min: 1 }),
  query('status').optional().isIn(['upcoming', 'submitted', 'graded', 'overdue']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['deadline', 'title', 'created_at']),
  query('sortOrder').optional().isIn(['ASC', 'DESC']),
  validateResult
], studentController.getAssignments);

/**
 * @swagger
 * /api/student/assignments/{assignmentId}:
 *   get:
 *     summary: Get assignment details
 *     tags: [Student Assignments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Assignment details retrieved successfully
 */
router.get('/assignments/:assignmentId', [
  param('assignmentId').isInt({ min: 1 }),
  validateResult
], studentController.getAssignmentDetails);

// ==========================================
// Submission Routes
// ==========================================

/**
 * @swagger
 * /api/student/assignments/{assignmentId}/submit:
 *   post:
 *     summary: Submit an assignment
 *     tags: [Student Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               submissionText:
 *                 type: string
 *               submissionCode:
 *                 type: string
 *               submissionFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Assignment submitted successfully
 */
router.post('/assignments/:assignmentId/submit', [
  param('assignmentId').isInt({ min: 1 }),
  uploadMiddleware.single('submissionFile'),
  body('submissionText').optional().isString().trim(),
  body('submissionCode').optional().isString().trim(),
  validateResult
], studentController.submitAssignment);

/**
 * @swagger
 * /api/student/assignments/{assignmentId}/resubmit:
 *   post:
 *     summary: Resubmit an assignment
 *     tags: [Student Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       201:
 *         description: Assignment resubmitted successfully
 */
router.post('/assignments/:assignmentId/resubmit', [
  param('assignmentId').isInt({ min: 1 }),
  uploadMiddleware.single('submissionFile'),
  body('submissionText').optional().isString().trim(),
  body('submissionCode').optional().isString().trim(),
  validateResult
], studentController.resubmitAssignment);

/**
 * @swagger
 * /api/student/assignments/{assignmentId}/history:
 *   get:
 *     summary: Get submission history for an assignment
 *     tags: [Student Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission history retrieved successfully
 */
router.get('/assignments/:assignmentId/history', [
  param('assignmentId').isInt({ min: 1 }),
  validateResult
], studentController.getSubmissionHistory);

/**
 * @swagger
 * /api/student/submissions/{submissionId}:
 *   get:
 *     summary: Get submission details
 *     tags: [Student Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission details retrieved successfully
 */
router.get('/submissions/:submissionId', [
  param('submissionId').isInt({ min: 1 }),
  validateResult
], studentController.getSubmissionDetails);

/**
 * @swagger
 * /api/student/submissions/{submissionId}/download:
 *   get:
 *     summary: Download submission file
 *     tags: [Student Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/submissions/:submissionId/download', [
  param('submissionId').isInt({ min: 1 }),
  validateResult
], studentController.downloadSubmissionFile);

/**
 * @swagger
 * /api/student/submissions/{submissionId}/progress:
 *   get:
 *     summary: Get submission processing progress
 *     tags: [Student Submissions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission progress retrieved successfully
 */
router.get('/submissions/:submissionId/progress', [
  param('submissionId').isInt({ min: 1 }),
  validateResult
], studentController.getSubmissionProgress);

// ==========================================
// Grades and Feedback Routes
// ==========================================

/**
 * @swagger
 * /api/student/grades:
 *   get:
 *     summary: Get grades overview
 *     tags: [Student Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter by semester
 *       - in: query
 *         name: includeUngraded
 *         schema:
 *           type: boolean
 *         description: Include ungraded submissions
 *     responses:
 *       200:
 *         description: Grades overview retrieved successfully
 */
router.get('/grades', [
  query('courseId').optional().isInt({ min: 1 }),
  query('semester').optional().isString().trim(),
  query('academicYear').optional().isString().trim(),
  query('includeUngraded').optional().isBoolean(),
  validateResult
], studentController.getGradesOverview);

/**
 * @swagger
 * /api/student/submissions/{submissionId}/feedback:
 *   get:
 *     summary: Get detailed feedback for a submission
 *     tags: [Student Grades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Submission feedback retrieved successfully
 */
router.get('/submissions/:submissionId/feedback', [
  param('submissionId').isInt({ min: 1 }),
  validateResult
], studentController.getSubmissionFeedback);

/**
 * @swagger
 * /api/student/analytics/performance:
 *   get:
 *     summary: Get performance analytics
 *     tags: [Student Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: timeRange
 *         schema:
 *           type: string
 *           enum: [1_month, 3_months, 6_months, 1_year, all]
 *           default: 6_months
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Performance analytics retrieved successfully
 */
router.get('/analytics/performance', [
  query('timeRange').optional().isIn(['1_month', '3_months', '6_months', '1_year', 'all']),
  query('courseId').optional().isInt({ min: 1 }),
  query('categoryId').optional().isInt({ min: 1 }),
  validateResult
], studentController.getPerformanceAnalytics);

/**
 * @swagger
 * /api/student/analytics/comparison:
 *   get:
 *     summary: Get comparative performance against class average
 *     tags: [Student Analytics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Specific course for comparison
 *     responses:
 *       200:
 *         description: Comparative performance retrieved successfully
 */
router.get('/analytics/comparison', [
  query('courseId').optional().isInt({ min: 1 }),
  validateResult
], studentController.getComparativePerformance);

// ==========================================
// Profile Management Routes
// ==========================================

/**
 * @swagger
 * /api/student/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 */
router.get('/profile', studentController.getProfile);

/**
 * @swagger
 * /api/student/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               yearLevel:
 *                 type: string
 *               major:
 *                 type: string
 *               bio:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 */
router.put('/profile', [
  body('firstName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('lastName').optional().isString().trim().isLength({ min: 1, max: 100 }),
  body('email').optional().isEmail().normalizeEmail(),
  body('yearLevel').optional().isString().trim(),
  body('major').optional().isString().trim(),
  body('bio').optional().isString().trim().isLength({ max: 1000 }),
  validateResult
], studentController.updateProfile);

/**
 * @swagger
 * /api/student/profile/image:
 *   post:
 *     summary: Update profile image
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profileImage:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 */
router.post('/profile/image', 
  uploadMiddleware.single('profileImage'), 
  studentController.updateProfileImage
);

/**
 * @swagger
 * /api/student/profile/password:
 *   post:
 *     summary: Change password
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *               confirmPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
router.post('/profile/password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirmPassword').notEmpty().withMessage('Password confirmation is required'),
  validateResult
], studentController.changePassword);

/**
 * @swagger
 * /api/student/academic-record:
 *   get:
 *     summary: Get academic record
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Academic record retrieved successfully
 */
router.get('/academic-record', studentController.getAcademicRecord);

/**
 * @swagger
 * /api/student/academic-profile:
 *   get:
 *     summary: Get academic profile with progress tracking
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Academic profile retrieved successfully
 */
router.get('/academic-profile', studentController.getAcademicProfile);

// ==========================================
// Notification Routes
// ==========================================

/**
 * @swagger
 * /api/student/notifications:
 *   get:
 *     summary: Get notifications
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [assignment, grade, announcement, reminder, system]
 *       - in: query
 *         name: isRead
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [high, medium, low]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 */
router.get('/notifications', [
  query('type').optional().isIn(['assignment', 'grade', 'announcement', 'reminder', 'system']),
  query('isRead').optional().isBoolean(),
  query('priority').optional().isIn(['high', 'medium', 'low']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('dateRange').optional().isIn(['7_days', '30_days', '90_days', 'all']),
  validateResult
], studentController.getNotifications);

/**
 * @swagger
 * /api/student/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.put('/notifications/:notificationId/read', [
  param('notificationId').isInt({ min: 1 }),
  validateResult
], studentController.markNotificationAsRead);

/**
 * @swagger
 * /api/student/notifications/read-multiple:
 *   put:
 *     summary: Mark multiple notifications as read
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notificationIds
 *             properties:
 *               notificationIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.put('/notifications/read-multiple', [
  body('notificationIds').isArray({ min: 1 }).withMessage('Notification IDs array is required'),
  body('notificationIds.*').isInt({ min: 1 }).withMessage('Each notification ID must be a positive integer'),
  validateResult
], studentController.markMultipleNotificationsAsRead);

/**
 * @swagger
 * /api/student/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.put('/notifications/read-all', studentController.markAllNotificationsAsRead);

/**
 * @swagger
 * /api/student/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete('/notifications/:notificationId', [
  param('notificationId').isInt({ min: 1 }),
  validateResult
], studentController.deleteNotification);

/**
 * @swagger
 * /api/student/deadlines:
 *   get:
 *     summary: Get upcoming deadlines
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: daysAhead
 *         schema:
 *           type: integer
 *           default: 7
 *         description: Number of days to look ahead
 *       - in: query
 *         name: includeCompleted
 *         schema:
 *           type: boolean
 *         description: Include completed assignments
 *     responses:
 *       200:
 *         description: Upcoming deadlines retrieved successfully
 */
router.get('/deadlines', [
  query('daysAhead').optional().isInt({ min: 1, max: 365 }),
  query('includeCompleted').optional().isBoolean(),
  validateResult
], studentController.getUpcomingDeadlines);

/**
 * @swagger
 * /api/student/announcements:
 *   get:
 *     summary: Get course announcements
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: courseId
 *         schema:
 *           type: integer
 *         description: Filter by course ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Course announcements retrieved successfully
 */
router.get('/announcements', [
  query('courseId').optional().isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('dateRange').optional().isIn(['7_days', '30_days', '90_days', 'all']),
  validateResult
], studentController.getCourseAnnouncements);

/**
 * @swagger
 * /api/student/announcements/{announcementId}/read:
 *   put:
 *     summary: Mark announcement as read
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: announcementId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Announcement marked as read
 */
router.put('/announcements/:announcementId/read', [
  param('announcementId').isInt({ min: 1 }),
  validateResult
], studentController.markAnnouncementAsRead);

/**
 * @swagger
 * /api/student/reminders:
 *   post:
 *     summary: Create custom reminder
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - message
 *               - reminderDateTime
 *             properties:
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               reminderDateTime:
 *                 type: string
 *                 format: date-time
 *               assignmentId:
 *                 type: integer
 *               courseId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Custom reminder created successfully
 */
router.post('/reminders', [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 255 }),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 1000 }),
  body('reminderDateTime').isISO8601().withMessage('Valid date-time is required'),
  body('assignmentId').optional().isInt({ min: 1 }),
  body('courseId').optional().isInt({ min: 1 }),
  validateResult
], studentController.createCustomReminder);

/**
 * @swagger
 * /api/student/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification preferences retrieved successfully
 */
router.get('/notifications/preferences', studentController.getNotificationPreferences);

/**
 * @swagger
 * /api/student/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - preferences
 *             properties:
 *               preferences:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     notificationType:
 *                       type: string
 *                     isEnabled:
 *                       type: boolean
 *                     deliveryMethod:
 *                       type: string
 *     responses:
 *       200:
 *         description: Notification preferences updated successfully
 */
router.put('/notifications/preferences', [
  body('preferences').isArray().withMessage('Preferences must be an array'),
  body('preferences.*.notificationType').isIn([
    'assignment_due', 'grade_published', 'course_announcement',
    'submission_confirmed', 'feedback_available', 'course_reminder'
  ]),
  body('preferences.*.isEnabled').isBoolean(),
  body('preferences.*.deliveryMethod').isIn(['email', 'sms', 'push', 'none']),
  validateResult
], studentController.updateNotificationPreferences);

/**
 * @swagger
 * /api/student/notifications/statistics:
 *   get:
 *     summary: Get notification statistics
 *     tags: [Student Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics retrieved successfully
 */
router.get('/notifications/statistics', studentController.getNotificationStatistics);

// ==========================================
// Support and Help Routes
// ==========================================

/**
 * @swagger
 * /api/student/support/tickets:
 *   post:
 *     summary: Create support ticket
 *     tags: [Student Support]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - category
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *                 enum: [technical, academic, grading, assignment, account, other]
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               courseId:
 *                 type: integer
 *               assignmentId:
 *                 type: integer
 *               submissionId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Support ticket created successfully
 */
router.post('/support/tickets', [
  body('title').notEmpty().withMessage('Title is required').isLength({ max: 255 }),
  body('description').notEmpty().withMessage('Description is required').isLength({ max: 2000 }),
  body('category').isIn(['technical', 'academic', 'grading', 'assignment', 'account', 'other']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('courseId').optional().isInt({ min: 1 }),
  body('assignmentId').optional().isInt({ min: 1 }),
  body('submissionId').optional().isInt({ min: 1 }),
  validateResult
], studentController.createSupportTicket);

/**
 * @swagger
 * /api/student/support/tickets:
 *   get:
 *     summary: Get support tickets
 *     tags: [Student Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [technical, academic, grading, assignment, account, other]
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Support tickets retrieved successfully
 */
router.get('/support/tickets', [
  query('status').optional().isIn(['open', 'in_progress', 'resolved', 'closed']),
  query('category').optional().isIn(['technical', 'academic', 'grading', 'assignment', 'account', 'other']),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  validateResult
], studentController.getSupportTickets);

/**
 * @swagger
 * /api/student/support/tickets/{ticketId}:
 *   get:
 *     summary: Get support ticket details
 *     tags: [Student Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Support ticket details retrieved successfully
 */
router.get('/support/tickets/:ticketId', [
  param('ticketId').isInt({ min: 1 }),
  validateResult
], studentController.getSupportTicketDetails);

/**
 * @swagger
 * /api/student/support/tickets/{ticketId}/messages:
 *   post:
 *     summary: Add message to support ticket
 *     tags: [Student Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message added to support ticket
 */
router.post('/support/tickets/:ticketId/messages', [
  param('ticketId').isInt({ min: 1 }),
  body('message').notEmpty().withMessage('Message is required').isLength({ max: 2000 }),
  validateResult
], studentController.addTicketMessage);

/**
 * @swagger
 * /api/student/support/tickets/{ticketId}/close:
 *   put:
 *     summary: Close support ticket
 *     tags: [Student Support]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *               satisfactionRating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               feedback:
 *                 type: string
 *     responses:
 *       200:
 *         description: Support ticket closed successfully
 */
router.put('/support/tickets/:ticketId/close', [
  param('ticketId').isInt({ min: 1 }),
  body('reason').optional().isString().trim().isLength({ max: 500 }),
  body('satisfactionRating').optional().isInt({ min: 1, max: 5 }),
  body('feedback').optional().isString().trim().isLength({ max: 1000 }),
  validateResult
], studentController.closeSupportTicket);

/**
 * @swagger
 * /api/student/support/faq:
 *   get:
 *     summary: Get frequently asked questions
 *     tags: [Student Support]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by FAQ category
 *     responses:
 *       200:
 *         description: FAQs retrieved successfully
 */
router.get('/support/faq', [
  query('category').optional().isString().trim(),
  validateResult
], studentController.getFAQs);

/**
 * @swagger
 * /api/student/support/search:
 *   get:
 *     summary: Search support resources
 *     tags: [Student Support]
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by category
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [faq, guide, all]
 *           default: all
 *     responses:
 *       200:
 *         description: Support resources search completed
 */
router.get('/support/search', [
  query('q').notEmpty().withMessage('Search query is required'),
  query('category').optional().isString().trim(),
  query('type').optional().isIn(['faq', 'guide', 'all']),
  validateResult
], studentController.searchSupportResources);

// ==========================================
// Activity and History Routes
// ==========================================

/**
 * @swagger
 * /api/student/activity-log:
 *   get:
 *     summary: Get activity log
 *     tags: [Student Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: actionType
 *         schema:
 *           type: string
 *         description: Filter by action type
 *       - in: query
 *         name: dateRange
 *         schema:
 *           type: string
 *           enum: [7_days, 30_days, 90_days, 1_year, all]
 *           default: 30_days
 *     responses:
 *       200:
 *         description: Activity log retrieved successfully
 */
router.get('/activity-log', [
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 200 }),
  query('actionType').optional().isString().trim(),
  query('dateRange').optional().isIn(['7_days', '30_days', '90_days', '1_year', 'all']),
  validateResult
], studentController.getActivityLog);

module.exports = router;
