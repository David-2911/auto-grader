import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Enhanced Type definitions
export interface ActivityLog {
  id: number;
  userId: number;
  userEmail: string;
  action: string;
  resource: string;
  details: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

export interface SystemMetrics {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  activeConnections: number;
  responseTime: number;
}

export interface SystemAlert {
  id: number;
  type: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalAssignments: number;
  totalSubmissions: number;
  pendingGrades: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    uptime: number;
    serverVersion: string;
  };
  recentActivity: ActivityLog[];
  quickStats: {
    activeUsers: number;
    todaySubmissions: number;
    processingQueue: number;
    errorRate: number;
  };
}

export interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'teacher' | 'student';
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  loginCount: number;
  department?: string;
  permissions?: string[];
  avatar?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  timezone: string;
}

export interface Course {
  id: number;
  title: string;
  description: string;
  teacherId: number;
  teacherName: string;
  studentsCount: number;
  assignmentsCount: number;
  status: 'active' | 'archived' | 'draft';
  createdAt: string;
  updatedAt: string;
  semester: string;
  department: string;
  credits: number;
}

export interface Assignment {
  id: number;
  title: string;
  courseId: number;
  courseName: string;
  teacherId: number;
  teacherName: string;
  submissionsCount: number;
  gradedCount: number;
  status: 'active' | 'archived' | 'draft';
  dueDate: string;
  createdAt: string;
  type: 'homework' | 'quiz' | 'exam' | 'project';
  totalPoints: number;
}

}

export interface MLModel {
  id: number;
  name: string;
  type: string;
  version: string;
  status: 'active' | 'inactive' | 'training';
  accuracy: number;
  lastTrainedAt: string;
  createdAt: string;
}

export interface SystemConfig {
  key: string;
  value: any;
  type: 'string' | 'number' | 'boolean' | 'json';
  description: string;
  category: string;
  updatedAt: string;
  updatedBy: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface BulkOperationResult {
  success: any[];
  errors: any[];
  totalProcessed: number;
}

// Create an axios instance with admin API base URL
const adminApi: AxiosInstance = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api',
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
  getDashboardStats: (): Promise<AxiosResponse<DashboardStats>> => adminApi.get('/admin/dashboard'),
  getSystemMetrics: (): Promise<AxiosResponse<SystemMetrics[]>> => adminApi.get('/admin/system/metrics'),
  getSystemStatus: (): Promise<AxiosResponse<any>> => adminApi.get('/admin/system/status'),
  getSystemAlerts: (): Promise<AxiosResponse<SystemAlert[]>> => adminApi.get('/admin/system/alerts'),
  acknowledgeAlert: (alertId: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/system/alerts/${alertId}/acknowledge`),

  // User Management
  getAllUsers: (params: any = {}): Promise<AxiosResponse<PaginatedResponse<User>>> => adminApi.get('/admin/users', { params }),
  getUserById: (id: number): Promise<AxiosResponse<User>> => adminApi.get(`/admin/users/${id}`),
  createUser: (userData: Partial<User>): Promise<AxiosResponse<User>> => adminApi.post('/admin/users', userData),
  updateUser: (id: number, userData: Partial<User>): Promise<AxiosResponse<User>> => adminApi.put(`/admin/users/${id}`, userData),
  deleteUser: (id: number): Promise<AxiosResponse<any>> => adminApi.delete(`/admin/users/${id}`),
  bulkImportUsers: (users: Partial<User>[], options: any): Promise<AxiosResponse<BulkOperationResult>> => adminApi.post('/admin/users/bulk-import', { users, options }),
  bulkUpdateUsers: (userIds: number[], updates: Partial<User>): Promise<AxiosResponse<BulkOperationResult>> => adminApi.post('/admin/users/bulk-update', { userIds, updates }),
  exportUsers: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/users/export', { params }),
  resetUserPassword: (id: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/users/${id}/reset-password`),
  suspendUser: (id: number, reason: string): Promise<AxiosResponse<any>> => adminApi.post(`/admin/users/${id}/suspend`, { reason }),
  unsuspendUser: (id: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/users/${id}/unsuspend`),

  // Course Management
  getAllCourses: (params: any = {}): Promise<AxiosResponse<PaginatedResponse<Course>>> => adminApi.get('/admin/courses', { params }),
  getCourseById: (id: number): Promise<AxiosResponse<Course>> => adminApi.get(`/admin/courses/${id}`),
  updateCourse: (id: number, courseData: Partial<Course>): Promise<AxiosResponse<Course>> => adminApi.put(`/admin/courses/${id}`, courseData),
  deleteCourse: (id: number): Promise<AxiosResponse<any>> => adminApi.delete(`/admin/courses/${id}`),
  archiveCourse: (id: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/courses/${id}/archive`),
  unarchiveCourse: (id: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/courses/${id}/unarchive`),

  // Assignment Management
  getAllAssignments: (params: any = {}): Promise<AxiosResponse<PaginatedResponse<Assignment>>> => adminApi.get('/admin/assignments', { params }),
  getAssignmentById: (id: number): Promise<AxiosResponse<Assignment>> => adminApi.get(`/admin/assignments/${id}`),
  updateAssignment: (id: number, assignmentData: Partial<Assignment>): Promise<AxiosResponse<Assignment>> => adminApi.put(`/admin/assignments/${id}`, assignmentData),
  deleteAssignment: (id: number): Promise<AxiosResponse<any>> => adminApi.delete(`/admin/assignments/${id}`),

  // Analytics
  getAnalytics: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/analytics', { params }),
  getUserAnalytics: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/analytics/users', { params }),
  getCourseAnalytics: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/analytics/courses', { params }),
  getSubmissionAnalytics: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/analytics/submissions', { params }),
  getPerformanceAnalytics: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/analytics/performance', { params }),

  // ML Model Management
  getAllModels: (): Promise<AxiosResponse<MLModel[]>> => adminApi.get('/admin/ml/models'),
  getModelById: (id: number): Promise<AxiosResponse<MLModel>> => adminApi.get(`/admin/ml/models/${id}`),
  updateModel: (id: number, modelData: Partial<MLModel>): Promise<AxiosResponse<MLModel>> => adminApi.put(`/admin/ml/models/${id}`, modelData),
  activateModel: (id: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/ml/models/${id}/activate`),
  deactivateModel: (id: number): Promise<AxiosResponse<any>> => adminApi.post(`/admin/ml/models/${id}/deactivate`),
  trainModel: (id: number, params: any): Promise<AxiosResponse<any>> => adminApi.post(`/admin/ml/models/${id}/train`, params),

  // Configuration Management
  getAllConfigs: (): Promise<AxiosResponse<SystemConfig[]>> => adminApi.get('/admin/config'),
  getConfigByKey: (key: string): Promise<AxiosResponse<SystemConfig>> => adminApi.get(`/admin/config/${key}`),
  updateConfig: (key: string, configData: Partial<SystemConfig>): Promise<AxiosResponse<SystemConfig>> => adminApi.put(`/admin/config/${key}`, configData),

  // Audit Logs
  getAuditLogs: (params: any = {}): Promise<AxiosResponse<PaginatedResponse<ActivityLog>>> => adminApi.get('/admin/audit-logs', { params }),
  exportAuditLogs: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/audit-logs/export', { params }),

  // Data Export and Backup
  exportData: (params: any = {}): Promise<AxiosResponse<any>> => adminApi.get('/admin/export', { params }),
  createBackup: (): Promise<AxiosResponse<any>> => adminApi.post('/admin/backup'),
  getBackups: (): Promise<AxiosResponse<any>> => adminApi.get('/admin/backups'),
  restoreBackup: (backupId: string): Promise<AxiosResponse<any>> => adminApi.post(`/admin/backups/${backupId}/restore`),
  deleteBackup: (backupId: string): Promise<AxiosResponse<any>> => adminApi.delete(`/admin/backups/${backupId}`),

    // Notifications
  sendNotification: (notificationData: any): Promise<AxiosResponse<any>> => adminApi.post('/admin/notifications', notificationData),
  getNotificationTemplates: (): Promise<AxiosResponse<any>> => adminApi.get('/admin/notification-templates'),
  createNotificationTemplate: (templateData: any): Promise<AxiosResponse<any>> => adminApi.post('/admin/notification-templates', templateData),
};
};

/**
 * Admin Dashboard API services
 */
export const adminService = {
  // Dashboard Statistics
  getDashboardStats: (): Promise<AxiosResponse<DashboardStats>> => adminApi.get('/admin/dashboard'),

  // User Management
  getAllUsers: (params: any = {}): Promise<AxiosResponse<User[]>> => adminApi.get('/admin/users', { params }),
  getUserById: (id: number): Promise<AxiosResponse<User>> => adminApi.get(`/admin/users/${id}`),
  updateUser: (id: number, userData: Partial<User>): Promise<AxiosResponse<User>> => adminApi.put(`/admin/users/${id}`, userData),
  deleteUser: (id: number): Promise<AxiosResponse<void>> => adminApi.delete(`/admin/users/${id}`),
  deactivateUser: (id: number): Promise<AxiosResponse<void>> => adminApi.post(`/admin/users/${id}/deactivate`),
  activateUser: (id: number): Promise<AxiosResponse<void>> => adminApi.post(`/admin/users/${id}/activate`),
  bulkImportUsers: (userData: any): Promise<AxiosResponse<any>> => adminApi.post('/admin/users/bulk-import', userData),
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
