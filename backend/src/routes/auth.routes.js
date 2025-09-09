const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validator.middleware');

// Register routes
router.post('/register/student', validate('registerStudent'), authController.registerStudent);
router.post('/register/teacher', validate('registerTeacher'), authController.registerTeacher);
router.post('/register/admin', validate('registerAdmin'), authController.registerAdmin);

// Login routes
router.post('/login', validate('login'), authController.login);

// Password management
router.post('/forgot-password', validate('forgotPassword'), authController.forgotPassword);
router.post('/reset-password', validate('resetPassword'), authController.resetPassword);

module.exports = router;
