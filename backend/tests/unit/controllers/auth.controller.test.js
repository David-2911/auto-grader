/**
 * Unit tests for Auth Controller
 * Tests authentication, authorization, and user management functionality
 */

const authController = require('../../../src/controllers/auth.controller');
const authService = require('../../../src/services/auth.service');
const userService = require('../../../src/services/user.service');

// Mock services
jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/services/user.service');

describe('Auth Controller Unit Tests', () => {
  let req, res, next;
  
  beforeEach(() => {
    req = {
      body: {},
      headers: {},
      ip: '127.0.0.1',
      user: null
    };
    
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis()
    };
    
    next = jest.fn();
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  describe('Student Registration', () => {
    const validStudentData = {
      email: 'student@test.com',
      password: 'SecurePass123!',
      identifier: 'STU001',
      firstName: 'John',
      lastName: 'Doe'
    };

    it('should register a new student successfully', async () => {
      // Arrange
      req.body = validStudentData;
      const mockUser = { id: 1, ...validStudentData, role: 'student' };
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      userService.createUser.mockResolvedValue(mockUser);
      authService.tokenService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      await authController.registerStudent(req, res, next);

      // Assert
      expect(userService.createUser).toHaveBeenCalledWith({
        ...validStudentData,
        role: 'student'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Student registered successfully',
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            role: 'student'
          }),
          tokens: mockTokens
        })
      );
    });

    it('should reject registration with invalid email', async () => {
      // Arrange
      req.body = { ...validStudentData, email: 'invalid-email' };

      // Act
      await authController.registerStudent(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('email')
        })
      );
      expect(userService.createUser).not.toHaveBeenCalled();
    });

    it('should reject registration with weak password', async () => {
      // Arrange
      req.body = { ...validStudentData, password: '123' };

      // Act
      await authController.registerStudent(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('password')
        })
      );
    });

    it('should handle duplicate email registration', async () => {
      // Arrange
      req.body = validStudentData;
      const duplicateError = new Error('Email already exists');
      duplicateError.code = 'DUPLICATE_EMAIL';
      
      userService.createUser.mockRejectedValue(duplicateError);

      // Act
      await authController.registerStudent(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email already registered'
        })
      );
    });
  });

  describe('Login', () => {
    const validLoginData = {
      email: 'test@example.com',
      password: 'ValidPassword123!'
    };

    it('should login user successfully', async () => {
      // Arrange
      req.body = validLoginData;
      const mockUser = global.testUtils.generateTestUser('student');
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token'
      };

      authService.validateLogin.mockResolvedValue(mockUser);
      authService.tokenService.generateTokens.mockResolvedValue(mockTokens);

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(authService.validateLogin).toHaveBeenCalledWith(
        validLoginData.email,
        validLoginData.password
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Login successful',
          user: expect.objectContaining({
            id: mockUser.id,
            email: mockUser.email,
            role: mockUser.role
          }),
          tokens: mockTokens
        })
      );
    });

    it('should reject login with invalid credentials', async () => {
      // Arrange
      req.body = validLoginData;
      authService.validateLogin.mockRejectedValue(new Error('Invalid credentials'));

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid credentials'
        })
      );
    });

    it('should handle account lockout', async () => {
      // Arrange
      req.body = validLoginData;
      const lockoutError = new Error('Account locked');
      lockoutError.code = 'ACCOUNT_LOCKED';
      lockoutError.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000);
      
      authService.validateLogin.mockRejectedValue(lockoutError);

      // Act
      await authController.login(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(423);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Account temporarily locked due to multiple failed attempts',
          lockoutUntil: lockoutError.lockoutUntil
        })
      );
    });
  });

  describe('Token Refresh', () => {
    it('should refresh tokens successfully', async () => {
      // Arrange
      req.body = { refreshToken: 'valid-refresh-token' };
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };

      authService.tokenService.refreshTokens.mockResolvedValue(mockTokens);

      // Act
      await authController.refreshToken(req, res, next);

      // Assert
      expect(authService.tokenService.refreshTokens).toHaveBeenCalledWith(
        'valid-refresh-token'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          tokens: mockTokens
        })
      );
    });

    it('should reject invalid refresh token', async () => {
      // Arrange
      req.body = { refreshToken: 'invalid-token' };
      authService.tokenService.refreshTokens.mockRejectedValue(
        new Error('Invalid refresh token')
      );

      // Act
      await authController.refreshToken(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Invalid refresh token'
        })
      );
    });
  });

  describe('Logout', () => {
    it('should logout user successfully', async () => {
      // Arrange
      req.user = global.testUtils.generateTestUser();
      req.body = { refreshToken: 'valid-refresh-token' };

      authService.tokenService.revokeToken.mockResolvedValue(true);

      // Act
      await authController.logout(req, res, next);

      // Assert
      expect(authService.tokenService.revokeToken).toHaveBeenCalledWith(
        'valid-refresh-token'
      );
      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully'
        })
      );
    });
  });

  describe('Password Reset', () => {
    it('should initiate password reset successfully', async () => {
      // Arrange
      req.body = { email: 'test@example.com' };
      
      authService.initiatePasswordReset.mockResolvedValue({
        resetToken: 'reset-token-123',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000)
      });

      // Act
      await authController.initiatePasswordReset(req, res, next);

      // Assert
      expect(authService.initiatePasswordReset).toHaveBeenCalledWith(
        'test@example.com'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password reset instructions sent to email'
        })
      );
    });

    it('should complete password reset successfully', async () => {
      // Arrange
      req.body = {
        resetToken: 'valid-reset-token',
        newPassword: 'NewSecurePassword123!'
      };
      
      authService.completePasswordReset.mockResolvedValue(true);

      // Act
      await authController.completePasswordReset(req, res, next);

      // Assert
      expect(authService.completePasswordReset).toHaveBeenCalledWith(
        'valid-reset-token',
        'NewSecurePassword123!'
      );
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Password reset successfully'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      // Arrange
      req.body = global.testUtils.generateTestUser();
      const unexpectedError = new Error('Database connection failed');
      
      userService.createUser.mockRejectedValue(unexpectedError);

      // Act
      await authController.registerStudent(req, res, next);

      // Assert
      expect(next).toHaveBeenCalledWith(unexpectedError);
    });

    it('should sanitize error messages in production', async () => {
      // Arrange
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      req.body = global.testUtils.generateTestUser();
      const sensitiveError = new Error('Database password is invalid');
      
      userService.createUser.mockRejectedValue(sensitiveError);

      // Act
      await authController.registerStudent(req, res, next);

      // Assert
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Internal server error'
        })
      );

      // Cleanup
      process.env.NODE_ENV = originalNodeEnv;
    });
  });
});
