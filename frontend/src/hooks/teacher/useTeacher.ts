import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { teacherService, TeacherDashboardStats, Course, Assignment, Student, Submission, Message, GradeBookEntry, AnalyticsData } from '@/services/teacher.service';
import { toast } from 'react-toastify';

// Query keys
export const teacherQueryKeys = {
  dashboard: ['teacher', 'dashboard'] as const,
  courses: ['teacher', 'courses'] as const,
  course: (id: number) => ['teacher', 'courses', id] as const,
  assignments: (courseId?: number) => ['teacher', 'assignments', courseId] as const,
  assignment: (id: number) => ['teacher', 'assignments', id] as const,
  students: (courseId?: number) => ['teacher', 'students', courseId] as const,
  student: (id: number) => ['teacher', 'students', id] as const,
  submissions: (status?: string, courseId?: number) => ['teacher', 'submissions', status, courseId] as const,
  submission: (id: number) => ['teacher', 'submissions', id] as const,
  messages: ['teacher', 'messages'] as const,
  gradeBook: (courseId: number) => ['teacher', 'gradebook', courseId] as const,
  analytics: (courseId?: number, timeframe?: string) => ['teacher', 'analytics', courseId, timeframe] as const,
  recentActivity: ['teacher', 'activity', 'recent'] as const,
};

// Dashboard hooks
export function useTeacherDashboard() {
  return useQuery({
    queryKey: teacherQueryKeys.dashboard,
    queryFn: () => teacherService.getDashboardStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: teacherQueryKeys.recentActivity,
    queryFn: () => teacherService.getRecentActivity(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

// Course hooks
export function useCourses() {
  return useQuery({
    queryKey: teacherQueryKeys.courses,
    queryFn: () => teacherService.getCourses(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCourse(id: number) {
  return useQuery({
    queryKey: teacherQueryKeys.course(id),
    queryFn: () => teacherService.getCourse(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useCreateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (courseData: Partial<Course>) => teacherService.createCourse(courseData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.courses });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Course created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create course');
    },
  });
}

export function useUpdateCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Course> }) => 
      teacherService.updateCourse(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.courses });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.course(id) });
      toast.success('Course updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update course');
    },
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => teacherService.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.courses });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Course deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete course');
    },
  });
}

// Assignment hooks
export function useAssignments(courseId?: number) {
  return useQuery({
    queryKey: teacherQueryKeys.assignments(courseId),
    queryFn: () => teacherService.getAssignments(courseId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useAssignment(id: number) {
  return useQuery({
    queryKey: teacherQueryKeys.assignment(id),
    queryFn: () => teacherService.getAssignment(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useCreateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (assignmentData: Partial<Assignment>) => teacherService.createAssignment(assignmentData),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.assignments(data.courseId) });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Assignment created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create assignment');
    },
  });
}

export function useUpdateAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Assignment> }) => 
      teacherService.updateAssignment(id, data),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.assignments(data.courseId) });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.assignment(id) });
      toast.success('Assignment updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update assignment');
    },
  });
}

export function useDeleteAssignment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => teacherService.deleteAssignment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.assignments() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Assignment deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete assignment');
    },
  });
}

// Student hooks
export function useStudents(courseId?: number) {
  return useQuery({
    queryKey: teacherQueryKeys.students(courseId),
    queryFn: () => teacherService.getStudents(courseId),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useStudent(id: number) {
  return useQuery({
    queryKey: teacherQueryKeys.student(id),
    queryFn: () => teacherService.getStudent(id),
    enabled: !!id,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useUpdateStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Student> }) => 
      teacherService.updateStudent(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.students() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.student(id) });
      toast.success('Student updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update student');
    },
  });
}

export function useEnrollStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: number; studentId: number }) => 
      teacherService.enrollStudent(courseId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.students() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Student enrolled successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to enroll student');
    },
  });
}

export function useUnenrollStudent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, studentId }: { courseId: number; studentId: number }) => 
      teacherService.unenrollStudent(courseId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.students() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Student unenrolled successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unenroll student');
    },
  });
}

// Grading hooks
export function useSubmissions(status?: string, courseId?: number) {
  return useQuery({
    queryKey: teacherQueryKeys.submissions(status, courseId),
    queryFn: () => teacherService.getSubmissions(status, courseId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSubmission(id: number) {
  return useQuery({
    queryKey: teacherQueryKeys.submission(id),
    queryFn: () => teacherService.getSubmission(id),
    enabled: !!id,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useGradeSubmission() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, grade, feedback }: { id: number; grade: number; feedback: string }) => 
      teacherService.gradeSubmission(id, { grade, feedback }),
    onSuccess: (data, { id }) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.submission(id) });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Submission graded successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to grade submission');
    },
  });
}

export function useBulkGradeSubmissions() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (submissions: Array<{ id: number; grade: number; feedback: string }>) => 
      teacherService.bulkGradeSubmissions(submissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.submissions() });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Submissions graded successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to grade submissions');
    },
  });
}

// Communication hooks
export function useMessages() {
  return useQuery({
    queryKey: teacherQueryKeys.messages,
    queryFn: () => teacherService.getMessages(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (messageData: {
      type: Message['type'];
      subject: string;
      content: string;
      recipients: string[];
      course?: string;
    }) => teacherService.sendMessage(messageData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.messages });
      toast.success('Message sent successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send message');
    },
  });
}

export function useMarkMessageAsRead() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => teacherService.markMessageAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.messages });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark message as read');
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => teacherService.deleteMessage(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.messages });
      toast.success('Message deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    },
  });
}

// Grade book hooks
export function useGradeBook(courseId: number) {
  return useQuery({
    queryKey: teacherQueryKeys.gradeBook(courseId),
    queryFn: () => teacherService.getGradeBook(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useUpdateGrade() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ courseId, studentId, assignmentId, grade }: {
      courseId: number;
      studentId: number;
      assignmentId: number;
      grade: number;
    }) => teacherService.updateGrade(courseId, studentId, assignmentId, grade),
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.gradeBook(courseId) });
      queryClient.invalidateQueries({ queryKey: teacherQueryKeys.dashboard });
      toast.success('Grade updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update grade');
    },
  });
}

export function useExportGradeBook() {
  return useMutation({
    mutationFn: ({ courseId, format }: { courseId: number; format: 'csv' | 'xlsx' | 'pdf' }) => 
      teacherService.exportGradeBook(courseId, format),
    onSuccess: (blob, { format }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `gradebook.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Grade book exported successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to export grade book');
    },
  });
}

// Analytics hooks
export function useAnalytics(courseId?: number, timeframe?: string) {
  return useQuery({
    queryKey: teacherQueryKeys.analytics(courseId, timeframe),
    queryFn: () => teacherService.getAnalytics(courseId, timeframe),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

export function useGenerateReport() {
  return useMutation({
    mutationFn: ({ type, options }: {
      type: 'performance' | 'engagement' | 'progress';
      options: { courseId?: number; timeframe?: string; format?: 'pdf' | 'csv' | 'xlsx' };
    }) => teacherService.generateReport(type, options),
    onSuccess: (blob, { type, options }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${type}-report.${options.format || 'pdf'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Report generated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate report');
    },
  });
}

// Utility hooks
export function useUploadFile() {
  return useMutation({
    mutationFn: ({ file, type }: { file: File; type: 'assignment' | 'resource' | 'syllabus' }) => 
      teacherService.uploadFile(file, type),
    onSuccess: () => {
      toast.success('File uploaded successfully!');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload file');
    },
  });
}

export function useSearchStudents() {
  return useMutation({
    mutationFn: ({ query, courseId }: { query: string; courseId?: number }) => 
      teacherService.searchStudents(query, courseId),
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to search students');
    },
  });
}
