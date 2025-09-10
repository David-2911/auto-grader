import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Grade as GradeIcon,
  Message as MessageIcon,
  Assessment as ReportIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

// Components
import TeacherOverview from '@/components/features/teacher/TeacherOverview';
import CourseManagement from '@/components/features/teacher/CourseManagement';
import AssignmentManagement from '@/components/features/teacher/AssignmentManagement';
import StudentManagement from '@/components/features/teacher/StudentManagement';
import GradingOversight from '@/components/features/teacher/GradingOversight';
import CommunicationCenter from '@/components/features/teacher/CommunicationCenter';
import ReportsAnalytics from '@/components/features/teacher/ReportsAnalytics';
import GradeBook from '@/components/features/teacher/GradeBook';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`teacher-tabpanel-${index}`}
      aria-labelledby={`teacher-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const TeacherDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const tabs = [
    { label: 'Overview', icon: <DashboardIcon />, component: <TeacherOverview /> },
    { label: 'Courses', icon: <SchoolIcon />, component: <CourseManagement /> },
    { label: 'Assignments', icon: <AssignmentIcon />, component: <AssignmentManagement /> },
    { label: 'Students', icon: <PeopleIcon />, component: <StudentManagement /> },
    { label: 'Grading', icon: <GradeIcon />, component: <GradingOversight /> },
    { label: 'Grade Book', icon: <ReportIcon />, component: <GradeBook /> },
    { label: 'Communication', icon: <MessageIcon />, component: <CommunicationCenter /> },
    { label: 'Analytics', icon: <AnalyticsIcon />, component: <ReportsAnalytics /> },
  ];

  return (
    <Box sx={{ width: '100%', bgcolor: 'background.default' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            color: 'white',
            p: 3,
            mb: 3,
            borderRadius: 2,
            boxShadow: 3,
          }}
        >
          <Grid container justifyContent="space-between" alignItems="center">
            <Grid item>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Teacher Dashboard
              </Typography>
              <Typography variant="subtitle1" sx={{ opacity: 0.9 }}>
                Manage your courses, assignments, and student progress
              </Typography>
            </Grid>
            <Grid item>
              <IconButton
                sx={{
                  bgcolor: alpha(theme.palette.common.white, 0.1),
                  color: 'white',
                  '&:hover': {
                    bgcolor: alpha(theme.palette.common.white, 0.2),
                  },
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Grid>
          </Grid>
        </Box>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <Card sx={{ mb: 3 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 64,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                },
              }}
            >
              {tabs.map((tab, index) => (
                <Tab
                  key={index}
                  icon={tab.icon}
                  label={tab.label}
                  iconPosition="start"
                  id={`teacher-tab-${index}`}
                  aria-controls={`teacher-tabpanel-${index}`}
                />
              ))}
            </Tabs>
          </Box>
        </Card>
      </motion.div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
      >
        {tabs.map((tab, index) => (
          <TabPanel key={index} value={activeTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </motion.div>
    </Box>
  );
};

export default TeacherDashboard;
