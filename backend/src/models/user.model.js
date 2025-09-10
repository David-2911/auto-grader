const { pool } = require('../config/database');
const bcrypt = require('bcrypt');
const { logger } = require('../utils/logger');

/**
 * User model for handling all user-related database operations
 */
class User {
  /**
   * Create a new user
   * @param {Object} userData - User data including email, password, role, identifier, first_name, last_name
   * @returns {Promise<Object>} - Created user data
   */
  static async create(userData) {
    try {
      const { email, password, role, identifier, firstName, lastName } = userData;
      
      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Insert user
      const [result] = await pool.query(
        'INSERT INTO users (email, password, role, identifier, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
        [email, hashedPassword, role, identifier, firstName, lastName]
      );
      
      // If user is created, create role-specific profile
      if (result.insertId) {
        const userId = result.insertId;
        
        if (role === 'student') {
          await pool.query(
            'INSERT INTO student_profiles (user_id) VALUES (?)',
            [userId]
          );
        } else if (role === 'teacher') {
          await pool.query(
            'INSERT INTO teacher_profiles (user_id) VALUES (?)',
            [userId]
          );
        } else if (role === 'admin') {
          await pool.query(
            'INSERT INTO admin_profiles (user_id, access_level) VALUES (?, ?)',
            [userId, 1]
          );
        }
      }
      
      return {
        id: result.insertId,
        email,
        role,
        identifier,
        firstName,
        lastName
      };
    } catch (error) {
      logger.error('Error creating user:', error);
      throw error;
    }
  }
  
  /**
   * Find a user by email
   * @param {string} email - User email
   * @returns {Promise<Object|null>} - User data or null
   */
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      logger.error('Error finding user by email:', error);
      throw error;
    }
  }
  
  /**
   * Find a user by ID
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} - User data or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      logger.error('Error finding user by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get user with profile data
   * @param {number} id - User ID
   * @returns {Promise<Object|null>} - User data with profile or null
   */
  static async getWithProfile(id) {
    try {
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );
      
      if (!users.length) return null;
      
      const user = users[0];
      let profile = null;
      
      if (user.role === 'student') {
        const [profiles] = await pool.query(
          'SELECT * FROM student_profiles WHERE user_id = ?',
          [id]
        );
        profile = profiles.length ? profiles[0] : null;
      } else if (user.role === 'teacher') {
        const [profiles] = await pool.query(
          'SELECT * FROM teacher_profiles WHERE user_id = ?',
          [id]
        );
        profile = profiles.length ? profiles[0] : null;
      } else if (user.role === 'admin') {
        const [profiles] = await pool.query(
          'SELECT * FROM admin_profiles WHERE user_id = ?',
          [id]
        );
        profile = profiles.length ? profiles[0] : null;
      }
      
      return {
        ...user,
        profile
      };
    } catch (error) {
      logger.error('Error getting user with profile:', error);
      throw error;
    }
  }
  
  /**
   * Update user data
   * @param {number} id - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<boolean>} - Success status
   */
  static async update(id, userData) {
    try {
      const { email, firstName, lastName, isActive } = userData;
      
      const [result] = await pool.query(
        'UPDATE users SET email = ?, first_name = ?, last_name = ?, is_active = ? WHERE id = ?',
        [email, firstName, lastName, isActive, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  }
  
  /**
   * Update user's password
   * @param {number} id - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  static async updatePassword(id, newPassword) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);
      
      const [result] = await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }
  
  /**
   * Update user's profile data
   * @param {number} id - User ID
   * @param {string} role - User role
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<boolean>} - Success status
   */
  static async updateProfile(id, role, profileData) {
    try {
      let result;
      
      if (role === 'student') {
        const { yearLevel, major, cumulativeGpa, bio } = profileData;
        [result] = await pool.query(
          'UPDATE student_profiles SET year_level = ?, major = ?, cumulative_gpa = ?, bio = ? WHERE user_id = ?',
          [yearLevel, major, cumulativeGpa, bio, id]
        );
      } else if (role === 'teacher') {
        const { department, title, officeLocation, officeHours, bio } = profileData;
        [result] = await pool.query(
          'UPDATE teacher_profiles SET department = ?, title = ?, office_location = ?, office_hours = ?, bio = ? WHERE user_id = ?',
          [department, title, officeLocation, officeHours, bio, id]
        );
      } else if (role === 'admin') {
        const { department, position, accessLevel } = profileData;
        [result] = await pool.query(
          'UPDATE admin_profiles SET department = ?, position = ?, access_level = ? WHERE user_id = ?',
          [department, position, accessLevel, id]
        );
      }
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating user profile:', error);
      throw error;
    }
  }
  
  /**
   * Get all users with pagination and filtering
   * @param {Object} options - Query options including page, limit, role, and search
   * @returns {Promise<Object>} - Paginated users and total count
   */
  static async getAll({ page = 1, limit = 10, role, search }) {
    try {
      let query = 'SELECT * FROM users';
      const queryParams = [];
      
      // Add filters
      const whereConditions = [];
      
      if (role) {
        whereConditions.push('role = ?');
        queryParams.push(role);
      }
      
      if (search) {
        whereConditions.push('(email LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR identifier LIKE ?)');
        const searchParam = `%${search}%`;
        queryParams.push(searchParam, searchParam, searchParam, searchParam);
      }
      
      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      // Add pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), (Number(page) - 1) * Number(limit));
      
      // Get users
      const [users] = await pool.query(query, queryParams);
      
      // Get total count
      let countQuery = 'SELECT COUNT(*) AS total FROM users';
      if (whereConditions.length) {
        countQuery += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, queryParams.length - 2));
      
      return {
        users,
        total: countResult[0].total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(countResult[0].total / Number(limit))
      };
    } catch (error) {
      logger.error('Error getting all users:', error);
      throw error;
    }
  }
  
  /**
   * Delete a user
   * @param {number} id - User ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }
}

module.exports = User;
