const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');
const teacherController = require('../controllers/teacher.controller');

// All teacher routes require teacher role
router.use(authenticate, authorize('teacher', 'admin'));

/**
 * @swagger
 * /api/teacher/dashboard:
 *   get:
 *     summary: Get teacher dashboard statistics and overview
 *     tags: [Teacher Portal]
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
 *                 assignments:
 *                   type: array
 *                 recentSubmissions:
 *                   type: array
 *                 statistics:
 *                   type: object
 */
router.get('/dashboard', teacherController.getDashboard);

/**
 * Course Management Routes
 */
router.get('/courses', teacherController.getCourses);
router.post('/courses', validate('createCourse'), teacherController.createCourse);
router.get('/courses/:id', teacherController.getCourseDetails);
router.put('/courses/:id', validate('updateCourse'), teacherController.updateCourse);
router.delete('/courses/:id', teacherController.deleteCourse);
router.post('/courses/:id/archive', teacherController.archiveCourse);
router.post('/courses/:id/duplicate', teacherController.duplicateCourse);

// Course enrollment management
router.get('/courses/:id/students', teacherController.getCourseStudents);
router.post('/courses/:id/students/enroll', teacherController.enrollStudents);
router.delete('/courses/:id/students/:studentId', teacherController.unenrollStudent);
router.post('/courses/:id/students/bulk-enroll', uploadMiddleware.single('csvFile'), teacherController.bulkEnrollStudents);

/**
 * Assignment Management Routes
 */
router.get('/assignments', teacherController.getAssignments);
router.post('/assignments', uploadMiddleware.fields([
  { name: 'questionPdf', maxCount: 1 },
  { name: 'resources', maxCount: 10 }
]), validate('createAssignment'), teacherController.createAssignment);
router.get('/assignments/templates', teacherController.getAssignmentTemplates);
router.post('/assignments/from-template/:templateId', teacherController.createFromTemplate);
router.get('/assignments/:id', teacherController.getAssignmentDetails);
router.put('/assignments/:id', uploadMiddleware.fields([
  { name: 'questionPdf', maxCount: 1 },
  { name: 'resources', maxCount: 10 }
]), validate('updateAssignment'), teacherController.updateAssignment);
router.delete('/assignments/:id', teacherController.deleteAssignment);
router.post('/assignments/:id/duplicate', teacherController.duplicateAssignment);

// Assignment categories
router.get('/courses/:courseId/categories', teacherController.getAssignmentCategories);
router.post('/courses/:courseId/categories', teacherController.createAssignmentCategory);
router.put('/categories/:id', teacherController.updateAssignmentCategory);
router.delete('/categories/:id', teacherController.deleteAssignmentCategory);

/**
 * Student Management Routes
 */
router.get('/students', teacherController.getAllStudents);
router.get('/students/:id', teacherController.getStudentProfile);
router.get('/students/:id/progress', teacherController.getStudentProgress);
router.get('/students/:id/submissions', teacherController.getStudentSubmissions);
router.post('/students/:id/notes', teacherController.addStudentNote);
router.get('/courses/:courseId/attendance', teacherController.getCourseAttendance);
router.post('/courses/:courseId/attendance', teacherController.recordAttendance);

/**
 * Grading and Submission Management Routes
 */
router.get('/submissions', teacherController.getSubmissions);
router.get('/submissions/:id', teacherController.getSubmissionDetails);
router.put('/submissions/:id/grade', teacherController.gradeSubmission);
router.post('/submissions/:id/regrade', teacherController.requestRegrade);
router.get('/assignments/:id/submissions', teacherController.getAssignmentSubmissions);
router.post('/assignments/:id/auto-grade', teacherController.autoGradeAssignment);
router.post('/assignments/:id/bulk-grade', teacherController.bulkGradeAssignment);

// Grade adjustments and appeals
router.get('/grade-appeals', teacherController.getGradeAppeals);
router.put('/grade-appeals/:id', teacherController.handleGradeAppeal);

/**
 * Reporting and Analytics Routes
 */
router.get('/analytics/class-performance/:courseId', teacherController.getClassPerformance);
router.get('/analytics/assignment-difficulty/:assignmentId', teacherController.getAssignmentDifficulty);
router.get('/analytics/student-progress/:courseId', teacherController.getStudentProgressAnalytics);
router.get('/analytics/grading-trends', teacherController.getGradingTrends);

// Report generation
router.get('/reports/course/:courseId/performance', teacherController.generateCoursePerformanceReport);
router.get('/reports/assignment/:assignmentId/results', teacherController.generateAssignmentReport);
router.get('/reports/student/:studentId/progress', teacherController.generateStudentProgressReport);
router.post('/reports/custom', teacherController.generateCustomReport);

/**
 * Communication Routes
 */
router.get('/announcements', teacherController.getAnnouncements);
router.post('/announcements', teacherController.createAnnouncement);
router.put('/announcements/:id', teacherController.updateAnnouncement);
router.delete('/announcements/:id', teacherController.deleteAnnouncement);

// Feedback and messaging
router.post('/feedback/send', teacherController.sendFeedback);
router.post('/messages/broadcast', teacherController.broadcastMessage);
router.get('/messages', teacherController.getMessages);

/**
 * Grade Book Management Routes
 */
router.get('/gradebook/:courseId', teacherController.getGradebook);
router.put('/gradebook/:courseId/settings', teacherController.updateGradebookSettings);
router.post('/gradebook/:courseId/export', teacherController.exportGradebook);
router.post('/gradebook/:courseId/import', uploadMiddleware.single('csvFile'), teacherController.importGrades);

// Grade calculations and statistics
router.get('/gradebook/:courseId/statistics', teacherController.getGradebookStatistics);
router.post('/gradebook/:courseId/recalculate', teacherController.recalculateGrades);

/**
 * Template Management Routes
 */
router.get('/templates', teacherController.getTemplates);
router.post('/templates', teacherController.createTemplate);
router.put('/templates/:id', teacherController.updateTemplate);
router.delete('/templates/:id', teacherController.deleteTemplate);

/**
 * Batch Operations Routes
 */
router.post('/batch/grade-submissions', teacherController.batchGradeSubmissions);
router.post('/batch/send-feedback', teacherController.batchSendFeedback);
router.post('/batch/update-assignments', teacherController.batchUpdateAssignments);

module.exports = router;
