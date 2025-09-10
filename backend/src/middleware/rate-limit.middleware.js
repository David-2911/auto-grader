const rateLimit = require('express-rate-limit');
const { logger } = require('../utils/logger');
const config = require('../config/config');
const { auditService } = require('../services/auth.service');

/**
 * Configure rate limiting
 * @param {Object} options - Rate limit options to override defaults
 * @returns {Function} - Rate limiting middleware
 */
const rateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.server.rateLimitWindowMs,  // 15 minutes
    max: config.server.rateLimitMax,  // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: {
      success: false,
      error: {
        status: 429,
        message: 'Too many requests, please try again later.'
      }
    },
    handler: (req, res, next, options) => {
      const logMessage = `Rate limit exceeded for IP: ${req.ip}`;
      logger.warn(logMessage);
      
      // Log the rate limit event to audit logs
      auditService.logSecurityEvent('rate_limit_exceeded', {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        action: req.method,
        resource: req.originalUrl,
        success: false,
        details: {
          windowMs: options.windowMs,
          limit: options.max
        }
      }).catch(err => logger.error('Failed to log rate limit event:', err));
      
      res.status(429).json(options.message);
    },
  };
  
  return rateLimit({
    ...defaultOptions,
    ...options
  });
};

/**
 * Configure stricter rate limiting for auth routes
 */
const authLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 10, // limit each IP to 10 requests per hour
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many login attempts, please try again after an hour'
    }
  }
});

/**
 * Configure stricter rate limiting for password reset routes
 */
const passwordResetLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // limit each IP to 5 requests per hour
  message: {
    success: false,
    error: {
      status: 429,
      message: 'Too many password reset attempts, please try again after an hour'
    }
  }
});

/**
 * Configure progressive rate limiting for sensitive operations
 * Adjusts the rate limit based on failure counts
 */
const createProgressiveRateLimiter = () => {
  // Store IP addresses with their failure counts
  const failureCounts = new Map();
  
  // Clean up old entries periodically
  const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of failureCounts.entries()) {
      if (now - data.lastFailure > CLEANUP_INTERVAL) {
        failureCounts.delete(ip);
      }
    }
  }, CLEANUP_INTERVAL);
  
  // Middleware function
  return (req, res, next) => {
    const ip = req.ip;
    
    // Check if IP is in the failure count map
    if (failureCounts.has(ip)) {
      const data = failureCounts.get(ip);
      const now = Date.now();
      
      // Calculate the block duration based on failure count
      let blockDuration = 0;
      if (data.count >= 10) blockDuration = 24 * 60 * 60 * 1000; // 24 hours
      else if (data.count >= 5) blockDuration = 60 * 60 * 1000; // 1 hour
      else if (data.count >= 3) blockDuration = 15 * 60 * 1000; // 15 minutes
      
      // Check if the IP is still blocked
      if (blockDuration > 0 && now - data.lastFailure < blockDuration) {
        const remainingTime = Math.ceil((data.lastFailure + blockDuration - now) / (60 * 1000));
        
        // Log the blocked attempt
        logger.warn(`Blocked request from IP ${ip} due to progressive rate limiting`);
        
        // Log to audit service
        auditService.logSecurityEvent('progressive_rate_limit_block', {
          ipAddress: ip,
          userAgent: req.get('User-Agent'),
          action: req.method,
          resource: req.originalUrl,
          success: false,
          details: {
            failureCount: data.count,
            blockDuration: blockDuration / (60 * 1000), // in minutes
            remainingTime
          }
        }).catch(err => logger.error('Failed to log progressive rate limit block:', err));
        
        return res.status(429).json({
          success: false,
          error: {
            status: 429,
            message: `Too many failed attempts. Please try again in ${remainingTime} minutes.`
          }
        });
      }
    }
    
    // Mark this request for tracking failures
    req.trackFailure = (failed) => {
      if (failed) {
        const now = Date.now();
        const data = failureCounts.get(ip) || { count: 0, lastFailure: now };
        data.count++;
        data.lastFailure = now;
        failureCounts.set(ip, data);
        
        // Log failure attempt
        logger.warn(`Failed authentication attempt from IP ${ip}, count: ${data.count}`);
      } else if (failureCounts.has(ip)) {
        // Reset failure count on successful attempt
        failureCounts.delete(ip);
      }
    };
    
    next();
  };
};

// Create a progressive rate limiter for sensitive operations
const progressiveRateLimiter = createProgressiveRateLimiter();

module.exports = {
  rateLimiter,
  authLimiter,
  passwordResetLimiter,
  progressiveRateLimiter
};
