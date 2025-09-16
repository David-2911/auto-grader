/**
 * User model interfaces
 */

/**
 * @typedef {Object} User
 * @property {number} id - User ID
 * @property {string} email - User email
 * @property {string} role - User role (student, teacher, admin)
 * @property {string} identifier - User identifier (student ID, staff ID, etc.)
 * @property {string} firstName - User first name
 * @property {string} lastName - User last name
 */

/**
 * @typedef {Object} Course
 * @property {number} id - Course ID
 * @property {string} code - Course code
 * @property {string} title - Course title
 * @property {string} description - Course description
 * @property {number} teacherId - Teacher ID
 */

/**
 * @typedef {Object} Assignment
 * @property {number} id - Assignment ID
 * @property {string} title - Assignment title
 * @property {string} description - Assignment description
 * @property {number} courseId - Course ID
 * @property {string} deadline - Assignment deadline
 * @property {number} totalPoints - Total points possible
 * @property {string} questionPdf - Path to question PDF
 */

/**
 * @typedef {Object} Submission
 * @property {number} id - Submission ID
 * @property {number} assignmentId - Assignment ID
 * @property {number} studentId - Student ID
 * @property {string} submissionPdf - Path to submission PDF
 * @property {number|null} grade - Submission grade
 * @property {string|null} feedback - Feedback on submission
 * @property {string} submissionTime - Submission timestamp
 * @property {boolean} isAutoGraded - Whether the submission was auto-graded
 */

export {};
