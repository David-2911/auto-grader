import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Tabs,
  Tab,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Home,
  Assignment,
  Assessment,
  Person,
  Timeline,
  Notifications,
  Help,
  Add,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchDashboardData,
  fetchAssignments,
  fetchSubmissions,
  fetchGrades,
  fetchPerformance,
  fetchProfile,
  fetchNotifications,
  fetchCourses,
  submitAssignment,
  setCurrentAssignment,
  clearErrors,
} from '@/store/slices/studentSlice';

// Import student components
import StudentDashboardHome from '@/components/student/StudentDashboardHome';
import AssignmentsList from '@/components/student/AssignmentsList';
import GradesView from '@/components/student/GradesView';
import StudentProfile from '@/components/student/StudentProfile';
import ProgressTracking from '@/components/student/ProgressTracking';
import AssignmentSubmission from '@/components/student/AssignmentSubmission';

const StyledTabs = styled(Tabs)(({ theme }) => ({
  backgroundColor: theme.palette.background.paper,
  borderRadius: theme.spacing(1),
  minHeight: 48,
  '& .MuiTab-root': {
    minHeight: 48,
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
}));

const TabPanel = styled(Box)(({ theme }) => ({
  marginTop: theme.spacing(2),
}));

const FloatingActionButton = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: theme.spacing(2),
  right: theme.spacing(2),
  zIndex: 1000,
}));

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function CustomTabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`student-tabpanel-${index}`}
      aria-labelledby={`student-tab-${index}`}
      {...other}
    >
      {value === index && (
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}

export const StudentDashboard: React.FC = () => {
  const dispatch = useAppDispatch();
  const {
    dashboardData,
    assignments,
    submissions,
    grades,
    performance,
    profile,
    notifications,
    courses,
    currentAssignment,
    dashboardLoading,
    assignmentsLoading,
    gradesLoading,
    performanceLoading,
    profileLoading,
    notificationsLoading,
    coursesLoading,
    submissionLoading,
    uploadProgress,
    unreadCount,
    dashboardError,
    assignmentsError,
    gradesError,
    performanceError,
    profileError,
    notificationsError,
    coursesError,
    submissionError,
  } = useAppSelector((state) => state.student);

  const [currentTab, setCurrentTab] = useState(0);
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [showNotificationSnackbar, setShowNotificationSnackbar] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');

  useEffect(() => {
    // Load initial data
    dispatch(fetchDashboardData());
    dispatch(fetchAssignments());
    dispatch(fetchSubmissions());
    dispatch(fetchGrades());
    dispatch(fetchPerformance());
    dispatch(fetchProfile());
    dispatch(fetchNotifications());
    dispatch(fetchCourses());
  }, [dispatch]);

  useEffect(() => {
    // Show notification for new unread notifications
    if (unreadCount > 0) {
      setNotificationMessage(`You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`);
      setShowNotificationSnackbar(true);
    }
  }, [unreadCount]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleAssignmentClick = (assignment: any) => {
    dispatch(setCurrentAssignment(assignment));
    // Navigate to assignment details or show modal
    console.log('Assignment clicked:', assignment);
  };

  const handleSubmissionClick = (assignment: any) => {
    dispatch(setCurrentAssignment(assignment));
    setShowSubmissionDialog(true);
  };

  const handleSubmitAssignment = async (data: { file?: File; submissionText?: string }) => {
    if (currentAssignment) {
      try {
        await dispatch(submitAssignment({
          assignmentId: currentAssignment.id,
          ...data,
        })).unwrap();
        
        setShowSubmissionDialog(false);
        setNotificationMessage('Assignment submitted successfully!');
        setShowNotificationSnackbar(true);
        
        // Refresh data
        dispatch(fetchSubmissions());
        dispatch(fetchDashboardData());
      } catch (error) {
        console.error('Submission failed:', error);
      }
    }
  };

  const handleViewFeedback = (submissionId: number) => {
    // Navigate to detailed feedback view
    console.log('View feedback for submission:', submissionId);
  };

  const handleProfileUpdate = (data: any) => {
    // Update profile logic
    console.log('Update profile:', data);
    setNotificationMessage('Profile updated successfully!');
    setShowNotificationSnackbar(true);
  };

  const handlePasswordChange = (data: any) => {
    // Change password logic
    console.log('Change password:', data);
    setNotificationMessage('Password changed successfully!');
    setShowNotificationSnackbar(true);
  };

  const handleLogout = () => {
    // Logout logic
    console.log('Logging out...');
  };

  const clearAllErrors = () => {
    dispatch(clearErrors());
  };

  // Quick action for new submission
  const handleQuickSubmission = () => {
    // Show quick submission modal or navigate to assignments
    setCurrentTab(1); // Navigate to assignments tab
  };

  const tabs = [
    { label: 'Home', icon: <Home />, id: 'home' },
    { label: 'Assignments', icon: <Assignment />, id: 'assignments' },
    { label: 'Grades', icon: <Assessment />, id: 'grades' },
    { label: 'Progress', icon: <Timeline />, id: 'progress' },
    { label: 'Profile', icon: <Person />, id: 'profile' },
  ];

  const hasError = dashboardError || assignmentsError || gradesError || performanceError || profileError || notificationsError || coursesError || submissionError;
  const isLoading = dashboardLoading || assignmentsLoading || gradesLoading || performanceLoading || profileLoading || notificationsLoading || coursesLoading;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Error Display */}
      {hasError && (
        <Alert 
          severity="error" 
          sx={{ mb: 2 }}
          onClose={clearAllErrors}
        >
          {dashboardError || assignmentsError || gradesError || performanceError || profileError || notificationsError || coursesError || submissionError}
        </Alert>
      )}

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 3 }}>
        <StyledTabs
          value={currentTab}
          onChange={handleTabChange}
          variant="fullWidth"
          sx={{ px: 2 }}
        >
          {tabs.map((tab, index) => (
            <Tab
              key={tab.id}
              icon={
                tab.id === 'profile' && unreadCount > 0 ? (
                  <Badge badgeContent={unreadCount} color="error">
                    {tab.icon}
                  </Badge>
                ) : (
                  tab.icon
                )
              }
              label={tab.label}
              iconPosition="start"
            />
          ))}
        </StyledTabs>
      </Paper>

      {/* Tab Panels */}
      <CustomTabPanel value={currentTab} index={0}>
        <StudentDashboardHome
          assignments={assignments}
          recentGrades={grades.slice(0, 5)}
          upcomingDeadlines={assignments.filter(a => {
            const deadline = new Date(a.deadline);
            const now = new Date();
            const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            return deadline > now && deadline <= weekFromNow;
          })}
          courses={courses}
          notifications={notifications}
          performance={performance}
          loading={isLoading}
        />
      </CustomTabPanel>

      <CustomTabPanel value={currentTab} index={1}>
        <AssignmentsList
          assignments={assignments}
          submissions={submissions}
          courses={courses}
          onAssignmentClick={handleAssignmentClick}
          onSubmissionClick={handleSubmissionClick}
          loading={assignmentsLoading}
        />
      </CustomTabPanel>

      <CustomTabPanel value={currentTab} index={2}>
        <GradesView
          submissions={grades}
          assignments={assignments}
          courses={courses}
          onViewFeedback={handleViewFeedback}
          loading={gradesLoading}
        />
      </CustomTabPanel>

      <CustomTabPanel value={currentTab} index={3}>
        <ProgressTracking
          submissions={submissions}
          courses={courses}
          performance={performance}
          loading={performanceLoading}
        />
      </CustomTabPanel>

      <CustomTabPanel value={currentTab} index={4}>
        <StudentProfile
          user={profile}
          courses={courses}
          onUpdateProfile={handleProfileUpdate}
          onChangePassword={handlePasswordChange}
          onLogout={handleLogout}
          loading={profileLoading}
        />
      </CustomTabPanel>

      {/* Floating Action Button */}
      <Tooltip title="Quick Submit Assignment">
        <FloatingActionButton
          color="primary"
          onClick={handleQuickSubmission}
          sx={{ display: currentTab === 1 ? 'none' : 'flex' }} // Hide on assignments tab
        >
          <Add />
        </FloatingActionButton>
      </Tooltip>

      {/* Assignment Submission Dialog */}
      {showSubmissionDialog && currentAssignment && (
        <AssignmentSubmission
          assignment={currentAssignment}
          onSubmit={handleSubmitAssignment}
          onCancel={() => setShowSubmissionDialog(false)}
          loading={submissionLoading}
          uploadProgress={uploadProgress}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <CircularProgress size={60} />
        </Box>
      )}

      {/* Notification Snackbar */}
      <Snackbar
        open={showNotificationSnackbar}
        autoHideDuration={6000}
        onClose={() => setShowNotificationSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert
          onClose={() => setShowNotificationSnackbar(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {notificationMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StudentDashboard;
