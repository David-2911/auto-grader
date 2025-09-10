const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validator.middleware');
const { authenticate, requirePermission, sanitizeInput } = require('../middleware/auth.middleware');
const { 
  authLimiter, 
  passwordResetLimiter, 
  progressiveRateLimiter 
} = require('../middleware/rate-limit.middleware');

// Apply input sanitization to all routes
router.use(sanitizeInput);

// Registration routes
router.post('/register/student', validate('registerStudent'), authController.registerStudent);
router.post('/register/teacher', validate('registerTeacher'), authController.registerTeacher);
router.post('/register/admin', 
  authenticate, 
  requirePermission('user:create'), 
  validate('registerAdmin'), 
  authController.registerAdmin
);

// Authentication routes (with rate limiting)
router.post('/login', progressiveRateLimiter, validate('login'), authController.login);
router.post('/refresh-token', validate('refreshToken'), authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// Password management (with stricter rate limiting for sensitive operations)
router.post('/forgot-password', passwordResetLimiter, validate('forgotPassword'), authController.forgotPassword);
router.post('/reset-password', passwordResetLimiter, validate('resetPassword'), authController.resetPassword);
router.post('/change-password', authenticate, validate('changePassword'), authController.changePassword);

// Email verification
router.post('/verify-email', validate('verifyEmail'), authController.verifyEmail);
router.post('/resend-verification', passwordResetLimiter, validate('forgotPassword'), authController.resendVerification);

// User information and security
router.get('/user', authenticate, authController.getCurrentUser);
router.get('/active-sessions', authenticate, authController.getActiveSessions);
router.delete('/terminate-session/:sessionId', authenticate, authController.terminateSession);
router.get('/security-settings', authenticate, authController.getSecuritySettings);
router.put('/security-settings', authenticate, validate('updateSecuritySettings'), authController.updateSecuritySettings);

module.exports = router;
