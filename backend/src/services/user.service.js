const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { passwordService } = require('./auth.service');
const { createError } = require('../utils/error.util');

/**
 * User Service - Handles all user-related operations
 */
class UserService {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {String} role - User role (student, teacher, admin)
   * @returns {Promise<Object>} - Created user
   */
  async createUser(userData, role) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if user with email or identifier exists
      const [existingUsers] = await connection.query(
        'SELECT * FROM users WHERE email = ? OR identifier = ?',
        [userData.email, userData.identifier]
      );
      
      if (existingUsers.length > 0) {
        throw createError(409, 'User with this email or identifier already exists');
      }
      
      // Hash password
      const hashedPassword = await passwordService.hash(userData.password);
      
      // Insert user
      const [userResult] = await connection.query(
        `INSERT INTO users (
          email, password, role, identifier, first_name, last_name, 
          profile_image, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userData.email, 
          hashedPassword, 
          role, 
          userData.identifier, 
          userData.firstName, 
          userData.lastName,
          userData.profileImage || null,
          userData.isActive !== undefined ? userData.isActive : true
        ]
      );
      
      const userId = userResult.insertId;
      
      // Create role-specific profile
      switch (role) {
        case 'student':
          await connection.query(
            'INSERT INTO student_profiles (user_id, year_level, major) VALUES (?, ?, ?)',
            [userId, userData.yearLevel || null, userData.major || null]
          );
          break;
          
        case 'teacher':
          await connection.query(
            'INSERT INTO teacher_profiles (user_id, department, title, office_location, office_hours) VALUES (?, ?, ?, ?, ?)',
            [
              userId, 
              userData.department || null, 
              userData.title || null,
              userData.officeLocation || null,
              userData.officeHours || null
            ]
          );
          break;
          
        case 'admin':
          await connection.query(
            'INSERT INTO admin_profiles (user_id, department, position, access_level) VALUES (?, ?, ?, ?)',
            [
              userId, 
              userData.department || null, 
              userData.position || null,
              userData.accessLevel || 1
            ]
          );
          break;
      }
      
      await connection.commit();
      
      // Get created user (without password)
      const [users] = await connection.query(
        'SELECT id, email, role, identifier, first_name, last_name, profile_image, is_active, created_at FROM users WHERE id = ?',
        [userId]
      );
      
      return users[0];
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Get user by ID with role-specific profile data
   * @param {Number} userId - User ID
   * @returns {Promise<Object>} - User data with profile
   */
  async getUserById(userId) {
    try {
      // Get base user data
      const [users] = await pool.query(
        `SELECT id, email, role, identifier, first_name, last_name, 
         profile_image, is_active, last_login, created_at, updated_at 
         FROM users WHERE id = ?`,
        [userId]
      );
      
      if (users.length === 0) {
        throw createError(404, 'User not found');
      }
      
      const user = users[0];
      
      // Get role-specific profile data
      let profileData = {};
      switch (user.role) {
        case 'student':
          const [studentProfiles] = await pool.query(
            'SELECT year_level, major, cumulative_gpa, bio FROM student_profiles WHERE user_id = ?',
            [userId]
          );
          if (studentProfiles.length > 0) {
            profileData = studentProfiles[0];
          }
          break;
          
        case 'teacher':
          const [teacherProfiles] = await pool.query(
            'SELECT department, title, office_location, office_hours, bio FROM teacher_profiles WHERE user_id = ?',
            [userId]
          );
          if (teacherProfiles.length > 0) {
            profileData = teacherProfiles[0];
          }
          break;
          
        case 'admin':
          const [adminProfiles] = await pool.query(
            'SELECT department, position, access_level FROM admin_profiles WHERE user_id = ?',
            [userId]
          );
          if (adminProfiles.length > 0) {
            profileData = adminProfiles[0];
          }
          break;
      }
      
      return {
        ...user,
        profile: profileData
      };
    } catch (error) {
      logger.error('Error getting user by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get user by email (for authentication)
   * @param {String} email - User email
   * @returns {Promise<Object>} - User data including password hash
   */
  async getUserByEmail(email) {
    try {
      const [users] = await pool.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );
      
      if (users.length === 0) {
        throw createError(404, 'User not found');
      }
      
      return users[0];
    } catch (error) {
      logger.error('Error getting user by email:', error);
      throw error;
    }
  }
  
  /**
   * Update user data
   * @param {Number} userId - User ID
   * @param {Object} userData - Updated user data
   * @returns {Promise<Object>} - Updated user
   */
  async updateUser(userId, userData) {
    const connection = await pool.getConnection();
    
    try {
      await connection.beginTransaction();
      
      // Check if user exists
      const [users] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        throw createError(404, 'User not found');
      }
      
      const user = users[0];
      
      // Update base user data
      const baseUpdates = {};
      
      // Only include fields that are provided
      if (userData.firstName !== undefined) baseUpdates.first_name = userData.firstName;
      if (userData.lastName !== undefined) baseUpdates.last_name = userData.lastName;
      if (userData.profileImage !== undefined) baseUpdates.profile_image = userData.profileImage;
      if (userData.isActive !== undefined) baseUpdates.is_active = userData.isActive;
      
      // If there are base updates, apply them
      if (Object.keys(baseUpdates).length > 0) {
        await connection.query(
          'UPDATE users SET ? WHERE id = ?',
          [baseUpdates, userId]
        );
      }
      
      // Update role-specific profile data
      const profileUpdates = {};
      
      switch (user.role) {
        case 'student':
          // Only include fields that are provided
          if (userData.yearLevel !== undefined) profileUpdates.year_level = userData.yearLevel;
          if (userData.major !== undefined) profileUpdates.major = userData.major;
          if (userData.cumulativeGpa !== undefined) profileUpdates.cumulative_gpa = userData.cumulativeGpa;
          if (userData.bio !== undefined) profileUpdates.bio = userData.bio;
          
          if (Object.keys(profileUpdates).length > 0) {
            await connection.query(
              'UPDATE student_profiles SET ? WHERE user_id = ?',
              [profileUpdates, userId]
            );
          }
          break;
          
        case 'teacher':
          // Only include fields that are provided
          if (userData.department !== undefined) profileUpdates.department = userData.department;
          if (userData.title !== undefined) profileUpdates.title = userData.title;
          if (userData.officeLocation !== undefined) profileUpdates.office_location = userData.officeLocation;
          if (userData.officeHours !== undefined) profileUpdates.office_hours = userData.officeHours;
          if (userData.bio !== undefined) profileUpdates.bio = userData.bio;
          
          if (Object.keys(profileUpdates).length > 0) {
            await connection.query(
              'UPDATE teacher_profiles SET ? WHERE user_id = ?',
              [profileUpdates, userId]
            );
          }
          break;
          
        case 'admin':
          // Only include fields that are provided
          if (userData.department !== undefined) profileUpdates.department = userData.department;
          if (userData.position !== undefined) profileUpdates.position = userData.position;
          if (userData.accessLevel !== undefined) profileUpdates.access_level = userData.accessLevel;
          
          if (Object.keys(profileUpdates).length > 0) {
            await connection.query(
              'UPDATE admin_profiles SET ? WHERE user_id = ?',
              [profileUpdates, userId]
            );
          }
          break;
      }
      
      await connection.commit();
      
      // Get updated user
      return this.getUserById(userId);
    } catch (error) {
      await connection.rollback();
      logger.error('Error updating user:', error);
      throw error;
    } finally {
      connection.release();
    }
  }
  
  /**
   * Update user password
   * @param {Number} userId - User ID
   * @param {String} newPassword - New password
   * @returns {Promise<Boolean>} - Success status
   */
  async updatePassword(userId, newPassword) {
    try {
      // Check if user exists
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        throw createError(404, 'User not found');
      }
      
      // Hash new password
      const hashedPassword = await passwordService.hash(newPassword);
      
      // Update password
      await pool.query(
        'UPDATE users SET password = ? WHERE id = ?',
        [hashedPassword, userId]
      );
      
      return true;
    } catch (error) {
      logger.error('Error updating password:', error);
      throw error;
    }
  }
  
  /**
   * Delete user
   * @param {Number} userId - User ID
   * @returns {Promise<Boolean>} - Success status
   */
  async deleteUser(userId) {
    try {
      // Check if user exists
      const [users] = await pool.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (users.length === 0) {
        throw createError(404, 'User not found');
      }
      
      // Delete user (cascade will delete profiles)
      await pool.query(
        'DELETE FROM users WHERE id = ?',
        [userId]
      );
      
      return true;
    } catch (error) {
      logger.error('Error deleting user:', error);
      throw error;
    }
  }
  
  /**
   * Get users with pagination and filters
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Paginated users
   */
  async getUsers(options = {}) {
    try {
      const limit = options.limit || 10;
      const page = options.page || 1;
      const offset = (page - 1) * limit;
      const role = options.role;
      const search = options.search;
      const isActive = options.isActive;
      
      // Build base query
      let query = `
        SELECT id, email, role, identifier, first_name, last_name, 
        profile_image, is_active, last_login, created_at, updated_at 
        FROM users
      `;
      
      // Build where clause
      const whereClauses = [];
      const queryParams = [];
      
      if (role) {
        whereClauses.push('role = ?');
        queryParams.push(role);
      }
      
      if (isActive !== undefined) {
        whereClauses.push('is_active = ?');
        queryParams.push(isActive);
      }
      
      if (search) {
        whereClauses.push('(email LIKE ? OR identifier LIKE ? OR first_name LIKE ? OR last_name LIKE ?)');
        const searchPattern = `%${search}%`;
        queryParams.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      // Add where clause to query if needed
      if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      // Add pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(limit, offset);
      
      // Execute query
      const [users] = await pool.query(query, queryParams);
      
      // Get total count for pagination
      let countQuery = 'SELECT COUNT(*) as total FROM users';
      
      if (whereClauses.length > 0) {
        countQuery += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      const [countResult] = await pool.query(countQuery, queryParams.slice(0, -2));
      const total = countResult[0].total;
      
      return {
        data: users,
        pagination: {
          page,
          limit,
          totalItems: total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Error getting users:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
