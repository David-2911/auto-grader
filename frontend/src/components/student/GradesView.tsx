import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Paper,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Error,
  Lightbulb,
  Assessment,
  Star,
  Warning,
  Info,
  Download,
  Visibility,
  School,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { Line } from 'react-chartjs-2';
import { Submission, Assignment, GradingResult, Course } from '@/types';

const GradeCard = styled(Card)(({ theme, gradePercentage }: { theme: any; gradePercentage: number }) => {
  const getGradeColor = () => {
    if (gradePercentage >= 90) return theme.palette.success.main;
    if (gradePercentage >= 80) return theme.palette.info.main;
    if (gradePercentage >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  return {
    border: `2px solid ${getGradeColor()}`,
    '&:hover': {
      boxShadow: theme.shadows[4],
    },
  };
});

const PerformanceRing = styled(Box)(({ theme }) => ({
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 80,
  height: 80,
}));

interface GradesViewProps {
  submissions: Submission[];
  assignments: Assignment[];
  courses: Course[];
  onViewFeedback: (submissionId: number) => void;
  loading?: boolean;
}

interface GradeDetailDialogProps {
  open: boolean;
  onClose: () => void;
  submission: Submission | null;
  gradingResult: GradingResult | null;
  loading: boolean;
}

const GradeDetailDialog: React.FC<GradeDetailDialogProps> = ({
  open,
  onClose,
  submission,
  gradingResult,
  loading,
}) => {
  if (!submission) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Grade Details - {submission.assignment?.title}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : gradingResult ? (
          <Box sx={{ mt: 2 }}>
            {/* Overall Grade */}
            <Paper sx={{ p: 3, mb: 3, textAlign: 'center' }}>
              <Typography variant="h3" color="primary" gutterBottom>
                {gradingResult.score}/{gradingResult.maxScore}
              </Typography>
              <Typography variant="h5" gutterBottom>
                {gradingResult.percentage.toFixed(1)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={gradingResult.percentage}
                sx={{ height: 8, borderRadius: 4, mt: 2 }}
                color={
                  gradingResult.percentage >= 90 ? 'success' :
                  gradingResult.percentage >= 80 ? 'info' :
                  gradingResult.percentage >= 70 ? 'warning' : 'error'
                }
              />
            </Paper>

            {/* Detailed Feedback */}
            {gradingResult.feedback && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Overall Feedback
                </Typography>
                <Typography variant="body2">
                  {gradingResult.feedback}
                </Typography>
              </Alert>
            )}

            {/* Grading Criteria */}
            {gradingResult.criteria && gradingResult.criteria.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Grading Breakdown
                </Typography>
                {gradingResult.criteria.map((criterion, index) => {
                  const percentage = (criterion.score / criterion.maxScore) * 100;
                  return (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2">
                          {criterion.name}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {criterion.score}/{criterion.maxScore} ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={percentage}
                        sx={{ height: 6, borderRadius: 3, mb: 1 }}
                        color={percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'error'}
                      />
                      {criterion.feedback && (
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.85rem' }}>
                          {criterion.feedback}
                        </Typography>
                      )}
                    </Box>
                  );
                })}
              </Box>
            )}

            {/* Improvement Suggestions */}
            {gradingResult.suggestions && gradingResult.suggestions.length > 0 && (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Lightbulb sx={{ mr: 1, color: 'warning.main' }} />
                  Suggestions for Improvement
                </Typography>
                <List>
                  {gradingResult.suggestions.map((suggestion, index) => (
                    <ListItem key={index} sx={{ pl: 0 }}>
                      <ListItemIcon>
                        <Lightbulb color="warning" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        ) : (
          <Alert severity="info">
            Detailed grading information is not available for this submission.
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {submission.originalFileName && (
          <Button startIcon={<Download />} variant="outlined">
            Download Submission
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export const GradesView: React.FC<GradesViewProps> = ({
  submissions,
  assignments,
  courses,
  onViewFeedback,
  loading = false,
}) => {
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [gradeDetailOpen, setGradeDetailOpen] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Calculate statistics
  const gradedSubmissions = submissions.filter(s => s.grade !== null);
  const totalPoints = gradedSubmissions.reduce((sum, s) => sum + (s.assignment?.totalPoints || 0), 0);
  const earnedPoints = gradedSubmissions.reduce((sum, s) => sum + (s.grade || 0), 0);
  const averageGrade = gradedSubmissions.length > 0 ? (earnedPoints / totalPoints) * 100 : 0;

  // Group submissions by course
  const submissionsByCourse = submissions.reduce((acc, submission) => {
    const course = courses.find(c => c.id === submission.assignment?.courseId);
    const courseName = course ? `${course.code} - ${course.title}` : 'Unknown Course';
    
    if (!acc[courseName]) {
      acc[courseName] = [];
    }
    acc[courseName].push(submission);
    return acc;
  }, {} as Record<string, Submission[]>);

  const handleViewDetails = async (submission: Submission) => {
    setSelectedSubmission(submission);
    setGradeDetailOpen(true);
    setLoadingDetails(true);
    
    try {
      // Simulate API call for detailed grading result
      // In real implementation, this would call the API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockGradingResult: GradingResult = {
        score: submission.grade || 0,
        maxScore: submission.assignment?.totalPoints || 100,
        percentage: submission.grade && submission.assignment 
          ? (submission.grade / submission.assignment.totalPoints) * 100 
          : 0,
        feedback: submission.feedback || 'Good work overall. Keep focusing on the key concepts.',
        criteria: [
          {
            name: 'Content Understanding',
            weight: 0.4,
            score: Math.floor((submission.grade || 0) * 0.4),
            maxScore: Math.floor((submission.assignment?.totalPoints || 100) * 0.4),
            feedback: 'Demonstrates good understanding of core concepts.',
          },
          {
            name: 'Technical Implementation',
            weight: 0.4,
            score: Math.floor((submission.grade || 0) * 0.4),
            maxScore: Math.floor((submission.assignment?.totalPoints || 100) * 0.4),
            feedback: 'Code is well-structured and follows best practices.',
          },
          {
            name: 'Documentation',
            weight: 0.2,
            score: Math.floor((submission.grade || 0) * 0.2),
            maxScore: Math.floor((submission.assignment?.totalPoints || 100) * 0.2),
            feedback: 'Could benefit from more detailed comments.',
          },
        ],
        suggestions: [
          'Consider adding more detailed explanations in your documentation',
          'Try to break down complex problems into smaller, manageable parts',
          'Review the course materials on error handling techniques',
        ],
      };
      
      setGradingResult(mockGradingResult);
    } catch (error) {
      console.error('Error loading grade details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading grades...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Grades & Feedback
      </Typography>

      {/* Overall Performance Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <PerformanceRing>
              <CircularProgress
                variant="determinate"
                value={averageGrade}
                size={80}
                thickness={4}
                color={averageGrade >= 80 ? 'success' : averageGrade >= 70 ? 'warning' : 'error'}
              />
              <Typography
                variant="h6"
                sx={{ position: 'absolute', fontWeight: 'bold' }}
              >
                {averageGrade.toFixed(1)}%
              </Typography>
            </PerformanceRing>
            <Typography variant="h6" sx={{ mt: 2 }}>
              Overall Average
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Based on {gradedSubmissions.length} graded assignments
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Assessment sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
            <Typography variant="h6">
              {earnedPoints}/{totalPoints}
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              Total Points
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Across all assignments
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <School sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
            <Typography variant="h6">
              {submissions.length}
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              Submissions
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {gradedSubmissions.length} graded, {submissions.length - gradedSubmissions.length} pending
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Grades by Course */}
      {submissions.length === 0 ? (
        <Alert severity="info">
          No submissions yet. Complete some assignments to see your grades here!
        </Alert>
      ) : (
        Object.entries(submissionsByCourse).map(([courseName, courseSubmissions]) => (
          <motion.div
            key={courseName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Accordion defaultExpanded sx={{ mb: 2 }}>
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    {courseName}
                  </Typography>
                  <Chip
                    label={`${courseSubmissions.filter(s => s.grade !== null).length}/${courseSubmissions.length} graded`}
                    size="small"
                    variant="outlined"
                    sx={{ mr: 2 }}
                  />
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  {courseSubmissions.map((submission) => {
                    const assignment = assignments.find(a => a.id === submission.assignmentId);
                    const gradePercentage = submission.grade && assignment
                      ? (submission.grade / assignment.totalPoints) * 100
                      : 0;

                    return (
                      <Grid item xs={12} md={6} lg={4} key={submission.id}>
                        <GradeCard gradePercentage={gradePercentage}>
                          <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                                {assignment?.title || 'Unknown Assignment'}
                              </Typography>
                              {submission.grade !== null ? (
                                <Chip
                                  icon={gradePercentage >= 80 ? <Star /> : <Assessment />}
                                  label={`${gradePercentage.toFixed(1)}%`}
                                  color={
                                    gradePercentage >= 90 ? 'success' :
                                    gradePercentage >= 80 ? 'info' :
                                    gradePercentage >= 70 ? 'warning' : 'error'
                                  }
                                  variant="filled"
                                />
                              ) : (
                                <Chip
                                  icon={<Warning />}
                                  label="Pending"
                                  color="default"
                                  variant="outlined"
                                />
                              )}
                            </Box>

                            {submission.grade !== null && assignment && (
                              <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                  <Typography variant="body2">
                                    Score: {submission.grade}/{assignment.totalPoints}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {gradePercentage.toFixed(1)}%
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={gradePercentage}
                                  sx={{ height: 6, borderRadius: 3 }}
                                  color={
                                    gradePercentage >= 90 ? 'success' :
                                    gradePercentage >= 80 ? 'info' :
                                    gradePercentage >= 70 ? 'warning' : 'error'
                                  }
                                />
                              </Box>
                            )}

                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                            </Typography>

                            {submission.gradedAt && (
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                Graded: {new Date(submission.gradedAt).toLocaleDateString()}
                              </Typography>
                            )}

                            {submission.feedback && (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  mt: 1, 
                                  p: 1, 
                                  bgcolor: 'background.default', 
                                  borderRadius: 1,
                                  fontStyle: 'italic',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                }}
                              >
                                "{submission.feedback}"
                              </Typography>
                            )}

                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                              <Button
                                size="small"
                                startIcon={<Visibility />}
                                onClick={() => onViewFeedback(submission.id)}
                              >
                                View Submission
                              </Button>
                              {submission.grade !== null && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  startIcon={<Info />}
                                  onClick={() => handleViewDetails(submission)}
                                >
                                  Details
                                </Button>
                              )}
                            </Box>
                          </CardContent>
                        </GradeCard>
                      </Grid>
                    );
                  })}
                </Grid>
              </AccordionDetails>
            </Accordion>
          </motion.div>
        ))
      )}

      {/* Grade Detail Dialog */}
      <GradeDetailDialog
        open={gradeDetailOpen}
        onClose={() => setGradeDetailOpen(false)}
        submission={selectedSubmission}
        gradingResult={gradingResult}
        loading={loadingDetails}
      />
    </Box>
  );
};

export default GradesView;
