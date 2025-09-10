// Student Dashboard Components
export { default as StudentDashboardHome } from './StudentDashboardHome';
export { default as AssignmentsList } from './AssignmentsList';
export { default as AssignmentSubmission } from './AssignmentSubmission';
export { default as GradesView } from './GradesView';
export { default as StudentProfile } from './StudentProfile';
export { default as ProgressTracking } from './ProgressTracking';
export { default as HelpSupport } from './HelpSupport';
export { default as NotificationsManagement } from './NotificationsManagement';

// Re-export types for convenience
export type {
  StudentDashboardData,
  SubmissionData,
  StudentProfileUpdate,
} from '@/services/student.service';
