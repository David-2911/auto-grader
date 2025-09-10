import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tabs,
  Tab,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Grade as GradeIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Line, Bar, Doughnut, Pie } from 'react-chartjs-2';

import { adminService } from '../../services/admin.service';

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

const Analytics: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [timeRange, setTimeRange] = useState('30d');
  const [courseFilter, setCourseFilter] = useState('all');

  // Fetch analytics data
  const {
    data: userAnalytics,
    isLoading: userLoading,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-user-analytics', timeRange],
    queryFn: () => adminService.getUserAnalytics({ timeRange }),
  });

  const {
    data: courseAnalytics,
    isLoading: courseLoading,
    refetch: refetchCourses,
  } = useQuery({
    queryKey: ['admin-course-analytics', timeRange, courseFilter],
    queryFn: () => adminService.getCourseAnalytics({ timeRange, course: courseFilter }),
  });

  const {
    data: assignmentAnalytics,
    isLoading: assignmentLoading,
    refetch: refetchAssignments,
  } = useQuery({
    queryKey: ['admin-assignment-analytics', timeRange],
    queryFn: () => adminService.getAssignmentAnalytics({ timeRange }),
  });

  const {
    data: gradingAnalytics,
    isLoading: gradingLoading,
    refetch: refetchGrading,
  } = useQuery({
    queryKey: ['admin-grading-analytics', timeRange],
    queryFn: () => adminService.getGradingAnalytics({ timeRange }),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleRefreshAll = () => {
    refetchUsers();
    refetchCourses();
    refetchAssignments();
    refetchGrading();
  };

  // Chart data preparation
  const userGrowthData = {
    labels: userAnalytics?.data?.timeline?.labels || [],
    datasets: [
      {
        label: 'New Users',
        data: userAnalytics?.data?.timeline?.newUsers || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
      },
      {
        label: 'Active Users',
        data: userAnalytics?.data?.timeline?.activeUsers || [],
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        tension: 0.1,
      },
    ],
  };

  const userRoleData = {
    labels: ['Students', 'Teachers', 'Admins'],
    datasets: [
      {
        data: [
          userAnalytics?.data?.roleDistribution?.students || 0,
          userAnalytics?.data?.roleDistribution?.teachers || 0,
          userAnalytics?.data?.roleDistribution?.admins || 0,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 206, 86, 1)',
          'rgba(255, 99, 132, 1)',
        ],
        borderWidth: 1,
      },
    ],
  };

  const courseEngagementData = {
    labels: courseAnalytics?.data?.engagementTimeline?.labels || [],
    datasets: [
      {
        label: 'Course Views',
        data: courseAnalytics?.data?.engagementTimeline?.views || [],
        backgroundColor: 'rgba(153, 102, 255, 0.8)',
      },
      {
        label: 'Submissions',
        data: courseAnalytics?.data?.engagementTimeline?.submissions || [],
        backgroundColor: 'rgba(255, 159, 64, 0.8)',
      },
    ],
  };

  const gradeDistributionData = {
    labels: ['A', 'B', 'C', 'D', 'F'],
    datasets: [
      {
        data: [
          gradingAnalytics?.data?.distribution?.A || 0,
          gradingAnalytics?.data?.distribution?.B || 0,
          gradingAnalytics?.data?.distribution?.C || 0,
          gradingAnalytics?.data?.distribution?.D || 0,
          gradingAnalytics?.data?.distribution?.F || 0,
        ],
        backgroundColor: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 99, 132, 0.8)',
        ],
      },
    ],
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Analytics & Reports
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 3 months</MenuItem>
              <MenuItem value="1y">Last year</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => {}}
          >
            Export Report
          </Button>
          <IconButton onClick={handleRefreshAll} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <PeopleIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {userAnalytics?.data?.totalUsers || 0}
              </Typography>
              <Typography color="textSecondary">Total Users</Typography>
              <Typography variant="body2" color="success.main">
                +{userAnalytics?.data?.newUsersThisPeriod || 0} this period
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SchoolIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {courseAnalytics?.data?.totalCourses || 0}
              </Typography>
              <Typography color="textSecondary">Active Courses</Typography>
              <Typography variant="body2" color="info.main">
                {courseAnalytics?.data?.averageEnrollment || 0} avg enrollment
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {assignmentAnalytics?.data?.totalSubmissions || 0}
              </Typography>
              <Typography color="textSecondary">Submissions</Typography>
              <Typography variant="body2" color="warning.main">
                {assignmentAnalytics?.data?.avgSubmissionTime || 0}h avg time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <GradeIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {gradingAnalytics?.data?.averageGrade || 0}%
              </Typography>
              <Typography color="textSecondary">Average Grade</Typography>
              <Typography variant="body2" color="success.main">
                {gradingAnalytics?.data?.gradingAccuracy || 0}% accuracy
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Analytics Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="analytics tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab icon={<PeopleIcon />} label="User Analytics" />
            <Tab icon={<SchoolIcon />} label="Course Analytics" />
            <Tab icon={<AssignmentIcon />} label="Assignment Analytics" />
            <Tab icon={<GradeIcon />} label="Grading Analytics" />
          </Tabs>
        </Box>

        {/* User Analytics Tab */}
        <TabPanel value={currentTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  User Growth Over Time
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={userGrowthData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  User Role Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Doughnut 
                    data={userRoleData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Top Active Users
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>User</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Login Count</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Activity Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {userAnalytics?.data?.topUsers?.map((user: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>
                            <Chip label={user.role} size="small" />
                          </TableCell>
                          <TableCell>{user.loginCount}</TableCell>
                          <TableCell>{user.lastLogin}</TableCell>
                          <TableCell>{user.activityScore}</TableCell>
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
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Course Analytics Tab */}
        <TabPanel value={currentTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Filter by Course</InputLabel>
                  <Select
                    value={courseFilter}
                    label="Filter by Course"
                    onChange={(e) => setCourseFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Courses</MenuItem>
                    {courseAnalytics?.data?.courses?.map((course: any) => (
                      <MenuItem key={course.id} value={course.id}>
                        {course.title}
                      </MenuItem>
                    )) || []}
                  </Select>
                </FormControl>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Course Engagement Trends
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Bar 
                    data={courseEngagementData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top' as const,
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Course Performance Metrics
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Course</TableCell>
                        <TableCell>Enrollment</TableCell>
                        <TableCell>Completion Rate</TableCell>
                        <TableCell>Average Grade</TableCell>
                        <TableCell>Engagement Score</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {courseAnalytics?.data?.performanceMetrics?.map((course: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{course.title}</TableCell>
                          <TableCell>{course.enrollment}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${course.completionRate}%`}
                              color={course.completionRate > 80 ? 'success' : course.completionRate > 60 ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{course.averageGrade}%</TableCell>
                          <TableCell>{course.engagementScore}</TableCell>
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
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Assignment Analytics Tab */}
        <TabPanel value={currentTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Assignment Submission Trends
                </Typography>
                <Box sx={{ height: 300 }}>
                  {/* Assignment trends chart would go here */}
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', pt: 10 }}>
                    Assignment submission trends chart
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Assignment Difficulty Analysis
                </Typography>
                <Box sx={{ height: 300 }}>
                  {/* Difficulty analysis chart would go here */}
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', pt: 10 }}>
                    Assignment difficulty analysis chart
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Assignment Performance Summary
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Assignment</TableCell>
                        <TableCell>Course</TableCell>
                        <TableCell>Submissions</TableCell>
                        <TableCell>Average Score</TableCell>
                        <TableCell>Completion Rate</TableCell>
                        <TableCell>Average Time</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {assignmentAnalytics?.data?.performanceSummary?.map((assignment: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{assignment.title}</TableCell>
                          <TableCell>{assignment.course}</TableCell>
                          <TableCell>{assignment.submissions}</TableCell>
                          <TableCell>{assignment.averageScore}%</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${assignment.completionRate}%`}
                              color={assignment.completionRate > 80 ? 'success' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{assignment.averageTime}h</TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Grading Analytics Tab */}
        <TabPanel value={currentTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Grading Accuracy Over Time
                </Typography>
                <Box sx={{ height: 300 }}>
                  {/* Grading accuracy trend chart would go here */}
                  <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center', pt: 10 }}>
                    Grading accuracy trends chart
                  </Typography>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Grade Distribution
                </Typography>
                <Box sx={{ height: 300 }}>
                  <Pie 
                    data={gradeDistributionData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom' as const,
                        },
                      },
                    }}
                  />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  ML Model Performance
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Model</TableCell>
                        <TableCell>Accuracy</TableCell>
                        <TableCell>Precision</TableCell>
                        <TableCell>Recall</TableCell>
                        <TableCell>F1 Score</TableCell>
                        <TableCell>Last Updated</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {gradingAnalytics?.data?.modelPerformance?.map((model: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell>{model.name}</TableCell>
                          <TableCell>
                            <Chip 
                              label={`${model.accuracy}%`}
                              color={model.accuracy > 90 ? 'success' : model.accuracy > 80 ? 'warning' : 'error'}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{model.precision}%</TableCell>
                          <TableCell>{model.recall}%</TableCell>
                          <TableCell>{model.f1Score}</TableCell>
                          <TableCell>{model.lastUpdated}</TableCell>
                        </TableRow>
                      )) || (
                        <TableRow>
                          <TableCell colSpan={6} align="center">
                            No model data available
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default Analytics;
