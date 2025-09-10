import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  LinearProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Assignment,
  Schedule,
  Person,
  ViewList,
  ViewModule,
  Search,
  FilterList,
  CheckCircle,
  Warning,
  Error,
  PlayArrow,
  Visibility,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { Assignment as AssignmentType, Course, Submission } from '@/types';

const AssignmentCard = styled(Card)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[8],
  },
}));

const DeadlineChip = styled(Chip)<{ status: string }>(({ theme, status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'overdue':
        return { bg: theme.palette.error.main, color: theme.palette.error.contrastText };
      case 'due-today':
        return { bg: theme.palette.warning.main, color: theme.palette.warning.contrastText };
      case 'due-soon':
        return { bg: theme.palette.info.main, color: theme.palette.info.contrastText };
      default:
        return { bg: theme.palette.success.main, color: theme.palette.success.contrastText };
    }
  };

  const colors = getStatusColor();
  return {
    backgroundColor: colors.bg,
    color: colors.color,
    fontWeight: 'bold',
  };
});

interface AssignmentsListProps {
  assignments: AssignmentType[];
  submissions: Submission[];
  courses: Course[];
  onAssignmentClick: (assignment: AssignmentType) => void;
  onSubmissionClick: (assignment: AssignmentType) => void;
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
}

export const AssignmentsList: React.FC<AssignmentsListProps> = ({
  assignments,
  submissions,
  courses,
  onAssignmentClick,
  onSubmissionClick,
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('deadline');

  const getAssignmentStatus = (assignment: AssignmentType) => {
    const submission = submissions.find(s => s.assignmentId === assignment.id);
    const now = new Date();
    const deadline = new Date(assignment.deadline);

    if (submission) {
      if (submission.grade !== null) return 'graded';
      return 'submitted';
    }

    if (now > deadline) return 'overdue';
    return 'pending';
  };

  const getDeadlineStatus = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return 'overdue';
    if (daysDiff === 0) return 'due-today';
    if (daysDiff <= 3) return 'due-soon';
    return 'future';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded':
        return <CheckCircle color="success" />;
      case 'submitted':
        return <CheckCircle color="info" />;
      case 'overdue':
        return <Error color="error" />;
      default:
        return <Schedule color="action" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'graded':
        return 'Graded';
      case 'submitted':
        return 'Submitted';
      case 'overdue':
        return 'Overdue';
      default:
        return 'Pending';
    }
  };

  const getDeadlineText = (deadline: string) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const timeDiff = deadlineDate.getTime() - now.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff < 0) return `${Math.abs(daysDiff)} days overdue`;
    if (daysDiff === 0) return 'Due today';
    if (daysDiff === 1) return 'Due tomorrow';
    return `Due in ${daysDiff} days`;
  };

  const filteredAndSortedAssignments = assignments
    .filter(assignment => {
      // Search filter
      if (searchTerm && !assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !assignment.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Course filter
      if (selectedCourse !== 'all' && assignment.courseId.toString() !== selectedCourse) {
        return false;
      }

      // Status filter
      if (statusFilter !== 'all') {
        const status = getAssignmentStatus(assignment);
        if (status !== statusFilter) return false;
      }

      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'deadline':
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        case 'title':
          return a.title.localeCompare(b.title);
        case 'points':
          return b.totalPoints - a.totalPoints;
        case 'status':
          return getAssignmentStatus(a).localeCompare(getAssignmentStatus(b));
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
        <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
          Loading assignments...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Assignments
        </Typography>
        {onViewModeChange && (
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && onViewModeChange(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Course</InputLabel>
              <Select
                value={selectedCourse}
                label="Course"
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <MenuItem value="all">All Courses</MenuItem>
                {courses.map(course => (
                  <MenuItem key={course.id} value={course.id.toString()}>
                    {course.code} - {course.title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All Status</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="submitted">Submitted</MenuItem>
                <MenuItem value="graded">Graded</MenuItem>
                <MenuItem value="overdue">Overdue</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="deadline">Deadline</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="points">Points</MenuItem>
                <MenuItem value="status">Status</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Results Count */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">
          Showing {filteredAndSortedAssignments.length} of {assignments.length} assignments
        </Typography>
      </Box>

      {/* Assignments Grid/List */}
      {filteredAndSortedAssignments.length === 0 ? (
        <Alert severity="info" sx={{ mt: 3 }}>
          {assignments.length === 0 
            ? "No assignments available yet. Check back later!"
            : "No assignments match your current filters. Try adjusting your search criteria."
          }
        </Alert>
      ) : (
        <AnimatePresence>
          <Grid container spacing={viewMode === 'grid' ? 3 : 1}>
            {filteredAndSortedAssignments.map((assignment, index) => {
              const status = getAssignmentStatus(assignment);
              const deadlineStatus = getDeadlineStatus(assignment.deadline);
              const submission = submissions.find(s => s.assignmentId === assignment.id);
              const course = courses.find(c => c.id === assignment.courseId);

              return (
                <Grid 
                  item 
                  xs={12} 
                  sm={viewMode === 'grid' ? 6 : 12} 
                  md={viewMode === 'grid' ? 4 : 12} 
                  key={assignment.id}
                >
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    style={{ height: '100%' }}
                  >
                    <AssignmentCard onClick={() => onAssignmentClick(assignment)}>
                      <CardContent sx={{ flexGrow: 1 }}>
                        {/* Assignment Header */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom>
                              {assignment.title}
                            </Typography>
                            {course && (
                              <Typography variant="body2" color="text.secondary" gutterBottom>
                                {course.code} - {course.title}
                              </Typography>
                            )}
                          </Box>
                          <Tooltip title={getStatusText(status)}>
                            {getStatusIcon(status)}
                          </Tooltip>
                        </Box>

                        {/* Assignment Details */}
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            mb: 2,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {assignment.description}
                        </Typography>

                        {/* Points and Deadline */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <Chip
                            label={`${assignment.totalPoints} points`}
                            size="small"
                            variant="outlined"
                          />
                          <DeadlineChip
                            label={getDeadlineText(assignment.deadline)}
                            size="small"
                            status={deadlineStatus}
                          />
                        </Box>

                        {/* Submission Info */}
                        {submission && (
                          <Box sx={{ mt: 2, p: 1, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                            </Typography>
                            {submission.grade !== null && (
                              <Typography variant="caption" display="block">
                                Grade: {submission.grade}/{assignment.totalPoints} 
                                ({((submission.grade / assignment.totalPoints) * 100).toFixed(1)}%)
                              </Typography>
                            )}
                          </Box>
                        )}
                      </CardContent>

                      <Divider />

                      <CardActions sx={{ justifyContent: 'space-between', p: 2 }}>
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssignmentClick(assignment);
                          }}
                        >
                          View Details
                        </Button>
                        
                        {status === 'pending' || status === 'overdue' ? (
                          <Button
                            size="small"
                            variant="contained"
                            startIcon={<PlayArrow />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onSubmissionClick(assignment);
                            }}
                            color={status === 'overdue' ? 'error' : 'primary'}
                          >
                            {status === 'overdue' ? 'Submit Late' : 'Submit'}
                          </Button>
                        ) : submission ? (
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<CheckCircle />}
                            onClick={(e) => {
                              e.stopPropagation();
                              onAssignmentClick(assignment);
                            }}
                          >
                            View Submission
                          </Button>
                        ) : null}
                      </CardActions>
                    </AssignmentCard>
                  </motion.div>
                </Grid>
              );
            })}
          </Grid>
        </AnimatePresence>
      )}
    </Box>
  );
};

export default AssignmentsList;
