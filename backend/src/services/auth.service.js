const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const config = require('../config/config');
const { logger } = require('../utils/logger');
const { pool } = require('../config/database');
const { createError } = require('../utils/error.util');

/**
 * Generate JWT tokens for authentication
 */
class TokenService {
  /**
   * Generate an access token
   * @param {Object} payload - User data to include in token
   * @returns {String} - JWT token
   */
  generateAccessToken(payload) {
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtExpiresIn
    });
  }

  /**
   * Generate a refresh token
   * @param {Object} payload - User data to include in token
   * @returns {String} - JWT refresh token
   */
  generateRefreshToken(payload) {
    return jwt.sign(payload, config.auth.jwtSecret, {
      expiresIn: config.auth.jwtRefreshExpiresIn
    });
  }

  /**
   * Verify the validity of a JWT token
   * @param {String} token - JWT token to verify
   * @returns {Object|null} - Decoded token payload or null if invalid
   */
  verifyToken(token) {
    try {
      return jwt.verify(token, config.auth.jwtSecret);
    } catch (error) {
      logger.error('Token verification failed:', error.message);
      return null;
    }
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} - Object containing both tokens
   */
  generateTokens(user) {
    // Create payload with minimal necessary user data
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      identifier: user.identifier
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
      expiresIn: config.auth.jwtExpiresIn
    };
  }

  /**
   * Store refresh token in database
   * @param {Number} userId - User ID
   * @param {String} refreshToken - Refresh token
   * @returns {Promise<Boolean>} - Success status
   */
  async storeRefreshToken(userId, refreshToken) {
    try {
      // Calculate expiry (7 days from now or as configured)
      const refreshTokenExpiry = new Date();
      const days = parseInt(config.auth.jwtRefreshExpiresIn.match(/(\d+)d/)?.[1] || '7', 10);
      refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + days);
      
      await pool.query(
        'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
        [userId, refreshToken, refreshTokenExpiry]
      );
      
      return true;
    } catch (error) {
      logger.error('Error storing refresh token:', error);
      throw error;
    }
  }

  /**
   * Verify and retrieve a refresh token
   * @param {String} refreshToken - Refresh token to verify
   * @returns {Promise<Object>} - Token data including user_id
   */
  async verifyRefreshToken(refreshToken) {
    try {
      // Verify token cryptographically
      const decoded = this.verifyToken(refreshToken);
      
      if (!decoded) {
        throw createError(401, 'Invalid refresh token');
      }
      
      // Check if token exists in database and is not expired
      const [tokens] = await pool.query(
        'SELECT * FROM refresh_tokens WHERE token = ? AND expires_at > NOW()',
        [refreshToken]
      );
      
      if (tokens.length === 0) {
        throw createError(401, 'Refresh token expired or revoked');
      }
      
      return { 
        token: tokens[0],
        decoded
      };
    } catch (error) {
      logger.error('Refresh token verification failed:', error);
      throw error;
    }
  }

  /**
   * Revoke a refresh token
   * @param {String} refreshToken - Refresh token to revoke
   * @returns {Promise<Boolean>} - Success status
   */
  async revokeRefreshToken(refreshToken) {
    try {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE token = ?',
        [refreshToken]
      );
      
      return true;
    } catch (error) {
      logger.error('Error revoking refresh token:', error);
      throw error;
    }
  }

  /**
   * Revoke all refresh tokens for a user
   * @param {Number} userId - User ID
   * @returns {Promise<Boolean>} - Success status
   */
  async revokeAllUserTokens(userId) {
    try {
      await pool.query(
        'DELETE FROM refresh_tokens WHERE user_id = ?',
        [userId]
      );
      
      return true;
    } catch (error) {
      logger.error('Error revoking user tokens:', error);
      throw error;
    }
  }
}

/**
 * Password management service
 */
class PasswordService {
  /**
   * Hash a password
   * @param {String} password - Plain text password
   * @returns {Promise<String>} - Hashed password
   */
  async hash(password) {
    const salt = await bcrypt.genSalt(config.auth.saltRounds);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify a password against a hash
   * @param {String} password - Plain text password
   * @param {String} hash - Hashed password
   * @returns {Promise<Boolean>} - True if password matches
   */
  async verify(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a random password reset token
   * @returns {String} - Random token
   */
  generateResetToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Store a password reset token in the database
   * @param {Number} userId - User ID
   * @param {String} resetToken - Reset token
   * @returns {Promise<Boolean>} - Success status
   */
  async storeResetToken(userId, resetToken) {
    try {
      // Set expiry (1 hour from now)
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + 1);
      
      await pool.query(
        'INSERT INTO password_reset (user_id, reset_token, expires_at) VALUES (?, ?, ?)',
        [userId, resetToken, expiry]
      );
      
      return true;
    } catch (error) {
      logger.error('Error storing reset token:', error);
      throw error;
    }
  }

  /**
   * Verify a password reset token
   * @param {String} resetToken - Reset token to verify
   * @returns {Promise<Object>} - Token data including user_id
   */
  async verifyResetToken(resetToken) {
    try {
      const [tokens] = await pool.query(
        'SELECT * FROM password_reset WHERE reset_token = ? AND expires_at > NOW()',
        [resetToken]
      );
      
      if (tokens.length === 0) {
        throw createError(404, 'Invalid or expired reset token');
      }
      
      return tokens[0];
    } catch (error) {
      logger.error('Error verifying reset token:', error);
      throw error;
    }
  }

  /**
   * Delete a password reset token
   * @param {String} resetToken - Reset token to delete
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteResetToken(resetToken) {
    try {
      await pool.query(
        'DELETE FROM password_reset WHERE reset_token = ?',
        [resetToken]
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting reset token:', error);
      throw error;
    }
  }
}

/**
 * Service for role and permissions management
 */
class PermissionService {
  // Define role-based permissions
  constructor() {
    // Define permission groups
    this.permissions = {
      // Course permissions
      COURSE_CREATE: 'course:create',
      COURSE_READ: 'course:read',
      COURSE_UPDATE: 'course:update',
      COURSE_DELETE: 'course:delete',
      
      // Assignment permissions
      ASSIGNMENT_CREATE: 'assignment:create',
      ASSIGNMENT_READ: 'assignment:read',
      ASSIGNMENT_UPDATE: 'assignment:update',
      ASSIGNMENT_DELETE: 'assignment:delete',
      
      // Submission permissions
      SUBMISSION_CREATE: 'submission:create',
      SUBMISSION_READ: 'submission:read',
      SUBMISSION_UPDATE: 'submission:update',
      
      // Grading permissions
      GRADE_CREATE: 'grade:create',
      GRADE_READ: 'grade:read',
      GRADE_UPDATE: 'grade:update',
      
      // User management permissions
      USER_CREATE: 'user:create',
      USER_READ: 'user:read',
      USER_UPDATE: 'user:update',
      USER_DELETE: 'user:delete',
      
      // Admin permissions
      SYSTEM_SETTINGS: 'system:settings',
      VIEW_LOGS: 'system:logs'
    };
    
    // Define role-based permission assignments
    this.rolePermissions = {
      student: [
        this.permissions.COURSE_READ,
        this.permissions.ASSIGNMENT_READ,
        this.permissions.SUBMISSION_CREATE,
        this.permissions.SUBMISSION_READ,
        this.permissions.GRADE_READ,
      ],
      
      teacher: [
        this.permissions.COURSE_CREATE,
        this.permissions.COURSE_READ,
        this.permissions.COURSE_UPDATE,
        this.permissions.ASSIGNMENT_CREATE,
        this.permissions.ASSIGNMENT_READ,
        this.permissions.ASSIGNMENT_UPDATE,
        this.permissions.ASSIGNMENT_DELETE,
        this.permissions.SUBMISSION_READ,
        this.permissions.GRADE_CREATE,
        this.permissions.GRADE_READ,
        this.permissions.GRADE_UPDATE,
        this.permissions.USER_READ,
      ],
      
      admin: Object.values(this.permissions) // Admins have all permissions
    };
  }
  
  /**
   * Check if a role has a specific permission
   * @param {String} role - User role (student, teacher, admin)
   * @param {String} permission - Permission to check
   * @returns {Boolean} - True if role has permission
   */
  hasPermission(role, permission) {
    if (!this.rolePermissions[role]) {
      return false;
    }
    
    return this.rolePermissions[role].includes(permission);
  }
  
  /**
   * Get all permissions for a role
   * @param {String} role - User role
   * @returns {Array<String>} - List of permissions
   */
  getRolePermissions(role) {
    return this.rolePermissions[role] || [];
  }
}

/**
 * Service for auditing and security logging
 */
class AuditService {
  /**
   * Log an authentication event
   * @param {String} event - Event type
   * @param {Object} data - Event data
   * @returns {Promise<Boolean>} - Success status
   */
  async logAuthEvent(event, data) {
    try {
      const { userId, email, success, ipAddress, userAgent, reason } = data;
      
      await pool.query(
        `INSERT INTO auth_logs (
          event_type, user_id, email, success, ip_address, user_agent, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [event, userId || null, email, success ? 1 : 0, ipAddress, userAgent, reason || null]
      );
      
      // Also log to the application logger
      const logLevel = success ? 'info' : 'warn';
      logger[logLevel](`Auth event: ${event}`, {
        userId,
        email,
        success,
        ipAddress,
        reason
      });
      
      return true;
    } catch (error) {
      logger.error('Error logging auth event:', error);
      // Don't throw - audit logging should not break the application flow
      return false;
    }
  }
  
  /**
   * Log a permission change event
   * @param {Object} data - Event data
   * @returns {Promise<Boolean>} - Success status
   */
  async logPermissionChange(data) {
    try {
      const { 
        performedBy, targetUserId, previousRole, 
        newRole, ipAddress, success, reason 
      } = data;
      
      await pool.query(
        `INSERT INTO permission_logs (
          performed_by, target_user_id, previous_role, new_role,
          ip_address, success, reason
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          performedBy, targetUserId, previousRole, newRole,
          ipAddress, success ? 1 : 0, reason || null
        ]
      );
      
      // Also log to the application logger
      logger.info(`Permission change: User ${targetUserId} role changed from ${previousRole} to ${newRole} by ${performedBy}`, {
        performedBy,
        targetUserId,
        previousRole,
        newRole,
        success,
        reason
      });
      
      return true;
    } catch (error) {
      logger.error('Error logging permission change:', error);
      // Don't throw - audit logging should not break the application flow
      return false;
    }
  }
  
  /**
   * Log a security event
   * @param {String} eventType - Type of security event
   * @param {Object} data - Event data
   * @returns {Promise<Boolean>} - Success status
   */
  async logSecurityEvent(eventType, data) {
    try {
      const { 
        userId, targetId, action, resource, 
        ipAddress, userAgent, success, details 
      } = data;
      
      await pool.query(
        `INSERT INTO security_logs (
          event_type, user_id, target_id, action, resource,
          ip_address, user_agent, success, details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          eventType, userId || null, targetId || null, 
          action, resource, ipAddress, userAgent,
          success ? 1 : 0, details ? JSON.stringify(details) : null
        ]
      );
      
      // Log level depends on success and event type
      const logLevel = success ? 'info' : 'warn';
      logger[logLevel](`Security event: ${eventType} - ${action} on ${resource}`, {
        userId,
        targetId,
        action,
        resource,
        success,
        details
      });
      
      return true;
    } catch (error) {
      logger.error('Error logging security event:', error);
      // Don't throw - audit logging should not break the application flow
      return false;
    }
  }
}

// Export services as singletons
module.exports = {
  tokenService: new TokenService(),
  passwordService: new PasswordService(),
  permissionService: new PermissionService(),
  auditService: new AuditService()
};
