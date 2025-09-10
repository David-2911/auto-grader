const { tokenService, permissionService, auditService } = require('../services/auth.service');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

/**
 * Middleware to authenticate requests using JWT
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(createError(401, 'Access denied. No token provided.'));
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return next(createError(401, 'Access denied. No token provided.'));
    }
    
    // Verify token
    const decoded = tokenService.verifyToken(token);
    
    if (!decoded) {
      return next(createError(401, 'Invalid token.'));
    }
    
    // Add user to request object
    req.user = decoded;
    
    // Continue to next middleware or route handler
    next();
  } catch (error) {
    logger.error('Authentication error:', error.message);
    
    if (error.name === 'TokenExpiredError') {
      return next(createError(401, 'Token has expired. Please login again.'));
    }
    
    return next(createError(401, 'Invalid token.'));
  }
};

/**
 * Middleware to authorize user based on role
 * @param {...String} roles - Roles allowed to access the route
 * @returns {Function} - Express middleware function
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'User not authenticated.'));
    }
    
    if (!roles.includes(req.user.role)) {
      logger.warn(`Access denied for user ${req.user.id} with role ${req.user.role}`);
      
      // Log the authorization attempt
      auditService.logSecurityEvent('authorization_failure', {
        userId: req.user.id,
        action: 'access',
        resource: req.originalUrl,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false,
        details: {
          requiredRoles: roles,
          userRole: req.user.role
        }
      }).catch(err => logger.error('Failed to log authorization failure:', err));
      
      return next(createError(403, 'You do not have permission to access this resource.'));
    }
    
    next();
  };
};

/**
 * Middleware to check if the user is accessing their own resource
 * @param {Function} getResourceUserId - Function to extract the user ID from the request
 * @returns {Function} - Express middleware function
 */
const isResourceOwner = (getResourceUserId) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(createError(401, 'User not authenticated.'));
      }
      
      // Admin can access all resources
      if (req.user.role === 'admin') {
        return next();
      }
      
      const resourceUserId = await getResourceUserId(req);
      
      if (parseInt(resourceUserId) !== parseInt(req.user.id)) {
        logger.warn(`Resource ownership check failed for user ${req.user.id} attempting to access resource of user ${resourceUserId}`);
        
        // Log the access attempt
        auditService.logSecurityEvent('resource_ownership_violation', {
          userId: req.user.id,
          targetId: resourceUserId,
          action: 'access',
          resource: req.originalUrl,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          success: false
        }).catch(err => logger.error('Failed to log resource ownership violation:', err));
        
        return next(createError(403, 'You do not have permission to access this resource.'));
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to authorize based on specific permissions
 * @param {...String} requiredPermissions - Permissions required to access the route
 * @returns {Function} - Express middleware function
 */
const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(createError(401, 'User not authenticated.'));
    }
    
    const { role } = req.user;
    
    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every(
      permission => permissionService.hasPermission(role, permission)
    );
    
    if (!hasAllPermissions) {
      logger.warn(`Permission denied for user ${req.user.id} with role ${role}`);
      
      // Log the permission check failure
      auditService.logSecurityEvent('permission_check_failure', {
        userId: req.user.id,
        action: 'access',
        resource: req.originalUrl,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: false,
        details: {
          requiredPermissions,
          userRole: role
        }
      }).catch(err => logger.error('Failed to log permission check failure:', err));
      
      return next(createError(403, 'You do not have permission to perform this action.'));
    }
    
    next();
  };
};

/**
 * Middleware to sanitize user input
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const sanitizeInput = (req, res, next) => {
  try {
    // Function to sanitize a string
    const sanitizeString = (str) => {
      if (typeof str !== 'string') return str;
      // Basic sanitization - remove HTML tags and trim
      return str
        .replace(/<[^>]*>/g, '')
        .trim();
    };
    
    // Function to recursively sanitize an object
    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }
      
      // Handle objects
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
          sanitized[key] = sanitizeString(value);
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
      
      return sanitized;
    };
    
    // Sanitize request body, query and params
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }
    
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    logger.error('Input sanitization error:', error);
    next(error);
  }
};

/**
 * Teacher-specific authentication middleware
 * Ensures user is authenticated and has teacher or admin role
 */
const requireTeacher = (req, res, next) => {
  authenticate(req, res, (authErr) => {
    if (authErr) return next(authErr);
    
    authorize('teacher', 'admin')(req, res, next);
  });
};

/**
 * Middleware to check if teacher has access to specific course
 */
const requireCourseAccess = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
    
    if (!courseId) {
      return next(createError(400, 'Course ID is required'));
    }
    
    // Admin has access to all courses
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if teacher is assigned to this course
    const db = require('../config/database');
    const [courseAccess] = await db.query(
      'SELECT id FROM courses WHERE id = ? AND teacher_id = ?',
      [courseId, req.user.id]
    );
    
    if (!courseAccess) {
      logger.warn(`Course access denied for user ${req.user.id} to course ${courseId}`);
      return next(createError(403, 'Access denied. You are not assigned to this course'));
    }
    
    next();
    
  } catch (error) {
    logger.error('Course access middleware error:', error);
    next(error);
  }
};

/**
 * Middleware to check if teacher has access to specific assignment
 */
const requireAssignmentAccess = async (req, res, next) => {
  try {
    const assignmentId = req.params.assignmentId || req.body.assignmentId || req.query.assignmentId;
    
    if (!assignmentId) {
      return next(createError(400, 'Assignment ID is required'));
    }
    
    // Admin has access to all assignments
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if teacher is assigned to the course that contains this assignment
    const db = require('../config/database');
    const [assignmentAccess] = await db.query(`
      SELECT a.id 
      FROM assignments a 
      JOIN courses c ON a.course_id = c.id 
      WHERE a.id = ? AND c.teacher_id = ?
    `, [assignmentId, req.user.id]);
    
    if (!assignmentAccess) {
      logger.warn(`Assignment access denied for user ${req.user.id} to assignment ${assignmentId}`);
      return next(createError(403, 'Access denied. You are not assigned to this assignment\'s course'));
    }
    
    next();
    
  } catch (error) {
    logger.error('Assignment access middleware error:', error);
    next(error);
  }
};

/**
 * Middleware to check if teacher has access to specific student data
 */
const requireStudentAccess = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.body.studentId || req.query.studentId;
    const courseId = req.params.courseId || req.body.courseId || req.query.courseId;
    
    if (!studentId) {
      return next(createError(400, 'Student ID is required'));
    }
    
    // Admin has access to all student data
    if (req.user.role === 'admin') {
      return next();
    }
    
    const db = require('../config/database');
    
    // If course is specified, check if teacher has access to student in that course
    if (courseId) {
      const [studentAccess] = await db.query(`
        SELECT e.id 
        FROM enrollments e 
        JOIN courses c ON e.course_id = c.id 
        WHERE e.student_id = ? AND e.course_id = ? AND c.teacher_id = ?
      `, [studentId, courseId, req.user.id]);
      
      if (!studentAccess) {
        logger.warn(`Student access denied for user ${req.user.id} to student ${studentId} in course ${courseId}`);
        return next(createError(403, 'Access denied. Student is not enrolled in your course'));
      }
    } else {
      // Check if teacher has access to student in any of their courses
      const [studentAccess] = await db.query(`
        SELECT e.id 
        FROM enrollments e 
        JOIN courses c ON e.course_id = c.id 
        WHERE e.student_id = ? AND c.teacher_id = ?
        LIMIT 1
      `, [studentId, req.user.id]);
      
      if (!studentAccess) {
        logger.warn(`Student access denied for user ${req.user.id} to student ${studentId}`);
        return next(createError(403, 'Access denied. You do not have access to this student\'s data'));
      }
    }
    
    next();
    
  } catch (error) {
    logger.error('Student access middleware error:', error);
    next(error);
  }
};

module.exports = { 
  authenticate, 
  authorize, 
  isResourceOwner, 
  requirePermission,
  sanitizeInput,
  requireTeacher,
  requireCourseAccess,
  requireAssignmentAccess,
  requireStudentAccess
};
