import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Teacher-specific types and interfaces
export interface TeacherDashboardStats {
  totalCourses: number;
  totalStudents: number;
  totalAssignments: number;
  pendingGrades: number;
  averageGrade: number;
  completionRate: number;
}

export interface Course {
  id: number;
  title: string;
  code: string;
  description: string;
  students: number;
  assignments: number;
  term: string;
  year: number;
  status: 'active' | 'archived' | 'draft';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Assignment {
  id: number;
  title: string;
  course: string;
  courseId: number;
  type: 'homework' | 'quiz' | 'exam' | 'project' | 'lab';
  description: string;
  totalPoints: number;
  dueDate: string;
  createdDate: string;
  status: 'draft' | 'published' | 'closed';
  submissions: number;
  totalStudents: number;
  avgGrade?: number;
  gradingStatus: 'not_started' | 'in_progress' | 'completed';
}

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  enrolledCourses: string[];
  totalAssignments: number;
  completedAssignments: number;
  averageGrade: number;
  lastSubmission: string;
  status: 'active' | 'inactive' | 'dropped';
  enrollmentDate: string;
  profilePicture?: string;
  phone?: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  major: string;
}

export interface Submission {
  id: number;
  studentName: string;
  studentId: string;
  assignmentTitle: string;
  assignmentId: number;
  submittedAt: string;
  mlGrade: number;
  mlConfidence: number;
  suggestedGrade: number;
  manualGrade?: number;
  finalGrade?: number;
  status: 'pending' | 'reviewed' | 'approved' | 'needs_review';
  feedback: string;
  mlFeedback: string;
  rubricScores: { [criterion: string]: number };
  flagged: boolean;
  ocrText?: string;
  originalFile?: string;
}

export interface Message {
  id: number;
  type: 'message' | 'announcement' | 'feedback';
  subject: string;
  content: string;
  sender: string;
  recipient: string | string[];
  timestamp: string;
  read: boolean;
  starred: boolean;
  attachments?: string[];
  course?: string;
  assignment?: string;
}

export interface GradeBookEntry {
  studentId: number;
  studentName: string;
  assignments: { [assignmentId: string]: number | null };
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  letterGrade: string;
}

export interface AnalyticsData {
  performanceTrends: Array<{
    week: string;
    [courseCode: string]: string | number;
  }>;
  gradeDistribution: Array<{
    grade: string;
    count: number;
    percentage: number;
  }>;
  assignmentDifficulty: Array<{
    assignment: string;
    avgGrade: number;
    submissions: number;
    difficulty: string;
  }>;
  studentProgress: Array<{
    student: string;
    [courseCode: string]: string | number;
    trend: 'up' | 'down' | 'stable';
  }>;
  engagementMetrics: Array<{
    metric: string;
    value: number;
    max: number;
  }>;
}

class TeacherService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: '/api/teacher',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add token to requests
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  // Dashboard methods
  async getDashboardStats(): Promise<TeacherDashboardStats> {
    const response: AxiosResponse<TeacherDashboardStats> = await this.api.get('/dashboard');
    return response.data;
  }

  // Course management methods
  async getCourses(): Promise<Course[]> {
    const response: AxiosResponse<Course[]> = await this.api.get('/courses');
    return response.data;
  }

  async getCourse(id: number): Promise<Course> {
    const response: AxiosResponse<Course> = await this.api.get(`/courses/${id}`);
    return response.data;
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const response: AxiosResponse<Course> = await this.api.post('/courses', courseData);
    return response.data;
  }

  async updateCourse(id: number, courseData: Partial<Course>): Promise<Course> {
    const response: AxiosResponse<Course> = await this.api.put(`/courses/${id}`, courseData);
    return response.data;
  }

  async deleteCourse(id: number): Promise<void> {
    await this.api.delete(`/courses/${id}`);
  }

  // Assignment management methods
  async getAssignments(courseId?: number): Promise<Assignment[]> {
    const url = courseId ? `/assignments?courseId=${courseId}` : '/assignments';
    const response: AxiosResponse<Assignment[]> = await this.api.get(url);
    return response.data;
  }

  async getAssignment(id: number): Promise<Assignment> {
    const response: AxiosResponse<Assignment> = await this.api.get(`/assignments/${id}`);
    return response.data;
  }

  async createAssignment(assignmentData: Partial<Assignment>): Promise<Assignment> {
    const response: AxiosResponse<Assignment> = await this.api.post('/assignments', assignmentData);
    return response.data;
  }

  async updateAssignment(id: number, assignmentData: Partial<Assignment>): Promise<Assignment> {
    const response: AxiosResponse<Assignment> = await this.api.put(`/assignments/${id}`, assignmentData);
    return response.data;
  }

  async deleteAssignment(id: number): Promise<void> {
    await this.api.delete(`/assignments/${id}`);
  }

  // Student management methods
  async getStudents(courseId?: number): Promise<Student[]> {
    const url = courseId ? `/students?courseId=${courseId}` : '/students';
    const response: AxiosResponse<Student[]> = await this.api.get(url);
    return response.data;
  }

  async getStudent(id: number): Promise<Student> {
    const response: AxiosResponse<Student> = await this.api.get(`/students/${id}`);
    return response.data;
  }

  async updateStudent(id: number, studentData: Partial<Student>): Promise<Student> {
    const response: AxiosResponse<Student> = await this.api.put(`/students/${id}`, studentData);
    return response.data;
  }

  async enrollStudent(courseId: number, studentId: number): Promise<void> {
    await this.api.post(`/courses/${courseId}/students/${studentId}`);
  }

  async unenrollStudent(courseId: number, studentId: number): Promise<void> {
    await this.api.delete(`/courses/${courseId}/students/${studentId}`);
  }

  // Grading methods
  async getSubmissions(status?: string, courseId?: number): Promise<Submission[]> {
    let url = '/submissions';
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (courseId) params.append('courseId', courseId.toString());
    if (params.toString()) url += `?${params.toString()}`;
    
    const response: AxiosResponse<Submission[]> = await this.api.get(url);
    return response.data;
  }

  async getSubmission(id: number): Promise<Submission> {
    const response: AxiosResponse<Submission> = await this.api.get(`/submissions/${id}`);
    return response.data;
  }

  async gradeSubmission(id: number, gradeData: {
    grade: number;
    feedback: string;
  }): Promise<Submission> {
    const response: AxiosResponse<Submission> = await this.api.put(`/submissions/${id}/grade`, gradeData);
    return response.data;
  }

  async bulkGradeSubmissions(submissions: Array<{
    id: number;
    grade: number;
    feedback: string;
  }>): Promise<Submission[]> {
    const response: AxiosResponse<Submission[]> = await this.api.post('/submissions/bulk-grade', { submissions });
    return response.data;
  }

  // Communication methods
  async getMessages(): Promise<Message[]> {
    const response: AxiosResponse<Message[]> = await this.api.get('/messages');
    return response.data;
  }

  async sendMessage(messageData: {
    type: Message['type'];
    subject: string;
    content: string;
    recipients: string[];
    course?: string;
  }): Promise<Message> {
    const response: AxiosResponse<Message> = await this.api.post('/messages', messageData);
    return response.data;
  }

  async markMessageAsRead(id: number): Promise<void> {
    await this.api.put(`/messages/${id}/read`);
  }

  async deleteMessage(id: number): Promise<void> {
    await this.api.delete(`/messages/${id}`);
  }

  // Grade book methods
  async getGradeBook(courseId: number): Promise<GradeBookEntry[]> {
    const response: AxiosResponse<GradeBookEntry[]> = await this.api.get(`/gradebook/${courseId}`);
    return response.data;
  }

  async updateGrade(courseId: number, studentId: number, assignmentId: number, grade: number): Promise<void> {
    await this.api.put(`/gradebook/${courseId}/students/${studentId}/assignments/${assignmentId}`, { grade });
  }

  async exportGradeBook(courseId: number, format: 'csv' | 'xlsx' | 'pdf'): Promise<Blob> {
    const response = await this.api.get(`/gradebook/${courseId}/export?format=${format}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  // Analytics methods
  async getAnalytics(courseId?: number, timeframe?: string): Promise<AnalyticsData> {
    let url = '/analytics';
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId.toString());
    if (timeframe) params.append('timeframe', timeframe);
    if (params.toString()) url += `?${params.toString()}`;
    
    const response: AxiosResponse<AnalyticsData> = await this.api.get(url);
    return response.data;
  }

  async generateReport(type: 'performance' | 'engagement' | 'progress', options: {
    courseId?: number;
    timeframe?: string;
    format?: 'pdf' | 'csv' | 'xlsx';
  }): Promise<Blob> {
    const response = await this.api.post(`/reports/${type}`, options, {
      responseType: 'blob',
    });
    return response.data;
  }

  // File upload methods
  async uploadFile(file: File, type: 'assignment' | 'resource' | 'syllabus'): Promise<{
    url: string;
    filename: string;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);
    
    const response = await this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Utility methods
  async searchStudents(query: string, courseId?: number): Promise<Student[]> {
    let url = `/students/search?q=${encodeURIComponent(query)}`;
    if (courseId) url += `&courseId=${courseId}`;
    
    const response: AxiosResponse<Student[]> = await this.api.get(url);
    return response.data;
  }

  async getRecentActivity(): Promise<Array<{
    id: number;
    type: string;
    description: string;
    timestamp: string;
    student?: string;
    course?: string;
  }>> {
    const response = await this.api.get('/activity/recent');
    return response.data;
  }
}

// Export singleton instance
export const teacherService = new TeacherService();
export default teacherService;
