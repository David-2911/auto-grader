import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  IconButton,
  Button,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Storage as StorageIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';

import { adminService } from '../../services/admin.service';
import DashboardOverview from '../../components/admin/DashboardOverview';
import UserManagement from '../../components/admin/UserManagement';
import CourseManagement from '../../components/admin/CourseManagement';
import AssignmentManagement from '../../components/admin/AssignmentManagement';
import SystemMonitoring from '../../components/admin/SystemMonitoring';
import Analytics from '../../components/admin/Analytics';
import ConfigurationManagement from '../../components/admin/ConfigurationManagement';
import AuditLogs from '../../components/admin/AuditLogs';
import DataExportBackup from '../../components/admin/DataExportBackup';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `admin-tab-${index}`,
    'aria-controls': `admin-tabpanel-${index}`,
  };
}

const AdminDashboard: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [realTimeData, setRealTimeData] = useState<any>(null);

  // Fetch dashboard statistics
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: () => adminService.getDashboardStats(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time data
  });

  // Fetch system status
  const {
    data: systemStatus,
    isLoading: statusLoading,
    error: statusError,
  } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => adminService.getSystemStatus(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefresh = () => {
    refetchStats();
  };

  // Set up real-time updates using WebSocket or Server-Sent Events
  useEffect(() => {
    // This would be implemented with Socket.io or SSE for real-time updates
    // For now, we'll use polling with React Query
  }, []);

  const tabs = [
    { label: 'Overview', icon: <DashboardIcon />, component: <DashboardOverview data={dashboardStats?.data} /> },
    { label: 'Users', icon: <PeopleIcon />, component: <UserManagement /> },
    { label: 'Courses', icon: <SchoolIcon />, component: <CourseManagement /> },
    { label: 'Assignments', icon: <AssignmentIcon />, component: <AssignmentManagement /> },
    { label: 'System', icon: <SettingsIcon />, component: <SystemMonitoring /> },
    { label: 'Analytics', icon: <AnalyticsIcon />, component: <Analytics /> },
    { label: 'Configuration', icon: <SecurityIcon />, component: <ConfigurationManagement /> },
    { label: 'Audit Logs', icon: <SecurityIcon />, component: <AuditLogs /> },
    { label: 'Backup', icon: <StorageIcon />, component: <DataExportBackup /> },
  ];

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Administrative Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {/* System Status Indicator */}
          {systemStatus?.data && (
            <Chip
              label={systemStatus.data.status === 'UP' ? 'System Online' : 'System Issues'}
              color={systemStatus.data.status === 'UP' ? 'success' : 'error'}
              variant="filled"
            />
          )}
          <IconButton onClick={handleRefresh} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Quick Stats Cards */}
      {statsLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : statsError ? (
        <Alert severity="error" sx={{ mb: 4 }}>
          Failed to load dashboard statistics. Please try again.
        </Alert>
      ) : (
        dashboardStats?.data && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Users
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.data.totalUsers || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    {dashboardStats.data.activeUsers || 0} active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Courses
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.data.totalCourses || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    {dashboardStats.data.activeCourses || 0} active
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    Total Assignments
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.data.totalAssignments || 0}
                  </Typography>
                  <Typography color="textSecondary">
                    {dashboardStats.data.pendingSubmissions || 0} pending
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom variant="h6">
                    System Load
                  </Typography>
                  <Typography variant="h4" component="div">
                    {dashboardStats.data.systemLoad || '0%'}
                  </Typography>
                  <Typography color="textSecondary">
                    CPU Usage
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )
      )}

      {/* Main Dashboard Content */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="admin dashboard tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                {...a11yProps(index)}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        {tabs.map((tab, index) => (
          <TabPanel key={index} value={currentTab} index={index}>
            {tab.component}
          </TabPanel>
        ))}
      </Paper>
    </Container>
  );
};

export default AdminDashboard;
