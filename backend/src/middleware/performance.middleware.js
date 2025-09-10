const { logger } = require('../utils/logger');
const performanceMonitor = require('../services/performance-monitor.service');

// Performance monitoring middleware
const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  // Track request start time
  req.startTime = startTime;
  
  // Override res.end to capture response time
  const originalEnd = res.end;
  res.end = function(...args) {
    const responseTime = Date.now() - startTime;
    
    // Record metrics
    performanceMonitor.recordAPIRequest(req, res, responseTime);
    
    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        method: req.method,
        url: req.originalUrl,
        responseTime,
        statusCode: res.statusCode,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
    }
    
    // Add performance headers
    res.set({
      'X-Response-Time': `${responseTime}ms`,
      'X-Server-Timing': `app;dur=${responseTime}`
    });
    
    originalEnd.apply(this, args);
  };
  
  next();
};

// Request size monitoring
const requestSizeMiddleware = (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    if (data) {
      const responseSize = Buffer.byteLength(data, 'utf8');
      res.set('X-Response-Size', responseSize.toString());
      
      // Log large responses
      if (responseSize > 1024 * 1024) { // 1MB
        logger.warn('Large response detected', {
          url: req.originalUrl,
          responseSize,
          statusCode: res.statusCode
        });
      }
    }
    
    originalSend.apply(this, arguments);
  };
  
  next();
};

// Database query monitoring middleware
const queryMonitoringMiddleware = (originalQuery) => {
  return async function(...args) {
    const startTime = Date.now();
    const query = args[0];
    
    try {
      const result = await originalQuery.apply(this, args);
      const duration = Date.now() - startTime;
      
      // Log slow queries
      if (duration > 1000) {
        logger.warn('Slow database query', {
          query: query.substring(0, 200),
          duration,
          timestamp: new Date()
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Database query failed', {
        query: query.substring(0, 200),
        duration,
        error: error.message
      });
      throw error;
    }
  };
};

// Memory usage monitoring
const memoryMonitoringMiddleware = (req, res, next) => {
  const memUsage = process.memoryUsage();
  const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  // Log high memory usage
  if (memUsagePercent > 80) {
    logger.warn('High memory usage detected', {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      percentage: memUsagePercent.toFixed(2),
      url: req.originalUrl
    });
  }
  
  res.set('X-Memory-Usage', `${memUsagePercent.toFixed(2)}%`);
  next();
};

// Rate limiting with performance considerations
const createAdaptiveRateLimit = (baseLimit = 100, windowMs = 15 * 60 * 1000) => {
  const requestCounts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [ip, data] of requestCounts.entries()) {
      if (data.resetTime < now) {
        requestCounts.delete(ip);
      }
    }
    
    // Get or create counter for this IP
    let counter = requestCounts.get(key);
    if (!counter || counter.resetTime < now) {
      counter = {
        count: 0,
        resetTime: now + windowMs
      };
      requestCounts.set(key, counter);
    }
    
    // Adaptive rate limiting based on system load
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    let effectiveLimit = baseLimit;
    if (memUsagePercent > 80) {
      effectiveLimit = Math.floor(baseLimit * 0.5); // Reduce by 50%
    } else if (memUsagePercent > 60) {
      effectiveLimit = Math.floor(baseLimit * 0.7); // Reduce by 30%
    }
    
    counter.count++;
    
    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': effectiveLimit,
      'X-RateLimit-Remaining': Math.max(0, effectiveLimit - counter.count),
      'X-RateLimit-Reset': counter.resetTime
    });
    
    if (counter.count > effectiveLimit) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
        retryAfter: Math.ceil((counter.resetTime - now) / 1000)
      });
    }
    
    next();
  };
};

// Request validation with performance optimization
const validateRequestSize = (maxSize = 10 * 1024 * 1024) => {
  return (req, res, next) => {
    const contentLength = parseInt(req.get('Content-Length')) || 0;
    
    if (contentLength > maxSize) {
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request size ${contentLength} exceeds maximum ${maxSize} bytes`
      });
    }
    
    next();
  };
};

// Cache optimization middleware
const cacheOptimizationMiddleware = (cacheControl = 'public, max-age=300') => {
  return (req, res, next) => {
    // Set cache headers for static assets
    if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
      res.set({
        'Cache-Control': 'public, max-age=31536000', // 1 year
        'Expires': new Date(Date.now() + 31536000000).toUTCString()
      });
    } else if (req.method === 'GET' && !req.url.includes('/api/')) {
      res.set('Cache-Control', cacheControl);
    }
    
    next();
  };
};

// Compression middleware wrapper
const intelligentCompression = () => {
  return (req, res, next) => {
    const acceptEncoding = req.get('Accept-Encoding') || '';
    
    // Skip compression for small responses
    const originalSend = res.send;
    res.send = function(data) {
      if (data && typeof data === 'string' && data.length > 1024) {
        // Enable compression for larger responses
        if (acceptEncoding.includes('br')) {
          res.set('Content-Encoding', 'br');
        } else if (acceptEncoding.includes('gzip')) {
          res.set('Content-Encoding', 'gzip');
        }
      }
      
      originalSend.apply(this, arguments);
    };
    
    next();
  };
};

// Error handling with performance context
const performanceErrorHandler = (err, req, res, next) => {
  const responseTime = Date.now() - (req.startTime || Date.now());
  
  logger.error('Request failed', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    responseTime,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  // Track error in performance monitoring
  performanceMonitor.recordAPIRequest(req, { statusCode: 500 }, responseTime);
  
  res.status(err.status || 500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

module.exports = {
  performanceMiddleware,
  requestSizeMiddleware,
  queryMonitoringMiddleware,
  memoryMonitoringMiddleware,
  createAdaptiveRateLimit,
  validateRequestSize,
  cacheOptimizationMiddleware,
  intelligentCompression,
  performanceErrorHandler
};
