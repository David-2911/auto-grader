import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Button,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  EmojiEvents,
  Star,
  Assignment,
  School,
  Timeline,
  Target,
  CheckCircle,
  WorkspacePremium,
  LocalFireDepartment,
  Psychology,
  ExpandMore,
  Add,
  Edit,
  Delete,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement,
} from 'chart.js';
import { Submission, Course, PerformanceMetrics } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  BarElement
);

const AchievementCard = styled(Card)(({ theme, earned }: { theme: any; earned: boolean }) => ({
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  opacity: earned ? 1 : 0.6,
  background: earned 
    ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`
    : theme.palette.background.paper,
  color: earned ? theme.palette.primary.contrastText : theme.palette.text.primary,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
}));

const StreakCounter = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: `linear-gradient(135deg, ${theme.palette.warning.main} 0%, ${theme.palette.error.main} 100%)`,
  borderRadius: theme.spacing(2),
  padding: theme.spacing(2),
  color: theme.palette.warning.contrastText,
  minHeight: 100,
}));

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  earned: boolean;
  progress: number;
  requirement: number;
  category: 'academic' | 'engagement' | 'improvement' | 'milestone';
  earnedDate?: string;
}

interface Goal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
  category: 'grade' | 'submission' | 'completion';
  priority: 'low' | 'medium' | 'high';
}

interface ProgressTrackingProps {
  submissions: Submission[];
  courses: Course[];
  performance: PerformanceMetrics | null;
  loading?: boolean;
}

export const ProgressTracking: React.FC<ProgressTrackingProps> = ({
  submissions,
  courses,
  performance,
  loading = false,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'semester'>('month');
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [newGoal, setNewGoal] = useState<Partial<Goal>>({
    title: '',
    description: '',
    targetValue: 0,
    category: 'grade',
    priority: 'medium',
    deadline: '',
  });

  // Mock data for achievements
  const [achievements] = useState<Achievement[]>([
    {
      id: '1',
      title: 'First Steps',
      description: 'Submit your first assignment',
      icon: <Assignment />,
      earned: submissions.length > 0,
      progress: Math.min(submissions.length, 1),
      requirement: 1,
      category: 'milestone',
      earnedDate: submissions.length > 0 ? submissions[0].submittedAt : undefined,
    },
    {
      id: '2',
      title: 'Perfect Score',
      description: 'Achieve 100% on an assignment',
      icon: <Star />,
      earned: submissions.some(s => s.grade === s.assignment?.totalPoints),
      progress: submissions.filter(s => s.grade === s.assignment?.totalPoints).length,
      requirement: 1,
      category: 'academic',
    },
    {
      id: '3',
      title: 'Consistent Performer',
      description: 'Submit 5 assignments on time',
      icon: <CheckCircle />,
      earned: submissions.length >= 5,
      progress: submissions.length,
      requirement: 5,
      category: 'engagement',
    },
    {
      id: '4',
      title: 'High Achiever',
      description: 'Maintain above 85% average',
      icon: <EmojiEvents />,
      earned: (performance?.averageGrade || 0) >= 85,
      progress: performance?.averageGrade || 0,
      requirement: 85,
      category: 'academic',
    },
    {
      id: '5',
      title: 'Course Completionist',
      description: 'Complete all assignments in a course',
      icon: <WorkspacePremium />,
      earned: false, // This would be calculated based on course completion
      progress: 0,
      requirement: 1,
      category: 'milestone',
    },
    {
      id: '6',
      title: 'Improvement Champion',
      description: 'Improve grade by 10% from first to last assignment',
      icon: <TrendingUp />,
      earned: false, // This would be calculated based on grade trends
      progress: 0,
      requirement: 10,
      category: 'improvement',
    },
  ]);

  const [goals, setGoals] = useState<Goal[]>([
    {
      id: '1',
      title: 'Achieve 90% Average',
      description: 'Maintain a 90% or higher average across all courses',
      targetValue: 90,
      currentValue: performance?.averageGrade || 0,
      deadline: '2024-12-31',
      category: 'grade',
      priority: 'high',
    },
    {
      id: '2',
      title: 'Complete All Assignments',
      description: 'Submit all assignments before their deadlines',
      targetValue: 100,
      currentValue: performance?.submissionRate || 0,
      deadline: '2024-12-31',
      category: 'submission',
      priority: 'medium',
    },
  ]);

  // Calculate streak (consecutive days with activity)
  const calculateStreak = () => {
    // This is a simplified calculation
    // In reality, you'd check consecutive days of activity
    return Math.min(submissions.length, 7); // Mock streak
  };

  const streak = calculateStreak();

  // Grade trend data for chart
  const gradeData = {
    labels: submissions.slice(-6).map((_, index) => `Assignment ${index + 1}`),
    datasets: [
      {
        label: 'Grade Percentage',
        data: submissions.slice(-6).map(s => 
          s.grade && s.assignment ? (s.grade / s.assignment.totalPoints) * 100 : 0
        ),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.4,
      },
    ],
  };

  // Performance distribution
  const performanceData = {
    labels: ['A (90-100%)', 'B (80-89%)', 'C (70-79%)', 'D (60-69%)', 'F (<60%)'],
    datasets: [
      {
        data: [
          submissions.filter(s => s.grade && s.assignment && (s.grade / s.assignment.totalPoints) * 100 >= 90).length,
          submissions.filter(s => s.grade && s.assignment && (s.grade / s.assignment.totalPoints) * 100 >= 80 && (s.grade / s.assignment.totalPoints) * 100 < 90).length,
          submissions.filter(s => s.grade && s.assignment && (s.grade / s.assignment.totalPoints) * 100 >= 70 && (s.grade / s.assignment.totalPoints) * 100 < 80).length,
          submissions.filter(s => s.grade && s.assignment && (s.grade / s.assignment.totalPoints) * 100 >= 60 && (s.grade / s.assignment.totalPoints) * 100 < 70).length,
          submissions.filter(s => s.grade && s.assignment && (s.grade / s.assignment.totalPoints) * 100 < 60).length,
        ],
        backgroundColor: [
          '#4caf50',
          '#2196f3',
          '#ff9800',
          '#f44336',
          '#9c27b0',
        ],
      },
    ],
  };

  const addGoal = () => {
    if (newGoal.title && newGoal.targetValue && newGoal.deadline) {
      const goal: Goal = {
        id: Date.now().toString(),
        title: newGoal.title!,
        description: newGoal.description || '',
        targetValue: newGoal.targetValue!,
        currentValue: 0,
        deadline: newGoal.deadline!,
        category: newGoal.category!,
        priority: newGoal.priority!,
      };
      setGoals(prev => [...prev, goal]);
      setNewGoal({
        title: '',
        description: '',
        targetValue: 0,
        category: 'grade',
        priority: 'medium',
        deadline: '',
      });
      setShowGoalDialog(false);
    }
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading progress data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Progress Tracking
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {['week', 'month', 'semester'].map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setSelectedTimeframe(timeframe as any)}
            >
              {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
            </Button>
          ))}
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Key Metrics */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {/* Streak Counter */}
            <Grid item xs={12} sm={6} md={3}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <StreakCounter>
                  <Box sx={{ textAlign: 'center' }}>
                    <LocalFireDepartment sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h4" fontWeight="bold">
                      {streak}
                    </Typography>
                    <Typography variant="body2">
                      Day Streak
                    </Typography>
                  </Box>
                </StreakCounter>
              </motion.div>
            </Grid>

            {/* Total Submissions */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <Assignment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {submissions.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Submissions
                </Typography>
              </Card>
            </Grid>

            {/* Average Grade */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <TrendingUp sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {(performance?.averageGrade || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Grade
                </Typography>
              </Card>
            </Grid>

            {/* Completion Rate */}
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ textAlign: 'center', p: 2 }}>
                <CheckCircle sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" fontWeight="bold">
                  {(performance?.completionRate || 0).toFixed(1)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Completion Rate
                </Typography>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Motivational Message */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card sx={{ p: 3, textAlign: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <Psychology sx={{ fontSize: 48, mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Keep It Up! 🚀
              </Typography>
              <Typography variant="body2">
                You're doing great! Your consistency is paying off. 
                {streak > 0 && ` You've maintained a ${streak}-day streak!`}
                {(performance?.averageGrade || 0) >= 85 && ' Your grades are excellent!'}
              </Typography>
            </Card>
          </motion.div>
        </Grid>

        {/* Grade Trend Chart */}
        <Grid item xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Timeline sx={{ mr: 1 }} />
              Grade Trends
            </Typography>
            <Box sx={{ height: 300 }}>
              <Line 
                data={gradeData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                    },
                  },
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Performance Distribution */}
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Grade Distribution
            </Typography>
            <Box sx={{ height: 300 }}>
              <Doughnut 
                data={performanceData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                }}
              />
            </Box>
          </Card>
        </Grid>

        {/* Achievements */}
        <Grid item xs={12}>
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <EmojiEvents sx={{ mr: 1 }} />
                Achievements ({achievements.filter(a => a.earned).length}/{achievements.length})
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {achievements.map((achievement) => (
                  <Grid item xs={12} sm={6} md={4} key={achievement.id}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <AchievementCard earned={achievement.earned}>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Avatar sx={{ 
                            mx: 'auto', 
                            mb: 2, 
                            bgcolor: achievement.earned ? 'transparent' : 'grey.300',
                            color: achievement.earned ? 'inherit' : 'grey.600',
                          }}>
                            {achievement.icon}
                          </Avatar>
                          <Typography variant="h6" gutterBottom>
                            {achievement.title}
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {achievement.description}
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(achievement.progress / achievement.requirement) * 100}
                              sx={{ 
                                height: 8, 
                                borderRadius: 4,
                                backgroundColor: achievement.earned ? 'rgba(255,255,255,0.3)' : 'grey.300',
                              }}
                            />
                            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                              {achievement.progress}/{achievement.requirement}
                            </Typography>
                          </Box>
                          {achievement.earned && achievement.earnedDate && (
                            <Chip
                              label={`Earned ${new Date(achievement.earnedDate).toLocaleDateString()}`}
                              size="small"
                              sx={{ 
                                backgroundColor: 'rgba(255,255,255,0.2)',
                                color: 'inherit',
                              }}
                            />
                          )}
                        </CardContent>
                      </AchievementCard>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>

        {/* Personal Goals */}
        <Grid item xs={12}>
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <Target sx={{ mr: 1 }} />
                Personal Goals ({goals.filter(g => (g.currentValue / g.targetValue) * 100 >= 100).length}/{goals.length} completed)
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowGoalDialog(true)}
                >
                  Add Goal
                </Button>
              </Box>
              
              <Grid container spacing={2}>
                {goals.map((goal) => {
                  const progress = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
                  const isCompleted = progress >= 100;
                  const daysUntilDeadline = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                  return (
                    <Grid item xs={12} md={6} key={goal.id}>
                      <Card sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              {goal.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {goal.description}
                            </Typography>
                          </Box>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => removeGoal(goal.id)}
                          >
                            <Delete fontSize="small" />
                          </Button>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2">
                              Progress: {goal.currentValue.toFixed(1)}/{goal.targetValue}
                            </Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {progress.toFixed(1)}%
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={progress}
                            color={isCompleted ? 'success' : progress > 75 ? 'info' : progress > 50 ? 'warning' : 'error'}
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Chip
                            label={goal.priority}
                            size="small"
                            color={goal.priority === 'high' ? 'error' : goal.priority === 'medium' ? 'warning' : 'default'}
                            variant="outlined"
                          />
                          <Typography variant="caption" color="text.secondary">
                            {daysUntilDeadline > 0 ? `${daysUntilDeadline} days left` : 'Deadline passed'}
                          </Typography>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            </AccordionDetails>
          </Accordion>
        </Grid>
      </Grid>

      {/* Add Goal Dialog */}
      <Dialog open={showGoalDialog} onClose={() => setShowGoalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Goal</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Goal Title"
            value={newGoal.title}
            onChange={(e) => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={newGoal.description}
            onChange={(e) => setNewGoal(prev => ({ ...prev, description: e.target.value }))}
            margin="normal"
            multiline
            rows={2}
          />
          <TextField
            fullWidth
            type="number"
            label="Target Value"
            value={newGoal.targetValue}
            onChange={(e) => setNewGoal(prev => ({ ...prev, targetValue: parseFloat(e.target.value) }))}
            margin="normal"
          />
          <TextField
            fullWidth
            select
            label="Category"
            value={newGoal.category}
            onChange={(e) => setNewGoal(prev => ({ ...prev, category: e.target.value as any }))}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="grade">Grade</option>
            <option value="submission">Submission</option>
            <option value="completion">Completion</option>
          </TextField>
          <TextField
            fullWidth
            select
            label="Priority"
            value={newGoal.priority}
            onChange={(e) => setNewGoal(prev => ({ ...prev, priority: e.target.value as any }))}
            margin="normal"
            SelectProps={{ native: true }}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </TextField>
          <TextField
            fullWidth
            type="date"
            label="Deadline"
            value={newGoal.deadline}
            onChange={(e) => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGoalDialog(false)}>Cancel</Button>
          <Button onClick={addGoal} variant="contained">Add Goal</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgressTracking;
