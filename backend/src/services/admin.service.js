const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const User = require('../models/user.model');
const Course = require('../models/course.model');
const Assignment = require('../models/assignment.model');
const MLModel = require('../models/ml.model');
const csv = require('csv-parser');
const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;
const fs = require('fs');
const path = require('path');

/**
 * Admin Service - Handles administrative operations and system management
 */
class AdminService {
  /**
   * Get dashboard statistics
   * @returns {Promise<Object>} Dashboard statistics
   */
  async getDashboardStats() {
    try {
      const connection = await pool.getConnection();
      
      try {
        // Get user statistics
        const [userStats] = await connection.query(`
          SELECT 
            COUNT(*) as total_users,
            COUNT(CASE WHEN role = 'student' THEN 1 END) as student_count,
            COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teacher_count,
            COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users
          FROM users
        `);

        // Get course statistics
        const [courseStats] = await connection.query(`
          SELECT 
            COUNT(*) as total_courses,
            COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_courses,
            COUNT(DISTINCT teacher_id) as unique_teachers
          FROM courses
        `);

        // Get assignment statistics
        const [assignmentStats] = await connection.query(`
          SELECT 
            COUNT(*) as total_assignments,
            COUNT(DISTINCT course_id) as courses_with_assignments
          FROM assignments
        `);

        // Get submission statistics
        const [submissionStats] = await connection.query(`
          SELECT 
            COUNT(*) as total_submissions,
            AVG(score) as average_score,
            COUNT(CASE WHEN status = 'graded' THEN 1 END) as graded_count
          FROM submissions
        `);

        // Get ML model performance
        const [modelStats] = await connection.query(`
          SELECT 
            COUNT(*) as total_models,
            COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_models,
            AVG(CAST(accuracy_metrics->>'$.accuracy' AS DECIMAL(5,4))) as avg_accuracy
          FROM ml_models
        `);

        // Get system performance metrics
        const [performanceStats] = await connection.query(`
          SELECT 
            AVG(metric_value) as avg_response_time,
            COUNT(CASE WHEN metric_value > threshold THEN 1 END) as alerts_count
          FROM performance_metrics
          WHERE metric_type = 'response_time'
          AND recorded_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        `);

        return {
          users: userStats[0],
          courses: courseStats[0],
          assignments: assignmentStats[0],
          submissions: submissionStats[0],
          mlModels: modelStats[0],
          performance: performanceStats[0]
        };
      } finally {
        connection.release();
      }
    } catch (error) {
      logger.error('Error getting dashboard stats:', error);
      throw error;
    }
  }

  /**
   * Get all users with filtering and pagination
   * @param {Object} options Query options
   * @returns {Promise<Object>} Paginated users and total count
   */
  async getAllUsers({ page = 1, limit = 10, role, search, status }) {
    try {
      const offset = (page - 1) * limit;
      let query = `
        SELECT u.*, 
          CASE 
            WHEN u.role = 'student' THEN sp.bio
            WHEN u.role = 'teacher' THEN tp.bio
            WHEN u.role = 'admin' THEN ap.department
          END as additional_info
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id AND u.role = 'student'
        LEFT JOIN teacher_profiles tp ON u.id = tp.user_id AND u.role = 'teacher'
        LEFT JOIN admin_profiles ap ON u.id = ap.user_id AND u.role = 'admin'
      `;

      const queryParams = [];
      const whereConditions = [];

      if (role) {
        whereConditions.push('u.role = ?');
        queryParams.push(role);
      }

      if (status !== undefined) {
        whereConditions.push('u.is_active = ?');
        queryParams.push(status === 'active' ? 1 : 0);
      }

      if (search) {
        whereConditions.push('(u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.identifier LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }

      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Add pagination
      query += ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), Number(offset));

      // Get users
      const [users] = await pool.query(query, queryParams);

      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM users u';
      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));

      return {
        users,
        pagination: {
          total: countResult[0].total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(countResult[0].total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }

  /**
   * Get user by ID with profile data
   * @param {number} id User ID
   * @returns {Promise<Object>} User data with profile
   */
  async getUserById(id) {
    try {
      const [users] = await pool.query(
        `SELECT u.*,
          CASE 
            WHEN u.role = 'student' THEN JSON_OBJECT(
              'bio', sp.bio,
              'yearLevel', sp.year_level,
              'major', sp.major,
              'cumulativeGpa', sp.cumulative_gpa
            )
            WHEN u.role = 'teacher' THEN JSON_OBJECT(
              'bio', tp.bio,
              'department', tp.department,
              'title', tp.title,
              'officeLocation', tp.office_location,
              'officeHours', tp.office_hours
            )
            WHEN u.role = 'admin' THEN JSON_OBJECT(
              'department', ap.department,
              'position', ap.position,
              'accessLevel', ap.access_level
            )
          END as profile
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id AND u.role = 'student'
        LEFT JOIN teacher_profiles tp ON u.id = tp.user_id AND u.role = 'teacher'
        LEFT JOIN admin_profiles ap ON u.id = ap.user_id AND u.role = 'admin'
        WHERE u.id = ?`,
        [id]
      );

      if (!users.length) {
        throw createError(404, 'User not found');
      }

      const user = users[0];
      user.profile = JSON.parse(user.profile);

      return user;
    } catch (error) {
      logger.error(`Error getting user ${id}:`, error);
      throw error;
    }
  }

  /**
   * Bulk import users from CSV
   * @param {Array} users Array of user data
   * @param {Object} options Import options
   * @returns {Promise<Object>} Import results
   */
  async bulkImportUsers(users, options = {}) {
    const connection = await pool.getConnection();
    const results = {
      success: [],
      errors: []
    };

    try {
      await connection.beginTransaction();

      for (const userData of users) {
        try {
          // Validate required fields
          if (!userData.email || !userData.role || !userData.identifier) {
            throw new Error('Missing required fields');
          }

          // Check if user already exists
          const [existing] = await connection.query(
            'SELECT id FROM users WHERE email = ? OR identifier = ?',
            [userData.email, userData.identifier]
          );

          if (existing.length > 0) {
            if (options.skipExisting) {
              continue;
            }
            throw new Error('User already exists');
          }

          // Generate default password if not provided
          const password = userData.password || Math.random().toString(36).slice(-8);

          // Create user
          const [result] = await connection.query(
            `INSERT INTO users (
              email, password, role, identifier, 
              first_name, last_name, is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              userData.email,
              await bcrypt.hash(password, 10),
              userData.role,
              userData.identifier,
              userData.firstName,
              userData.lastName,
              userData.isActive !== undefined ? userData.isActive : true
            ]
          );

          // Create role-specific profile
          const userId = result.insertId;
          if (userData.role === 'student') {
            await connection.query(
              'INSERT INTO student_profiles (user_id, bio, year_level, major) VALUES (?, ?, ?, ?)',
              [userId, userData.bio, userData.yearLevel, userData.major]
            );
          } else if (userData.role === 'teacher') {
            await connection.query(
              'INSERT INTO teacher_profiles (user_id, bio, department, title) VALUES (?, ?, ?, ?)',
              [userId, userData.bio, userData.department, userData.title]
            );
          } else if (userData.role === 'admin') {
            await connection.query(
              'INSERT INTO admin_profiles (user_id, department, position, access_level) VALUES (?, ?, ?, ?)',
              [userId, userData.department, userData.position, userData.accessLevel || 1]
            );
          }

          results.success.push({
            email: userData.email,
            id: userId,
            password: options.includePasswords ? password : undefined
          });
        } catch (error) {
          results.errors.push({
            email: userData.email,
            error: error.message
          });

          if (!options.continueOnError) {
            throw error;
          }
        }
      }

      await connection.commit();
      return results;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Export users to CSV/JSON
   * @param {Object} options Export options
   * @returns {Promise<Buffer>} Exported data
   */
  async exportUsers({ format = 'csv', role, status }) {
    try {
      let query = `
        SELECT u.*, 
          CASE 
            WHEN u.role = 'student' THEN sp.bio
            WHEN u.role = 'teacher' THEN tp.bio
            WHEN u.role = 'admin' THEN ap.department
          END as additional_info
        FROM users u
        LEFT JOIN student_profiles sp ON u.id = sp.user_id AND u.role = 'student'
        LEFT JOIN teacher_profiles tp ON u.id = tp.user_id AND u.role = 'teacher'
        LEFT JOIN admin_profiles ap ON u.id = ap.user_id AND u.role = 'admin'
      `;

      const queryParams = [];
      const whereConditions = [];

      if (role) {
        whereConditions.push('u.role = ?');
        queryParams.push(role);
      }

      if (status !== undefined) {
        whereConditions.push('u.is_active = ?');
        queryParams.push(status === 'active' ? 1 : 0);
      }

      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      const [users] = await pool.query(query, queryParams);

      // Remove sensitive data
      users.forEach(user => {
        delete user.password;
        delete user.reset_token;
      });

      if (format === 'json') {
        return JSON.stringify(users, null, 2);
      } else if (format === 'csv') {
        const csvStringifier = createCsvStringifier({
          header: [
            { id: 'id', title: 'ID' },
            { id: 'email', title: 'Email' },
            { id: 'role', title: 'Role' },
            { id: 'identifier', title: 'Identifier' },
            { id: 'first_name', title: 'First Name' },
            { id: 'last_name', title: 'Last Name' },
            { id: 'is_active', title: 'Active' },
            { id: 'created_at', title: 'Created At' },
            { id: 'additional_info', title: 'Additional Info' }
          ]
        });

        return csvStringifier.stringifyRecords(users);
      } else if (format === 'excel') {
        // Implementation for Excel format
        // You would need to use a library like xlsx here
        throw new Error('Excel format not implemented');
      }

      throw new Error('Unsupported format');
    } catch (error) {
      logger.error('Error exporting users:', error);
      throw error;
    }
  }

  /**
   * Update user data
   * @param {number} id User ID
   * @param {Object} userData Updated user data
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(id, userData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Update base user data
      const { email, firstName, lastName, isActive, role, identifier } = userData;
      await connection.query(
        `UPDATE users 
         SET email = ?, first_name = ?, last_name = ?, is_active = ?,
             role = ?, identifier = ?, updated_at = NOW()
         WHERE id = ?`,
        [email, firstName, lastName, isActive, role, identifier, id]
      );

      // Update role-specific profile
      if (userData.profile) {
        if (role === 'student') {
          await connection.query(
            `UPDATE student_profiles 
             SET bio = ?, year_level = ?, major = ?, cumulative_gpa = ?
             WHERE user_id = ?`,
            [
              userData.profile.bio,
              userData.profile.yearLevel,
              userData.profile.major,
              userData.profile.cumulativeGpa,
              id
            ]
          );
        } else if (role === 'teacher') {
          await connection.query(
            `UPDATE teacher_profiles 
             SET bio = ?, department = ?, title = ?, 
                 office_location = ?, office_hours = ?
             WHERE user_id = ?`,
            [
              userData.profile.bio,
              userData.profile.department,
              userData.profile.title,
              userData.profile.officeLocation,
              userData.profile.officeHours,
              id
            ]
          );
        } else if (role === 'admin') {
          await connection.query(
            `UPDATE admin_profiles 
             SET department = ?, position = ?, access_level = ?
             WHERE user_id = ?`,
            [
              userData.profile.department,
              userData.profile.position,
              userData.profile.accessLevel,
              id
            ]
          );
        }
      }

      await connection.commit();
      return this.getUserById(id);
    } catch (error) {
      await connection.rollback();
      logger.error(`Error updating user ${id}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Delete user and associated data
   * @param {number} id User ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteUser(id) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();

      // Delete role-specific profile first
      await connection.query(
        'DELETE FROM student_profiles WHERE user_id = ?;' +
        'DELETE FROM teacher_profiles WHERE user_id = ?;' +
        'DELETE FROM admin_profiles WHERE user_id = ?',
        [id, id, id]
      );

      // Delete user's data from related tables
      await connection.query(
        'DELETE FROM auth_logs WHERE user_id = ?;' +
        'DELETE FROM activity_logs WHERE user_id = ?;' +
        'DELETE FROM refresh_tokens WHERE user_id = ?',
        [id, id, id]
      );

      // Finally, delete the user
      await connection.query('DELETE FROM users WHERE id = ?', [id]);

      await connection.commit();
      return true;
    } catch (error) {
      await connection.rollback();
      logger.error(`Error deleting user ${id}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * Update user status (activate/deactivate)
   * @param {number} id User ID
   * @param {boolean} isActive Active status
   * @param {string} reason Reason for status change
   * @returns {Promise<boolean>} Success status
   */
  async updateUserStatus(id, isActive, reason) {
    try {
      await pool.query(
        'UPDATE users SET is_active = ? WHERE id = ?',
        [isActive, id]
      );

      // Log status change
      await pool.query(
        `INSERT INTO user_status_logs (user_id, status, reason, created_at)
         VALUES (?, ?, ?, NOW())`,
        [id, isActive ? 'activated' : 'deactivated', reason]
      );

      return true;
    } catch (error) {
      logger.error(`Error updating user ${id} status:`, error);
      throw error;
    }
  }

  /**
   * Get user analytics
   * @param {Object} options Query options
   * @returns {Promise<Object>} Analytics data
   */
  async getUserAnalytics({ period = 'month', startDate, endDate }) {
    try {
      let dateFilter;
      if (startDate && endDate) {
        dateFilter = 'created_at BETWEEN ? AND ?';
      } else {
        switch (period) {
          case 'day':
            dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)';
            break;
          case 'week':
            dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
            break;
          case 'month':
            dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
            break;
          case 'year':
            dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
            break;
          default:
            dateFilter = 'created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';
        }
      }

      // Get user registration trends
      const query = `
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as total,
          COUNT(CASE WHEN role = 'student' THEN 1 END) as students,
          COUNT(CASE WHEN role = 'teacher' THEN 1 END) as teachers
        FROM users
        WHERE ${dateFilter}
        GROUP BY DATE(created_at)
        ORDER BY date
      `;

      const [registrations] = await pool.query(
        query,
        startDate && endDate ? [startDate, endDate] : []
      );

      // Get role distribution
      const [roleDistribution] = await pool.query(`
        SELECT 
          role,
          COUNT(*) as count,
          COUNT(*) * 100.0 / (SELECT COUNT(*) FROM users) as percentage
        FROM users
        GROUP BY role
      `);

      // Get active vs inactive users
      const [activityStats] = await pool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_users,
          COUNT(CASE WHEN is_active = 0 THEN 1 END) as inactive_users
        FROM users
      `);

      return {
        registrations,
        roleDistribution,
        activityStats
      };
    } catch (error) {
      logger.error('Error getting user analytics:', error);
      throw error;
    }
  }

  // ... Add remaining methods for course, assignment, ML model management
  // and other administrative functions ...
}

module.exports = AdminService;
