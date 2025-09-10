import { apiCore } from '../core/api.core';
import {
  Assignment,
  Submission,
  Course,
  User,
  ApiResponse,
  FileUploadProgress,
} from '@/types';
import { AxiosRequestConfig } from 'axios';

export interface TeacherDashboardData {
  courses: Course[];
  recentSubmissions: Submission[];
  pendingGrading: Submission[];
  assignments: Assignment[];
  students: User[];
  analytics: {
    totalCourses: number;
    totalStudents: number;
    totalAssignments: number;
    pendingGradingCount: number;
    averageGradeThisWeek: number;
    submissionRate: number;
  };
}

export interface AssignmentCreateData {
  title: string;
  description: string;
  courseId: number;
  deadline: string;
  totalPoints: number;
  maxSubmissions?: number;
  allowedFileTypes?: string[];
  instructions?: string;
  questionFile?: File;
  rubric?: GradingRubric;
  settings?: AssignmentSettings;
}

export interface AssignmentSettings {
  allowLateSubmissions: boolean;
  latePenalty?: number;
  autoGrading: boolean;
  plagiarismCheck: boolean;
  anonymousGrading: boolean;
  groupAssignment: boolean;
  maxGroupSize?: number;
  visibleToStudents: boolean;
  lockAfterDeadline: boolean;
}

export interface GradingRubric {
  id?: string;
  name: string;
  criteria: GradingCriterion[];
  totalPoints: number;
  description?: string;
}

export interface GradingCriterion {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  weight?: number;
  levels: GradingLevel[];
}

export interface GradingLevel {
  id: string;
  name: string;
  description: string;
  points: number;
}

export interface GradingData {
  submissionId: number;
  score: number;
  feedback: string;
  criteriaGrades?: {
    criterionId: string;
    score: number;
    feedback?: string;
  }[];
  isComplete: boolean;
  returnToStudent: boolean;
}

export interface CourseCreateData {
  code: string;
  title: string;
  description?: string;
  department?: string;
  credits?: number;
  startDate?: string;
  endDate?: string;
  enrollmentLimit?: number;
  isPublic?: boolean;
}

export interface BulkGradingData {
  submissionIds: number[];
  score?: number;
  feedback?: string;
  operation: 'grade' | 'return' | 'download';
}

export interface ClassAnalytics {
  courseId: number;
  gradeDistribution: {
    grade: string;
    count: number;
    percentage: number;
  }[];
  submissionStats: {
    total: number;
    onTime: number;
    late: number;
    missing: number;
  };
  performanceMetrics: {
    averageGrade: number;
    median: number;
    standardDeviation: number;
    passRate: number;
  };
  timeAnalytics: {
    averageTimeToSubmit: number;
    peakSubmissionTimes: string[];
  };
}

class EnhancedTeacherService {
  constructor() {
    this.initializeWebSocketListeners();
  }

  // Dashboard and Analytics
  async getDashboardData(useCache: boolean = true): Promise<TeacherDashboardData> {
    const config: AxiosRequestConfig = {
      metadata: {
        endpoint: 'teacher_dashboard',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
        cacheKey: useCache ? 'teacher_dashboard' : undefined,
      },
    };

    const response = await apiCore.get<ApiResponse<TeacherDashboardData>>('/teacher/dashboard', config);
    return response.data.data!;
  }

  async getClassAnalytics(courseId: number, dateRange?: {
    start: string;
    end: string;
  }): Promise<ClassAnalytics> {
    const params = dateRange ? { start: dateRange.start, end: dateRange.end } : {};
    
    const response = await apiCore.get<ApiResponse<ClassAnalytics>>(
      `/teacher/courses/${courseId}/analytics`,
      {
        params,
        metadata: {
          endpoint: 'class_analytics',
          method: 'GET',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'normal',
          cacheKey: `analytics_${courseId}_${JSON.stringify(params)}`,
        },
      }
    );

    return response.data.data!;
  }

  async exportClassData(courseId: number, format: 'csv' | 'xlsx' | 'pdf' = 'csv'): Promise<Blob> {
    const response = await apiCore.get(`/teacher/courses/${courseId}/export`, {
      params: { format },
      responseType: 'blob',
      metadata: {
        endpoint: 'class_export',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    return response.data;
  }

  // Course Management
  async getCourses(filters?: {
    semester?: string;
    year?: number;
    status?: 'active' | 'archived' | 'draft';
  }): Promise<Course[]> {
    const response = await apiCore.get<ApiResponse<Course[]>>('/teacher/courses', {
      params: filters,
      metadata: {
        endpoint: 'teacher_courses',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `teacher_courses_${JSON.stringify(filters)}`,
      },
    });

    return response.data.data!;
  }

  async getCourse(id: number): Promise<Course> {
    const response = await apiCore.get<ApiResponse<Course>>(`/teacher/courses/${id}`, {
      metadata: {
        endpoint: 'teacher_course_detail',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `teacher_course_${id}`,
      },
    });

    return response.data.data!;
  }

  async createCourse(data: CourseCreateData): Promise<Course> {
    const response = await apiCore.post<ApiResponse<Course>>('/teacher/courses', data, {
      metadata: {
        endpoint: 'create_course',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    // Clear courses cache
    await this.clearCoursesCache();

    return response.data.data!;
  }

  async updateCourse(id: number, data: Partial<CourseCreateData>): Promise<Course> {
    const response = await apiCore.put<ApiResponse<Course>>(`/teacher/courses/${id}`, data, {
      metadata: {
        endpoint: 'update_course',
        method: 'PUT',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    // Clear specific course cache
    await this.clearCourseCache(id);

    return response.data.data!;
  }

  async deleteCourse(id: number): Promise<void> {
    await apiCore.delete(`/teacher/courses/${id}`, {
      metadata: {
        endpoint: 'delete_course',
        method: 'DELETE',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    await this.clearCoursesCache();
  }

  // Student Management
  async getCourseStudents(courseId: number): Promise<User[]> {
    const response = await apiCore.get<ApiResponse<User[]>>(`/teacher/courses/${courseId}/students`, {
      metadata: {
        endpoint: 'course_students',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `course_students_${courseId}`,
      },
    });

    return response.data.data!;
  }

  async addStudentToCourse(courseId: number, studentEmail: string): Promise<void> {
    await apiCore.post(`/teacher/courses/${courseId}/students`, {
      studentEmail,
    }, {
      metadata: {
        endpoint: 'add_student',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    await this.clearCourseStudentsCache(courseId);
  }

  async removeStudentFromCourse(courseId: number, studentId: number): Promise<void> {
    await apiCore.delete(`/teacher/courses/${courseId}/students/${studentId}`, {
      metadata: {
        endpoint: 'remove_student',
        method: 'DELETE',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    await this.clearCourseStudentsCache(courseId);
  }

  async bulkAddStudents(courseId: number, studentEmails: string[]): Promise<{
    added: string[];
    failed: string[];
    errors: Record<string, string>;
  }> {
    const response = await apiCore.post<ApiResponse<any>>(
      `/teacher/courses/${courseId}/students/bulk`,
      { studentEmails },
      {
        metadata: {
          endpoint: 'bulk_add_students',
          method: 'POST',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'high',
        },
      }
    );

    await this.clearCourseStudentsCache(courseId);

    return response.data.data!;
  }

  // Assignment Management
  async getAssignments(courseId?: number, filters?: {
    status?: 'draft' | 'published' | 'closed';
    sortBy?: 'deadline' | 'title' | 'created';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Assignment[]> {
    const params = {
      ...(courseId && { courseId }),
      ...filters,
    };

    const response = await apiCore.get<ApiResponse<Assignment[]>>('/teacher/assignments', {
      params,
      metadata: {
        endpoint: 'teacher_assignments',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `teacher_assignments_${JSON.stringify(params)}`,
      },
    });

    return response.data.data!;
  }

  async getAssignment(id: number): Promise<Assignment> {
    const response = await apiCore.get<ApiResponse<Assignment>>(`/teacher/assignments/${id}`, {
      metadata: {
        endpoint: 'teacher_assignment_detail',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: `teacher_assignment_${id}`,
      },
    });

    return response.data.data!;
  }

  async createAssignment(
    data: AssignmentCreateData,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<Assignment> {
    const formData = new FormData();
    
    // Add text fields
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'questionFile' && value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });

    // Add file if present
    if (data.questionFile) {
      formData.append('questionFile', data.questionFile);
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      metadata: {
        endpoint: 'create_assignment',
        method: 'POST',
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
            filename: data.questionFile?.name || 'assignment',
            status: 'uploading',
          };
          onProgress(progress);
        }
      },
    };

    const response = await apiCore.post<ApiResponse<Assignment>>('/teacher/assignments', formData, config);

    await this.clearAssignmentsCache();

    return response.data.data!;
  }

  async updateAssignment(
    id: number,
    data: Partial<AssignmentCreateData>,
    onProgress?: (progress: FileUploadProgress) => void
  ): Promise<Assignment> {
    const formData = new FormData();
    
    Object.entries(data).forEach(([key, value]) => {
      if (key !== 'questionFile' && value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : value.toString());
      }
    });

    if (data.questionFile) {
      formData.append('questionFile', data.questionFile);
    }

    const config: AxiosRequestConfig = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      metadata: {
        endpoint: 'update_assignment',
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
            filename: data.questionFile?.name || 'assignment',
            status: 'uploading',
          };
          onProgress(progress);
        }
      },
    };

    const response = await apiCore.put<ApiResponse<Assignment>>(
      `/teacher/assignments/${id}`,
      formData,
      config
    );

    await this.clearAssignmentCache(id);

    return response.data.data!;
  }

  async deleteAssignment(id: number): Promise<void> {
    await apiCore.delete(`/teacher/assignments/${id}`, {
      metadata: {
        endpoint: 'delete_assignment',
        method: 'DELETE',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    await this.clearAssignmentsCache();
  }

  async publishAssignment(id: number): Promise<Assignment> {
    const response = await apiCore.post<ApiResponse<Assignment>>(
      `/teacher/assignments/${id}/publish`,
      {},
      {
        metadata: {
          endpoint: 'publish_assignment',
          method: 'POST',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'high',
        },
      }
    );

    await this.clearAssignmentCache(id);

    return response.data.data!;
  }

  async duplicateAssignment(id: number, newCourseId?: number): Promise<Assignment> {
    const response = await apiCore.post<ApiResponse<Assignment>>(
      `/teacher/assignments/${id}/duplicate`,
      { newCourseId },
      {
        metadata: {
          endpoint: 'duplicate_assignment',
          method: 'POST',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'normal',
        },
      }
    );

    await this.clearAssignmentsCache();

    return response.data.data!;
  }

  // Submission and Grading Management
  async getSubmissions(assignmentId: number, filters?: {
    status?: 'submitted' | 'graded' | 'returned';
    studentId?: number;
    sortBy?: 'submittedAt' | 'studentName' | 'grade';
    sortOrder?: 'asc' | 'desc';
  }): Promise<Submission[]> {
    const params = { assignmentId, ...filters };

    const response = await apiCore.get<ApiResponse<Submission[]>>('/teacher/submissions', {
      params,
      metadata: {
        endpoint: 'assignment_submissions',
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
    const response = await apiCore.get<ApiResponse<Submission>>(`/teacher/submissions/${id}`, {
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

  async gradeSubmission(id: number, gradingData: GradingData): Promise<Submission> {
    const response = await apiCore.post<ApiResponse<Submission>>(
      `/teacher/submissions/${id}/grade`,
      gradingData,
      {
        metadata: {
          endpoint: 'grade_submission',
          method: 'POST',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'high',
        },
      }
    );

    await this.clearSubmissionCache(id);

    return response.data.data!;
  }

  async bulkGradeSubmissions(data: BulkGradingData): Promise<{
    success: number[];
    failed: number[];
    errors: Record<string, string>;
  }> {
    const response = await apiCore.post<ApiResponse<any>>('/teacher/submissions/bulk-grade', data, {
      metadata: {
        endpoint: 'bulk_grade',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });

    // Clear submission caches
    data.submissionIds.forEach(id => this.clearSubmissionCache(id));

    return response.data.data!;
  }

  async downloadSubmission(id: number): Promise<Blob> {
    const response = await apiCore.get(`/teacher/submissions/${id}/download`, {
      responseType: 'blob',
      metadata: {
        endpoint: 'download_submission',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    return response.data;
  }

  async downloadAllSubmissions(assignmentId: number, format: 'zip' | 'pdf' = 'zip'): Promise<Blob> {
    const response = await apiCore.get(`/teacher/assignments/${assignmentId}/submissions/download`, {
      params: { format },
      responseType: 'blob',
      metadata: {
        endpoint: 'download_all_submissions',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    return response.data;
  }

  async requestAutoGrading(assignmentId: number, options?: {
    overwriteExisting?: boolean;
    criteria?: string[];
  }): Promise<{ jobId: string }> {
    const response = await apiCore.post<ApiResponse<{ jobId: string }>>(
      `/teacher/assignments/${assignmentId}/auto-grade`,
      options,
      {
        metadata: {
          endpoint: 'auto_grade',
          method: 'POST',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'high',
        },
      }
    );

    return response.data.data!;
  }

  async getAutoGradingStatus(jobId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress: number;
    results?: any;
    error?: string;
  }> {
    const response = await apiCore.get<ApiResponse<any>>(`/teacher/auto-grade/status/${jobId}`, {
      metadata: {
        endpoint: 'auto_grade_status',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    return response.data.data!;
  }

  // Rubric Management
  async getRubrics(): Promise<GradingRubric[]> {
    const response = await apiCore.get<ApiResponse<GradingRubric[]>>('/teacher/rubrics', {
      metadata: {
        endpoint: 'rubrics',
        method: 'GET',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
        cacheKey: 'teacher_rubrics',
      },
    });

    return response.data.data!;
  }

  async createRubric(rubric: Omit<GradingRubric, 'id'>): Promise<GradingRubric> {
    const response = await apiCore.post<ApiResponse<GradingRubric>>('/teacher/rubrics', rubric, {
      metadata: {
        endpoint: 'create_rubric',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    await this.clearRubricsCache();

    return response.data.data!;
  }

  async updateRubric(id: string, rubric: Partial<GradingRubric>): Promise<GradingRubric> {
    const response = await apiCore.put<ApiResponse<GradingRubric>>(
      `/teacher/rubrics/${id}`,
      rubric,
      {
        metadata: {
          endpoint: 'update_rubric',
          method: 'PUT',
          timestamp: Date.now(),
          retryCount: 0,
          priority: 'normal',
        },
      }
    );

    await this.clearRubricsCache();

    return response.data.data!;
  }

  async deleteRubric(id: string): Promise<void> {
    await apiCore.delete(`/teacher/rubrics/${id}`, {
      metadata: {
        endpoint: 'delete_rubric',
        method: 'DELETE',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'normal',
      },
    });

    await this.clearRubricsCache();
  }

  // Communication
  async sendAnnouncementToCourse(courseId: number, data: {
    title: string;
    message: string;
    urgent?: boolean;
    scheduledFor?: string;
  }): Promise<void> {
    await apiCore.post(`/teacher/courses/${courseId}/announcements`, data, {
      metadata: {
        endpoint: 'send_announcement',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });
  }

  async sendMessageToStudent(studentId: number, data: {
    subject: string;
    message: string;
    courseId?: number;
    assignmentId?: number;
  }): Promise<void> {
    await apiCore.post(`/teacher/students/${studentId}/message`, data, {
      metadata: {
        endpoint: 'send_message',
        method: 'POST',
        timestamp: Date.now(),
        retryCount: 0,
        priority: 'high',
      },
    });
  }

  // File Operations
  async uploadQuestionFile(
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
        endpoint: 'upload_question',
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
      '/teacher/upload/question',
      formData,
      config
    );

    return response.data.data!.filePath;
  }

  // Cache Management
  private async clearCoursesCache(): Promise<void> {
    // Implementation would clear course-related cache entries
  }

  private async clearCourseCache(courseId: number): Promise<void> {
    // Implementation would clear specific course cache
  }

  private async clearCourseStudentsCache(courseId: number): Promise<void> {
    // Implementation would clear course students cache
  }

  private async clearAssignmentsCache(): Promise<void> {
    // Implementation would clear assignments cache
  }

  private async clearAssignmentCache(assignmentId: number): Promise<void> {
    // Implementation would clear specific assignment cache
  }

  private async clearSubmissionCache(submissionId: number): Promise<void> {
    // Implementation would clear specific submission cache
  }

  private async clearRubricsCache(): Promise<void> {
    // Implementation would clear rubrics cache
  }

  // WebSocket Event Listeners
  private initializeWebSocketListeners(): void {
    apiCore.subscribeToWebSocket('submission:new', (data) => {
      console.log('New submission received:', data);
    });

    apiCore.subscribeToWebSocket('grading:progress', (data) => {
      console.log('Grading progress update:', data);
    });

    apiCore.subscribeToWebSocket('student:question', (data) => {
      console.log('Student question received:', data);
    });
  }
}

export const enhancedTeacherService = new EnhancedTeacherService();
export default enhancedTeacherService;
