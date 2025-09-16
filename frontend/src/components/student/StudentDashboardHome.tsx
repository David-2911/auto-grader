import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Chip,
  Button,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  IconButton,
  Badge,
  Alert,
} from '@mui/material';
import {
  Assignment,
  TrendingUp,
  Schedule,
  Star,
  Notifications,
  ChevronRight,
  Assessment,
  School,
  EmojiEvents,
  Warning,
  CheckCircle,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Assignment as AssignmentType, Submission, Course, Notification as NotificationType } from '@/types';

const StatCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
  color: theme.palette.primary.contrastText,
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const AssignmentCard = styled(Card)(({ theme }) => ({
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const ProgressRing = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 60,
  height: 60,
}));

interface StudentDashboardHomeProps {
  assignments: AssignmentType[];
  recentGrades: Submission[];
  upcomingDeadlines: AssignmentType[];
  courses: Course[];
  notifications: NotificationType[];
  performance: {
    averageGrade: number;
    submissionRate: number;
    completionRate: number;
  } | null;
  loading?: boolean;
}

export const StudentDashboardHome: React.FC<StudentDashboardHomeProps> = ({
  assignments,
  recentGrades,
  upcomingDeadlines,
  courses,
  notifications,
  performance,
  loading = false,
}) => {
  const navigate = useNavigate();

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return { status: 'overdue', color: 'error', text: 'Overdue' };
    if (daysDiff === 0) return { status: 'today', color: 'warning', text: 'Due Today' };
    if (daysDiff === 1) return { status: 'tomorrow', color: 'warning', text: 'Due Tomorrow' };
    if (daysDiff <= 7) return { status: 'week', color: 'info', text: `Due in ${daysDiff} days` };
    return { status: 'future', color: 'success', text: `Due in ${daysDiff} days` };
  };

  const getGradeColor = (grade: number, total: number) => {
    const percentage = (grade / total) * 100;
    if (percentage >= 90) return 'success';
    if (percentage >= 80) return 'info';
    if (percentage >= 70) return 'warning';
    return 'error';
  };

  const unreadNotifications = notifications.filter(n => !n.read);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Welcome Message */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" gutterBottom>
            Welcome back! 👋
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's an overview of your academic progress and upcoming deadlines.
          </Typography>
        </Box>
      </motion.div>

      {/* Stats Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <StatCard>
              <CardContent sx={{ textAlign: 'center' }}>
                <Assignment sx={{ fontSize: 40, mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {assignments.length}
                </Typography>
                <Typography variant="body2">
                  Active Assignments
                </Typography>
              </CardContent>
            </StatCard>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <TrendingUp sx={{ fontSize: 40, mb: 1, color: 'success.main' }} />
                <Typography variant="h4" fontWeight="bold">
                  {performance?.averageGrade?.toFixed(1) || 'N/A'}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Grade
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <Schedule sx={{ fontSize: 40, mb: 1, color: 'warning.main' }} />
                <Typography variant="h4" fontWeight="bold">
                  {upcomingDeadlines.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Due This Week
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <School sx={{ fontSize: 40, mb: 1, color: 'info.main' }} />
                <Typography variant="h4" fontWeight="bold">
                  {courses.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enrolled Courses
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Upcoming Deadlines */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Schedule sx={{ mr: 1 }} />
                  Upcoming Deadlines
                </Typography>
                <Button
                  size="small"
                  endIcon={<ChevronRight />}
                  onClick={() => navigate('/student/assignments')}
                >
                  View All
                </Button>
              </Box>

              {upcomingDeadlines.length === 0 ? (
                <Alert severity="success" sx={{ display: 'flex', alignItems: 'center' }}>
                  <EmojiEvents sx={{ mr: 1 }} />
                  Great! No upcoming deadlines this week.
                </Alert>
              ) : (
                <List>
                  {upcomingDeadlines.slice(0, 4).map((assignment) => {
                    const deadline = getDeadlineStatus(assignment.deadline);
                    return (
                      <ListItem
                        key={assignment.id}
                        sx={{ px: 0, cursor: 'pointer' }}
                        onClick={() => navigate(`/student/assignments/${assignment.id}`)}
                      >
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${deadline.color}.main` }}>
                            {deadline.status === 'overdue' ? <Warning /> : <Assignment />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={assignment.title}
                          secondary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={deadline.text}
                                size="small"
                                color={deadline.color as any}
                                variant="outlined"
                              />
                              <Typography variant="caption">
                                {assignment.totalPoints} points
                              </Typography>
                            </Box>
                          }
                        />
                        <ChevronRight />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* Recent Grades */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Assessment sx={{ mr: 1 }} />
                  Recent Grades
                </Typography>
                <Button
                  size="small"
                  endIcon={<ChevronRight />}
                  onClick={() => navigate('/student/grades')}
                >
                  View All
                </Button>
              </Box>

              {recentGrades.length === 0 ? (
                <Alert severity="info">
                  No grades available yet. Complete some assignments to see your progress!
                </Alert>
              ) : (
                <List>
                  {recentGrades.slice(0, 4).map((submission) => {
                    const gradeColor = submission.grade !== null 
                      ? getGradeColor(submission.grade, submission.assignment?.totalPoints || 100)
                      : 'default';
                    const percentage = submission.grade !== null && submission.assignment
                      ? (submission.grade / submission.assignment.totalPoints) * 100
                      : 0;

                    return (
                      <ListItem key={submission.id} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: `${gradeColor}.main` }}>
                            {percentage >= 90 ? <Star /> : <Assessment />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={submission.assignment?.title || 'Assignment'}
                          secondary={
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                <Typography variant="body2" fontWeight="bold">
                                  {submission.grade || 'N/A'}/{submission.assignment?.totalPoints || 100}
                                </Typography>
                                {submission.grade !== null && (
                                  <Chip
                                    label={`${percentage.toFixed(1)}%`}
                                    size="small"
                                    color={gradeColor as any}
                                    variant="outlined"
                                  />
                                )}
                              </Box>
                              {percentage > 0 && (
                                <LinearProgress
                                  variant="determinate"
                                  value={percentage}
                                  color={gradeColor as any}
                                  sx={{ height: 4, borderRadius: 2 }}
                                />
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* Performance Overview */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <Paper sx={{ p: 3, height: '100%' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ mr: 1 }} />
                Performance Overview
              </Typography>

              {performance ? (
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ProgressRing>
                        <CircularProgress
                          variant="determinate"
                          value={performance.averageGrade}
                          size={60}
                          thickness={4}
                          color={performance.averageGrade >= 80 ? 'success' : performance.averageGrade >= 70 ? 'warning' : 'error'}
                        />
                        <Typography
                          variant="caption"
                          sx={{ position: 'absolute', fontWeight: 'bold' }}
                        >
                          {performance.averageGrade.toFixed(0)}%
                        </Typography>
                      </ProgressRing>
                      <Typography variant="caption" display="block">
                        Avg Grade
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ProgressRing>
                        <CircularProgress
                          variant="determinate"
                          value={performance.submissionRate}
                          size={60}
                          thickness={4}
                          color="info"
                        />
                        <Typography
                          variant="caption"
                          sx={{ position: 'absolute', fontWeight: 'bold' }}
                        >
                          {performance.submissionRate.toFixed(0)}%
                        </Typography>
                      </ProgressRing>
                      <Typography variant="caption" display="block">
                        Submission Rate
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <ProgressRing>
                        <CircularProgress
                          variant="determinate"
                          value={performance.completionRate}
                          size={60}
                          thickness={4}
                          color="primary"
                        />
                        <Typography
                          variant="caption"
                          sx={{ position: 'absolute', fontWeight: 'bold' }}
                        >
                          {performance.completionRate.toFixed(0)}%
                        </Typography>
                      </ProgressRing>
                      <Typography variant="caption" display="block">
                        Completion Rate
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">
                  Performance data will be available after you complete some assignments.
                </Alert>
              )}
            </Paper>
          </motion.div>
        </Grid>

        {/* Notifications */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Paper sx={{ p: 3, height: '100%' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                  <Badge badgeContent={unreadNotifications.length} color="error">
                    <Notifications sx={{ mr: 1 }} />
                  </Badge>
                  Notifications
                </Typography>
                <Button
                  size="small"
                  endIcon={<ChevronRight />}
                  onClick={() => navigate('/student/notifications')}
                >
                  View All
                </Button>
              </Box>

              {notifications.length === 0 ? (
                <Alert severity="info">
                  <CheckCircle sx={{ mr: 1 }} />
                  You're all caught up! No new notifications.
                </Alert>
              ) : (
                <List>
                  {notifications.slice(0, 3).map((notification) => (
                    <ListItem key={notification.id} sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ 
                          bgcolor: notification.read ? 'grey.300' : `${notification.type}.main`,
                          opacity: notification.read ? 0.6 : 1 
                        }}>
                          <Notification />
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={notification.title}
                        secondary={
                          <Box>
                            <Typography variant="body2" color="text.secondary">
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {new Date(notification.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                        }
                        sx={{ opacity: notification.read ? 0.6 : 1 }}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentDashboardHome;
