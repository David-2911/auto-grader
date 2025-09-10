import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  ButtonGroup,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress,
  CircularProgress,
  Alert,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Grade as GradeIcon,
  Timeline as TimelineIcon,
  PieChart as PieChartIcon,
  BarChart as BarChartIcon,
  ShowChart as ShowChartIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { adminService } from '../../services/admin.service';
import {
  MetricsLineChart,
  PerformanceBarChart,
  DistributionPieChart,
  SystemMetricsDoughnut,
} from '../charts/AdminCharts';

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
      id={`analytics-tabpanel-${index}`}
      aria-labelledby={`analytics-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const EnhancedAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [chartType, setChartType] = useState('line');
  const [selectedMetric, setSelectedMetric] = useState('users');

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useQuery({
    queryKey: ['admin-analytics', timeRange],
    queryFn: () => adminService.getAnalytics({ timeRange }),
    select: (response) => response.data,
  });

  // Fetch user analytics
  const {
    data: userAnalytics,
    isLoading: userAnalyticsLoading,
  } = useQuery({
    queryKey: ['admin-user-analytics', timeRange],
    queryFn: () => adminService.getUserAnalytics({ timeRange }),
    select: (response) => response.data,
  });

  // Fetch course analytics
  const {
    data: courseAnalytics,
    isLoading: courseAnalyticsLoading,
  } = useQuery({
    queryKey: ['admin-course-analytics', timeRange],
    queryFn: () => adminService.getCourseAnalytics({ timeRange }),
    select: (response) => response.data,
  });

  // Fetch submission analytics
  const {
    data: submissionAnalytics,
    isLoading: submissionAnalyticsLoading,
  } = useQuery({
    queryKey: ['admin-submission-analytics', timeRange],
    queryFn: () => adminService.getSubmissionAnalytics({ timeRange }),
    select: (response) => response.data,
  });

  // Fetch performance analytics
  const {
    data: performanceAnalytics,
    isLoading: performanceAnalyticsLoading,
  } = useQuery({
    queryKey: ['admin-performance-analytics', timeRange],
    queryFn: () => adminService.getPerformanceAnalytics({ timeRange }),
    select: (response) => response.data,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // Generate overview metrics
  const overviewMetrics = useMemo(() => {
    if (!analyticsData) return [];

    return [
      {
        title: 'Total Users',
        value: analyticsData.totalUsers || 0,
        change: analyticsData.userGrowth || 0,
        icon: <PeopleIcon />,
        color: 'primary',
      },
      {
        title: 'Active Courses',
        value: analyticsData.activeCourses || 0,
        change: analyticsData.courseGrowth || 0,
        icon: <SchoolIcon />,
        color: 'secondary',
      },
      {
        title: 'Total Assignments',
        value: analyticsData.totalAssignments || 0,
        change: analyticsData.assignmentGrowth || 0,
        icon: <AssignmentIcon />,
        color: 'info',
      },
      {
        title: 'Submissions Today',
        value: analyticsData.todaySubmissions || 0,
        change: analyticsData.submissionGrowth || 0,
        icon: <GradeIcon />,
        color: 'success',
      },
    ];
  }, [analyticsData]);

  // Generate user activity chart data
  const userActivityChartData = useMemo(() => {
    if (!userAnalytics?.activityTrend) return null;

    return {
      labels: userAnalytics.activityTrend.map((item: any) => item.date),
      datasets: [
        {
          label: 'Daily Active Users',
          data: userAnalytics.activityTrend.map((item: any) => item.activeUsers),
          borderColor: '#2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
        },
        {
          label: 'New Registrations',
          data: userAnalytics.activityTrend.map((item: any) => item.newUsers),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: true,
        },
      ],
    };
  }, [userAnalytics]);

  // Generate course performance chart data
  const coursePerformanceData = useMemo(() => {
    if (!courseAnalytics?.topCourses) return null;

    return {
      labels: courseAnalytics.topCourses.map((course: any) => course.name),
      datasets: [{
        label: 'Average Grade',
        data: courseAnalytics.topCourses.map((course: any) => course.averageGrade),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#4BC0C0', '#FF6384'
        ],
      }],
    };
  }, [courseAnalytics]);

  // Generate submission trend data
  const submissionTrendData = useMemo(() => {
    if (!submissionAnalytics?.submissionTrend) return null;

    return {
      labels: submissionAnalytics.submissionTrend.map((item: any) => item.date),
      datasets: [
        {
          label: 'Total Submissions',
          data: submissionAnalytics.submissionTrend.map((item: any) => item.total),
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
        },
        {
          label: 'Graded',
          data: submissionAnalytics.submissionTrend.map((item: any) => item.graded),
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
        },
        {
          label: 'Pending',
          data: submissionAnalytics.submissionTrend.map((item: any) => item.pending),
          borderColor: '#FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
        },
      ],
    };
  }, [submissionAnalytics]);

  // Generate user role distribution
  const userRoleDistribution = useMemo(() => {
    if (!userAnalytics?.roleDistribution) return null;

    return {
      labels: Object.keys(userAnalytics.roleDistribution),
      datasets: [{
        data: Object.values(userAnalytics.roleDistribution),
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56'],
        borderWidth: 2,
      }],
    };
  }, [userAnalytics]);

  // Generate performance metrics
  const performanceMetricsData = useMemo(() => {
    if (!performanceAnalytics?.metrics) return null;

    return {
      labels: ['Response Time', 'Accuracy', 'Efficiency', 'User Satisfaction'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          performanceAnalytics.metrics.responseTime,
          performanceAnalytics.metrics.accuracy,
          performanceAnalytics.metrics.efficiency,
          performanceAnalytics.metrics.satisfaction,
        ],
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
      }],
    };
  }, [performanceAnalytics]);

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUpIcon color="success" />;
    if (change < 0) return <TrendingDownIcon color="error" />;
    return null;
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  return (
    <Box>
      {/* Header Controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Analytics Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 Days</MenuItem>
              <MenuItem value="30d">Last 30 Days</MenuItem>
              <MenuItem value="90d">Last 3 Months</MenuItem>
              <MenuItem value="1y">Last Year</MenuItem>
            </Select>
          </FormControl>
          <ButtonGroup size="small">
            <Button
              variant={chartType === 'line' ? 'contained' : 'outlined'}
              onClick={() => setChartType('line')}
              startIcon={<ShowChartIcon />}
            >
              Line
            </Button>
            <Button
              variant={chartType === 'bar' ? 'contained' : 'outlined'}
              onClick={() => setChartType('bar')}
              startIcon={<BarChartIcon />}
            >
              Bar
            </Button>
            <Button
              variant={chartType === 'pie' ? 'contained' : 'outlined'}
              onClick={() => setChartType('pie')}
              startIcon={<PieChartIcon />}
            >
              Pie
            </Button>
          </ButtonGroup>
          <Tooltip title="Refresh Data">
            <IconButton onClick={() => refetchAnalytics()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            Export Report
          </Button>
        </Box>
      </Box>

      {/* Overview Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {overviewMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={metric.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
            >
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 48,
                        height: 48,
                        borderRadius: 2,
                        bgcolor: `${metric.color}.main`,
                        color: 'white',
                        mr: 2,
                      }}
                    >
                      {metric.icon}
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {metric.value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {metric.title}
                      </Typography>
                    </Box>
                  </Box>
                  {metric.change !== 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getChangeIcon(metric.change)}
                      <Typography
                        variant="body2"
                        color={metric.change > 0 ? 'success.main' : 'error.main'}
                        sx={{ ml: 0.5 }}
                      >
                        {formatPercentage(metric.change)} from last period
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Tabs for different analytics views */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="Overview" icon={<AssessmentIcon />} />
          <Tab label="User Analytics" icon={<PeopleIcon />} />
          <Tab label="Course Performance" icon={<SchoolIcon />} />
          <Tab label="Submissions" icon={<GradeIcon />} />
          <Tab label="System Performance" icon={<TimelineIcon />} />
        </Tabs>
      </Box>

      {/* Overview Tab */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {userActivityChartData ? (
              <MetricsLineChart
                title="User Activity Trend"
                data={userActivityChartData}
                height={400}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading user activity data...
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            {userRoleDistribution ? (
              <DistributionPieChart
                title="User Role Distribution"
                data={userRoleDistribution}
                height={400}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading role distribution...
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Insights
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon>
                      <StarIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="User Engagement"
                      secondary={`Average session duration has ${analyticsData?.engagementChange > 0 ? 'increased' : 'decreased'} by ${Math.abs(analyticsData?.engagementChange || 0)}% this period`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckCircleIcon color="success" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Submission Success Rate"
                      secondary={`${analyticsData?.successRate || 85}% of assignments are submitted on time`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <WarningIcon color="warning" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Areas for Improvement"
                      secondary="Consider implementing automated reminders for pending assignments"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* User Analytics Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            {userAnalyticsLoading ? (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
              </Paper>
            ) : (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Registration Trend
                  </Typography>
                  {/* User registration chart would go here */}
                  <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="textSecondary">User registration chart</Typography>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Engagement Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Average Session Duration"
                      secondary={`${userAnalytics?.averageSessionDuration || 0} minutes`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Monthly Active Users"
                      secondary={userAnalytics?.monthlyActiveUsers || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="User Retention Rate"
                      secondary={`${userAnalytics?.retentionRate || 0}%`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Top Active Users
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Sessions</TableCell>
                        <TableCell>Last Active</TableCell>
                        <TableCell>Activity Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {userAnalytics?.topUsers?.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>
                            <Chip label={user.role} size="small" />
                          </TableCell>
                          <TableCell>{user.sessions}</TableCell>
                          <TableCell>{new Date(user.lastActive).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <LinearProgress
                              variant="determinate"
                              value={user.activityScore}
                              sx={{ width: 100, mr: 1 }}
                            />
                            {user.activityScore}%
                          </TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={5} align="center">
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Course Performance Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {coursePerformanceData ? (
              <PerformanceBarChart
                title="Course Performance Overview"
                data={coursePerformanceData}
                height={400}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading course performance data...
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Course Statistics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Total Courses"
                      secondary={courseAnalytics?.totalCourses || 0}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Average Enrollment"
                      secondary={`${courseAnalytics?.averageEnrollment || 0} students`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Completion Rate"
                      secondary={`${courseAnalytics?.completionRate || 0}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Average Grade"
                      secondary={`${courseAnalytics?.averageGrade || 0}/100`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Submissions Tab */}
      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            {submissionTrendData ? (
              <MetricsLineChart
                title="Submission Trends"
                data={submissionTrendData}
                height={400}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading submission data...
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Submission Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {submissionAnalytics?.totalSubmissions || 0}
                      </Typography>
                      <Typography variant="body2">Total Submissions</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {submissionAnalytics?.gradedSubmissions || 0}
                      </Typography>
                      <Typography variant="body2">Graded</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {submissionAnalytics?.pendingSubmissions || 0}
                      </Typography>
                      <Typography variant="body2">Pending</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {submissionAnalytics?.lateSubmissions || 0}
                      </Typography>
                      <Typography variant="body2">Late</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Grading Performance
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Average Grading Time"
                      secondary={`${submissionAnalytics?.averageGradingTime || 0} hours`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Auto-Grading Success Rate"
                      secondary={`${submissionAnalytics?.autoGradingSuccessRate || 0}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Manual Review Required"
                      secondary={`${submissionAnalytics?.manualReviewRate || 0}%`}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* System Performance Tab */}
      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {performanceMetricsData ? (
              <PerformanceBarChart
                title="System Performance Metrics"
                data={performanceMetricsData}
                height={400}
              />
            ) : (
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Loading performance data...
                </Typography>
              </Paper>
            )}
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Summary
                </Typography>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="System Uptime"
                      secondary={`${performanceAnalytics?.uptime || 99.9}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Avg Response Time"
                      secondary={`${performanceAnalytics?.responseTime || 0}ms`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Error Rate"
                      secondary={`${performanceAnalytics?.errorRate || 0}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemText
                      primary="Active Sessions"
                      secondary={performanceAnalytics?.activeSessions || 0}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Error State */}
      {analyticsError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load analytics data. Please try refreshing the page.
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedAnalytics;
