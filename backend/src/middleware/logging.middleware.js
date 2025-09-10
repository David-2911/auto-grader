const morgan = require('morgan');
const { httpLogStream } = require('../utils/logger');
const { logger } = require('../utils/logger');

/**
 * Custom format for Morgan to log requests in a structured way
 */
const morganFormat = (tokens, req, res) => {
  return JSON.stringify({
    method: tokens.method(req, res),
    url: tokens.url(req, res),
    status: tokens.status(req, res),
    contentLength: tokens.res(req, res, 'content-length'),
    responseTime: `${tokens['response-time'](req, res)} ms`,
    userAgent: tokens['user-agent'](req, res),
    remoteAddr: tokens['remote-addr'](req, res),
    timestamp: tokens.date(req, res, 'iso'),
    userId: req.user ? req.user.id : null
  });
};

/**
 * Request logging middleware using Morgan
 */
const requestLogger = morgan(morganFormat, { stream: httpLogStream });

/**
 * Activity logging middleware
 * Logs user actions to database for audit purposes
 */
const activityLogger = (req, res, next) => {
  // Continue processing the request
  next();
  
  // Skip logging for certain routes
  if (
    req.path.includes('/health') || 
    req.path.includes('/favicon') ||
    req.method === 'OPTIONS'
  ) {
    return;
  }
  
  try {
    // Extract entity type and ID from the path
    const pathParts = req.path.split('/').filter(part => part);
    let entityType = pathParts[0] || 'unknown';
    let entityId = null;
    
    // Try to extract entity ID from path parameter
    if (pathParts.length > 1 && !isNaN(parseInt(pathParts[1]))) {
      entityId = parseInt(pathParts[1]);
    }
    
    // Determine action based on HTTP method
    let action;
    switch (req.method) {
      case 'GET':
        action = entityId ? 'view' : 'list';
        break;
      case 'POST':
        action = 'create';
        break;
      case 'PUT':
      case 'PATCH':
        action = 'update';
        break;
      case 'DELETE':
        action = 'delete';
        break;
      default:
        action = req.method.toLowerCase();
    }
    
    // Prepare log data for database
    const logData = {
      user_id: req.user ? req.user.id : null,
      action: `${action}_${entityType}`,
      entity_type: entityType,
      entity_id: entityId,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      additional_data: JSON.stringify({
        method: req.method,
        path: req.path,
        query: req.query
      })
    };
    
    // Asynchronously log to database if pool is available
    if (req.app.locals.dbPool) {
      req.app.locals.dbPool.query(
        'INSERT INTO activity_logs SET ?',
        logData
      ).catch(err => {
        logger.error('Failed to log activity:', err);
      });
    }
  } catch (error) {
    logger.error('Activity logging error:', error);
    // Don't throw - this is non-critical functionality
  }
};

module.exports = {
  requestLogger,
  activityLogger
};
