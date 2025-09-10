// Test setup file for Teacher Portal
const { config } = require('dotenv');

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';
process.env.DB_NAME = 'autograde_test';

// Global test timeout
jest.setTimeout(30000);

// Mock console for cleaner test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test helpers
global.testHelpers = {
  generateTestUser: (role = 'teacher') => ({
    id: Math.floor(Math.random() * 1000),
    email: `test-${role}@example.com`,
    role: role,
    firstName: 'Test',
    lastName: 'User'
  }),
  
  generateTestCourse: () => ({
    code: `TEST${Math.floor(Math.random() * 1000)}`,
    title: 'Test Course',
    description: 'A test course',
    credits: 3,
    semester: 'Test Semester'
  }),
  
  generateTestAssignment: (courseId) => ({
    courseId: courseId,
    title: 'Test Assignment',
    description: 'A test assignment',
    totalPoints: 100,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  })
};

// Database cleanup helpers
beforeEach(async () => {
  // Add any global setup needed before each test
});

afterEach(async () => {
  // Add any global cleanup needed after each test
});
