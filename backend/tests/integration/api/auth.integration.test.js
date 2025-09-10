/**
 * Integration tests for Authentication API
 * Tests complete authentication workflows including database interactions
 */

const request = require('supertest');
const app = require('../../../server');
const { setupTestDatabase, seedTestData, cleanupTestData } = require('../setup');

describe('Authentication API Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
  });

  afterEach(async () => {
    // Clean up any test-specific data
    const { pool } = require('../../../src/config/database');
    await pool.execute('DELETE FROM users WHERE email LIKE "%integration-test%"');
  });

  describe('POST /api/auth/register/student', () => {
    const validStudentData = {
      email: 'integration-test-student@example.com',
      password: 'SecurePassword123!',
      identifier: 'INT001',
      firstName: 'Integration',
      lastName: 'Student'
    };

    it('should register a new student and store in database', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/register/student')
        .send(validStudentData)
        .expect(201);

      // Assert response structure
      expect(response.body).toMatchObject({
        success: true,
        message: 'Student registered successfully',
        user: {
          email: validStudentData.email,
          role: 'student',
          firstName: validStudentData.firstName,
          lastName: validStudentData.lastName
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });

      // Verify user was created in database
      const { pool } = require('../../../src/config/database');
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE email = ?',
        [validStudentData.email]
      );

      expect(users).toHaveLength(1);
      expect(users[0]).toMatchObject({
        email: validStudentData.email,
        role: 'student',
        firstName: validStudentData.firstName,
        lastName: validStudentData.lastName,
        identifier: validStudentData.identifier,
        isActive: 1
      });

      // Verify password is hashed
      expect(users[0].password).not.toBe(validStudentData.password);
      expect(users[0].password).toMatch(/^\$2[aby]\$/);
    });

    it('should prevent duplicate email registration', async () => {
      // Arrange - Register first user
      await request(app)
        .post('/api/auth/register/student')
        .send(validStudentData)
        .expect(201);

      // Act - Try to register with same email
      const response = await request(app)
        .post('/api/auth/register/student')
        .send({
          ...validStudentData,
          identifier: 'INT002' // Different identifier
        })
        .expect(409);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: 'Email already registered'
      });
    });

    it('should validate required fields', async () => {
      // Test missing email
      const response1 = await request(app)
        .post('/api/auth/register/student')
        .send({
          ...validStudentData,
          email: undefined
        })
        .expect(400);

      expect(response1.body.message).toContain('email');

      // Test invalid email format
      const response2 = await request(app)
        .post('/api/auth/register/student')
        .send({
          ...validStudentData,
          email: 'invalid-email'
        })
        .expect(400);

      expect(response2.body.message).toContain('email');

      // Test weak password
      const response3 = await request(app)
        .post('/api/auth/register/student')
        .send({
          ...validStudentData,
          password: '123'
        })
        .expect(400);

      expect(response3.body.message).toContain('password');
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'integration-test-login@example.com',
      password: 'TestPassword123!',
      identifier: 'INT003',
      firstName: 'Test',
      lastName: 'Login'
    };

    beforeEach(async () => {
      // Create test user
      await request(app)
        .post('/api/auth/register/student')
        .send(testUser)
        .expect(201);
    });

    it('should login with valid credentials', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: 'Login successful',
        user: {
          email: testUser.email,
          role: 'student'
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });

      // Verify JWT token is valid
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(
        response.body.tokens.accessToken,
        process.env.JWT_SECRET
      );
      
      expect(decoded).toMatchObject({
        email: testUser.email,
        role: 'student'
      });
    });

    it('should reject invalid password', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!'
        })
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should reject non-existent user', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!'
        })
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid credentials'
      });
    });

    it('should handle account lockout after failed attempts', async () => {
      // Arrange - Make multiple failed login attempts
      const invalidLogin = {
        email: testUser.email,
        password: 'WrongPassword'
      };

      // Act - Make 5 failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send(invalidLogin)
          .expect(401);
      }

      // Try one more time - should be locked
      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidLogin)
        .expect(423);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Account temporarily locked')
      });
    });
  });

  describe('POST /api/auth/refresh', () => {
    let refreshToken;

    beforeEach(async () => {
      // Register and login to get refresh token
      const registrationResponse = await request(app)
        .post('/api/auth/register/student')
        .send({
          email: 'integration-test-refresh@example.com',
          password: 'TestPassword123!',
          identifier: 'INT004',
          firstName: 'Test',
          lastName: 'Refresh'
        });

      refreshToken = registrationResponse.body.tokens.refreshToken;
    });

    it('should refresh tokens with valid refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String)
        }
      });

      // Verify new tokens are different
      expect(response.body.tokens.accessToken).not.toBe(refreshToken);
      expect(response.body.tokens.refreshToken).not.toBe(refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: 'Invalid refresh token'
      });
    });

    it('should reject expired refresh token', async () => {
      // Arrange - Create expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: 1, type: 'refresh' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      // Act
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: expiredToken })
        .expect(401);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('expired')
      });
    });
  });

  describe('POST /api/auth/logout', () => {
    let authTokens;

    beforeEach(async () => {
      // Register and login to get tokens
      const response = await request(app)
        .post('/api/auth/register/student')
        .send({
          email: 'integration-test-logout@example.com',
          password: 'TestPassword123!',
          identifier: 'INT005',
          firstName: 'Test',
          lastName: 'Logout'
        });

      authTokens = response.body.tokens;
    });

    it('should logout successfully and invalidate tokens', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${authTokens.accessToken}`)
        .send({ refreshToken: authTokens.refreshToken })
        .expect(200);

      // Assert
      expect(response.body).toMatchObject({
        success: true,
        message: 'Logged out successfully'
      });

      // Verify refresh token is invalidated
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: authTokens.refreshToken })
        .expect(401);

      expect(refreshResponse.body.success).toBe(false);
    });
  });

  describe('Password Reset Flow', () => {
    const testUser = {
      email: 'integration-test-reset@example.com',
      password: 'OriginalPassword123!',
      identifier: 'INT006',
      firstName: 'Test',
      lastName: 'Reset'
    };

    beforeEach(async () => {
      await request(app)
        .post('/api/auth/register/student')
        .send(testUser)
        .expect(201);
    });

    it('should complete password reset flow', async () => {
      // Step 1: Initiate password reset
      const initiateResponse = await request(app)
        .post('/api/auth/password-reset/initiate')
        .send({ email: testUser.email })
        .expect(200);

      expect(initiateResponse.body).toMatchObject({
        success: true,
        message: 'Password reset instructions sent to email'
      });

      // Step 2: Get reset token from database (simulate email click)
      const { pool } = require('../../../src/config/database');
      const [tokenRows] = await pool.execute(
        'SELECT resetToken FROM users WHERE email = ?',
        [testUser.email]
      );

      expect(tokenRows).toHaveLength(1);
      const resetToken = tokenRows[0].resetToken;

      // Step 3: Complete password reset
      const newPassword = 'NewPassword123!';
      const completeResponse = await request(app)
        .post('/api/auth/password-reset/complete')
        .send({
          resetToken: resetToken,
          newPassword: newPassword
        })
        .expect(200);

      expect(completeResponse.body).toMatchObject({
        success: true,
        message: 'Password reset successfully'
      });

      // Step 4: Verify new password works
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);

      // Step 5: Verify old password doesn't work
      await request(app)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        })
        .expect(401);
    });

    it('should reject password reset with invalid token', async () => {
      // Act
      const response = await request(app)
        .post('/api/auth/password-reset/complete')
        .send({
          resetToken: 'invalid-reset-token',
          newPassword: 'NewPassword123!'
        })
        .expect(400);

      // Assert
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('Invalid or expired reset token')
      });
    });
  });

  describe('Role-based Access Control', () => {
    let studentToken, teacherToken, adminToken;

    beforeAll(async () => {
      // Get tokens for different roles from seeded data
      const studentLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'student@test.com',
          password: 'password' // This should match the seeded password
        });

      const teacherLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'teacher@test.com',
          password: 'password'
        });

      const adminLogin = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@test.com',
          password: 'password'
        });

      studentToken = studentLogin.body.tokens.accessToken;
      teacherToken = teacherLogin.body.tokens.accessToken;
      adminToken = adminLogin.body.tokens.accessToken;
    });

    it('should allow students to access student endpoints', async () => {
      await request(app)
        .get('/api/student/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200);
    });

    it('should allow teachers to access teacher endpoints', async () => {
      await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(200);
    });

    it('should allow admins to access admin endpoints', async () => {
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should deny cross-role access', async () => {
      // Student trying to access teacher endpoint
      await request(app)
        .get('/api/teacher/dashboard')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);

      // Teacher trying to access admin endpoint
      await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${teacherToken}`)
        .expect(403);
    });
  });
});
