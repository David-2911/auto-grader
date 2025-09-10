import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  IconButton,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useTheme,
  alpha,
} from '@mui/material';
import {
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Grade as GradeIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';

// Mock data - replace with actual API calls
const mockStats = {
  totalCourses: 5,
  totalStudents: 127,
  totalAssignments: 23,
  pendingGrades: 15,
  averageGrade: 82.5,
  completionRate: 91.2,
};

const mockRecentActivity = [
  {
    id: 1,
    type: 'submission',
    student: 'John Doe',
    assignment: 'Python Programming Basics',
    timestamp: '2 hours ago',
    status: 'pending',
  },
  {
    id: 2,
    type: 'grade',
    student: 'Jane Smith',
    assignment: 'Data Structures Quiz',
    timestamp: '4 hours ago',
    status: 'completed',
  },
  {
    id: 3,
    type: 'question',
    student: 'Mike Johnson',
    assignment: 'Algorithm Analysis',
    timestamp: '1 day ago',
    status: 'answered',
  },
];

const mockCoursePerformance = [
  { course: 'CS101', students: 45, avgGrade: 85, completion: 92 },
  { course: 'CS201', students: 38, avgGrade: 78, completion: 88 },
  { course: 'CS301', students: 32, avgGrade: 82, completion: 95 },
  { course: 'CS401', students: 12, avgGrade: 89, completion: 97 },
];

const mockGradeDistribution = [
  { name: 'A (90-100)', value: 35, color: '#4caf50' },
  { name: 'B (80-89)', value: 42, color: '#2196f3' },
  { name: 'C (70-79)', value: 18, color: '#ff9800' },
  { name: 'D (60-69)', value: 4, color: '#f44336' },
  { name: 'F (0-59)', value: 1, color: '#9c27b0' },
];

const TeacherOverview: React.FC = () => {
  const theme = useTheme();

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    change?: string;
    trend?: 'up' | 'down';
  }> = ({ title, value, icon, color, change, trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          height: '100%',
          background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
          color: 'white',
          cursor: 'pointer',
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box>
              <Typography variant="body2" sx={{ opacity: 0.8 }}>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {value}
              </Typography>
              {change && (
                <Box display="flex" alignItems="center" mt={1}>
                  {trend === 'up' ? (
                    <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5 }} />
                  ) : (
                    <TrendingUpIcon sx={{ fontSize: 16, mr: 0.5, transform: 'rotate(180deg)' }} />
                  )}
                  <Typography variant="body2">{change}</Typography>
                </Box>
              )}
            </Box>
            <Avatar sx={{ bgcolor: alpha(theme.palette.common.white, 0.2) }}>
              {icon}
            </Avatar>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Box>
      {/* Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Courses"
            value={mockStats.totalCourses}
            icon={<SchoolIcon />}
            color={theme.palette.primary.main}
            change="+2 this semester"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Students"
            value={mockStats.totalStudents}
            icon={<PeopleIcon />}
            color={theme.palette.secondary.main}
            change="+15 this month"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Assignments"
            value={mockStats.totalAssignments}
            icon={<AssignmentIcon />}
            color={theme.palette.success.main}
            change="3 due this week"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Pending Grades"
            value={mockStats.pendingGrades}
            icon={<GradeIcon />}
            color={theme.palette.warning.main}
            change="-5 from yesterday"
            trend="down"
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Course Performance Chart */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Course Performance Overview
                </Typography>
                <IconButton size="small">
                  <MoreVertIcon />
                </IconButton>
              </Box>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={mockCoursePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="course" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgGrade" fill={theme.palette.primary.main} name="Avg Grade" />
                  <Bar dataKey="completion" fill={theme.palette.secondary.main} name="Completion %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Grade Distribution */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Grade Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={mockGradeDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {mockGradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="bold">
                  Recent Activity
                </Typography>
                <Button variant="outlined" size="small">
                  View All
                </Button>
              </Box>
              <List>
                {mockRecentActivity.map((activity) => (
                  <ListItem key={activity.id} divider>
                    <ListItemAvatar>
                      <Avatar
                        sx={{
                          bgcolor:
                            activity.status === 'pending'
                              ? theme.palette.warning.main
                              : activity.status === 'completed'
                              ? theme.palette.success.main
                              : theme.palette.info.main,
                        }}
                      >
                        {activity.type === 'submission' ? (
                          <AssignmentIcon />
                        ) : activity.type === 'grade' ? (
                          <GradeIcon />
                        ) : (
                          <NotificationsIcon />
                        )}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={`${activity.student} - ${activity.assignment}`}
                      secondary={activity.timestamp}
                    />
                    <Chip
                      label={activity.status}
                      size="small"
                      color={
                        activity.status === 'pending'
                          ? 'warning'
                          : activity.status === 'completed'
                          ? 'success'
                          : 'info'
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" mb={2}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<SchoolIcon />}
                    sx={{ py: 1.5 }}
                  >
                    Create Course
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<AssignmentIcon />}
                    sx={{ py: 1.5 }}
                  >
                    New Assignment
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<GradeIcon />}
                    sx={{ py: 1.5 }}
                  >
                    Grade Submissions
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<PeopleIcon />}
                    sx={{ py: 1.5 }}
                  >
                    Manage Students
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TeacherOverview;
