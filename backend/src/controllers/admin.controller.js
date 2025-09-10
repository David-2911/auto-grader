const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');
const Submission = require('../models/submission.model');
const MLModel = require('../models/ml.model');
const AdminService = require('../services/admin.service');
const SystemService = require('../services/system.service');
const { pool } = require('../config/database');
const { auditService } = require('../services/auth.service');

// Initialize services
const adminService = new AdminService();
const systemService = new SystemService();

/**
 * Get admin dashboard statistics
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const stats = await adminService.getDashboardStats();
    return res.json(stats);
  } catch (error) {
    logger.error('Error getting dashboard stats:', error);
    return next(error);
  }
};

/**
 * User Management Controllers
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, role, search, status } = req.query;
    const users = await adminService.getAllUsers({ page, limit, role, search, status });
    return res.json(users);
  } catch (error) {
    logger.error('Error getting all users:', error);
    return next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await adminService.getUserById(id);
    
    if (!user) {
      return next(createError(404, 'User not found'));
    }
    
    return res.json(user);
  } catch (error) {
    logger.error(`Error getting user ${req.params.id}:`, error);
    return next(error);
  }
};

exports.bulkImportUsers = async (req, res, next) => {
  try {
    const { users, options } = req.body;
    const result = await adminService.bulkImportUsers(users, options);
    
    // Log the action
    auditService.logSecurityEvent('bulk_user_import', {
      userId: req.user.id,
      action: 'import',
      resource: 'users',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { count: result.success.length }
    }).catch(err => logger.error('Failed to log bulk user import:', err));
    
    return res.json(result);
  } catch (error) {
    logger.error('Error importing users:', error);
    
    // Log the failed action
    auditService.logSecurityEvent('bulk_user_import', {
      userId: req.user.id,
      action: 'import',
      resource: 'users',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      details: { error: error.message }
    }).catch(err => logger.error('Failed to log bulk user import failure:', err));
    
    return next(error);
  }
};

exports.exportUsers = async (req, res, next) => {
  try {
    const { format = 'csv', role, status } = req.query;
    const data = await adminService.exportUsers({ format, role, status });
    
    // Set response headers based on format
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=users.csv');
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=users.json');
    } else if (format === 'excel') {
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    }
    
    // Log the export action
    auditService.logSecurityEvent('user_export', {
      userId: req.user.id,
      action: 'export',
      resource: 'users',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { format, role, status }
    }).catch(err => logger.error('Failed to log user export:', err));
    
    return res.send(data);
  } catch (error) {
    logger.error('Error exporting users:', error);
    return next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userData = req.body;
    const user = await adminService.updateUser(id, userData);
    
    // Log the update action
    auditService.logSecurityEvent('user_update', {
      userId: req.user.id,
      targetId: id,
      action: 'update',
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { updatedFields: Object.keys(userData) }
    }).catch(err => logger.error('Failed to log user update:', err));
    
    return res.json(user);
  } catch (error) {
    logger.error(`Error updating user ${req.params.id}:`, error);
    
    // Log the failed update action
    auditService.logSecurityEvent('user_update', {
      userId: req.user.id,
      targetId: req.params.id,
      action: 'update',
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      details: { error: error.message }
    }).catch(err => logger.error('Failed to log user update failure:', err));
    
    return next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.deleteUser(id);
    
    // Log the delete action
    auditService.logSecurityEvent('user_delete', {
      userId: req.user.id,
      targetId: id,
      action: 'delete',
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    }).catch(err => logger.error('Failed to log user deletion:', err));
    
    return res.json({ message: 'User deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting user ${req.params.id}:`, error);
    
    // Log the failed delete action
    auditService.logSecurityEvent('user_delete', {
      userId: req.user.id,
      targetId: req.params.id,
      action: 'delete',
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      details: { error: error.message }
    }).catch(err => logger.error('Failed to log user deletion failure:', err));
    
    return next(error);
  }
};

exports.deactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await adminService.updateUserStatus(id, false, reason);
    
    // Log the deactivation action
    auditService.logSecurityEvent('user_deactivation', {
      userId: req.user.id,
      targetId: id,
      action: 'deactivate',
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { reason }
    }).catch(err => logger.error('Failed to log user deactivation:', err));
    
    return res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    logger.error(`Error deactivating user ${req.params.id}:`, error);
    return next(error);
  }
};

exports.activateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await adminService.updateUserStatus(id, true, reason);
    
    // Log the activation action
    auditService.logSecurityEvent('user_activation', {
      userId: req.user.id,
      targetId: id,
      action: 'activate',
      resource: 'user',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { reason }
    }).catch(err => logger.error('Failed to log user activation:', err));
    
    return res.json({ message: 'User activated successfully' });
  } catch (error) {
    logger.error(`Error activating user ${req.params.id}:`, error);
    return next(error);
  }
};

/**
 * Course Management Controllers
 */
exports.getAllCourses = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, teacherId, isActive, search } = req.query;
    const courses = await adminService.getAllCourses({ page, limit, teacherId, isActive, search });
    return res.json(courses);
  } catch (error) {
    logger.error('Error getting all courses:', error);
    return next(error);
  }
};

exports.getCourseById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await adminService.getCourseById(id);
    
    if (!course) {
      return next(createError(404, 'Course not found'));
    }
    
    return res.json(course);
  } catch (error) {
    logger.error(`Error getting course ${req.params.id}:`, error);
    return next(error);
  }
};

exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const courseData = req.body;
    const course = await adminService.updateCourse(id, courseData);
    
    // Log the update action
    auditService.logSecurityEvent('course_update', {
      userId: req.user.id,
      targetId: id,
      action: 'update',
      resource: 'course',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { updatedFields: Object.keys(courseData) }
    }).catch(err => logger.error('Failed to log course update:', err));
    
    return res.json(course);
  } catch (error) {
    logger.error(`Error updating course ${req.params.id}:`, error);
    return next(error);
  }
};

exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.deleteCourse(id);
    
    // Log the delete action
    auditService.logSecurityEvent('course_delete', {
      userId: req.user.id,
      targetId: id,
      action: 'delete',
      resource: 'course',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    }).catch(err => logger.error('Failed to log course deletion:', err));
    
    return res.json({ message: 'Course deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting course ${req.params.id}:`, error);
    return next(error);
  }
};

exports.archiveCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await adminService.updateCourseStatus(id, false, reason);
    
    // Log the archive action
    auditService.logSecurityEvent('course_archive', {
      userId: req.user.id,
      targetId: id,
      action: 'archive',
      resource: 'course',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { reason }
    }).catch(err => logger.error('Failed to log course archiving:', err));
    
    return res.json({ message: 'Course archived successfully' });
  } catch (error) {
    logger.error(`Error archiving course ${req.params.id}:`, error);
    return next(error);
  }
};

exports.unarchiveCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    await adminService.updateCourseStatus(id, true, reason);
    
    // Log the unarchive action
    auditService.logSecurityEvent('course_unarchive', {
      userId: req.user.id,
      targetId: id,
      action: 'unarchive',
      resource: 'course',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { reason }
    }).catch(err => logger.error('Failed to log course unarchiving:', err));
    
    return res.json({ message: 'Course unarchived successfully' });
  } catch (error) {
    logger.error(`Error unarchiving course ${req.params.id}:`, error);
    return next(error);
  }
};

/**
 * Assignment Management Controllers
 */
exports.getAllAssignments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, courseId, isActive, search } = req.query;
    const assignments = await adminService.getAllAssignments({ page, limit, courseId, isActive, search });
    return res.json(assignments);
  } catch (error) {
    logger.error('Error getting all assignments:', error);
    return next(error);
  }
};

exports.getAssignmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignment = await adminService.getAssignmentById(id);
    
    if (!assignment) {
      return next(createError(404, 'Assignment not found'));
    }
    
    return res.json(assignment);
  } catch (error) {
    logger.error(`Error getting assignment ${req.params.id}:`, error);
    return next(error);
  }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const assignmentData = req.body;
    const assignment = await adminService.updateAssignment(id, assignmentData);
    
    // Log the update action
    auditService.logSecurityEvent('assignment_update', {
      userId: req.user.id,
      targetId: id,
      action: 'update',
      resource: 'assignment',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { updatedFields: Object.keys(assignmentData) }
    }).catch(err => logger.error('Failed to log assignment update:', err));
    
    return res.json(assignment);
  } catch (error) {
    logger.error(`Error updating assignment ${req.params.id}:`, error);
    return next(error);
  }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.deleteAssignment(id);
    
    // Log the delete action
    auditService.logSecurityEvent('assignment_delete', {
      userId: req.user.id,
      targetId: id,
      action: 'delete',
      resource: 'assignment',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    }).catch(err => logger.error('Failed to log assignment deletion:', err));
    
    return res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting assignment ${req.params.id}:`, error);
    return next(error);
  }
};

/**
 * System Analytics Controllers
 */
exports.getUserAnalytics = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const analytics = await adminService.getUserAnalytics({ period, startDate, endDate });
    return res.json(analytics);
  } catch (error) {
    logger.error('Error getting user analytics:', error);
    return next(error);
  }
};

exports.getCourseAnalytics = async (req, res, next) => {
  try {
    const { period = 'month', startDate, endDate } = req.query;
    const analytics = await adminService.getCourseAnalytics({ period, startDate, endDate });
    return res.json(analytics);
  } catch (error) {
    logger.error('Error getting course analytics:', error);
    return next(error);
  }
};

exports.getAssignmentAnalytics = async (req, res, next) => {
  try {
    const { period = 'month', courseId, startDate, endDate } = req.query;
    const analytics = await adminService.getAssignmentAnalytics({ period, courseId, startDate, endDate });
    return res.json(analytics);
  } catch (error) {
    logger.error('Error getting assignment analytics:', error);
    return next(error);
  }
};

exports.getSubmissionAnalytics = async (req, res, next) => {
  try {
    const { period = 'month', courseId, assignmentId, startDate, endDate } = req.query;
    const analytics = await adminService.getSubmissionAnalytics({ 
      period, courseId, assignmentId, startDate, endDate 
    });
    return res.json(analytics);
  } catch (error) {
    logger.error('Error getting submission analytics:', error);
    return next(error);
  }
};

exports.getGradingAnalytics = async (req, res, next) => {
  try {
    const { period = 'month', courseId, assignmentId, startDate, endDate } = req.query;
    const analytics = await adminService.getGradingAnalytics({ 
      period, courseId, assignmentId, startDate, endDate 
    });
    return res.json(analytics);
  } catch (error) {
    logger.error('Error getting grading analytics:', error);
    return next(error);
  }
};

/**
 * System Monitoring Controllers
 */
exports.getSystemStatus = async (req, res, next) => {
  try {
    const status = await systemService.getSystemStatus();
    return res.json(status);
  } catch (error) {
    logger.error('Error getting system status:', error);
    return next(error);
  }
};

exports.getSystemLogs = async (req, res, next) => {
  try {
    const { logType = 'all', startDate, endDate, severity = 'all', limit = 100, page = 1 } = req.query;
    const logs = await systemService.getSystemLogs({ logType, startDate, endDate, severity, limit, page });
    return res.json(logs);
  } catch (error) {
    logger.error('Error getting system logs:', error);
    return next(error);
  }
};

exports.getSystemPerformance = async (req, res, next) => {
  try {
    const { period = 'day' } = req.query;
    const performance = await systemService.getSystemPerformance(period);
    return res.json(performance);
  } catch (error) {
    logger.error('Error getting system performance:', error);
    return next(error);
  }
};

exports.getDatabaseStats = async (req, res, next) => {
  try {
    const stats = await systemService.getDatabaseStats();
    return res.json(stats);
  } catch (error) {
    logger.error('Error getting database stats:', error);
    return next(error);
  }
};

/**
 * ML Model Management Controllers
 */
exports.getAllModels = async (req, res, next) => {
  try {
    const { modelType, isActive } = req.query;
    const models = await adminService.getAllModels({ modelType, isActive });
    return res.json(models);
  } catch (error) {
    logger.error('Error getting all ML models:', error);
    return next(error);
  }
};

exports.getModelById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const model = await adminService.getModelById(id);
    
    if (!model) {
      return next(createError(404, 'ML model not found'));
    }
    
    return res.json(model);
  } catch (error) {
    logger.error(`Error getting ML model ${req.params.id}:`, error);
    return next(error);
  }
};

exports.updateModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const modelData = req.body;
    const model = await adminService.updateModel(id, modelData);
    
    // Log the update action
    auditService.logSecurityEvent('model_update', {
      userId: req.user.id,
      targetId: id,
      action: 'update',
      resource: 'ml_model',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { updatedFields: Object.keys(modelData) }
    }).catch(err => logger.error('Failed to log model update:', err));
    
    return res.json(model);
  } catch (error) {
    logger.error(`Error updating ML model ${req.params.id}:`, error);
    return next(error);
  }
};

exports.activateModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.updateModelStatus(id, true);
    
    // Log the activation action
    auditService.logSecurityEvent('model_activation', {
      userId: req.user.id,
      targetId: id,
      action: 'activate',
      resource: 'ml_model',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    }).catch(err => logger.error('Failed to log model activation:', err));
    
    return res.json({ message: 'Model activated successfully' });
  } catch (error) {
    logger.error(`Error activating ML model ${req.params.id}:`, error);
    return next(error);
  }
};

exports.deactivateModel = async (req, res, next) => {
  try {
    const { id } = req.params;
    await adminService.updateModelStatus(id, false);
    
    // Log the deactivation action
    auditService.logSecurityEvent('model_deactivation', {
      userId: req.user.id,
      targetId: id,
      action: 'deactivate',
      resource: 'ml_model',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true
    }).catch(err => logger.error('Failed to log model deactivation:', err));
    
    return res.json({ message: 'Model deactivated successfully' });
  } catch (error) {
    logger.error(`Error deactivating ML model ${req.params.id}:`, error);
    return next(error);
  }
};

exports.getModelAnalytics = async (req, res, next) => {
  try {
    const { modelType, period = 'month', startDate, endDate } = req.query;
    const analytics = await adminService.getModelAnalytics({ modelType, period, startDate, endDate });
    return res.json(analytics);
  } catch (error) {
    logger.error('Error getting ML model analytics:', error);
    return next(error);
  }
};

/**
 * Configuration Management Controllers
 */
exports.getAllConfigs = async (req, res, next) => {
  try {
    const configs = await systemService.getAllConfigs();
    return res.json(configs);
  } catch (error) {
    logger.error('Error getting all configs:', error);
    return next(error);
  }
};

exports.getConfigByKey = async (req, res, next) => {
  try {
    const { key } = req.params;
    const config = await systemService.getConfigByKey(key);
    
    if (!config) {
      return next(createError(404, 'Configuration not found'));
    }
    
    return res.json(config);
  } catch (error) {
    logger.error(`Error getting config ${req.params.key}:`, error);
    return next(error);
  }
};

exports.updateConfig = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const config = await systemService.updateConfig(key, value, description);
    
    // Log the update action
    auditService.logSecurityEvent('config_update', {
      userId: req.user.id,
      action: 'update',
      resource: 'system_config',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { key }
    }).catch(err => logger.error('Failed to log config update:', err));
    
    return res.json(config);
  } catch (error) {
    logger.error(`Error updating config ${req.params.key}:`, error);
    return next(error);
  }
};

exports.createConfig = async (req, res, next) => {
  try {
    const { key, value, description, isPublic } = req.body;
    const config = await systemService.createConfig(key, value, description, isPublic);
    
    // Log the create action
    auditService.logSecurityEvent('config_create', {
      userId: req.user.id,
      action: 'create',
      resource: 'system_config',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { key }
    }).catch(err => logger.error('Failed to log config creation:', err));
    
    return res.status(201).json(config);
  } catch (error) {
    logger.error('Error creating config:', error);
    return next(error);
  }
};

exports.deleteConfig = async (req, res, next) => {
  try {
    const { key } = req.params;
    await systemService.deleteConfig(key);
    
    // Log the delete action
    auditService.logSecurityEvent('config_delete', {
      userId: req.user.id,
      action: 'delete',
      resource: 'system_config',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { key }
    }).catch(err => logger.error('Failed to log config deletion:', err));
    
    return res.json({ message: 'Configuration deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting config ${req.params.key}:`, error);
    return next(error);
  }
};

/**
 * Audit and Security Controllers
 */
exports.getAuditLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, action, resource, limit = 100, page = 1 } = req.query;
    const logs = await systemService.getAuditLogs({ 
      startDate, endDate, userId, action, resource, limit, page 
    });
    return res.json(logs);
  } catch (error) {
    logger.error('Error getting audit logs:', error);
    return next(error);
  }
};

exports.getSecurityLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, eventType, userId, success, limit = 100, page = 1 } = req.query;
    const logs = await systemService.getSecurityLogs({ 
      startDate, endDate, eventType, userId, success, limit, page 
    });
    return res.json(logs);
  } catch (error) {
    logger.error('Error getting security logs:', error);
    return next(error);
  }
};

exports.getAuthLogs = async (req, res, next) => {
  try {
    const { startDate, endDate, userId, email, event, success, limit = 100, page = 1 } = req.query;
    const logs = await systemService.getAuthLogs({ 
      startDate, endDate, userId, email, event, success, limit, page 
    });
    return res.json(logs);
  } catch (error) {
    logger.error('Error getting auth logs:', error);
    return next(error);
  }
};

/**
 * Data Export and Backup Controllers
 */
exports.exportSystemData = async (req, res, next) => {
  try {
    const { format = 'json', tables } = req.body;
    const data = await systemService.exportSystemData(format, tables);
    
    // Set appropriate headers
    if (format === 'csv') {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=system_data.zip');
    } else if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=system_data.json');
    } else if (format === 'sql') {
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', 'attachment; filename=system_data.sql');
    }
    
    // Log the export action
    auditService.logSecurityEvent('data_export', {
      userId: req.user.id,
      action: 'export',
      resource: 'system_data',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { format, tables }
    }).catch(err => logger.error('Failed to log data export:', err));
    
    return res.send(data);
  } catch (error) {
    logger.error('Error exporting system data:', error);
    return next(error);
  }
};

exports.getBackupStatus = async (req, res, next) => {
  try {
    const status = await systemService.getBackupStatus();
    return res.json(status);
  } catch (error) {
    logger.error('Error getting backup status:', error);
    return next(error);
  }
};

exports.createBackup = async (req, res, next) => {
  try {
    const { description } = req.body;
    const backup = await systemService.createBackup(description);
    
    // Log the backup action
    auditService.logSecurityEvent('system_backup', {
      userId: req.user.id,
      action: 'backup',
      resource: 'database',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { backupId: backup.id }
    }).catch(err => logger.error('Failed to log system backup:', err));
    
    return res.status(201).json(backup);
  } catch (error) {
    logger.error('Error creating backup:', error);
    return next(error);
  }
};

exports.restoreBackup = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { confirmationCode } = req.body;
    
    // Extra security check for restore operations
    if (!confirmationCode || confirmationCode !== req.user.email) {
      return next(createError(400, 'Invalid confirmation code. Please provide your email as confirmation.'));
    }
    
    await systemService.restoreBackup(id);
    
    // Log the restore action
    auditService.logSecurityEvent('system_restore', {
      userId: req.user.id,
      action: 'restore',
      resource: 'database',
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      details: { backupId: id }
    }).catch(err => logger.error('Failed to log system restore:', err));
    
    return res.json({ message: 'System restored successfully from backup' });
  } catch (error) {
    logger.error(`Error restoring backup ${req.params.id}:`, error);
    return next(error);
  }
};
