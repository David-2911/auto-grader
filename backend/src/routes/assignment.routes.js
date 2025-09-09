const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validator.middleware');
const uploadMiddleware = require('../middleware/upload.middleware');

// Get all assignments (filtered by course for students and teachers)
router.get('/', authenticate, assignmentController.getAssignments);

// Get a specific assignment
router.get('/:id', authenticate, assignmentController.getAssignmentById);

// Create a new assignment (teachers and admins only)
router.post(
  '/', 
  authenticate, 
  authorize('teacher', 'admin'),
  uploadMiddleware.single('questionPdf'),
  validate('createAssignment'),
  assignmentController.createAssignment
);

// Update an assignment (teachers and admins only)
router.put(
  '/:id', 
  authenticate, 
  authorize('teacher', 'admin'),
  uploadMiddleware.single('questionPdf'),
  validate('updateAssignment'),
  assignmentController.updateAssignment
);

// Delete an assignment (teachers and admins only)
router.delete(
  '/:id', 
  authenticate, 
  authorize('teacher', 'admin'),
  assignmentController.deleteAssignment
);

// Download assignment question PDF
router.get(
  '/:id/question-pdf',
  authenticate,
  assignmentController.downloadQuestionPdf
);

module.exports = router;
