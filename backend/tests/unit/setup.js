// Unit test setup for controllers
const request = require('supertest');
const express = require('express');

// Create test app
const createTestApp = (controller) => {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // Add test middleware
  app.use((req, res, next) => {
    req.user = global.testUtils.generateTestUser();
    next();
  });
  
  // Add controller routes
  app.use('/test', controller);
  
  return app;
};

global.testApp = createTestApp;

// Mock database
const mockDb = {
  query: jest.fn(),
  execute: jest.fn(),
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn()
};

jest.mock('../../src/config/database', () => ({
  pool: mockDb
}));

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
