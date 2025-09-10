import api from './api.service';
import {
  Assignment,
  Submission,
  Course,
  GradingResult,
  User,
  Notification,
  PerformanceMetrics,
  ApiResponse
} from '@/types';

export interface StudentDashboardData {
  assignments: Assignment[];
  recentGrades: Submission[];
  upcomingDeadlines: Assignment[];
  courses: Course[];
  notifications: Notification[];
  performance: PerformanceMetrics;
}

export interface SubmissionData {
  assignmentId: number;
  file?: File;
  submissionText?: string;
}

export interface StudentProfileUpdate {
  firstName?: string;
  lastName?: string;
  email?: string;
  preferences?: {
    emailNotifications: boolean;
    deadlineReminders: boolean;
    gradeNotifications: boolean;
  };
}

class StudentService {
  // Dashboard data
  async getDashboardData(): Promise<StudentDashboardData> {
    const response = await api.get<ApiResponse<StudentDashboardData>>('/student/dashboard');
    return response.data.data!;
  }

  // Assignments
  async getAssignments(courseId?: number): Promise<Assignment[]> {
    const params = courseId ? { courseId } : {};
    const response = await api.get<ApiResponse<Assignment[]>>('/student/assignments', { params });
    return response.data.data!;
  }

  async getAssignment(id: number): Promise<Assignment> {
    const response = await api.get<ApiResponse<Assignment>>(`/student/assignments/${id}`);
    return response.data.data!;
  }

  async getUpcomingDeadlines(): Promise<Assignment[]> {
    const response = await api.get<ApiResponse<Assignment[]>>('/student/assignments/upcoming');
    return response.data.data!;
  }

  // Submissions
  async submitAssignment(data: SubmissionData): Promise<Submission> {
    const formData = new FormData();
    formData.append('assignmentId', data.assignmentId.toString());
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    if (data.submissionText) {
      formData.append('submissionText', data.submissionText);
    }

    const response = await api.post<ApiResponse<Submission>>('/student/submissions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  }

  async getSubmissions(assignmentId?: number): Promise<Submission[]> {
    const params = assignmentId ? { assignmentId } : {};
    const response = await api.get<ApiResponse<Submission[]>>('/student/submissions', { params });
    return response.data.data!;
  }

  async getSubmission(id: number): Promise<Submission> {
    const response = await api.get<ApiResponse<Submission>>(`/student/submissions/${id}`);
    return response.data.data!;
  }

  async resubmitAssignment(submissionId: number, data: SubmissionData): Promise<Submission> {
    const formData = new FormData();
    
    if (data.file) {
      formData.append('file', data.file);
    }
    
    if (data.submissionText) {
      formData.append('submissionText', data.submissionText);
    }

    const response = await api.put<ApiResponse<Submission>>(`/student/submissions/${submissionId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data.data!;
  }

  // Grades and feedback
  async getGrades(): Promise<Submission[]> {
    const response = await api.get<ApiResponse<Submission[]>>('/student/grades');
    return response.data.data!;
  }

  async getGradeDetails(submissionId: number): Promise<GradingResult> {
    const response = await api.get<ApiResponse<GradingResult>>(`/student/grades/${submissionId}`);
    return response.data.data!;
  }

  // Performance tracking
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const response = await api.get<ApiResponse<PerformanceMetrics>>('/student/performance');
    return response.data.data!;
  }

  async getProgressHistory(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/student/progress');
    return response.data.data!;
  }

  // Profile management
  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/student/profile');
    return response.data.data!;
  }

  async updateProfile(data: StudentProfileUpdate): Promise<User> {
    const response = await api.put<ApiResponse<User>>('/student/profile', data);
    return response.data.data!;
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    const response = await api.get<ApiResponse<Notification[]>>('/student/notifications');
    return response.data.data!;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await api.put(`/student/notifications/${id}/read`);
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await api.put('/student/notifications/read-all');
  }

  // Courses
  async getCourses(): Promise<Course[]> {
    const response = await api.get<ApiResponse<Course[]>>('/student/courses');
    return response.data.data!;
  }

  async getCourse(id: number): Promise<Course> {
    const response = await api.get<ApiResponse<Course>>(`/student/courses/${id}`);
    return response.data.data!;
  }

  // File upload progress tracking
  async uploadFile(file: File, onProgress?: (progress: number) => void): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ApiResponse<{ filePath: string }>>('/student/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent: any) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data.data!.filePath;
  }

  // Help and support
  async submitSupportRequest(data: { subject: string; message: string; category: string }): Promise<void> {
    await api.post('/student/support', data);
  }

  async getFAQs(): Promise<any[]> {
    const response = await api.get<ApiResponse<any[]>>('/student/faqs');
    return response.data.data!;
  }
}

export const studentService = new StudentService();
export default studentService;
