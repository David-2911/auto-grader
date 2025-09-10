import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { store } from '@/store';
import { logout } from '@/store/slices/authSlice';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const state = store.getState();
    const token = state.auth.token;
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login';
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Generic API service class
export class ApiService {
  static async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.get<T>(url, config);
    return response.data;
  }

  static async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post<T>(url, data, config);
    return response.data;
  }

  static async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put<T>(url, data, config);
    return response.data;
  }

  static async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.patch<T>(url, data, config);
    return response.data;
  }

  static async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete<T>(url, config);
    return response.data;
  }

  // File upload helper
  static async uploadFile<T>(
    url: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    };

    const response = await api.post<T>(url, formData, config);
    return response.data;
  }

  // Download file helper
  static async downloadFile(url: string, filename?: string): Promise<void> {
    const response = await api.get(url, {
      responseType: 'blob',
    });

    const blob = new Blob([response.data]);
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename || 'download';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  }
}

// Specific service classes
export class AuthService extends ApiService {
  static async login(credentials: { email: string; password: string }) {
    return this.post('/auth/login', credentials);
  }

  static async register(userData: any) {
    return this.post('/auth/register', userData);
  }

  static async forgotPassword(email: string) {
    return this.post('/auth/forgot-password', { email });
  }

  static async resetPassword(token: string, password: string) {
    return this.post('/auth/reset-password', { token, password });
  }

  static async getCurrentUser() {
    return this.get('/auth/me');
  }

  static async refreshToken() {
    return this.post('/auth/refresh');
  }
}

export class CourseService extends ApiService {
  static async getCourses(params?: any) {
    return this.get('/courses', { params });
  }

  static async getCourseById(id: number) {
    return this.get(`/courses/${id}`);
  }

  static async createCourse(courseData: any) {
    return this.post('/courses', courseData);
  }

  static async updateCourse(id: number, courseData: any) {
    return this.put(`/courses/${id}`, courseData);
  }

  static async deleteCourse(id: number) {
    return this.delete(`/courses/${id}`);
  }

  static async enrollStudent(courseId: number, studentId: number) {
    return this.post(`/courses/${courseId}/enroll`, { studentId });
  }
}

export class AssignmentService extends ApiService {
  static async getAssignments(params?: any) {
    return this.get('/assignments', { params });
  }

  static async getAssignmentById(id: number) {
    return this.get(`/assignments/${id}`);
  }

  static async createAssignment(assignmentData: any) {
    return this.post('/assignments', assignmentData);
  }

  static async updateAssignment(id: number, assignmentData: any) {
    return this.put(`/assignments/${id}`, assignmentData);
  }

  static async deleteAssignment(id: number) {
    return this.delete(`/assignments/${id}`);
  }
}

export class SubmissionService extends ApiService {
  static async getSubmissions(params?: any) {
    return this.get('/submissions', { params });
  }

  static async getSubmissionById(id: number) {
    return this.get(`/submissions/${id}`);
  }

  static async createSubmission(formData: FormData) {
    return this.post('/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  static async gradeSubmission(id: number, gradeData: any) {
    return this.put(`/submissions/${id}/grade`, gradeData);
  }

  static async downloadSubmission(id: number) {
    return this.downloadFile(`/submissions/${id}/download`);
  }
}

export class UserService extends ApiService {
  static async getUsers(params?: any) {
    return this.get('/users', { params });
  }

  static async getUserById(id: number) {
    return this.get(`/users/${id}`);
  }

  static async updateUser(id: number, userData: any) {
    return this.put(`/users/${id}`, userData);
  }

  static async deleteUser(id: number) {
    return this.delete(`/users/${id}`);
  }

  static async updateProfile(profileData: any) {
    return this.put('/users/profile', profileData);
  }

  static async changePassword(passwordData: any) {
    return this.put('/users/change-password', passwordData);
  }
}

export default api;
