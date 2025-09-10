const { logger } = require('../utils/logger');
const assignmentService = require('../services/assignment.service');
const { createError } = require('../utils/error.util');

/**
 * Assignment Controller - Handles assignment-related operations
 */
class AssignmentController {

  /**
   * Get all assignments
   */
  async getAssignments(req, res, next) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const filters = {
        courseId: req.query.courseId,
        status: req.query.status,
        dueAfter: req.query.dueAfter,
        dueBefore: req.query.dueBefore,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      let assignments;
      if (userRole === 'teacher') {
        assignments = await assignmentService.getTeacherAssignments(userId, filters);
      } else if (userRole === 'student') {
        assignments = await assignmentService.getStudentAssignments(userId, filters);
      } else {
        assignments = await assignmentService.getAllAssignments(filters);
      }

      res.success(assignments, 'Assignments retrieved successfully');
    } catch (error) {
      logger.error('Error in getAssignments:', error);
      next(error);
    }
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(req, res, next) {
    try {
      const assignmentId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      const assignment = await assignmentService.getAssignmentById(assignmentId, userId, userRole);
      
      if (!assignment) {
        return res.error('Assignment not found', 404);
      }

      res.success(assignment, 'Assignment retrieved successfully');
    } catch (error) {
      logger.error('Error in getAssignmentById:', error);
      next(error);
    }
  }

  /**
   * Create new assignment (Teachers only)
   */
  async createAssignment(req, res, next) {
    try {
      const teacherId = req.user.id;
      const assignmentData = {
        ...req.body,
        teacherId,
        createdBy: teacherId
      };

      const assignment = await assignmentService.createAssignment(assignmentData);
      
      res.created(assignment, 'Assignment created successfully');
    } catch (error) {
      logger.error('Error in createAssignment:', error);
      next(error);
    }
  }

  /**
   * Update assignment (Teachers only)
   */
  async updateAssignment(req, res, next) {
    try {
      const assignmentId = req.params.id;
      const teacherId = req.user.id;
      const updateData = req.body;

      const assignment = await assignmentService.updateAssignment(assignmentId, updateData, teacherId);
      
      if (!assignment) {
        return res.error('Assignment not found or unauthorized', 404);
      }

      res.success(assignment, 'Assignment updated successfully');
    } catch (error) {
      logger.error('Error in updateAssignment:', error);
      next(error);
    }
  }

  /**
   * Delete assignment (Teachers only)
   */
  async deleteAssignment(req, res, next) {
    try {
      const assignmentId = req.params.id;
      const teacherId = req.user.id;

      const result = await assignmentService.deleteAssignment(assignmentId, teacherId);
      
      if (!result) {
        return res.error('Assignment not found or unauthorized', 404);
      }

      res.success(null, 'Assignment deleted successfully');
    } catch (error) {
      logger.error('Error in deleteAssignment:', error);
      next(error);
    }
  }

  /**
   * Download assignment question PDF
   */
  async downloadQuestionPdf(req, res, next) {
    try {
      const assignmentId = req.params.id;
      const userId = req.user.id;
      const userRole = req.user.role;

      const pdfPath = await assignmentService.getQuestionPdfPath(assignmentId, userId, userRole);
      
      if (!pdfPath) {
        return res.error('PDF not found or unauthorized', 404);
      }

      res.download(pdfPath);
    } catch (error) {
      logger.error('Error in downloadQuestionPdf:', error);
      next(error);
    }
  }

  /**
   * Submit assignment (Students only)
   */
  async submitAssignment(req, res, next) {
    try {
      const assignmentId = req.params.id;
      const studentId = req.user.id;
      const submissionData = {
        assignmentId,
        studentId,
        ...req.body,
        files: req.files || []
      };

      const submission = await assignmentService.submitAssignment(submissionData);
      
      res.created(submission, 'Assignment submitted successfully');
    } catch (error) {
      logger.error('Error in submitAssignment:', error);
      next(error);
    }
  }

  /**
   * Get assignment submissions (Teachers only)
   */
  async getAssignmentSubmissions(req, res, next) {
    try {
      const assignmentId = req.params.id;
      const teacherId = req.user.id;
      const filters = {
        status: req.query.status,
        studentId: req.query.studentId,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10
      };

      const submissions = await assignmentService.getAssignmentSubmissions(assignmentId, teacherId, filters);
      
      res.success(submissions, 'Submissions retrieved successfully');
    } catch (error) {
      logger.error('Error in getAssignmentSubmissions:', error);
      next(error);
    }
  }

  /**
   * Grade assignment submission (Teachers only)
   */
  async gradeSubmission(req, res, next) {
    try {
      const submissionId = req.params.submissionId;
      const teacherId = req.user.id;
      const gradeData = {
        ...req.body,
        gradedBy: teacherId,
        gradedAt: new Date()
      };

      const result = await assignmentService.gradeSubmission(submissionId, gradeData, teacherId);
      
      res.success(result, 'Submission graded successfully');
    } catch (error) {
      logger.error('Error in gradeSubmission:', error);
      next(error);
    }
  }
}

module.exports = new AssignmentController();
