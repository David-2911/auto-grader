// Integration test setup
const { execSync } = require('child_process');
const path = require('path');

// Setup test database
const setupTestDatabase = async () => {
  try {
    // Create test database
    execSync('mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS autograde_test;"', {
      stdio: 'ignore'
    });
    
    // Run migrations
    execSync('npm run migrate -- --env=test', {
      cwd: path.join(__dirname, '../../'),
      stdio: 'ignore'
    });
    
    console.log('Test database setup completed');
  } catch (error) {
    console.error('Failed to setup test database:', error.message);
    throw error;
  }
};

// Setup test data
const seedTestData = async () => {
  const { pool } = require('../../src/config/database');
  
  try {
    // Insert test users
    await pool.execute(`
      INSERT INTO users (email, password, role, firstName, lastName, identifier, isActive) 
      VALUES 
        ('admin@test.com', '$2b$10$test_hash', 'admin', 'Test', 'Admin', 'ADM001', 1),
        ('teacher@test.com', '$2b$10$test_hash', 'teacher', 'Test', 'Teacher', 'TCH001', 1),
        ('student@test.com', '$2b$10$test_hash', 'student', 'Test', 'Student', 'STU001', 1)
    `);
    
    // Insert test courses
    await pool.execute(`
      INSERT INTO courses (code, title, description, credits, semester, teacherId) 
      VALUES ('TEST101', 'Test Course', 'A test course', 3, 'Test Semester', 2)
    `);
    
    // Insert test assignments
    await pool.execute(`
      INSERT INTO assignments (courseId, title, description, type, totalPoints, deadline) 
      VALUES (1, 'Test Assignment', 'A test assignment', 'coding', 100, DATE_ADD(NOW(), INTERVAL 7 DAY))
    `);
    
    console.log('Test data seeded successfully');
  } catch (error) {
    console.error('Failed to seed test data:', error.message);
    throw error;
  }
};

// Cleanup test data
const cleanupTestData = async () => {
  const { pool } = require('../../src/config/database');
  
  try {
    const tables = ['grades', 'submissions', 'enrollments', 'assignments', 'courses', 'users'];
    
    for (const table of tables) {
      await pool.execute(`DELETE FROM ${table} WHERE 1=1`);
    }
    
    console.log('Test data cleaned up');
  } catch (error) {
    console.error('Failed to cleanup test data:', error.message);
  }
};

module.exports = {
  setupTestDatabase,
  seedTestData,
  cleanupTestData
};
