import axios from 'axios';

// Create an axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add a response interceptor to handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      // Clear localStorage and redirect to login
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Auth API services
 */
export const authService = {
  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.email - User email
   * @param {string} credentials.password - User password
   * @returns {Promise<Object>} Login response with token and user data
   */
  login: (credentials) => api.post('/auth/login', credentials),

  /**
   * Register student
   * @param {Object} userData - Student registration data
   * @returns {Promise<Object>} Registration response
   */
  registerStudent: (userData) => api.post('/auth/register/student', userData),

  /**
   * Register teacher
   * @param {Object} userData - Teacher registration data
   * @returns {Promise<Object>} Registration response
   */
  registerTeacher: (userData) => api.post('/auth/register/teacher', userData),

  /**
   * Forgot password
   * @param {Object} data - Forgot password data
   * @param {string} data.email - User email
   * @returns {Promise<Object>} Response
   */
  forgotPassword: (data) => api.post('/auth/forgot-password', data),

  /**
   * Reset password
   * @param {Object} data - Reset password data
   * @param {string} data.token - Reset token
   * @param {string} data.newPassword - New password
   * @returns {Promise<Object>} Response
   */
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

/**
 * User API services
 */
export const userService = {
  /**
   * Get current user profile
   * @returns {Promise<Object>} User profile
   */
  getProfile: () => api.get('/users/profile'),

  /**
   * Update user profile
   * @param {Object} profileData - Profile data to update
   * @returns {Promise<Object>} Updated profile
   */
  updateProfile: (profileData) => api.put('/users/profile', profileData),

  /**
   * Change password
   * @param {Object} passwordData - Password change data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise<Object>} Response
   */
  changePassword: (passwordData) => api.post('/users/change-password', passwordData),
};

/**
 * Course API services
 */
export const courseService = {
  /**
   * Get all courses
   * @returns {Promise<Object>} Courses list
   */
  getCourses: () => api.get('/courses'),

  /**
   * Get course by ID
   * @param {number} id - Course ID
   * @returns {Promise<Object>} Course details
   */
  getCourse: (id) => api.get(`/courses/${id}`),

  /**
   * Create new course (teacher only)
   * @param {Object} courseData - Course data
   * @returns {Promise<Object>} Created course
   */
  createCourse: (courseData) => api.post('/courses', courseData),

  /**
   * Update course (teacher only)
   * @param {number} id - Course ID
   * @param {Object} courseData - Course data to update
   * @returns {Promise<Object>} Updated course
   */
  updateCourse: (id, courseData) => api.put(`/courses/${id}`, courseData),

  /**
   * Delete course (teacher only)
   * @param {number} id - Course ID
   * @returns {Promise<Object>} Response
   */
  deleteCourse: (id) => api.delete(`/courses/${id}`),

  /**
   * Enroll student in course
   * @param {number} courseId - Course ID
   * @returns {Promise<Object>} Response
   */
  enrollInCourse: (courseId) => api.post(`/courses/${courseId}/enroll`),
};

/**
 * Assignment API services
 */
export const assignmentService = {
  /**
   * Get all assignments
   * @returns {Promise<Object>} Assignments list
   */
  getAssignments: () => api.get('/assignments'),

  /**
   * Get assignments for a course
   * @param {number} courseId - Course ID
   * @returns {Promise<Object>} Course assignments
   */
  getCourseAssignments: (courseId) => api.get(`/courses/${courseId}/assignments`),

  /**
   * Get assignment by ID
   * @param {number} id - Assignment ID
   * @returns {Promise<Object>} Assignment details
   */
  getAssignment: (id) => api.get(`/assignments/${id}`),

  /**
   * Create new assignment (teacher only)
   * @param {FormData} assignmentData - Assignment data including PDF file
   * @returns {Promise<Object>} Created assignment
   */
  createAssignment: (assignmentData) => 
    api.post('/assignments', assignmentData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * Update assignment (teacher only)
   * @param {number} id - Assignment ID
   * @param {FormData} assignmentData - Assignment data to update
   * @returns {Promise<Object>} Updated assignment
   */
  updateAssignment: (id, assignmentData) => 
    api.put(`/assignments/${id}`, assignmentData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * Delete assignment (teacher only)
   * @param {number} id - Assignment ID
   * @returns {Promise<Object>} Response
   */
  deleteAssignment: (id) => api.delete(`/assignments/${id}`),

  /**
   * Download assignment question PDF
   * @param {number} id - Assignment ID
   * @returns {Promise<Blob>} PDF file as blob
   */
  downloadQuestionPdf: (id) => 
    api.get(`/assignments/${id}/question-pdf`, {
      responseType: 'blob',
    }),
};

/**
 * Submission API services
 */
export const submissionService = {
  /**
   * Get submissions for an assignment (teacher) or current user (student)
   * @param {number} assignmentId - Assignment ID
   * @returns {Promise<Object>} Submissions list
   */
  getSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),

  /**
   * Get submission by ID
   * @param {number} id - Submission ID
   * @returns {Promise<Object>} Submission details
   */
  getSubmission: (id) => api.get(`/submissions/${id}`),

  /**
   * Submit an assignment (student only)
   * @param {number} assignmentId - Assignment ID
   * @param {FormData} submissionData - Submission data including PDF file
   * @returns {Promise<Object>} Created submission
   */
  submitAssignment: (assignmentId, submissionData) => 
    api.post(`/assignments/${assignmentId}/submit`, submissionData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  /**
   * Grade a submission (teacher only)
   * @param {number} id - Submission ID
   * @param {Object} gradingData - Grading data
   * @param {number} gradingData.grade - Grade
   * @param {string} gradingData.feedback - Feedback
   * @returns {Promise<Object>} Updated submission
   */
  gradeSubmission: (id, gradingData) => api.post(`/submissions/${id}/grade`, gradingData),

  /**
   * Download submission PDF
   * @param {number} id - Submission ID
   * @returns {Promise<Blob>} PDF file as blob
   */
  downloadSubmissionPdf: (id) => 
    api.get(`/submissions/${id}/pdf`, {
      responseType: 'blob',
    }),
};

export default api;
