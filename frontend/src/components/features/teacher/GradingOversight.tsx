import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Slider,
  Rating,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Grade as GradeIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Schedule as ScheduleIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  AutoFixHigh as AutoIcon,
  Person as PersonIcon,
  Assignment as AssignmentIcon,
  ExpandMore as ExpandMoreIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Comment as CommentIcon,
  Flag as FlagIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Submission {
  id: number;
  studentName: string;
  studentId: string;
  assignmentTitle: string;
  assignmentId: number;
  submittedAt: string;
  mlGrade: number;
  mlConfidence: number;
  suggestedGrade: number;
  manualGrade?: number;
  finalGrade?: number;
  status: 'pending' | 'reviewed' | 'approved' | 'needs_review';
  feedback: string;
  mlFeedback: string;
  rubricScores: { [criterion: string]: number };
  flagged: boolean;
  ocrText?: string;
  originalFile?: string;
}

// Mock data
const mockSubmissions: Submission[] = [
  {
    id: 1,
    studentName: 'John Doe',
    studentId: 'ST001',
    assignmentTitle: 'Python Basics Assignment',
    assignmentId: 1,
    submittedAt: '2024-09-08T14:30:00',
    mlGrade: 85,
    mlConfidence: 0.92,
    suggestedGrade: 85,
    finalGrade: 87,
    status: 'approved',
    feedback: 'Good work on the basic concepts. Consider improving variable naming conventions.',
    mlFeedback: 'Code structure is well organized. Syntax is correct with minor style improvements needed.',
    rubricScores: {
      'Code Quality': 8,
      'Correctness': 9,
      'Documentation': 7,
      'Style': 8,
    },
    flagged: false,
  },
  {
    id: 2,
    studentName: 'Jane Smith',
    studentId: 'ST002',
    assignmentTitle: 'Data Structures Quiz',
    assignmentId: 2,
    submittedAt: '2024-09-09T10:15:00',
    mlGrade: 78,
    mlConfidence: 0.65,
    suggestedGrade: 78,
    status: 'needs_review',
    feedback: '',
    mlFeedback: 'Some answers lack detail. Consider providing more comprehensive explanations.',
    rubricScores: {
      'Understanding': 7,
      'Completeness': 8,
      'Examples': 6,
      'Clarity': 8,
    },
    flagged: true,
  },
  {
    id: 3,
    studentName: 'Mike Johnson',
    studentId: 'ST003',
    assignmentTitle: 'Algorithm Analysis',
    assignmentId: 3,
    submittedAt: '2024-09-07T16:45:00',
    mlGrade: 92,
    mlConfidence: 0.88,
    suggestedGrade: 92,
    status: 'pending',
    feedback: '',
    mlFeedback: 'Excellent analysis and implementation. Shows deep understanding of algorithmic complexity.',
    rubricScores: {
      'Analysis': 9,
      'Implementation': 9,
      'Efficiency': 10,
      'Documentation': 8,
    },
    flagged: false,
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
};

const GradingOversight: React.FC = () => {
  const [submissions, setSubmissions] = useState<Submission[]>(mockSubmissions);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);
  const [tempGrade, setTempGrade] = useState<number>(0);
  const [tempFeedback, setTempFeedback] = useState<string>('');
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGradeSubmission = (submission: Submission) => {
    setSelectedSubmission(submission);
    setTempGrade(submission.manualGrade || submission.suggestedGrade);
    setTempFeedback(submission.feedback);
    setIsGradingDialogOpen(true);
  };

  const saveGrade = () => {
    if (selectedSubmission) {
      const updatedSubmissions = submissions.map(sub => 
        sub.id === selectedSubmission.id 
          ? { 
              ...sub, 
              manualGrade: tempGrade,
              finalGrade: tempGrade,
              feedback: tempFeedback,
              status: 'approved' as const
            }
          : sub
      );
      setSubmissions(updatedSubmissions);
      setIsGradingDialogOpen(false);
    }
  };

  const getStatusColor = (status: Submission['status']) => {
    switch (status) {
      case 'approved':
        return theme.palette.success.main;
      case 'reviewed':
        return theme.palette.info.main;
      case 'needs_review':
        return theme.palette.warning.main;
      case 'pending':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return theme.palette.success.main;
    if (confidence >= 0.6) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const SubmissionCard: React.FC<{ submission: Submission }> = ({ submission }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          cursor: 'pointer',
          border: submission.flagged ? `2px solid ${theme.palette.warning.main}` : 'none',
          '&:hover': {
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="between" alignItems="flex-start" mb={2}>
            <Box flex={1}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                {submission.assignmentTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {submission.studentName} ({submission.studentId})
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Submitted: {new Date(submission.submittedAt).toLocaleString()}
              </Typography>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              {submission.flagged && (
                <FlagIcon sx={{ color: theme.palette.warning.main }} />
              )}
              <Chip
                label={submission.status.replace('_', ' ')}
                size="small"
                sx={{
                  bgcolor: getStatusColor(submission.status),
                  color: 'white',
                  textTransform: 'capitalize',
                }}
              />
            </Box>
          </Box>

          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {submission.mlGrade}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ML Grade
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography 
                  variant="h5" 
                  fontWeight="bold" 
                  color={getConfidenceColor(submission.mlConfidence)}
                >
                  {Math.round(submission.mlConfidence * 100)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Confidence
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Typography variant="h5" fontWeight="bold" color="secondary">
                  {submission.finalGrade || submission.suggestedGrade}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Final Grade
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center">
                <Rating value={submission.mlConfidence * 5} readOnly size="small" />
                <Typography variant="body2" color="text.secondary">
                  Quality
                </Typography>
              </Box>
            </Grid>
          </Grid>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight="medium">
                ML Analysis & Feedback
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" paragraph>
                {submission.mlFeedback}
              </Typography>
              <Box>
                <Typography variant="body2" fontWeight="medium" gutterBottom>
                  Rubric Scores:
                </Typography>
                {Object.entries(submission.rubricScores).map(([criterion, score]) => (
                  <Box key={criterion} display="flex" alignItems="center" mb={1}>
                    <Typography variant="body2" sx={{ minWidth: 120 }}>
                      {criterion}:
                    </Typography>
                    <Box sx={{ flex: 1, mx: 2 }}>
                      <Slider
                        value={score}
                        min={0}
                        max={10}
                        disabled
                        size="small"
                        sx={{
                          '& .MuiSlider-thumb': {
                            display: 'none',
                          },
                        }}
                      />
                    </Box>
                    <Typography variant="body2" fontWeight="bold">
                      {score}/10
                    </Typography>
                  </Box>
                ))}
              </Box>
            </AccordionDetails>
          </Accordion>

          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
            <Box display="flex" gap={1}>
              <Button
                size="small"
                startIcon={<ViewIcon />}
                onClick={() => handleGradeSubmission(submission)}
              >
                Review
              </Button>
              <Button size="small" startIcon={<GradeIcon />}>
                Grade
              </Button>
            </Box>
            <Box display="flex" gap={1}>
              <IconButton size="small" color="success">
                <ThumbUpIcon />
              </IconButton>
              <IconButton size="small" color="error">
                <ThumbDownIcon />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  const filteredSubmissions = submissions.filter((submission) => {
    switch (activeTab) {
      case 0:
        return submission.status === 'pending';
      case 1:
        return submission.status === 'needs_review' || submission.flagged;
      case 2:
        return submission.status === 'reviewed';
      case 3:
        return submission.status === 'approved';
      default:
        return true;
    }
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Grading Oversight
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<AutoIcon />}>
            Auto-Grade All
          </Button>
          <Button
            variant="contained"
            startIcon={<GradeIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Batch Review
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <ScheduleIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {submissions.filter(s => s.status === 'pending').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Review
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <WarningIcon sx={{ fontSize: 40, color: theme.palette.error.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {submissions.filter(s => s.flagged || s.status === 'needs_review').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Needs Attention
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircleIcon sx={{ fontSize: 40, color: theme.palette.success.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {submissions.filter(s => s.status === 'approved').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <GradeIcon sx={{ fontSize: 40, color: theme.palette.info.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {Math.round(submissions.reduce((acc, s) => acc + (s.finalGrade || s.mlGrade), 0) / submissions.length)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Grade
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`Pending (${submissions.filter(s => s.status === 'pending').length})`} />
          <Tab label={`Needs Review (${submissions.filter(s => s.status === 'needs_review' || s.flagged).length})`} />
          <Tab label={`Reviewed (${submissions.filter(s => s.status === 'reviewed').length})`} />
          <Tab label={`Approved (${submissions.filter(s => s.status === 'approved').length})`} />
        </Tabs>
      </Card>

      {/* Submissions List */}
      <TabPanel value={activeTab} index={activeTab}>
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredSubmissions.map((submission) => (
              <Grid item xs={12} key={submission.id}>
                <SubmissionCard submission={submission} />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
        
        {filteredSubmissions.length === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
          >
            <GradeIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No submissions to review
            </Typography>
            <Typography variant="body2" color="text.secondary">
              All caught up! Check back later for new submissions.
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Grading Dialog */}
      <Dialog
        open={isGradingDialogOpen}
        onClose={() => setIsGradingDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        {selectedSubmission && (
          <>
            <DialogTitle>
              <Typography variant="h6" fontWeight="bold">
                Grade Submission: {selectedSubmission.assignmentTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Student: {selectedSubmission.studentName} ({selectedSubmission.studentId})
              </Typography>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* ML Analysis */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        ML Analysis
                      </Typography>
                      <Box mb={2}>
                        <Typography variant="body2" color="text.secondary">
                          Suggested Grade: <strong>{selectedSubmission.suggestedGrade}%</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Confidence: <strong>{Math.round(selectedSubmission.mlConfidence * 100)}%</strong>
                        </Typography>
                      </Box>
                      <Typography variant="body2" paragraph>
                        {selectedSubmission.mlFeedback}
                      </Typography>
                      <Box>
                        <Typography variant="body2" fontWeight="medium" gutterBottom>
                          Rubric Breakdown:
                        </Typography>
                        {Object.entries(selectedSubmission.rubricScores).map(([criterion, score]) => (
                          <Box key={criterion} display="flex" justifyContent="space-between" mb={1}>
                            <Typography variant="body2">{criterion}:</Typography>
                            <Typography variant="body2" fontWeight="bold">
                              {score}/10
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Manual Grading */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Manual Review
                      </Typography>
                      <Box mb={3}>
                        <Typography variant="body2" gutterBottom>
                          Final Grade
                        </Typography>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Slider
                            value={tempGrade}
                            onChange={(_, value) => setTempGrade(value as number)}
                            min={0}
                            max={100}
                            step={1}
                            valueLabelDisplay="auto"
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            value={tempGrade}
                            onChange={(e) => setTempGrade(Number(e.target.value))}
                            type="number"
                            inputProps={{ min: 0, max: 100 }}
                            sx={{ width: 80 }}
                          />
                        </Box>
                      </Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={6}
                        label="Feedback"
                        value={tempFeedback}
                        onChange={(e) => setTempFeedback(e.target.value)}
                        placeholder="Provide detailed feedback for the student..."
                      />
                    </CardContent>
                  </Card>
                </Grid>

                {/* Submission Content */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Submission Content
                      </Typography>
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: alpha(theme.palette.grey[500], 0.1),
                          borderRadius: 1,
                          maxHeight: 300,
                          overflow: 'auto',
                        }}
                      >
                        <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                          {selectedSubmission.ocrText || "# Python Programming Assignment\n\n# Problem 1: Variables and Data Types\nname = \"John Doe\"\nage = 20\ngpa = 3.85\n\nprint(f\"Student: {name}\")\nprint(f\"Age: {age}\")\nprint(f\"GPA: {gpa}\")\n\n# Problem 2: Lists and Loops\nnumbers = [1, 2, 3, 4, 5]\ntotal = 0\n\nfor num in numbers:\n    total += num\n\nprint(f\"Sum: {total}\")\nprint(f\"Average: {total / len(numbers)}\")\n\n# Problem 3: Functions\ndef calculate_grade(points, total):\n    percentage = (points / total) * 100\n    if percentage >= 90:\n        return 'A'\n    elif percentage >= 80:\n        return 'B'\n    elif percentage >= 70:\n        return 'C'\n    elif percentage >= 60:\n        return 'D'\n    else:\n        return 'F'\n\n# Test the function\nresult = calculate_grade(85, 100)\nprint(f\"Grade: {result}\")"}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsGradingDialogOpen(false)}>Cancel</Button>
              <Button variant="outlined" startIcon={<CommentIcon />}>
                Add Comment
              </Button>
              <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={saveGrade}
              >
                Save Grade
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default GradingOversight;
