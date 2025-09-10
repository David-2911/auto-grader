// Global test setup for all test environments
const { config } = require('dotenv');
const path = require('path');

// Load test environment variables
config({ path: path.join(__dirname, '.env.test') });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.DB_NAME = 'autograde_test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Disable external API calls in tests
process.env.DISABLE_EXTERNAL_APIS = 'true';
process.env.MOCK_EXTERNAL_SERVICES = 'true';

// ML model paths for testing
process.env.ML_MODEL_PATH = path.join(__dirname, 'fixtures', 'models');
process.env.TEST_DATA_PATH = path.join(__dirname, 'fixtures', 'data');

// File upload settings for tests
process.env.UPLOAD_PATH = path.join(__dirname, 'temp');
process.env.MAX_FILE_SIZE = '10MB';

// Logging configuration for tests
process.env.LOG_LEVEL = 'error';
process.env.LOG_FILE = path.join(__dirname, 'temp', 'test.log');

// Global test timeout
jest.setTimeout(30000);

// Enhanced console mocking with selective output
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: process.env.JEST_VERBOSE === 'true' ? originalConsole.log : jest.fn(),
  debug: jest.fn(),
  info: process.env.JEST_VERBOSE === 'true' ? originalConsole.info : jest.fn(),
  warn: originalConsole.warn,
  error: originalConsole.error,
};

// Global test utilities
global.testUtils = {
  // User generators
  generateTestUser: (role = 'student', overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    email: `test-${role}-${Date.now()}@example.com`,
    role: role,
    firstName: 'Test',
    lastName: 'User',
    identifier: `TEST${Math.floor(Math.random() * 10000)}`,
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Course generators
  generateTestCourse: (overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    code: `TEST${Math.floor(Math.random() * 1000)}`,
    title: 'Test Course',
    description: 'A test course for automated testing',
    credits: 3,
    semester: 'Test Semester 2024',
    maxEnrollment: 30,
    department: 'Computer Science',
    isActive: true,
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Assignment generators
  generateTestAssignment: (courseId, overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    courseId: courseId,
    title: 'Test Assignment',
    description: 'A test assignment for automated testing',
    type: 'homework',
    totalPoints: 100,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isActive: true,
    allowLateSubmission: false,
    maxAttempts: 3,
    createdAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Submission generators
  generateTestSubmission: (assignmentId, studentId, overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    assignmentId: assignmentId,
    studentId: studentId,
    content: 'Test submission content',
    filePath: '/test/path/submission.pdf',
    status: 'submitted',
    attemptNumber: 1,
    submittedAt: new Date().toISOString(),
    ...overrides
  }),
  
  // Grade generators
  generateTestGrade: (submissionId, overrides = {}) => ({
    id: Math.floor(Math.random() * 10000),
    submissionId: submissionId,
    score: 85,
    feedback: 'Good work!',
    gradingMethod: 'manual',
    gradedAt: new Date().toISOString(),
    ...overrides
  }),
  
  // JWT token generator
  generateJWTToken: (userId, role = 'student', expiresIn = '1h') => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { 
        id: userId, 
        role: role,
        email: `test-${role}@example.com`
      },
      process.env.JWT_SECRET,
      { expiresIn }
    );
  },
  
  // Database helpers
  cleanDatabase: async () => {
    // Implementation depends on database setup
    // This is a placeholder for database cleanup
  },
  
  // File helpers
  createTestFile: (filename, content = 'test content') => {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(__dirname, 'temp', filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  },
  
  // Mock data generators
  generateMockOCRResult: (text = 'Sample OCR text') => ({
    text: text,
    confidence: 0.95,
    pages: 1,
    processedAt: new Date().toISOString()
  }),
  
  generateMockMLPrediction: (score = 85) => ({
    score: score,
    confidence: 0.92,
    feedback: 'Automated feedback based on ML analysis',
    categories: {
      syntax: 0.9,
      logic: 0.85,
      style: 0.88
    },
    suggestions: ['Consider adding more comments', 'Good logic flow']
  }),
  
  // Date helpers
  addDays: (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },
  
  // Async test helpers
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Error generators
  generateAPIError: (status = 400, message = 'Test error') => {
    const error = new Error(message);
    error.status = status;
    return error;
  }
};

// Global test constants
global.TEST_CONSTANTS = {
  VALID_EMAIL: 'test@example.com',
  INVALID_EMAIL: 'invalid-email',
  VALID_PASSWORD: 'TestPassword123!',
  WEAK_PASSWORD: '123',
  VALID_COURSE_CODE: 'CS101',
  INVALID_COURSE_CODE: 'INVALID',
  DEFAULT_TIMEOUT: 5000,
  LONG_TIMEOUT: 30000
};

// Mock external services by default
jest.mock('../src/services/external/ocr.service', () => ({
  processDocument: jest.fn(),
  extractText: jest.fn()
}));

jest.mock('../src/services/external/email.service', () => ({
  sendEmail: jest.fn(),
  sendNotification: jest.fn()
}));

// Cleanup function
const cleanup = () => {
  // Clean up temp files
  const fs = require('fs');
  const path = require('path');
  const tempDir = path.join(__dirname, 'temp');
  
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    files.forEach(file => {
      try {
        fs.unlinkSync(path.join(tempDir, file));
      } catch (error) {
        console.warn(`Failed to delete temp file: ${file}`);
      }
    });
  }
};

// Run cleanup after each test
afterEach(() => {
  cleanup();
});

// Final cleanup
process.on('exit', cleanup);
