const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

// Register a new student
exports.registerStudent = async (req, res) => {
  try {
    const { email, password, identifier, firstName, lastName } = req.body;
    
    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR identifier = ?',
      [email, identifier]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: true,
        message: 'User with this email or student ID already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new student
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role, identifier, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, 'student', identifier, firstName, lastName]
    );
    
    res.status(201).json({
      error: false,
      message: 'Student registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    logger.error('Student registration error:', error);
    res.status(500).json({
      error: true,
      message: 'Error registering student'
    });
  }
};

// Register a new teacher
exports.registerTeacher = async (req, res) => {
  try {
    const { email, password, identifier, firstName, lastName } = req.body;
    
    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR identifier = ?',
      [email, identifier]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: true,
        message: 'User with this email or staff ID already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new teacher
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role, identifier, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, 'teacher', identifier, firstName, lastName]
    );
    
    res.status(201).json({
      error: false,
      message: 'Teacher registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    logger.error('Teacher registration error:', error);
    res.status(500).json({
      error: true,
      message: 'Error registering teacher'
    });
  }
};

// Register a new admin (restricted operation)
exports.registerAdmin = async (req, res) => {
  try {
    const { email, password, identifier, firstName, lastName } = req.body;
    
    // Check if user already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM users WHERE email = ? OR identifier = ?',
      [email, identifier]
    );
    
    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: true,
        message: 'User with this email or admin ID already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert new admin
    const [result] = await pool.query(
      'INSERT INTO users (email, password, role, identifier, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, 'admin', identifier, firstName, lastName]
    );
    
    res.status(201).json({
      error: false,
      message: 'Admin registered successfully',
      userId: result.insertId
    });
  } catch (error) {
    logger.error('Admin registration error:', error);
    res.status(500).json({
      error: true,
      message: 'Error registering admin'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password'
      });
    }
    
    const user = users[0];
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      return res.status(401).json({
        error: true,
        message: 'Invalid email or password'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
    );
    
    res.status(200).json({
      error: false,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      error: true,
      message: 'Error during login'
    });
  }
};

// Forgot password functionality
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Find user
    const [users] = await pool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        error: true,
        message: 'User not found'
      });
    }
    
    // In a real app, you would generate a reset token and send an email
    // For this example, we'll just return a success message
    
    res.status(200).json({
      error: false,
      message: 'Password reset instructions sent to your email'
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      error: true,
      message: 'Error processing forgot password request'
    });
  }
};

// Reset password functionality
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // In a real app, you would verify the reset token
    // For this example, we'll just return a success message
    
    res.status(200).json({
      error: false,
      message: 'Password reset successful'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      error: true,
      message: 'Error resetting password'
    });
  }
};
