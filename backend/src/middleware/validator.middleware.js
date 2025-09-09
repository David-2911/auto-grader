const { body, validationResult } = require('express-validator');

// Validation schemas
const validationSchemas = {
  // Student registration validation
  registerStudent: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('identifier').notEmpty().withMessage('Student ID is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required')
  ],
  
  // Teacher registration validation
  registerTeacher: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('identifier').notEmpty().withMessage('Staff ID is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required')
  ],
  
  // Admin registration validation
  registerAdmin: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('identifier').notEmpty().withMessage('Admin ID is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required')
  ],
  
  // Login validation
  login: [
    body('email').isEmail().withMessage('Please provide a valid email'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  // Forgot password validation
  forgotPassword: [
    body('email').isEmail().withMessage('Please provide a valid email')
  ],
  
  // Reset password validation
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
  ]
};

// Middleware for validation
exports.validate = (schema) => {
  if (!validationSchemas[schema]) {
    throw new Error(`Validation schema '${schema}' not found`);
  }
  
  return [
    ...validationSchemas[schema],
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: true, 
          message: 'Validation failed', 
          errors: errors.array() 
        });
      }
      
      next();
    }
  ];
};
