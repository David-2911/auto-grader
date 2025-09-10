const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');
const adminController = require('../controllers/admin.controller');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get admin dashboard statistics and overview
 * @access  Admin
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * User Management Routes
 */
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserById);
router.post('/users/bulk-import', adminController.bulkImportUsers);
router.get('/users/export', adminController.exportUsers);
router.put('/users/:id', adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);
router.post('/users/:id/deactivate', adminController.deactivateUser);
router.post('/users/:id/activate', adminController.activateUser);

/**
 * Course Management Routes
 */
router.get('/courses', adminController.getAllCourses);
router.get('/courses/:id', adminController.getCourseById);
router.put('/courses/:id', adminController.updateCourse);
router.delete('/courses/:id', adminController.deleteCourse);
router.post('/courses/:id/archive', adminController.archiveCourse);
router.post('/courses/:id/unarchive', adminController.unarchiveCourse);

/**
 * Assignment Management Routes
 */
router.get('/assignments', adminController.getAllAssignments);
router.get('/assignments/:id', adminController.getAssignmentById);
router.put('/assignments/:id', adminController.updateAssignment);
router.delete('/assignments/:id', adminController.deleteAssignment);

/**
 * System Monitoring and Analytics Routes
 */
router.get('/analytics/users', adminController.getUserAnalytics);
router.get('/analytics/courses', adminController.getCourseAnalytics);
router.get('/analytics/assignments', adminController.getAssignmentAnalytics);
router.get('/analytics/submissions', adminController.getSubmissionAnalytics);
router.get('/analytics/grading', adminController.getGradingAnalytics);

/**
 * System Monitoring Routes
 */
router.get('/system/status', adminController.getSystemStatus);
router.get('/system/logs', adminController.getSystemLogs);
router.get('/system/performance', adminController.getSystemPerformance);
router.get('/system/database', adminController.getDatabaseStats);

/**
 * ML Model Management Routes
 */
router.get('/ml/models', adminController.getAllModels);
router.get('/ml/models/:id', adminController.getModelById);
router.put('/ml/models/:id', adminController.updateModel);
router.post('/ml/models/:id/activate', adminController.activateModel);
router.post('/ml/models/:id/deactivate', adminController.deactivateModel);
router.get('/ml/analytics', adminController.getModelAnalytics);

/**
 * Configuration Management Routes
 */
router.get('/config', adminController.getAllConfigs);
router.get('/config/:key', adminController.getConfigByKey);
router.put('/config/:key', adminController.updateConfig);
router.post('/config', adminController.createConfig);
router.delete('/config/:key', adminController.deleteConfig);

/**
 * Audit and Security Routes
 */
router.get('/audit/logs', adminController.getAuditLogs);
router.get('/audit/security', adminController.getSecurityLogs);
router.get('/audit/auth', adminController.getAuthLogs);

/**
 * Data Export and Backup Routes
 */
router.post('/export/data', adminController.exportSystemData);
router.get('/backup/status', adminController.getBackupStatus);
router.post('/backup/create', adminController.createBackup);
router.post('/backup/restore/:id', adminController.restoreBackup);

module.exports = router;
