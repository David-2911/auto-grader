const { body, query, param, validationResult } = require('express-validator');
const { logger } = require('../utils/logger');

// Reusable validation rules
const validationRules = {
  // Common validation rules
  email: () => body('email').isEmail().withMessage('Please provide a valid email'),
  password: () => body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*])/).withMessage('Password must include at least one number, one uppercase letter, one lowercase letter, and one special character'),
  identifier: () => body('identifier').notEmpty().withMessage('Identifier is required'),
  firstName: () => body('firstName').notEmpty().withMessage('First name is required'),
  lastName: () => body('lastName').notEmpty().withMessage('Last name is required'),
  
  // ID validation (for route params)
  id: () => param('id').isInt({ min: 1 }).withMessage('Invalid ID parameter'),
  
  // Course validation
  courseCode: () => body('code').isLength({ min: 2, max: 50 }).withMessage('Course code must be between 2 and 50 characters'),
  courseTitle: () => body('title').isLength({ min: 3, max: 255 }).withMessage('Course title must be between 3 and 255 characters'),
  
  // Assignment validation
  assignmentTitle: () => body('title').isLength({ min: 3, max: 255 }).withMessage('Assignment title must be between 3 and 255 characters'),
  totalPoints: () => body('totalPoints').isFloat({ min: 0 }).withMessage('Total points must be a positive number'),
  deadline: () => body('deadline').isISO8601().toDate().withMessage('Deadline must be a valid date'),
  
  // Submission validation
  submissionGrade: () => body('grade').optional().isFloat({ min: 0 }).withMessage('Grade must be a positive number'),
  
  // Pagination
  page: () => query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  limit: () => query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
};

// Validation schemas
const validationSchemas = {
  // User authentication schemas
  registerStudent: [
    validationRules.email(),
    validationRules.password(),
    validationRules.identifier(),
    validationRules.firstName(),
    validationRules.lastName(),
    body('yearLevel').optional().isString().withMessage('Year level must be a string'),
    body('major').optional().isString().withMessage('Major must be a string')
  ],
  
  registerTeacher: [
    validationRules.email(),
    validationRules.password(),
    validationRules.identifier(),
    validationRules.firstName(),
    validationRules.lastName(),
    body('department').optional().isString().withMessage('Department must be a string'),
    body('title').optional().isString().withMessage('Title must be a string')
  ],
  
  registerAdmin: [
    validationRules.email(),
    validationRules.password(),
    validationRules.identifier(),
    validationRules.firstName(),
    validationRules.lastName(),
    body('department').optional().isString().withMessage('Department must be a string'),
    body('position').optional().isString().withMessage('Position must be a string'),
    body('accessLevel').optional().isInt({ min: 1, max: 10 }).withMessage('Access level must be between 1 and 10')
  ],
  
  login: [
    validationRules.email(),
    body('password').notEmpty().withMessage('Password is required')
  ],
  
  refreshToken: [
    body('refreshToken').notEmpty().withMessage('Refresh token is required')
  ],
  
  forgotPassword: [
    validationRules.email()
  ],
  
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    validationRules.password(),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    validationRules.password().custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Confirm password is required')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Passwords do not match');
        }
        return true;
      })
  ],
  
  verifyEmail: [
    body('token').notEmpty().withMessage('Verification token is required')
  ],
  
  updateSecuritySettings: [
    body('twoFactorEnabled').optional().isBoolean().withMessage('Two-factor enabled must be a boolean'),
    body('twoFactorMethod').optional().isIn(['app', 'email', 'sms']).withMessage('Invalid two-factor method'),
    body('notificationOnLogin').optional().isBoolean().withMessage('Notification on login must be a boolean'),
    body('allowedIps').optional().isString().withMessage('Allowed IPs must be a string'),
    body('sessionTimeoutMinutes').optional().isInt({ min: 15, max: 1440 }).withMessage('Session timeout must be between 15 and 1440 minutes')
  ],
  
  // Course schemas
  createCourse: [
    validationRules.courseCode(),
    validationRules.courseTitle(),
    body('description').optional(),
    body('credits').optional().isInt({ min: 1 }).withMessage('Credits must be a positive integer'),
    body('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ],
  
  updateCourse: [
    validationRules.id(),
    body('code').optional().isLength({ min: 2, max: 50 }).withMessage('Course code must be between 2 and 50 characters'),
    body('title').optional().isLength({ min: 3, max: 255 }).withMessage('Course title must be between 3 and 255 characters'),
    body('description').optional(),
    body('credits').optional().isInt({ min: 1 }).withMessage('Credits must be a positive integer'),
    body('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean')
  ],
  
  // Assignment schemas
  createAssignment: [
    validationRules.assignmentTitle(),
    body('description').notEmpty().withMessage('Description is required'),
    body('courseId').isInt({ min: 1 }).withMessage('Course ID is required'),
    body('categoryId').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('openDate').isISO8601().toDate().withMessage('Open date must be a valid date'),
    validationRules.deadline(),
    body('lateDeadline').optional().isISO8601().toDate().withMessage('Late deadline must be a valid date'),
    body('latePenalty').optional().isFloat({ min: 0, max: 100 }).withMessage('Late penalty must be between 0 and 100'),
    validationRules.totalPoints(),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    body('isGroupAssignment').optional().isBoolean().withMessage('Is group assignment must be a boolean'),
    body('maxAttempts').optional().isInt({ min: 1 }).withMessage('Max attempts must be a positive integer'),
    body('submissionFormat').optional().isIn(['pdf', 'code', 'notebook', 'text']).withMessage('Invalid submission format'),
    body('gradingMethod').optional().isIn(['auto', 'manual', 'hybrid']).withMessage('Invalid grading method')
  ],
  
  updateAssignment: [
    validationRules.id(),
    body('title').optional().isLength({ min: 3, max: 255 }).withMessage('Assignment title must be between 3 and 255 characters'),
    body('description').optional(),
    body('courseId').optional().isInt({ min: 1 }).withMessage('Course ID must be a positive integer'),
    body('categoryId').optional().isInt({ min: 1 }).withMessage('Category ID must be a positive integer'),
    body('openDate').optional().isISO8601().toDate().withMessage('Open date must be a valid date'),
    body('deadline').optional().isISO8601().toDate().withMessage('Deadline must be a valid date'),
    body('lateDeadline').optional().isISO8601().toDate().withMessage('Late deadline must be a valid date'),
    body('latePenalty').optional().isFloat({ min: 0, max: 100 }).withMessage('Late penalty must be between 0 and 100'),
    body('totalPoints').optional().isFloat({ min: 0 }).withMessage('Total points must be a positive number'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    body('isGroupAssignment').optional().isBoolean().withMessage('Is group assignment must be a boolean'),
    body('maxAttempts').optional().isInt({ min: 1 }).withMessage('Max attempts must be a positive integer'),
    body('submissionFormat').optional().isIn(['pdf', 'code', 'notebook', 'text']).withMessage('Invalid submission format'),
    body('gradingMethod').optional().isIn(['auto', 'manual', 'hybrid']).withMessage('Invalid grading method')
  ],
  
  // Submission schemas
  createSubmission: [
    body('assignmentId').isInt({ min: 1 }).withMessage('Assignment ID is required'),
    body('submissionNumber').optional().isInt({ min: 1 }).withMessage('Submission number must be a positive integer')
  ],
  
  gradeSubmission: [
    validationRules.id(),
    validationRules.submissionGrade(),
    body('feedback').optional().isString().withMessage('Feedback must be a string')
  ],
  
  // Search and filter schemas
  searchAssignments: [
    validationRules.page(),
    validationRules.limit(),
    query('courseId').optional().isInt({ min: 1 }).withMessage('Course ID must be a positive integer'),
    query('status').optional().isIn(['active', 'inactive', 'all']).withMessage('Invalid status'),
    query('search').optional().isString().withMessage('Search must be a string')
  ],

  // Teacher-specific validation schemas
  createTeacherCourse: [
    validationRules.courseCode(),
    validationRules.courseTitle(),
    body('description').optional(),
    body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
    body('startDate').isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').isISO8601().toDate().withMessage('End date must be a valid date'),
    body('maxStudents').optional().isInt({ min: 1, max: 1000 }).withMessage('Max students must be between 1 and 1000'),
    body('semester').notEmpty().withMessage('Semester is required'),
    body('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
    body('gradeWeight').optional().isObject().withMessage('Grade weight must be an object')
  ],

  updateTeacherCourse: [
    validationRules.id(),
    body('code').optional().isLength({ min: 2, max: 50 }).withMessage('Course code must be between 2 and 50 characters'),
    body('title').optional().isLength({ min: 3, max: 255 }).withMessage('Course title must be between 3 and 255 characters'),
    body('description').optional(),
    body('credits').optional().isInt({ min: 1, max: 10 }).withMessage('Credits must be between 1 and 10'),
    body('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
    body('maxStudents').optional().isInt({ min: 1, max: 1000 }).withMessage('Max students must be between 1 and 1000'),
    body('isActive').optional().isBoolean().withMessage('Is active must be a boolean'),
    body('gradeWeight').optional().isObject().withMessage('Grade weight must be an object')
  ],

  enrollStudents: [
    validationRules.id(),
    body('studentIds').isArray({ min: 1 }).withMessage('Student IDs must be an array with at least one ID'),
    body('studentIds.*').isInt({ min: 1 }).withMessage('Each student ID must be a positive integer'),
    body('enrollmentDate').optional().isISO8601().toDate().withMessage('Enrollment date must be a valid date')
  ],

  createAssignmentTemplate: [
    body('name').isLength({ min: 3, max: 100 }).withMessage('Template name must be between 3 and 100 characters'),
    body('description').optional(),
    body('config').isObject().withMessage('Config must be an object'),
    body('isDefault').optional().isBoolean().withMessage('Is default must be a boolean')
  ],

  sendMessage: [
    body('recipientType').isIn(['student', 'students', 'course']).withMessage('Invalid recipient type'),
    body('recipientIds').optional().isArray().withMessage('Recipient IDs must be an array'),
    body('courseId').optional().isInt({ min: 1 }).withMessage('Course ID must be a positive integer'),
    body('subject').isLength({ min: 3, max: 200 }).withMessage('Subject must be between 3 and 200 characters'),
    body('message').isLength({ min: 10, max: 5000 }).withMessage('Message must be between 10 and 5000 characters'),
    body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid priority level')
  ],

  sendAnnouncement: [
    body('courseId').isInt({ min: 1 }).withMessage('Course ID is required'),
    body('title').isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('content').isLength({ min: 10, max: 5000 }).withMessage('Content must be between 10 and 5000 characters'),
    body('priority').optional().isIn(['low', 'normal', 'high']).withMessage('Invalid priority level'),
    body('sendEmail').optional().isBoolean().withMessage('Send email must be a boolean'),
    body('scheduledFor').optional().isISO8601().toDate().withMessage('Scheduled for must be a valid date')
  ],

  bulkGradeUpdate: [
    body('assignmentId').isInt({ min: 1 }).withMessage('Assignment ID is required'),
    body('grades').isArray({ min: 1 }).withMessage('Grades must be an array with at least one entry'),
    body('grades.*.submissionId').isInt({ min: 1 }).withMessage('Each submission ID must be a positive integer'),
    body('grades.*.grade').isFloat({ min: 0 }).withMessage('Each grade must be a positive number'),
    body('grades.*.feedback').optional().isString().withMessage('Feedback must be a string')
  ],

  generateReport: [
    body('type').isIn(['course_performance', 'assignment_analysis', 'student_progress', 'grading_summary']).withMessage('Invalid report type'),
    body('courseId').optional().isInt({ min: 1 }).withMessage('Course ID must be a positive integer'),
    body('assignmentId').optional().isInt({ min: 1 }).withMessage('Assignment ID must be a positive integer'),
    body('startDate').optional().isISO8601().toDate().withMessage('Start date must be a valid date'),
    body('endDate').optional().isISO8601().toDate().withMessage('End date must be a valid date'),
    body('format').optional().isIn(['json', 'excel', 'pdf']).withMessage('Invalid format'),
    body('includeDetails').optional().isBoolean().withMessage('Include details must be a boolean')
  ],

  addStudentNote: [
    body('studentId').isInt({ min: 1 }).withMessage('Student ID is required'),
    body('courseId').optional().isInt({ min: 1 }).withMessage('Course ID must be a positive integer'),
    body('note').isLength({ min: 10, max: 2000 }).withMessage('Note must be between 10 and 2000 characters'),
    body('type').optional().isIn(['academic', 'behavioral', 'attendance', 'general']).withMessage('Invalid note type'),
    body('isPrivate').optional().isBoolean().withMessage('Is private must be a boolean')
  ],

  recordAttendance: [
    body('courseId').isInt({ min: 1 }).withMessage('Course ID is required'),
    body('date').isISO8601().toDate().withMessage('Date must be a valid date'),
    body('attendanceRecords').isArray({ min: 1 }).withMessage('Attendance records must be an array with at least one entry'),
    body('attendanceRecords.*.studentId').isInt({ min: 1 }).withMessage('Each student ID must be a positive integer'),
    body('attendanceRecords.*.status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid attendance status'),
    body('attendanceRecords.*.notes').optional().isString().withMessage('Notes must be a string')
  ],

  updateGradebookSettings: [
    body('courseId').isInt({ min: 1 }).withMessage('Course ID is required'),
    body('gradeCalculationMethod').optional().isIn(['weighted', 'points', 'percentage']).withMessage('Invalid calculation method'),
    body('categoryWeights').optional().isObject().withMessage('Category weights must be an object'),
    body('dropLowestScores').optional().isObject().withMessage('Drop lowest scores must be an object'),
    body('latePenaltyPolicy').optional().isObject().withMessage('Late penalty policy must be an object'),
    body('gradingScale').optional().isObject().withMessage('Grading scale must be an object')
  ]
};

/**
 * Middleware for request validation using express-validator
 * @param {String} schema - Name of the validation schema to use
 * @returns {Function} - Express middleware function
 */
const validate = (schema) => {
  if (!validationSchemas[schema]) {
    throw new Error(`Validation schema '${schema}' not found`);
  }
  
  return [
    ...validationSchemas[schema],
    (req, res, next) => {
      const errors = validationResult(req);
      
      if (!errors.isEmpty()) {
        const extractedErrors = errors.array().map(err => ({
          field: err.param,
          message: err.msg
        }));
        
        logger.debug('Validation error:', { schema, errors: extractedErrors });
        
        return res.status(400).json({
          success: false,
          error: {
            status: 400,
            message: 'Validation error',
            details: extractedErrors
          }
        });
      }
      
      next();
    }
  ];
};

// Middleware to handle validation results
const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg,
      value: err.value
    }));

    logger.warn('Validation failed:', extractedErrors);
    
    return res.status(400).json({
      success: false,
      error: {
        status: 400,
        message: 'Validation error',
        details: extractedErrors
      }
    });
  }
  
  next();
};

module.exports = {
  validate,
  validateResult,
  validationRules,
  validationSchemas
};
