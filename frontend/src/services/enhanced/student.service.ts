import { apiCore } from '../core/api.core';
import {
  Assignment,
  Submission,
  Course,
  GradingResult,
  User,
  Notification,
  PerformanceMetrics,
  ApiResponse,
  FileUploadProgress,
} from '@/types';
import { AxiosResponse, AxiosRequestConfig } from 'axios';

export interface StudentDashboardData {
  assignments: Assignment[];
  recentGrades: Submission[];
  upcomingDeadlines: Assignment[];
  courses: Course[];
  notifications: Notification[];
  performance: PerformanceMetrics;
  analytics: {
    totalSubmissions: number;
    averageGrade: number;
    completionRate: number;
    streakDays: number;
  };
}

export interface SubmissionData {
  assignmentId: number;
  file?: File;
  submissionText?: string;
  metadata?: {
    browserInfo?: string;
    timestamp?: number;
    timeSpent?: number;
  };
}

export interface StudentProfileUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: File;
  preferences?: {
    emailNotifications: boolean;
    deadlineReminders: boolean;
    gradeNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
  };
}

export interface StudyMaterial {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'article' | 'quiz';
  url: string;
  description: string;
  estimatedTime: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  courseId: number;
}

export interface ProgressTracking {
  assignmentId: number;
  startTime: number;
  timeSpent: number;
  progress: number;
  lastSaved: number;
  autoSaveData?: any;
}

class EnhancedStudentService {
  private progressTracking: Map<number, ProgressTracking> = new Map();
  private autoSaveInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeWebSocketListeners();
    this.loadProgressFromStorage();
  }

  // Dashboard and Analytics
  async getDashboardData(useCache: boolean = true): Promise<StudentDashboardData> {
    const config: AxiosRequestConfig = {
      metadata: {
        endpoint: 'dashboard',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
        cacheKey: useCache ? 'student_dashboard' : undefined,
      },
    };

    const response = await apiCore.get<ApiResponse<StudentDashboardData>>('/student/dashboard', config);
    return response.data.data!;
  }

  async getAnalytics(dateRange?: { start: string; end: string }): Promise<any> {
    const params = dateRange ? { start: dateRange.start, end: dateRange.end } : {};
    
    const response = await apiCore.get<ApiResponse<any>>('/student/analytics', {
      params,
      metadata: {
        endpoint: 'analytics',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });
    
    return response.data.data!;
  }

  // Assignments with Enhanced Features
  async getAssignments(courseId?: number, filters?: {
    status?: 'pending' | 'completed' | 'overdue';
    sortBy?: 'deadline' | 'title' | 'created';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Assignment[]> {
    const params = {
      ...(courseId && { courseId }),
      ...filters,
    };

    const response = await apiCore.get<ApiResponse<Assignment[]>>('/student/assignments', {
      params,
      metadata: {
        endpoint: 'assignments',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `assignments_${JSON.stringify(params)}`,
      },
    });

    return response.data.data!;
  }

  async getAssignment(id: number): Promise<Assignment> {
    const response = await apiCore.get<ApiResponse<Assignment>>(`/student/assignments/${id}`, {
      metadata: {
        endpoint: 'assignment_detail',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `assignment_${id}`,
      },
    });

    return response.data.data!;
  }

  async getUpcomingDeadlines(limit: number = 10): Promise<Assignment[]> {
    const response = await apiCore.get<ApiResponse<Assignment[]>>('/student/assignments/upcoming', {
      params: { limit },
      metadata: {
        endpoint: 'upcoming_deadlines',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
        cacheKey: `upcoming_deadlines_${limit}`,
      },
    });

    return response.data.data!;
  }

  // Enhanced Submission Handling
  async submitAssignment(
    data: SubmissionData,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<Submission> {
    const formData = new FormData();
    formData.append('assignmentId', data.assignmentId.toString());
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    if (data.submissionText) {
      formData.append('submissionText', data.submissionText);
    }

    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      metadata: {
        endpoint: 'submit_assignment',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
        skipLoading: true, // We handle loading with progress
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress: FileUploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            filename: data.file?.name || 'submission',
            status: 'uploading',
          };
          onProgress(progress);
        }
      },
    };

    try {
      const response = await apiCore.post<ApiResponse<Submission>>('/student/submissions', formData, config);
      
      // Clear progress tracking for this assignment
      this.clearProgressTracking(data.assignmentId);
      
      // Show success progress
      if (onProgress) {
        onProgress({
          loaded: 100,
          total: 100,
          percentage: 100,
          filename: data.file?.name || 'submission',
          status: 'completed',
        });
      }

      return response.data.data!;
    } catch (error) {
      if (onProgress) {
        onProgress({
          loaded: 0,
          total: 100,
          percentage: 0,
          filename: data.file?.name || 'submission',
          status: 'error',
          error: 'Upload failed',
        });
      }
      throw error;
    }
  }

  async getSubmissions(assignmentId?: number, pagination?: {
    page: number;
    limit: number;
  }): Promise<Submission[]> {
    const params = {
      ...(assignmentId && { assignmentId }),
      ...pagination,
    };

    const response = await apiCore.get<ApiResponse<Submission[]>>('/student/submissions', {
      params,
      metadata: {
        endpoint: 'submissions',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `submissions_${JSON.stringify(params)}`,
      },
    });

    return response.data.data!;
  }

  async getSubmission(id: number): Promise<Submission> {
    const response = await apiCore.get<ApiResponse<Submission>>(`/student/submissions/${id}`, {
      metadata: {
        endpoint: 'submission_detail',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `submission_${id}`,
      },
    });

    return response.data.data!;
  }

  async resubmitAssignment(
    submissionId: number,
    data: SubmissionData,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<Submission> {
    const formData = new FormData();
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    if (data.submissionText) {
      formData.append('submissionText', data.submissionText);
    }

    if (data.metadata) {
      formData.append('metadata', JSON.stringify(data.metadata));
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      metadata: {
        endpoint: 'resubmit_assignment',
        method: 'PUT',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
        skipLoading: true,
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress: FileUploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            filename: data.file?.name || 'resubmission',
            status: 'uploading',
          };
          onProgress(progress);
        }
      },
    };

    const response = await apiCore.put<ApiResponse<Submission>>(
      `/student/submissions/${submissionId}`,
      formData,
      config
    );

    return response.data.data!;
  }

  // Grades and Feedback
  async getGrades(filters?: {
    courseId?: number;
    dateRange?: { start: string; end: string };
    minGrade?: number;
    maxGrade?: number;
  }): Promise<Submission[]> {
    const response = await apiCore.get<ApiResponse<Submission[]>>('/student/grades', {
      params: filters,
      metadata: {
        endpoint: 'grades',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `grades_${JSON.stringify(filters)}`,
      },
    });

    return response.data.data!;
  }

  async getGradeDetails(submissionId: number): Promise<GradingResult> {
    const response = await apiCore.get<ApiResponse<GradingResult>>(
      `/student/grades/${submissionId}`,
      {
        metadata: {
          endpoint: 'grade_details',
          method: 'GET',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'normal',
          cacheKey: `grade_details_${submissionId}`,
        },
      }
    );

    return response.data.data!;
  }

  async requestGradeReview(submissionId: number, reason: string): Promise<void> {
    await apiCore.post('/student/grades/review-request', {
      submissionId,
      reason,
    }, {
      metadata: {
        endpoint: 'grade_review_request',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });
  }

  // Performance and Progress
  async getPerformanceMetrics(courseId?: number): Promise<PerformanceMetrics> {
    const params = courseId ? { courseId } : {};
    
    const response = await apiCore.get<ApiResponse<PerformanceMetrics>>('/student/performance', {
      params,
      metadata: {
        endpoint: 'performance_metrics',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `performance_${courseId || 'all'}`,
      },
    });

    return response.data.data!;
  }

  async getProgressHistory(assignmentId?: number): Promise<any[]> {
    const params = assignmentId ? { assignmentId } : {};
    
    const response = await apiCore.get<ApiResponse<any[]>>('/student/progress', {
      params,
      metadata: {
        endpoint: 'progress_history',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `progress_${assignmentId || 'all'}`,
      },
    });

    return response.data.data!;
  }

  // Profile Management
  async getProfile(): Promise<User> {
    const response = await apiCore.get<ApiResponse<User>>('/student/profile', {
      metadata: {
        endpoint: 'profile',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: 'student_profile',
      },
    });

    return response.data.data!;
  }

  async updateProfile(data: StudentProfileUpdate): Promise<User> {
    let requestData: any = { ...data };
    
    // Handle file upload for avatar
    if (data.avatar) {
      const formData = new FormData();
      formData.append('avatar', data.avatar);
      
      // Upload avatar separately
      const avatarResponse = await apiCore.post<ApiResponse<{ avatarUrl: string }>>(
        '/student/profile/avatar',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          metadata: {
            endpoint: 'profile_avatar',
            method: 'POST',
            timestamp: Date.now(),
            retryCount: 0,
            priority: 'normal',
          },
        }
      );

      requestData = { ...data, avatarUrl: avatarResponse.data.data!.avatarUrl };
      delete requestData.avatar;
    }

    const response = await apiCore.put<ApiResponse<User>>('/student/profile', requestData, {
      metadata: {
        endpoint: 'profile_update',
        method: 'PUT',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    // Clear profile cache
    await apiCore.clearCache();

    return response.data.data!;
  }

  // Notifications
  async getNotifications(filters?: {
    read?: boolean;
    type?: string;
    limit?: number;
  }): Promise<Notification[]> {
    const response = await apiCore.get<ApiResponse<Notification[]>>('/student/notifications', {
      params: filters,
      metadata: {
        endpoint: 'notifications',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `notifications_${JSON.stringify(filters)}`,
      },
    });

    return response.data.data!;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await apiCore.put(`/student/notifications/${id}/read`, {}, {
      metadata: {
        endpoint: 'notification_read',
        method: 'PUT',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'low',
      },
    });

    // Clear notifications cache
    await this.clearNotificationsCache();
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await apiCore.put('/student/notifications/read-all', {}, {
      metadata: {
        endpoint: 'notifications_read_all',
        method: 'PUT',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'low',
      },
    });

    // Clear notifications cache
    await this.clearNotificationsCache();
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    const response = await apiCore.get<ApiResponse<Course[]>>('/student/courses', {
      metadata: {
        endpoint: 'courses',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: 'student_courses',
      },
    });

    return response.data.data!;
  }

  async getCourse(id: number): Promise<Course> {
    const response = await apiCore.get<ApiResponse<Course>>(`/student/courses/${id}`, {
      metadata: {
        endpoint: 'course_detail',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `course_${id}`,
      },
    });

    return response.data.data!;
  }

  async enrollInCourse(courseCode: string): Promise<void> {
    await apiCore.post('/student/courses/enroll', {
      courseCode,
    }, {
      metadata: {
        endpoint: 'course_enroll',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    // Clear courses cache
    await this.clearCoursesCache();
  }

  // Study Materials
  async getStudyMaterials(courseId: number, filters?: {
    type?: string;
    difficulty?: string;
    tags?: string[];
  }): Promise<StudyMaterial[]> {
    const params = {
      courseId,
      ...filters,
    };

    const response = await apiCore.get<ApiResponse<StudyMaterial[]>>('/student/study-materials', {
      params,
      metadata: {
        endpoint: 'study_materials',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `study_materials_${JSON.stringify(params)}`,
      },
    });

    return response.data.data!;
  }

  async bookmarkStudyMaterial(materialId: string): Promise<void> {
    await apiCore.post(`/student/study-materials/${materialId}/bookmark`, {}, {
      metadata: {
        endpoint: 'bookmark_material',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'low',
      },
    });
  }

  // Progress Tracking
  startProgressTracking(assignmentId: number): void {
    const tracking: ProgressTracking = {
      assignmentId,
      startTime: Date.now(),
      timeSpent: 0,
      progress: 0,
      lastSaved: Date.now(),
    };

    this.progressTracking.set(assignmentId, tracking);
    this.saveProgressToStorage();
    this.startAutoSave();
  }

  updateProgress(assignmentId: number, progress: number, autoSaveData?: any): void {
    const tracking = this.progressTracking.get(assignmentId);
    if (tracking) {
      const now = Date.now();
      tracking.timeSpent = now - tracking.startTime;
      tracking.progress = progress;
      tracking.lastSaved = now;
      tracking.autoSaveData = autoSaveData;

      this.progressTracking.set(assignmentId, tracking);
      this.saveProgressToStorage();
    }
  }

  getProgressTracking(assignmentId: number): ProgressTracking | null {
    return this.progressTracking.get(assignmentId) || null;
  }

  clearProgressTracking(assignmentId: number): void {
    this.progressTracking.delete(assignmentId);
    this.saveProgressToStorage();
  }

  // File Operations
  async uploadFile(
    file: File,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      metadata: {
        endpoint: 'file_upload',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        skipLoading: true,
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress: FileUploadProgress = {
            loaded: progressEvent.loaded,
            total: progressEvent.total,
            percentage: Math.round((progressEvent.loaded * 100) / progressEvent.total),
            filename: file.name,
            status: 'uploading',
          };
          onProgress(progress);
        }
      },
    };

    const response = await apiCore.post<ApiResponse<{ filePath: string }>>(
      '/student/upload',
      formData,
      config
    );

    return response.data.data!.filePath;
  }

  // Support and Help
  async submitSupportRequest(data: {
    subject: string;
    message: string;
    category: string;
    priority?: 'low' | 'normal' | 'high';
    attachments?: File[];
  }): Promise<void> {
    let requestData: any = { ...data };

    // Upload attachments if any
    if (data.attachments && data.attachments.length > 0) {
      const attachmentUrls = await Promise.all(
        data.attachments.map(file => this.uploadFile(file))
      );
      requestData.attachments = attachmentUrls;
    }

    await apiCore.post('/student/support', requestData, {
      metadata: {
        endpoint: 'support_request',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });
  }

  async getFAQs(category?: string): Promise<any[]> {
    const params = category ? { category } : {};
    
    const response = await apiCore.get<ApiResponse<any[]>>('/student/faqs', {
      params,
      metadata: {
        endpoint: 'faqs',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `faqs_${category || 'all'}`,
      },
    });

    return response.data.data!;
  }

  // Utility Methods
  private async clearNotificationsCache(): Promise<void> {
    // Clear specific notification-related cache entries
    // Implementation would depend on cache key patterns
  }

  private async clearCoursesCache(): Promise<void> {
    // Clear specific course-related cache entries
  }

  private initializeWebSocketListeners(): void {
    // Listen for real-time updates
    apiCore.subscribeToWebSocket('submission:status', (data) => {
      console.log('Submission status update:', data);
    });

    apiCore.subscribeToWebSocket('grading:complete', (data) => {
      console.log('Grading complete:', data);
    });

    apiCore.subscribeToWebSocket('notification:new', (data) => {
      console.log('New notification:', data);
    });
  }

  private loadProgressFromStorage(): void {
    try {
      const stored = localStorage.getItem('student_progress_tracking');
      if (stored) {
        const data = JSON.parse(stored);
        this.progressTracking = new Map(data);
      }
    } catch (error) {
      console.error('Failed to load progress tracking from storage:', error);
    }
  }

  private saveProgressToStorage(): void {
    try {
      const data = Array.from(this.progressTracking.entries());
      localStorage.setItem('student_progress_tracking', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save progress tracking to storage:', error);
    }
  }

  private startAutoSave(): void {
    if (this.autoSaveInterval) {
      return; // Already running
    }

    this.autoSaveInterval = setInterval(() => {
      this.saveProgressToStorage();
    }, 30000); // Save every 30 seconds
  }

  private stopAutoSave(): void {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Cleanup
  destroy(): void {
    this.stopAutoSave();
    this.progressTracking.clear();
  }
}

export const enhancedStudentService = new EnhancedStudentService();
export default enhancedStudentService;
