import { ReactNode } from 'react';

// User types
export interface User {
  id: number;
  email: string;
  role: UserRole;
  identifier: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  updatedAt: string;
  profile?: StudentProfile | TeacherProfile | AdminProfile;
}

export type UserRole = 'student' | 'teacher' | 'admin';

export interface StudentProfile {
  id: number;
  userId: number;
  studentId: string;
  enrollments?: Enrollment[];
}

export interface TeacherProfile {
  id: number;
  userId: number;
  department?: string;
  courses?: Course[];
}

export interface AdminProfile {
  id: number;
  userId: number;
  department?: string;
  permissions: string[];
}

// Course types
export interface Course {
  id: number;
  code: string;
  title: string;
  description?: string;
  teacherId: number;
  teacher?: User;
  createdAt: string;
  updatedAt: string;
  enrollments?: Enrollment[];
  assignments?: Assignment[];
}

export interface Enrollment {
  id: number;
  courseId: number;
  studentId: number;
  enrollmentDate: string;
  course?: Course;
  student?: User;
}

// Assignment types
export interface Assignment {
  id: number;
  title: string;
  description: string;
  courseId: number;
  deadline: string;
  totalPoints: number;
  maxSubmissions: number;
  allowedFileTypes: string[];
  instructions?: string;
  course?: Course;
  submissions?: Submission[];
  createdAt: string;
  updatedAt: string;
}

export interface Submission {
  id: number;
  assignmentId: number;
  studentId: number;
  filePath?: string;
  originalFileName?: string;
  submissionText?: string;
  extractedText?: string;
  grade?: number;
  feedback?: string;
  status: SubmissionStatus;
  mlProcessed: boolean;
  submittedAt: string;
  gradedAt?: string;
  assignment?: Assignment;
  student?: User;
}

export type SubmissionStatus = 'submitted' | 'graded' | 'returned' | 'late';

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  identifier: string;
  firstName: string;
  lastName: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'select' | 'textarea' | 'file' | 'date' | 'number';
  required?: boolean;
  options?: { value: string; label: string }[];
  validation?: any;
}

// UI types
export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export interface TableColumn<T = any> {
  field: keyof T;
  headerName: string;
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  renderCell?: (params: { row: T; value: any }) => ReactNode;
}

export interface ActionButtonProps {
  variant?: 'contained' | 'outlined' | 'text';
  color?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

// Theme types
export interface ThemeConfig {
  mode: 'light' | 'dark';
  primaryColor: string;
  secondaryColor: string;
  errorColor: string;
  warningColor: string;
  infoColor: string;
  successColor: string;
}

// File processing types
export interface FileUpload {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export interface ProcessedFile {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  extractedText?: string;
  processedAt: string;
}

// ML/Grading types
export interface GradingResult {
  score: number;
  maxScore: number;
  percentage: number;
  feedback: string;
  criteria: GradingCriterion[];
  suggestions: string[];
}

export interface GradingCriterion {
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  feedback: string;
}

// Notification types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Dashboard types
export interface DashboardStats {
  totalStudents?: number;
  totalCourses?: number;
  totalAssignments?: number;
  totalSubmissions?: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'assignment_created' | 'submission_received' | 'grade_assigned' | 'course_created';
  title: string;
  description: string;
  timestamp: string;
  user?: User;
  metadata?: Record<string, any>;
}

// Chart/Analytics types
export interface ChartDataPoint {
  name: string;
  value: number;
  label?: string;
  color?: string;
}

export interface GradeDistribution {
  grade: string;
  count: number;
  percentage: number;
}

export interface PerformanceMetrics {
  averageGrade: number;
  submissionRate: number;
  completionRate: number;
  trends: {
    grades: ChartDataPoint[];
    submissions: ChartDataPoint[];
  };
}
