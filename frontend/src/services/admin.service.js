import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Create an axios instance with admin API base URL
const adminApi: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to add auth token
adminApi.interceptors.request.use(
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
adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors (token expired or invalid)
    if (error.response && error.response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/**
 * Admin Dashboard API services
 */
export const adminService = {
  // Dashboard Statistics
  getDashboardStats: () => adminApi.get('/admin/dashboard'),

  // User Management
  getAllUsers: (params = {}) => adminApi.get('/admin/users', { params }),
  getUserById: (id) => adminApi.get(`/admin/users/${id}`),
  updateUser: (id, userData) => adminApi.put(`/admin/users/${id}`, userData),
  deleteUser: (id) => adminApi.delete(`/admin/users/${id}`),
  deactivateUser: (id) => adminApi.post(`/admin/users/${id}/deactivate`),
  activateUser: (id) => adminApi.post(`/admin/users/${id}/activate`),
  bulkImportUsers: (userData) => adminApi.post('/admin/users/bulk-import', userData),
  exportUsers: (params = {}) => adminApi.get('/admin/users/export', { 
    params,
    responseType: 'blob'
  }),

  // Course Management
  getAllCourses: (params = {}) => adminApi.get('/admin/courses', { params }),
  getCourseById: (id) => adminApi.get(`/admin/courses/${id}`),
  updateCourse: (id, courseData) => adminApi.put(`/admin/courses/${id}`, courseData),
  deleteCourse: (id) => adminApi.delete(`/admin/courses/${id}`),
  archiveCourse: (id) => adminApi.post(`/admin/courses/${id}/archive`),
  unarchiveCourse: (id) => adminApi.post(`/admin/courses/${id}/unarchive`),

  // Assignment Management
  getAllAssignments: (params = {}) => adminApi.get('/admin/assignments', { params }),
  getAssignmentById: (id) => adminApi.get(`/admin/assignments/${id}`),
  updateAssignment: (id, assignmentData) => adminApi.put(`/admin/assignments/${id}`, assignmentData),
  deleteAssignment: (id) => adminApi.delete(`/admin/assignments/${id}`),

  // Analytics
  getUserAnalytics: (params = {}) => adminApi.get('/admin/analytics/users', { params }),
  getCourseAnalytics: (params = {}) => adminApi.get('/admin/analytics/courses', { params }),
  getAssignmentAnalytics: (params = {}) => adminApi.get('/admin/analytics/assignments', { params }),
  getSubmissionAnalytics: (params = {}) => adminApi.get('/admin/analytics/submissions', { params }),
  getGradingAnalytics: (params = {}) => adminApi.get('/admin/analytics/grading', { params }),

  // System Monitoring
  getSystemStatus: () => adminApi.get('/admin/system/status'),
  getSystemLogs: (params = {}) => adminApi.get('/admin/system/logs', { params }),
  getSystemPerformance: (params = {}) => adminApi.get('/admin/system/performance', { params }),
  getDatabaseStats: () => adminApi.get('/admin/system/database'),

  // ML Model Management
  getAllModels: (params = {}) => adminApi.get('/admin/ml/models', { params }),
  getModelById: (id) => adminApi.get(`/admin/ml/models/${id}`),
  updateModel: (id, modelData) => adminApi.put(`/admin/ml/models/${id}`, modelData),
  activateModel: (id) => adminApi.post(`/admin/ml/models/${id}/activate`),
  deactivateModel: (id) => adminApi.post(`/admin/ml/models/${id}/deactivate`),
  getModelAnalytics: (params = {}) => adminApi.get('/admin/ml/analytics', { params }),

  // Configuration Management
  getAllConfigs: () => adminApi.get('/admin/config'),
  getConfigByKey: (key) => adminApi.get(`/admin/config/${key}`),
  updateConfig: (key, configData) => adminApi.put(`/admin/config/${key}`, configData),
  createConfig: (configData) => adminApi.post('/admin/config', configData),
  deleteConfig: (key) => adminApi.delete(`/admin/config/${key}`),

  // Audit and Security
  getAuditLogs: (params = {}) => adminApi.get('/admin/audit/logs', { params }),
  getSecurityLogs: (params = {}) => adminApi.get('/admin/audit/security', { params }),
  getAuthLogs: (params = {}) => adminApi.get('/admin/audit/auth', { params }),

  // Data Export and Backup
  exportSystemData: (exportData) => adminApi.post('/admin/export/data', exportData, {
    responseType: 'blob'
  }),
  getBackupStatus: () => adminApi.get('/admin/backup/status'),
  createBackup: (backupData) => adminApi.post('/admin/backup/create', backupData),
  restoreBackup: (id) => adminApi.post(`/admin/backup/restore/${id}`),
};

export default adminService;
