#!/usr/bin/env node

/**
 * Database Migration and Seeding Script
 * 
 * This script applies the comprehensive database schema and populates
 * the database with sample data for development and testing.
 * 
 * Usage:
 * node migrate.js [--reset]
 * 
 * Options:
 * --reset: Drop and recreate the database (caution: destroys all data)
 */

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const { logger } = require('../src/utils/logger');
require('dotenv').config();

// Database configuration (include port so dev env on 3307 works)
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true
};

logger.info('Database connection parameters (excluding password)', {
  host: dbConfig.host,
  port: dbConfig.port,
  user: dbConfig.user
});

/**
 * Execute SQL file
 * @param {string} filePath - Path to SQL file
 * @param {mysql.Connection} connection - Database connection
 */
async function executeSqlFile(filePath, connection) {
  try {
    const sql = fs.readFileSync(filePath, 'utf8');
    await connection.query(sql);
    logger.info(`Successfully executed SQL file: ${path.basename(filePath)}`);
  } catch (error) {
    logger.error(`Error executing SQL file ${path.basename(filePath)}:`, error);
    throw error;
  }
}

/**
 * Generate secure password
 * @param {string} password - Plain text password
 * @returns {Promise<string>} - Hashed password
 */
async function hashPassword(password) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Seed database with additional test data
 * @param {mysql.Connection} connection - Database connection
 */
async function seedDatabase(connection) {
  try {
    logger.info('Seeding database with test data...');
    
    // Hash passwords for test users
    const hashedPassword = await hashPassword('password123');
    
    // Create more test users
    const testUsers = [
      // Additional teachers
      { email: 'chen@autograde.com', password: hashedPassword, role: 'teacher', identifier: 'TCHR003', firstName: 'Li', lastName: 'Chen' },
      { email: 'patel@autograde.com', password: hashedPassword, role: 'teacher', identifier: 'TCHR004', firstName: 'Priya', lastName: 'Patel' },
      
      // Additional students
      { email: 'student5@autograde.com', password: hashedPassword, role: 'student', identifier: 'STU005', firstName: 'David', lastName: 'Wilson' },
      { email: 'student6@autograde.com', password: hashedPassword, role: 'student', identifier: 'STU006', firstName: 'Emma', lastName: 'Garcia' },
      { email: 'student7@autograde.com', password: hashedPassword, role: 'student', identifier: 'STU007', firstName: 'James', lastName: 'Taylor' },
      { email: 'student8@autograde.com', password: hashedPassword, role: 'student', identifier: 'STU008', firstName: 'Olivia', lastName: 'Thomas' },
      { email: 'student9@autograde.com', password: hashedPassword, role: 'student', identifier: 'STU009', firstName: 'Noah', lastName: 'Martinez' },
      { email: 'student10@autograde.com', password: hashedPassword, role: 'student', identifier: 'STU010', firstName: 'Sophia', lastName: 'Anderson' }
    ];
    
    for (const user of testUsers) {
      await connection.query(
        'INSERT INTO users (email, password, role, identifier, first_name, last_name, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)',
        [user.email, user.password, user.role, user.identifier, user.firstName, user.lastName]
      );
      
      // Get the inserted user ID
      const [userResult] = await connection.query('SELECT LAST_INSERT_ID() as id');
      const userId = userResult[0].id;
      
      // Create profile based on role
      if (user.role === 'teacher') {
        await connection.query(
          'INSERT INTO teacher_profiles (user_id, department, title) VALUES (?, ?, ?)',
          [userId, 'Computer Science', 'Assistant Professor']
        );
      } else if (user.role === 'student') {
        await connection.query(
          'INSERT INTO student_profiles (user_id, year_level, major) VALUES (?, ?, ?)',
          [userId, 'Sophomore', 'Computer Science']
        );
      }
    }
    
    // Create additional courses
    const additionalCourses = [
      { code: 'CS301', title: 'Database Systems', description: 'Design and implementation of database systems', credits: 3, teacherId: 3 },
      { code: 'CS401', title: 'Machine Learning', description: 'Introduction to machine learning algorithms and applications', credits: 4, teacherId: 2 },
      { code: 'MATH201', title: 'Linear Algebra', description: 'Vector spaces, matrices, and linear transformations', credits: 3, teacherId: 4 }
    ];
    
    for (const course of additionalCourses) {
      await connection.query(
        'INSERT INTO courses (code, title, description, credits, is_active, start_date, end_date, teacher_id) VALUES (?, ?, ?, ?, TRUE, ?, ?, ?)',
        [course.code, course.title, course.description, course.credits, '2025-09-01', '2025-12-15', course.teacherId]
      );
    }
    
    // Enroll students in additional courses
    const studentIds = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    const courseIds = [1, 2, 3, 4, 5, 6];
    
    for (const courseId of courseIds) {
      // Randomly select 5-8 students for each course
      const numStudents = Math.floor(Math.random() * 4) + 5;
      const shuffledStudents = [...studentIds].sort(() => 0.5 - Math.random());
      const enrolledStudents = shuffledStudents.slice(0, numStudents);
      
      for (const studentId of enrolledStudents) {
        await connection.query(
          'INSERT IGNORE INTO enrollments (course_id, student_id, status) VALUES (?, ?, ?)',
          [courseId, studentId, 'active']
        );
      }
    }
    
    // Create additional assignment categories
    const assignmentCategories = [
      { courseId: 4, name: 'Labs', weight: 40.00, description: 'Hands-on database exercises' },
      { courseId: 4, name: 'Exams', weight: 60.00, description: 'Midterm and final examinations' },
      { courseId: 5, name: 'Projects', weight: 50.00, description: 'ML implementation projects' },
      { courseId: 5, name: 'Papers', weight: 20.00, description: 'Research paper reviews' },
      { courseId: 5, name: 'Exams', weight: 30.00, description: 'Written exams' },
      { courseId: 6, name: 'Homework', weight: 40.00, description: 'Weekly problem sets' },
      { courseId: 6, name: 'Quizzes', weight: 20.00, description: 'Short in-class quizzes' },
      { courseId: 6, name: 'Exams', weight: 40.00, description: 'Midterm and final exams' }
    ];
    
    for (const category of assignmentCategories) {
      await connection.query(
        'INSERT INTO assignment_categories (course_id, name, weight, description) VALUES (?, ?, ?, ?)',
        [category.courseId, category.name, category.weight, category.description]
      );
    }
    
    // Create additional assignments
    const assignments = [
      { 
        title: 'SQL Basics', 
        description: 'Introduction to SQL queries and database design', 
        courseId: 4, 
        categoryId: 10, 
        openDate: '2025-09-10 00:00:00', 
        deadline: '2025-09-17 23:59:59', 
        totalPoints: 100.00,
        submissionFormat: 'code',
        gradingMethod: 'auto'
      },
      { 
        title: 'Database Normalization', 
        description: 'Apply normalization rules to database schemas', 
        courseId: 4, 
        categoryId: 10, 
        openDate: '2025-09-17 00:00:00', 
        deadline: '2025-09-24 23:59:59', 
        totalPoints: 100.00,
        submissionFormat: 'pdf',
        gradingMethod: 'hybrid'
      },
      { 
        title: 'Linear Regression', 
        description: 'Implement linear regression from scratch', 
        courseId: 5, 
        categoryId: 12, 
        openDate: '2025-09-15 00:00:00', 
        deadline: '2025-09-29 23:59:59', 
        totalPoints: 100.00,
        submissionFormat: 'notebook',
        gradingMethod: 'auto'
      },
      { 
        title: 'ML Paper Review', 
        description: 'Review a recent paper on deep learning', 
        courseId: 5, 
        categoryId: 13, 
        openDate: '2025-09-20 00:00:00', 
        deadline: '2025-10-04 23:59:59', 
        totalPoints: 50.00,
        submissionFormat: 'pdf',
        gradingMethod: 'manual'
      },
      { 
        title: 'Vector Spaces', 
        description: 'Problems on vector spaces and linear transformations', 
        courseId: 6, 
        categoryId: 15, 
        openDate: '2025-09-12 00:00:00', 
        deadline: '2025-09-19 23:59:59', 
        totalPoints: 50.00,
        submissionFormat: 'pdf',
        gradingMethod: 'hybrid'
      }
    ];
    
    for (const assignment of assignments) {
      await connection.query(
        `INSERT INTO assignments (
          title, description, course_id, category_id, open_date, deadline, 
          total_points, is_active, submission_format, grading_method
        ) VALUES (?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?)`,
        [
          assignment.title, 
          assignment.description, 
          assignment.courseId, 
          assignment.categoryId, 
          assignment.openDate, 
          assignment.deadline, 
          assignment.totalPoints,
          assignment.submissionFormat,
          assignment.gradingMethod
        ]
      );
    }
    
    // Create sample ML models
    const mlModels = [
      { 
        name: 'Advanced Text Similarity', 
        description: 'Enhanced text similarity model using BERT embeddings', 
        version: '2.0.0', 
        modelPath: '/models/text_similarity_v2.pkl', 
        modelType: 'similarity', 
        accuracyMetrics: JSON.stringify({ accuracy: 0.92, f1: 0.91, precision: 0.93, recall: 0.90 })
      },
      { 
        name: 'Math Expression Analyzer', 
        description: 'Advanced model for analyzing mathematical proofs and expressions', 
        version: '1.1.0', 
        modelPath: '/models/math_analyzer_v1.1.pkl', 
        modelType: 'custom', 
        accuracyMetrics: JSON.stringify({ accuracy: 0.88, f1: 0.87, precision: 0.89, recall: 0.86 })
      },
      { 
        name: 'Code Quality Analyzer', 
        description: 'Model for evaluating code quality and best practices', 
        version: '1.0.0', 
        modelPath: '/models/code_quality_v1.pkl', 
        modelType: 'code_analysis', 
        accuracyMetrics: JSON.stringify({ accuracy: 0.85, f1: 0.84, precision: 0.86, recall: 0.83 })
      }
    ];
    
    for (const model of mlModels) {
      await connection.query(
        `INSERT INTO ml_models 
         (name, description, version, model_path, model_type, accuracy_metrics, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [model.name, model.description, model.version, model.modelPath, model.modelType, model.accuracyMetrics]
      );
    }
    
    // Create system settings
    const systemSettings = [
      { key: 'system.maintenance_mode', value: 'false', dataType: 'boolean', description: 'Whether the system is in maintenance mode', isPublic: true },
      { key: 'grading.auto_process', value: 'true', dataType: 'boolean', description: 'Whether to automatically process submissions for grading', isPublic: false },
      { key: 'notification.email_students', value: 'true', dataType: 'boolean', description: 'Whether to email students when grades are released', isPublic: false },
      { key: 'ui.dashboard_refresh_rate', value: '30', dataType: 'number', description: 'Dashboard refresh rate in seconds', isPublic: true },
      { key: 'system.version_check', value: 'weekly', dataType: 'string', description: 'How often to check for system updates', isPublic: false }
    ];
    
    for (const setting of systemSettings) {
      await connection.query(
        `INSERT INTO system_settings 
         (setting_key, setting_value, data_type, description, is_public, updated_by) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [setting.key, setting.value, setting.dataType, setting.description, setting.isPublic, 1]
      );
    }
    
    logger.info('Database seeding completed successfully');
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Main migration function
 */
async function migrate() {
  let connection;
  const reset = process.argv.includes('--reset');
  
  try {
    logger.info('Starting database migration...');
    
    // Create connection without database selected
    connection = await mysql.createConnection(dbConfig);
    
    if (reset) {
      logger.warn('Resetting database (all data will be lost)...');
      await connection.query('DROP DATABASE IF EXISTS auto_grade');
    }
    
  // Execute the comprehensive schema SQL
    const schemaPath = path.join(__dirname, '../src/config/comprehensive_schema.sql');
    await executeSqlFile(schemaPath, connection);
    
  // Apply auth/security schema (adds auth_logs, user_sessions, etc.)
  const authSchemaPath = path.join(__dirname, '../src/config/auth_security_schema.sql');
  await executeSqlFile(authSchemaPath, connection);
    
  // Ensure refresh_tokens table exists (idempotent)
  const refreshTokensPath = path.join(__dirname, '../src/config/refresh_tokens_schema.sql');
  await executeSqlFile(refreshTokensPath, connection);
    
  // Apply core performance tables (api_usage_tracking, performance_metrics)
  const perfCorePath = path.join(__dirname, '../src/config/performance_core_schema.sql');
  await executeSqlFile(perfCorePath, connection);
    
    // Seed the database with test data
    await seedDatabase(connection);
    
    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Database migration failed:', error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Run migration if script is executed directly
if (require.main === module) {
  migrate();
}

module.exports = { migrate };
