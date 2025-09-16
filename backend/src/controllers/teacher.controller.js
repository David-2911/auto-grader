const { logger } = require('../utils/logger');
const teacherService = require('../services/teacher.service');
const courseService = require('../services/course.service');
const assignmentService = require('../services/assignment.service');
const submissionService = require('../services/submission.service');
const gradingService = require('../services/grading.service');
const analyticsService = require('../services/analytics.service');
const notificationService = require('../services/notification.service');
const reportService = require('../services/report.service');

// Enhanced teacher portal services
const courseManagementService = require('../services/course-management.service');
const studentManagementService = require('../services/student-management.service');
const assignmentManagementService = require('../services/assignment-management.service');
const gradingOversightService = require('../services/grading-oversight.service');
const communicationService = require('../services/communication.service');
const gradeBookService = require('../services/gradebook.service');

/**
 * Teacher Portal Controller
 * Handles all teacher-specific operations for course management, grading, and analytics
 */

/**
 * @desc    Get teacher dashboard with overview statistics
 * @route   GET /api/teacher/dashboard
 * @access  Teacher
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const dashboard = await teacherService.getDashboardData(teacherId);
    
    return res.success(dashboard, 'Dashboard data retrieved successfully');
  } catch (error) {
    logger.error('Get dashboard error:', error);
    next(error);
  }
};

/**
 * Course Management Controllers
 */

/**
 * @desc    Get all courses for the teacher
 * @route   GET /api/teacher/courses
 * @access  Teacher
 */
exports.getCourses = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, search, status } = req.query;
    
    const courses = await courseService.getCoursesByTeacher(teacherId, {
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      status
    });
    
    return res.success(courses, 'Courses retrieved successfully');
  } catch (error) {
    logger.error('Get courses error:', error);
    next(error);
  }
};

/**
 * @desc    Create a new course
 * @route   POST /api/teacher/courses
 * @access  Teacher
 */
exports.createCourse = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const courseData = {
      ...req.body,
      teacherId
    };
    
    const course = await courseManagementService.createCourse(courseData, teacherId);
    
    logger.info(`Course created by teacher ${teacherId}: ${course.title}`);
    return res.created(course, 'Course created successfully');
  } catch (error) {
    logger.error('Create course error:', error);
    next(error);
  }
};

/**
 * @desc    Get detailed course information
 * @route   GET /api/teacher/courses/:id
 * @access  Teacher
 */
exports.getCourseDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const course = await courseManagementService.getCourseDetails(id, teacherId);
    
    return res.success(course, 'Course details retrieved successfully');
  } catch (error) {
    logger.error('Get course details error:', error);
    next(error);
  }
};

/**
 * @desc    Update course information
 * @route   PUT /api/teacher/courses/:id
 * @access  Teacher
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const updateData = req.body;
    
    const course = await courseManagementService.updateCourse(id, updateData, teacherId);
    
    return res.success(course, 'Course updated successfully');
  } catch (error) {
    logger.error('Update course error:', error);
    next(error);
  }
};

/**
 * @desc    Archive a course
 * @route   POST /api/teacher/courses/:id/archive
 * @access  Teacher
 */
exports.archiveCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const result = await courseManagementService.archiveCourse(id, teacherId);
    
    return res.success(result, 'Course archived successfully');
  } catch (error) {
    logger.error('Archive course error:', error);
    next(error);
  }
};

/**
 * @desc    Duplicate a course
 * @route   POST /api/teacher/courses/:id/duplicate
 * @access  Teacher
 */
exports.duplicateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const newCourseData = req.body;
    
    const course = await courseManagementService.duplicateCourse(id, teacherId, newCourseData);
    
    return res.success(course, 'Course duplicated successfully');
  } catch (error) {
    logger.error('Duplicate course error:', error);
    next(error);
  }
};

/**
 * Student Management Controllers
 */

/**
 * @desc    Get all students for teacher
 * @route   GET /api/teacher/students
 * @access  Teacher
 */
exports.getAllStudents = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const filters = req.query;
    
    const students = await studentManagementService.getStudentsByTeacher(teacherId, filters);
    
    return res.success(students, 'Students retrieved successfully');
  } catch (error) {
    logger.error('Get all students error:', error);
    next(error);
  }
};

/**
 * @desc    Get student profile and performance
 * @route   GET /api/teacher/students/:id
 * @access  Teacher
 */
exports.getStudentProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const student = await studentManagementService.getStudentProfile(id, teacherId);
    
    return res.success(student, 'Student profile retrieved successfully');
  } catch (error) {
    logger.error('Get student profile error:', error);
    next(error);
  }
};

/**
 * @desc    Add note about a student
 * @route   POST /api/teacher/students/:id/notes
 * @access  Teacher
 */
exports.addStudentNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const noteData = req.body;
    
    const note = await studentManagementService.addStudentNote(id, teacherId, noteData);
    
    return res.created(note, 'Student note added successfully');
  } catch (error) {
    logger.error('Add student note error:', error);
    next(error);
  }
};

/**
 * @desc    Get course attendance
 * @route   GET /api/teacher/courses/:courseId/attendance
 * @access  Teacher
 */
exports.getCourseAttendance = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const filters = req.query;
    
    const attendance = await studentManagementService.getCourseAttendance(courseId, teacherId, filters);
    
    return res.success(attendance, 'Attendance records retrieved successfully');
  } catch (error) {
    logger.error('Get course attendance error:', error);
    next(error);
  }
};

/**
 * @desc    Record attendance for a class
 * @route   POST /api/teacher/courses/:courseId/attendance
 * @access  Teacher
 */
exports.recordAttendance = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const attendanceData = req.body;
    
    const attendance = await studentManagementService.recordAttendance(courseId, teacherId, attendanceData);
    
    return res.success(attendance, 'Attendance recorded successfully');
  } catch (error) {
    logger.error('Record attendance error:', error);
    next(error);
  }
};

/**
 * @desc    Bulk enroll students
 * @route   POST /api/teacher/courses/:id/students/bulk-enroll
 * @access  Teacher
 */
exports.bulkEnrollStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    // Parse CSV file if uploaded
    let studentData = req.body.students || [];
    
    if (req.file) {
      // Handle CSV file parsing here
      const csvData = await parseCsvFile(req.file.path);
      studentData = csvData;
    }
    
    const result = await studentManagementService.bulkEnrollStudents(id, teacherId, studentData);
    
    return res.success(result, 'Bulk enrollment completed');
  } catch (error) {
    logger.error('Bulk enroll students error:', error);
    next(error);
  }
};

/**
 * Assignment Management Controllers
 */

/**
 * @desc    Get assignments for teacher
 * @route   GET /api/teacher/assignments
 * @access  Teacher
 */
exports.getAssignments = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const filters = req.query;
    
    const assignments = await assignmentManagementService.getAssignmentsByTeacher(teacherId, filters);
    
    return res.success(assignments, 'Assignments retrieved successfully');
  } catch (error) {
    logger.error('Get assignments error:', error);
    next(error);
  }
};

/**
 * @desc    Create assignment
 * @route   POST /api/teacher/assignments
 * @access  Teacher
 */
exports.createAssignment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const assignmentData = {
      ...req.body,
      questionPdfPath: req.files?.questionPdf?.[0]?.path,
      resourceFiles: req.files?.resources || []
    };
    
    const assignment = await assignmentManagementService.createAssignment(assignmentData, teacherId);
    
    return res.created(assignment, 'Assignment created successfully');
  } catch (error) {
    logger.error('Create assignment error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment details
 * @route   GET /api/teacher/assignments/:id
 * @access  Teacher
 */
exports.getAssignmentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const assignment = await assignmentManagementService.getAssignmentDetails(id, teacherId);
    
    return res.success(assignment, 'Assignment details retrieved successfully');
  } catch (error) {
    logger.error('Get assignment details error:', error);
    next(error);
  }
};

/**
 * @desc    Update assignment
 * @route   PUT /api/teacher/assignments/:id
 * @access  Teacher
 */
exports.updateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const updateData = {
      ...req.body,
      questionPdfPath: req.files?.questionPdf?.[0]?.path,
      resourceFiles: req.files?.resources || []
    };
    
    const assignment = await assignmentManagementService.updateAssignment(id, updateData, teacherId);
    
    return res.success(assignment, 'Assignment updated successfully');
  } catch (error) {
    logger.error('Update assignment error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment templates
 * @route   GET /api/teacher/assignments/templates
 * @access  Teacher
 */
exports.getAssignmentTemplates = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const filters = req.query;
    
    const templates = await assignmentManagementService.getAssignmentTemplates(teacherId, filters);
    
    return res.success(templates, 'Assignment templates retrieved successfully');
  } catch (error) {
    logger.error('Get assignment templates error:', error);
    next(error);
  }
};

/**
 * @desc    Create assignment from template
 * @route   POST /api/teacher/assignments/from-template/:templateId
 * @access  Teacher
 */
exports.createFromTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const teacherId = req.user.id;
    const assignmentData = req.body;
    
    const assignment = await assignmentManagementService.createFromTemplate(templateId, assignmentData, teacherId);
    
    return res.created(assignment, 'Assignment created from template successfully');
  } catch (error) {
    logger.error('Create from template error:', error);
    next(error);
  }
};

/**
 * @desc    Duplicate assignment
 * @route   POST /api/teacher/assignments/:id/duplicate
 * @access  Teacher
 */
exports.duplicateAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const overrides = req.body;
    
    const assignment = await assignmentManagementService.duplicateAssignment(id, teacherId, overrides);
    
    return res.created(assignment, 'Assignment duplicated successfully');
  } catch (error) {
    logger.error('Duplicate assignment error:', error);
    next(error);
  }
};

/**
 * Grading and Submission Management Controllers
 */

/**
 * @desc    Get submissions for grading
 * @route   GET /api/teacher/submissions
 * @access  Teacher
 */
exports.getSubmissions = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const filters = req.query;
    
    const submissions = await gradingOversightService.getSubmissionsForGrading(teacherId, filters);
    
    return res.success(submissions, 'Submissions retrieved successfully');
  } catch (error) {
    logger.error('Get submissions error:', error);
    next(error);
  }
};

/**
 * @desc    Get submission details for grading
 * @route   GET /api/teacher/submissions/:id
 * @access  Teacher
 */
exports.getSubmissionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const submission = await gradingOversightService.getSubmissionDetails(id, teacherId);
    
    return res.success(submission, 'Submission details retrieved successfully');
  } catch (error) {
    logger.error('Get submission details error:', error);
    next(error);
  }
};

/**
 * @desc    Grade a submission
 * @route   PUT /api/teacher/submissions/:id/grade
 * @access  Teacher
 */
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const gradingData = req.body;
    
    const submission = await gradingOversightService.gradeSubmission(id, teacherId, gradingData);
    
    return res.success(submission, 'Submission graded successfully');
  } catch (error) {
    logger.error('Grade submission error:', error);
    next(error);
  }
};

/**
 * @desc    Request regrade of submission
 * @route   POST /api/teacher/submissions/:id/regrade
 * @access  Teacher
 */
exports.requestRegrade = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const options = req.body;
    
    const result = await gradingOversightService.requestRegrade(id, teacherId, options);
    
    return res.success(result, 'Regrade requested successfully');
  } catch (error) {
    logger.error('Request regrade error:', error);
    next(error);
  }
};

/**
 * @desc    Bulk grade submissions
 * @route   POST /api/teacher/assignments/:id/bulk-grade
 * @access  Teacher
 */
exports.bulkGradeAssignment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const gradingData = req.body.submissions || [];
    
    const result = await gradingOversightService.bulkGradeSubmissions(teacherId, gradingData);
    
    return res.success(result, 'Bulk grading completed');
  } catch (error) {
    logger.error('Bulk grade assignment error:', error);
    next(error);
  }
};

/**
 * Communication Controllers
 */

/**
 * @desc    Send feedback to student
 * @route   POST /api/teacher/feedback/send
 * @access  Teacher
 */
exports.sendFeedback = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const feedbackData = req.body;
    
    const feedback = await communicationService.sendFeedback(teacherId, feedbackData);
    
    return res.success(feedback, 'Feedback sent successfully');
  } catch (error) {
    logger.error('Send feedback error:', error);
    next(error);
  }
};

/**
 * @desc    Broadcast message to students
 * @route   POST /api/teacher/messages/broadcast
 * @access  Teacher
 */
exports.broadcastMessage = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const messageData = req.body;
    
    const result = await communicationService.broadcastMessage(teacherId, messageData);
    
    return res.success(result, 'Message broadcast successfully');
  } catch (error) {
    logger.error('Broadcast message error:', error);
    next(error);
  }
};

/**
 * @desc    Get announcements
 * @route   GET /api/teacher/announcements
 * @access  Teacher
 */
exports.getAnnouncements = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const filters = req.query;
    
    const announcements = await communicationService.getAnnouncements(teacherId, filters);
    
    return res.success(announcements, 'Announcements retrieved successfully');
  } catch (error) {
    logger.error('Get announcements error:', error);
    next(error);
  }
};

/**
 * @desc    Create announcement
 * @route   POST /api/teacher/announcements
 * @access  Teacher
 */
exports.createAnnouncement = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const announcementData = req.body;
    
    const announcement = await communicationService.createAnnouncement(teacherId, announcementData);
    
    return res.created(announcement, 'Announcement created successfully');
  } catch (error) {
    logger.error('Create announcement error:', error);
    next(error);
  }
};

/**
 * @desc    Update announcement
 * @route   PUT /api/teacher/announcements/:id
 * @access  Teacher
 */
exports.updateAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const updateData = req.body;
    
    const announcement = await communicationService.updateAnnouncement(id, teacherId, updateData);
    
    return res.success(announcement, 'Announcement updated successfully');
  } catch (error) {
    logger.error('Update announcement error:', error);
    next(error);
  }
};

/**
 * @desc    Delete announcement
 * @route   DELETE /api/teacher/announcements/:id
 * @access  Teacher
 */
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const result = await communicationService.deleteAnnouncement(id, teacherId);
    
    return res.success(result, 'Announcement deleted successfully');
  } catch (error) {
    logger.error('Delete announcement error:', error);
    next(error);
  }
};

/**
 * @desc    Get messages
 * @route   GET /api/teacher/messages
 * @access  Teacher
 */
exports.getMessages = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const filters = req.query;
    
    const messages = await communicationService.getMessages(teacherId, filters);
    
    return res.success(messages, 'Messages retrieved successfully');
  } catch (error) {
    logger.error('Get messages error:', error);
    next(error);
  }
};

/**
 * Grade Book Management Controllers
 */

/**
 * @desc    Get gradebook for course
 * @route   GET /api/teacher/gradebook/:courseId
 * @access  Teacher
 */
exports.getGradebook = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const options = req.query;
    
    const gradebook = await gradeBookService.getGradebook(courseId, teacherId, options);
    
    return res.success(gradebook, 'Gradebook retrieved successfully');
  } catch (error) {
    logger.error('Get gradebook error:', error);
    next(error);
  }
};

/**
 * @desc    Update gradebook settings
 * @route   PUT /api/teacher/gradebook/:courseId/settings
 * @access  Teacher
 */
exports.updateGradebookSettings = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const settings = req.body;
    
    const updatedSettings = await gradeBookService.updateGradebookSettings(courseId, teacherId, settings);
    
    return res.success(updatedSettings, 'Gradebook settings updated successfully');
  } catch (error) {
    logger.error('Update gradebook settings error:', error);
    next(error);
  }
};

/**
 * @desc    Export gradebook
 * @route   POST /api/teacher/gradebook/:courseId/export
 * @access  Teacher
 */
exports.exportGradebook = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const options = req.body;
    
    const exportInfo = await gradeBookService.exportGradebook(courseId, teacherId, options);
    
    return res.success(exportInfo, 'Gradebook exported successfully');
  } catch (error) {
    logger.error('Export gradebook error:', error);
    next(error);
  }
};

/**
 * @desc    Import grades
 * @route   POST /api/teacher/gradebook/:courseId/import
 * @access  Teacher
 */
exports.importGrades = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const filePath = req.file?.path;
    const options = req.body;
    
    if (!filePath) {
      return res.badRequest('CSV file is required');
    }
    
    const result = await gradeBookService.importGrades(courseId, teacherId, filePath, options);
    
    return res.success(result, 'Grades imported successfully');
  } catch (error) {
    logger.error('Import grades error:', error);
    next(error);
  }
};

/**
 * @desc    Get gradebook statistics
 * @route   GET /api/teacher/gradebook/:courseId/statistics
 * @access  Teacher
 */
exports.getGradebookStatistics = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    
    const statistics = await gradeBookService.getGradebookStatistics(courseId, teacherId);
    
    return res.success(statistics, 'Gradebook statistics retrieved successfully');
  } catch (error) {
    logger.error('Get gradebook statistics error:', error);
    next(error);
  }
};

/**
 * @desc    Recalculate grades
 * @route   POST /api/teacher/gradebook/:courseId/recalculate
 * @access  Teacher
 */
exports.recalculateGrades = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    
    const result = await gradeBookService.recalculateGrades(courseId, teacherId);
    
    return res.success(result, 'Grades recalculated successfully');
  } catch (error) {
    logger.error('Recalculate grades error:', error);
    next(error);
  }
};

/**
 * Batch Operations Controllers
 */

/**
 * @desc    Batch send feedback
 * @route   POST /api/teacher/batch/send-feedback
 * @access  Teacher
 */
exports.batchSendFeedback = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const batchData = req.body;
    
    const result = await communicationService.batchSendFeedback(teacherId, batchData);
    
    return res.success(result, 'Batch feedback sent successfully');
  } catch (error) {
    logger.error('Batch send feedback error:', error);
    next(error);
  }
};

/**
 * Helper function to parse CSV file
 */
async function parseCsvFile(filePath) {
  // Implementation for CSV parsing
  // This would typically use a CSV parsing library
  return [];
}

/**
 * @desc    Update course information
 * @route   PUT /api/teacher/courses/:id
 * @access  Teacher
 */
exports.updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const course = await teacherService.updateCourse(id, req.body, teacherId);
    
    return res.success(course, 'Course updated successfully');
  } catch (error) {
    logger.error('Update course error:', error);
    next(error);
  }
};

/**
 * @desc    Delete course
 * @route   DELETE /api/teacher/courses/:id
 * @access  Teacher
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    await teacherService.deleteCourse(id, teacherId);
    
    return res.success(null, 'Course deleted successfully');
  } catch (error) {
    logger.error('Delete course error:', error);
    next(error);
  }
};

/**
 * @desc    Archive course
 * @route   POST /api/teacher/courses/:id/archive
 * @access  Teacher
 */
exports.archiveCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    await teacherService.archiveCourse(id, teacherId);
    
    return res.success(null, 'Course archived successfully');
  } catch (error) {
    logger.error('Archive course error:', error);
    next(error);
  }
};

/**
 * @desc    Duplicate course
 * @route   POST /api/teacher/courses/:id/duplicate
 * @access  Teacher
 */
exports.duplicateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const newCourse = await teacherService.duplicateCourse(id, teacherId);
    
    return res.created(newCourse, 'Course duplicated successfully');
  } catch (error) {
    logger.error('Duplicate course error:', error);
    next(error);
  }
};

/**
 * Student Management Controllers
 */

/**
 * @desc    Get course students
 * @route   GET /api/teacher/courses/:id/students
 * @access  Teacher
 */
exports.getCourseStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const { page = 1, limit = 20, search } = req.query;
    
    const students = await teacherService.getCourseStudents(id, teacherId, {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    
    return res.success(students, 'Course students retrieved successfully');
  } catch (error) {
    logger.error('Get course students error:', error);
    next(error);
  }
};

/**
 * @desc    Enroll students in course
 * @route   POST /api/teacher/courses/:id/students/enroll
 * @access  Teacher
 */
exports.enrollStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const teacherId = req.user.id;
    
    const result = await teacherService.enrollStudents(id, studentIds, teacherId);
    
    return res.success(result, 'Students enrolled successfully');
  } catch (error) {
    logger.error('Enroll students error:', error);
    next(error);
  }
};

/**
 * @desc    Unenroll student from course
 * @route   DELETE /api/teacher/courses/:id/students/:studentId
 * @access  Teacher
 */
exports.unenrollStudent = async (req, res, next) => {
  try {
    const { id, studentId } = req.params;
    const teacherId = req.user.id;
    
    await teacherService.unenrollStudent(id, studentId, teacherId);
    
    return res.success(null, 'Student unenrolled successfully');
  } catch (error) {
    logger.error('Unenroll student error:', error);
    next(error);
  }
};

/**
 * @desc    Bulk enroll students from CSV
 * @route   POST /api/teacher/courses/:id/students/bulk-enroll
 * @access  Teacher
 */
exports.bulkEnrollStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const csvFile = req.file;
    
    const result = await teacherService.bulkEnrollStudents(id, csvFile, teacherId);
    
    return res.success(result, 'Students bulk enrolled successfully');
  } catch (error) {
    logger.error('Bulk enroll students error:', error);
    next(error);
  }
};

/**
 * Assignment Management Controllers
 */

/**
 * @desc    Get all assignments for teacher
 * @route   GET /api/teacher/assignments
 * @access  Teacher
 */
exports.getAssignments = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 10, courseId, status, search } = req.query;
    
    const assignments = await teacherService.getAssignments(teacherId, {
      page: parseInt(page),
      limit: parseInt(limit),
      courseId,
      status,
      search
    });
    
    return res.success(assignments, 'Assignments retrieved successfully');
  } catch (error) {
    logger.error('Get assignments error:', error);
    next(error);
  }
};

/**
 * @desc    Create new assignment
 * @route   POST /api/teacher/assignments
 * @access  Teacher
 */
exports.createAssignment = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const assignmentData = {
      ...req.body,
      teacherId
    };
    
    // Handle file uploads
    if (req.files) {
      if (req.files.questionPdf) {
        assignmentData.questionPdfPath = req.files.questionPdf[0].path;
      }
      if (req.files.resources) {
        assignmentData.resourcePaths = req.files.resources.map(file => file.path);
      }
    }
    
    const assignment = await teacherService.createAssignment(assignmentData, teacherId);
    
    return res.created(assignment, 'Assignment created successfully');
  } catch (error) {
    logger.error('Create assignment error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment templates
 * @route   GET /api/teacher/assignments/templates
 * @access  Teacher
 */
exports.getAssignmentTemplates = async (req, res, next) => {
  try {
    const templates = await teacherService.getAssignmentTemplates();
    
    return res.success(templates, 'Assignment templates retrieved successfully');
  } catch (error) {
    logger.error('Get assignment templates error:', error);
    next(error);
  }
};

/**
 * @desc    Create assignment from template
 * @route   POST /api/teacher/assignments/from-template/:templateId
 * @access  Teacher
 */
exports.createFromTemplate = async (req, res, next) => {
  try {
    const { templateId } = req.params;
    const teacherId = req.user.id;
    const customizations = req.body;
    
    const assignment = await teacherService.createAssignmentFromTemplate(templateId, customizations, teacherId);
    
    return res.created(assignment, 'Assignment created from template successfully');
  } catch (error) {
    logger.error('Create from template error:', error);
    next(error);
  }
};

/**
 * Grading Management Controllers
 */

/**
 * @desc    Get submissions for grading
 * @route   GET /api/teacher/submissions
 * @access  Teacher
 */
exports.getSubmissions = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 20, status, courseId, assignmentId } = req.query;
    
    const submissions = await teacherService.getSubmissions(teacherId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      courseId,
      assignmentId
    });
    
    return res.success(submissions, 'Submissions retrieved successfully');
  } catch (error) {
    logger.error('Get submissions error:', error);
    next(error);
  }
};

/**
 * @desc    Grade a submission
 * @route   PUT /api/teacher/submissions/:id/grade
 * @access  Teacher
 */
exports.gradeSubmission = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    const gradingData = req.body;
    
    const result = await gradingService.gradeSubmission(id, gradingData, teacherId);
    
    return res.success(result, 'Submission graded successfully');
  } catch (error) {
    logger.error('Grade submission error:', error);
    next(error);
  }
};

/**
 * @desc    Auto-grade assignment submissions
 * @route   POST /api/teacher/assignments/:id/auto-grade
 * @access  Teacher
 */
exports.autoGradeAssignment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const result = await gradingService.autoGradeAssignment(id, teacherId);
    
    return res.success(result, 'Auto-grading initiated successfully');
  } catch (error) {
    logger.error('Auto-grade assignment error:', error);
    next(error);
  }
};

/**
 * Analytics and Reporting Controllers
 */

/**
 * @desc    Get class performance analytics
 * @route   GET /api/teacher/analytics/class-performance/:courseId
 * @access  Teacher
 */
exports.getClassPerformance = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    
    const analytics = await analyticsService.getClassPerformance(courseId, teacherId);
    
    return res.success(analytics, 'Class performance analytics retrieved successfully');
  } catch (error) {
    logger.error('Get class performance error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment difficulty analysis
 * @route   GET /api/teacher/analytics/assignment-difficulty/:assignmentId
 * @access  Teacher
 */
exports.getAssignmentDifficulty = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;
    
    const analysis = await analyticsService.getAssignmentDifficulty(assignmentId, teacherId);
    
    return res.success(analysis, 'Assignment difficulty analysis retrieved successfully');
  } catch (error) {
    logger.error('Get assignment difficulty error:', error);
    next(error);
  }
};

/**
 * Grade Book Management Controllers
 */

/**
 * @desc    Get course gradebook
 * @route   GET /api/teacher/gradebook/:courseId
 * @access  Teacher
 */
exports.getGradebook = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    
    const gradebook = await teacherService.getGradebook(courseId, teacherId);
    
    return res.success(gradebook, 'Gradebook retrieved successfully');
  } catch (error) {
    logger.error('Get gradebook error:', error);
    next(error);
  }
};

/**
 * @desc    Export gradebook
 * @route   POST /api/teacher/gradebook/:courseId/export
 * @access  Teacher
 */
exports.exportGradebook = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    const { format = 'csv' } = req.body;
    
    const exportData = await teacherService.exportGradebook(courseId, format, teacherId);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=gradebook_${courseId}.${format}`);
    
    return res.send(exportData);
  } catch (error) {
    logger.error('Export gradebook error:', error);
    next(error);
  }
};

/**
 * Communication Controllers
 */

/**
 * @desc    Send feedback to student
 * @route   POST /api/teacher/feedback/send
 * @access  Teacher
 */
exports.sendFeedback = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const feedbackData = {
      ...req.body,
      senderId: teacherId
    };
    
    const result = await notificationService.sendFeedback(feedbackData);
    
    return res.success(result, 'Feedback sent successfully');
  } catch (error) {
    logger.error('Send feedback error:', error);
    next(error);
  }
};

/**
 * @desc    Broadcast message to course
 * @route   POST /api/teacher/messages/broadcast
 * @access  Teacher
 */
exports.broadcastMessage = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const messageData = {
      ...req.body,
      senderId: teacherId
    };
    
    const result = await notificationService.broadcastMessage(messageData);
    
    return res.success(result, 'Message broadcasted successfully');
  } catch (error) {
    logger.error('Broadcast message error:', error);
    next(error);
  }
};

/**
 * Report Generation Controllers
 */

/**
 * @desc    Generate course performance report
 * @route   GET /api/teacher/reports/course/:courseId/performance
 * @access  Teacher
 */
exports.generateCoursePerformanceReport = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const teacherId = req.user.id;
    
    const report = await reportService.generateCoursePerformanceReport(courseId, teacherId);
    
    return res.success(report, 'Course performance report generated successfully');
  } catch (error) {
    logger.error('Generate course performance report error:', error);
    next(error);
  }
};

/**
 * @desc    Generate assignment results report
 * @route   GET /api/teacher/reports/assignment/:assignmentId/results
 * @access  Teacher
 */
exports.generateAssignmentReport = async (req, res, next) => {
  try {
    const { assignmentId } = req.params;
    const teacherId = req.user.id;
    
    const report = await reportService.generateAssignmentReport(assignmentId, teacherId);
    
    return res.success(report, 'Assignment report generated successfully');
  } catch (error) {
    logger.error('Generate assignment report error:', error);
    next(error);
  }
};

// Additional controller methods for the remaining endpoints...
// (Due to length constraints, I'm including the main structure)

/**
 * Helper Controllers
 */

exports.getAssignmentDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const assignment = await teacherService.getAssignmentDetails(id, teacherId);
    
    return res.success(assignment, 'Assignment details retrieved successfully');
  } catch (error) {
    logger.error('Get assignment details error:', error);
    next(error);
  }
};

exports.getSubmissionDetails = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const submission = await teacherService.getSubmissionDetails(id, teacherId);
    
    return res.success(submission, 'Submission details retrieved successfully');
  } catch (error) {
    logger.error('Get submission details error:', error);
    next(error);
  }
};

exports.getAllStudents = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const { page = 1, limit = 20, search } = req.query;
    
    const students = await teacherService.getAllStudents(teacherId, {
      page: parseInt(page),
      limit: parseInt(limit),
      search
    });
    
    return res.success(students, 'Students retrieved successfully');
  } catch (error) {
    logger.error('Get all students error:', error);
    next(error);
  }
};

exports.getStudentProgress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const teacherId = req.user.id;
    
    const progress = await teacherService.getStudentProgress(id, teacherId);
    
    return res.success(progress, 'Student progress retrieved successfully');
  } catch (error) {
    logger.error('Get student progress error:', error);
    next(error);
  }
};

/**
 * @desc    Delete a course
 * @route   DELETE /api/teacher/courses/:id
 * @access  Teacher
 */
exports.deleteCourse = async (req, res, next) => {
  try {
    const courseId = req.params.id;
    const teacherId = req.user.id;
    
    await courseService.deleteCourse(courseId, teacherId);
    
    return res.success(null, 'Course deleted successfully');
  } catch (error) {
    logger.error('Delete course error:', error);
    next(error);
  }
};

/**
 * @desc    Unenroll a student from course
 * @route   DELETE /api/teacher/courses/:id/students/:studentId
 * @access  Teacher
 */
exports.unenrollStudent = async (req, res, next) => {
  try {
    const { id: courseId, studentId } = req.params;
    const teacherId = req.user.id;
    
    await courseService.unenrollStudent(courseId, studentId, teacherId);
    
    return res.success(null, 'Student unenrolled successfully');
  } catch (error) {
    logger.error('Unenroll student error:', error);
    next(error);
  }
};

/**
 * @desc    Delete an assignment
 * @route   DELETE /api/teacher/assignments/:id
 * @access  Teacher
 */
exports.deleteAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const teacherId = req.user.id;
    
    await assignmentService.deleteAssignment(assignmentId, teacherId);
    
    return res.success(null, 'Assignment deleted successfully');
  } catch (error) {
    logger.error('Delete assignment error:', error);
    next(error);
  }
};

/**
 * @desc    Delete an assignment category
 * @route   DELETE /api/teacher/categories/:id
 * @access  Teacher
 */
exports.deleteAssignmentCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const teacherId = req.user.id;
    
    await assignmentService.deleteCategory(categoryId, teacherId);
    
    return res.success(null, 'Assignment category deleted successfully');
  } catch (error) {
    logger.error('Delete assignment category error:', error);
    next(error);
  }
};

/**
 * @desc    Delete an announcement
 * @route   DELETE /api/teacher/announcements/:id
 * @access  Teacher
 */
exports.deleteAnnouncement = async (req, res, next) => {
  try {
    const announcementId = req.params.id;
    const teacherId = req.user.id;
    
    await communicationService.deleteAnnouncement(announcementId, teacherId);
    
    return res.success(null, 'Announcement deleted successfully');
  } catch (error) {
    logger.error('Delete announcement error:', error);
    next(error);
  }
};

/**
 * @desc    Delete a template
 * @route   DELETE /api/teacher/templates/:id
 * @access  Teacher
 */
exports.deleteTemplate = async (req, res, next) => {
  try {
    const templateId = req.params.id;
    const teacherId = req.user.id;
    
    await assignmentService.deleteTemplate(templateId, teacherId);
    
    return res.success(null, 'Template deleted successfully');
  } catch (error) {
    logger.error('Delete template error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment categories for a course
 * @route   GET /api/teacher/courses/:courseId/categories
 * @access  Teacher
 */
exports.getAssignmentCategories = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    
    const categories = await assignmentService.getCategories(courseId, teacherId);
    
    return res.success(categories, 'Assignment categories retrieved successfully');
  } catch (error) {
    logger.error('Get assignment categories error:', error);
    next(error);
  }
};

/**
 * @desc    Create assignment category
 * @route   POST /api/teacher/courses/:courseId/categories
 * @access  Teacher
 */
exports.createAssignmentCategory = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    const categoryData = req.body;
    
    const category = await assignmentService.createCategory(courseId, categoryData, teacherId);
    
    return res.success(category, 'Assignment category created successfully');
  } catch (error) {
    logger.error('Create assignment category error:', error);
    next(error);
  }
};

/**
 * @desc    Update assignment category
 * @route   PUT /api/teacher/categories/:id
 * @access  Teacher
 */
exports.updateAssignmentCategory = async (req, res, next) => {
  try {
    const categoryId = req.params.id;
    const teacherId = req.user.id;
    const categoryData = req.body;
    
    const category = await assignmentService.updateCategory(categoryId, categoryData, teacherId);
    
    return res.success(category, 'Assignment category updated successfully');
  } catch (error) {
    logger.error('Update assignment category error:', error);
    next(error);
  }
};

/**
 * @desc    Get student profile
 * @route   GET /api/teacher/students/:id
 * @access  Teacher
 */
exports.getStudentProfile = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const teacherId = req.user.id;
    
    const profile = await studentManagementService.getStudentProfile(studentId, teacherId);
    
    return res.success(profile, 'Student profile retrieved successfully');
  } catch (error) {
    logger.error('Get student profile error:', error);
    next(error);
  }
};

/**
 * @desc    Get student submissions
 * @route   GET /api/teacher/students/:id/submissions
 * @access  Teacher
 */
exports.getStudentSubmissions = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const teacherId = req.user.id;
    
    const submissions = await submissionService.getStudentSubmissions(studentId, teacherId);
    
    return res.success(submissions, 'Student submissions retrieved successfully');
  } catch (error) {
    logger.error('Get student submissions error:', error);
    next(error);
  }
};

/**
 * @desc    Add student note
 * @route   POST /api/teacher/students/:id/notes
 * @access  Teacher
 */
exports.addStudentNote = async (req, res, next) => {
  try {
    const studentId = req.params.id;
    const teacherId = req.user.id;
    const noteData = req.body;
    
    const note = await studentManagementService.addStudentNote(studentId, noteData, teacherId);
    
    return res.success(note, 'Student note added successfully');
  } catch (error) {
    logger.error('Add student note error:', error);
    next(error);
  }
};

/**
 * @desc    Get course attendance
 * @route   GET /api/teacher/courses/:courseId/attendance
 * @access  Teacher
 */
exports.getCourseAttendance = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    
    const attendance = await courseManagementService.getCourseAttendance(courseId, teacherId);
    
    return res.success(attendance, 'Course attendance retrieved successfully');
  } catch (error) {
    logger.error('Get course attendance error:', error);
    next(error);
  }
};

/**
 * @desc    Record attendance
 * @route   POST /api/teacher/courses/:courseId/attendance
 * @access  Teacher
 */
exports.recordAttendance = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    const attendanceData = req.body;
    
    const attendance = await courseManagementService.recordAttendance(courseId, attendanceData, teacherId);
    
    return res.success(attendance, 'Attendance recorded successfully');
  } catch (error) {
    logger.error('Record attendance error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment submissions
 * @route   GET /api/teacher/assignments/:id/submissions
 * @access  Teacher
 */
exports.getAssignmentSubmissions = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const teacherId = req.user.id;
    
    const submissions = await submissionService.getAssignmentSubmissions(assignmentId, teacherId);
    
    return res.success(submissions, 'Assignment submissions retrieved successfully');
  } catch (error) {
    logger.error('Get assignment submissions error:', error);
    next(error);
  }
};

/**
 * @desc    Auto grade assignment
 * @route   POST /api/teacher/assignments/:id/auto-grade
 * @access  Teacher
 */
exports.autoGradeAssignment = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const teacherId = req.user.id;
    
    const result = await gradingService.autoGradeAssignment(assignmentId, teacherId);
    
    return res.success(result, 'Auto grading initiated successfully');
  } catch (error) {
    logger.error('Auto grade assignment error:', error);
    next(error);
  }
};

/**
 * @desc    Get grade appeals
 * @route   GET /api/teacher/grade-appeals
 * @access  Teacher
 */
exports.getGradeAppeals = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    
    const appeals = await gradingService.getGradeAppeals(teacherId);
    
    return res.success(appeals, 'Grade appeals retrieved successfully');
  } catch (error) {
    logger.error('Get grade appeals error:', error);
    next(error);
  }
};

/**
 * @desc    Handle grade appeal
 * @route   PUT /api/teacher/grade-appeals/:id
 * @access  Teacher
 */
exports.handleGradeAppeal = async (req, res, next) => {
  try {
    const appealId = req.params.id;
    const teacherId = req.user.id;
    const appealData = req.body;
    
    const result = await gradingService.handleGradeAppeal(appealId, appealData, teacherId);
    
    return res.success(result, 'Grade appeal handled successfully');
  } catch (error) {
    logger.error('Handle grade appeal error:', error);
    next(error);
  }
};

/**
 * @desc    Get class performance analytics
 * @route   GET /api/teacher/analytics/class-performance/:courseId
 * @access  Teacher
 */
exports.getClassPerformance = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    
    const performance = await analyticsService.getClassPerformance(courseId, teacherId);
    
    return res.success(performance, 'Class performance analytics retrieved successfully');
  } catch (error) {
    logger.error('Get class performance error:', error);
    next(error);
  }
};

/**
 * @desc    Get assignment difficulty analytics
 * @route   GET /api/teacher/analytics/assignment-difficulty/:assignmentId
 * @access  Teacher
 */
exports.getAssignmentDifficulty = async (req, res, next) => {
  try {
    const assignmentId = req.params.assignmentId;
    const teacherId = req.user.id;
    
    const difficulty = await analyticsService.getAssignmentDifficulty(assignmentId, teacherId);
    
    return res.success(difficulty, 'Assignment difficulty analytics retrieved successfully');
  } catch (error) {
    logger.error('Get assignment difficulty error:', error);
    next(error);
  }
};

/**
 * @desc    Get student progress analytics
 * @route   GET /api/teacher/analytics/student-progress/:courseId
 * @access  Teacher
 */
exports.getStudentProgressAnalytics = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    
    const progress = await analyticsService.getStudentProgressAnalytics(courseId, teacherId);
    
    return res.success(progress, 'Student progress analytics retrieved successfully');
  } catch (error) {
    logger.error('Get student progress analytics error:', error);
    next(error);
  }
};

/**
 * @desc    Get grading trends analytics
 * @route   GET /api/teacher/analytics/grading-trends
 * @access  Teacher
 */
exports.getGradingTrends = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    
    const trends = await analyticsService.getGradingTrends(teacherId);
    
    return res.success(trends, 'Grading trends analytics retrieved successfully');
  } catch (error) {
    logger.error('Get grading trends error:', error);
    next(error);
  }
};

/**
 * @desc    Generate course performance report
 * @route   GET /api/teacher/reports/course/:courseId/performance
 * @access  Teacher
 */
exports.generateCoursePerformanceReport = async (req, res, next) => {
  try {
    const courseId = req.params.courseId;
    const teacherId = req.user.id;
    
    const report = await reportService.generateCoursePerformanceReport(courseId, teacherId);
    
    return res.success(report, 'Course performance report generated successfully');
  } catch (error) {
    logger.error('Generate course performance report error:', error);
    next(error);
  }
};

/**
 * @desc    Generate assignment report
 * @route   GET /api/teacher/reports/assignment/:assignmentId/results
 * @access  Teacher
 */
exports.generateAssignmentReport = async (req, res, next) => {
  try {
    const assignmentId = req.params.assignmentId;
    const teacherId = req.user.id;
    
    const report = await reportService.generateAssignmentReport(assignmentId, teacherId);
    
    return res.success(report, 'Assignment report generated successfully');
  } catch (error) {
    logger.error('Generate assignment report error:', error);
    next(error);
  }
};

/**
 * @desc    Generate student progress report
 * @route   GET /api/teacher/reports/student/:studentId/progress
 * @access  Teacher
 */
exports.generateStudentProgressReport = async (req, res, next) => {
  try {
    const studentId = req.params.studentId;
    const teacherId = req.user.id;
    
    const report = await reportService.generateStudentProgressReport(studentId, teacherId);
    
    return res.success(report, 'Student progress report generated successfully');
  } catch (error) {
    logger.error('Generate student progress report error:', error);
    next(error);
  }
};

/**
 * @desc    Generate custom report
 * @route   POST /api/teacher/reports/custom
 * @access  Teacher
 */
exports.generateCustomReport = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const reportConfig = req.body;
    
    const report = await reportService.generateCustomReport(reportConfig, teacherId);
    
    return res.success(report, 'Custom report generated successfully');
  } catch (error) {
    logger.error('Generate custom report error:', error);
    next(error);
  }
};

/**
 * @desc    Get templates
 * @route   GET /api/teacher/templates
 * @access  Teacher
 */
exports.getTemplates = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    
    const templates = await assignmentService.getTemplates(teacherId);
    
    return res.success(templates, 'Templates retrieved successfully');
  } catch (error) {
    logger.error('Get templates error:', error);
    next(error);
  }
};

/**
 * @desc    Create template
 * @route   POST /api/teacher/templates
 * @access  Teacher
 */
exports.createTemplate = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const templateData = req.body;
    
    const template = await assignmentService.createTemplate(templateData, teacherId);
    
    return res.success(template, 'Template created successfully');
  } catch (error) {
    logger.error('Create template error:', error);
    next(error);
  }
};

/**
 * @desc    Update template
 * @route   PUT /api/teacher/templates/:id
 * @access  Teacher
 */
exports.updateTemplate = async (req, res, next) => {
  try {
    const templateId = req.params.id;
    const teacherId = req.user.id;
    const templateData = req.body;
    
    const template = await assignmentService.updateTemplate(templateId, templateData, teacherId);
    
    return res.success(template, 'Template updated successfully');
  } catch (error) {
    logger.error('Update template error:', error);
    next(error);
  }
};

/**
 * @desc    Batch grade submissions
 * @route   POST /api/teacher/assignments/:id/batch-grade
 * @access  Teacher
 */
exports.batchGradeSubmissions = async (req, res, next) => {
  try {
    const assignmentId = req.params.id;
    const teacherId = req.user.id;
    const gradingData = req.body;
    
    const result = await gradingService.batchGradeSubmissions(assignmentId, gradingData, teacherId);
    
    return res.success(result, 'Batch grading completed successfully');
  } catch (error) {
    logger.error('Batch grade submissions error:', error);
    next(error);
  }
};

/**
 * @desc    Batch update assignments
 * @route   PUT /api/teacher/assignments/batch-update
 * @access  Teacher
 */
exports.batchUpdateAssignments = async (req, res, next) => {
  try {
    const teacherId = req.user.id;
    const updateData = req.body;
    
    const result = await assignmentService.batchUpdateAssignments(updateData, teacherId);
    
    return res.success(result, 'Batch update completed successfully');
  } catch (error) {
    logger.error('Batch update assignments error:', error);
    next(error);
  }
};

// Add remaining controller implementations as needed...
