import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  useTheme,
  alpha,
  Fab,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  People as PeopleIcon,
  Grade as GradeIcon,
  MoreVert as MoreVertIcon,
  FileUpload as FileUploadIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs, { Dayjs } from 'dayjs';
import { motion, AnimatePresence } from 'framer-motion';

interface Assignment {
  id: number;
  title: string;
  course: string;
  courseId: number;
  type: 'homework' | 'quiz' | 'exam' | 'project' | 'lab';
  description: string;
  totalPoints: number;
  dueDate: string;
  createdDate: string;
  status: 'draft' | 'published' | 'closed';
  submissions: number;
  totalStudents: number;
  avgGrade?: number;
  gradingStatus: 'not_started' | 'in_progress' | 'completed';
}

// Mock data
const mockAssignments: Assignment[] = [
  {
    id: 1,
    title: 'Python Basics - Variables and Data Types',
    course: 'CS101',
    courseId: 1,
    type: 'homework',
    description: 'Introduction to Python programming fundamentals',
    totalPoints: 100,
    dueDate: '2024-09-15T23:59:00',
    createdDate: '2024-09-01T10:00:00',
    status: 'published',
    submissions: 42,
    totalStudents: 45,
    avgGrade: 85.2,
    gradingStatus: 'completed',
  },
  {
    id: 2,
    title: 'Data Structures Quiz #1',
    course: 'CS201',
    courseId: 2,
    type: 'quiz',
    description: 'Quiz covering arrays, linked lists, and stacks',
    totalPoints: 50,
    dueDate: '2024-09-12T14:30:00',
    createdDate: '2024-09-05T09:00:00',
    status: 'published',
    submissions: 35,
    totalStudents: 38,
    avgGrade: 78.5,
    gradingStatus: 'in_progress',
  },
  {
    id: 3,
    title: 'Database Design Project',
    course: 'CS301',
    courseId: 3,
    type: 'project',
    description: 'Design and implement a relational database system',
    totalPoints: 200,
    dueDate: '2024-09-25T23:59:00',
    createdDate: '2024-09-08T11:00:00',
    status: 'published',
    submissions: 18,
    totalStudents: 32,
    gradingStatus: 'not_started',
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

const AssignmentManagement: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [activeTab, setActiveTab] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const theme = useTheme();

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    courseId: 1,
    type: 'homework' as Assignment['type'],
    description: '',
    totalPoints: 100,
    dueDate: dayjs().add(1, 'week'),
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateAssignment = () => {
    const assignment: Assignment = {
      id: Date.now(),
      title: newAssignment.title,
      course: 'CS101', // Mock - should be fetched based on courseId
      courseId: newAssignment.courseId,
      type: newAssignment.type,
      description: newAssignment.description,
      totalPoints: newAssignment.totalPoints,
      dueDate: newAssignment.dueDate.toISOString(),
      createdDate: new Date().toISOString(),
      status: 'draft',
      submissions: 0,
      totalStudents: 45, // Mock data
      gradingStatus: 'not_started',
    };
    setAssignments([...assignments, assignment]);
    setIsCreateDialogOpen(false);
    setNewAssignment({
      title: '',
      courseId: 1,
      type: 'homework',
      description: '',
      totalPoints: 100,
      dueDate: dayjs().add(1, 'week'),
    });
  };

  const getStatusColor = (status: Assignment['status']) => {
    switch (status) {
      case 'published':
        return theme.palette.success.main;
      case 'draft':
        return theme.palette.warning.main;
      case 'closed':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const getTypeColor = (type: Assignment['type']) => {
    switch (type) {
      case 'homework':
        return theme.palette.primary.main;
      case 'quiz':
        return theme.palette.secondary.main;
      case 'exam':
        return theme.palette.error.main;
      case 'project':
        return theme.palette.success.main;
      case 'lab':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getGradingStatusColor = (status: Assignment['gradingStatus']) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'in_progress':
        return theme.palette.warning.main;
      case 'not_started':
        return theme.palette.grey[500];
      default:
        return theme.palette.grey[500];
    }
  };

  const AssignmentCard: React.FC<{ assignment: Assignment }> = ({ assignment }) => {
    const submissionRate = (assignment.submissions / assignment.totalStudents) * 100;
    const isDue = dayjs(assignment.dueDate).isBefore(dayjs());
    
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.2 }}
      >
        <Card
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            cursor: 'pointer',
            border: isDue ? `2px solid ${theme.palette.error.main}` : 'none',
            '&:hover': {
              boxShadow: theme.shadows[8],
            },
          }}
        >
          <Box
            sx={{
              height: 8,
              background: `linear-gradient(90deg, ${getTypeColor(assignment.type)} 0%, ${alpha(getTypeColor(assignment.type), 0.7)} 100%)`,
            }}
          />
          <CardContent sx={{ flexGrow: 1 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
              <Typography variant="h6" fontWeight="bold" sx={{ flex: 1, mr: 1 }}>
                {assignment.title}
              </Typography>
              <Chip
                label={assignment.status}
                size="small"
                sx={{
                  bgcolor: getStatusColor(assignment.status),
                  color: 'white',
                }}
              />
            </Box>
            
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              {assignment.course} • {assignment.totalPoints} points
            </Typography>
            
            <Chip
              label={assignment.type}
              size="small"
              variant="outlined"
              sx={{
                color: getTypeColor(assignment.type),
                borderColor: getTypeColor(assignment.type),
                mb: 2,
              }}
            />
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {assignment.description}
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  Submissions: {assignment.submissions}/{assignment.totalStudents}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {submissionRate.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={submissionRate}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.grey[300], 0.3),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    bgcolor: submissionRate >= 80 ? theme.palette.success.main : 
                             submissionRate >= 60 ? theme.palette.warning.main : 
                             theme.palette.error.main,
                  },
                }}
              />
            </Box>
            
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <Box display="flex" alignItems="center">
                <CalendarIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2" color={isDue ? 'error.main' : 'text.secondary'}>
                  Due: {dayjs(assignment.dueDate).format('MMM DD, YYYY HH:mm')}
                </Typography>
              </Box>
            </Box>
            
            {assignment.avgGrade && (
              <Box display="flex" alignItems="center" gap={1}>
                <GradeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  Avg: {assignment.avgGrade.toFixed(1)}%
                </Typography>
                <Chip
                  label={assignment.gradingStatus.replace('_', ' ')}
                  size="small"
                  sx={{
                    bgcolor: getGradingStatusColor(assignment.gradingStatus),
                    color: 'white',
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
            )}
          </CardContent>
          
          <CardActions>
            <Button size="small" startIcon={<ViewIcon />}>
              View
            </Button>
            <Button size="small" startIcon={<EditIcon />}>
              Edit
            </Button>
            <Button size="small" startIcon={<GradeIcon />}>
              Grade
            </Button>
            <IconButton size="small">
              <MoreVertIcon />
            </IconButton>
          </CardActions>
        </Card>
      </motion.div>
    );
  };

  const filteredAssignments = assignments.filter((assignment) => {
    switch (activeTab) {
      case 0:
        return true; // All assignments
      case 1:
        return assignment.status === 'published';
      case 2:
        return assignment.status === 'draft';
      case 3:
        return assignment.gradingStatus === 'in_progress' || assignment.gradingStatus === 'not_started';
      default:
        return true;
    }
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Assignment Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          Create Assignment
        </Button>
      </Box>

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
          <Tab label={`All (${assignments.length})`} />
          <Tab label={`Published (${assignments.filter(a => a.status === 'published').length})`} />
          <Tab label={`Draft (${assignments.filter(a => a.status === 'draft').length})`} />
          <Tab label={`Needs Grading (${assignments.filter(a => a.gradingStatus !== 'completed').length})`} />
        </Tabs>
      </Card>

      {/* Assignment Grid */}
      <TabPanel value={activeTab} index={activeTab}>
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredAssignments.map((assignment) => (
              <Grid item xs={12} sm={6} lg={4} key={assignment.id}>
                <AssignmentCard assignment={assignment} />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
        
        {filteredAssignments.length === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
          >
            <AssignmentIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No assignments found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {activeTab === 0
                ? "You haven't created any assignments yet."
                : `No assignments in this category.`}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create Your First Assignment
            </Button>
          </Box>
        )}
      </TabPanel>

      {/* Create Assignment Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Create New Assignment
          </Typography>
        </DialogTitle>
        <DialogContent>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box component="form" sx={{ mt: 2 }}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Assignment Title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Course</InputLabel>
                    <Select
                      value={newAssignment.courseId}
                      label="Course"
                      onChange={(e) => setNewAssignment({ ...newAssignment, courseId: e.target.value as number })}
                    >
                      <MenuItem value={1}>CS101 - Intro to Computer Science</MenuItem>
                      <MenuItem value={2}>CS201 - Data Structures</MenuItem>
                      <MenuItem value={3}>CS301 - Database Systems</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={newAssignment.type}
                      label="Type"
                      onChange={(e) => setNewAssignment({ ...newAssignment, type: e.target.value as Assignment['type'] })}
                    >
                      <MenuItem value="homework">Homework</MenuItem>
                      <MenuItem value="quiz">Quiz</MenuItem>
                      <MenuItem value="exam">Exam</MenuItem>
                      <MenuItem value="project">Project</MenuItem>
                      <MenuItem value="lab">Lab</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Total Points"
                    value={newAssignment.totalPoints}
                    onChange={(e) => setNewAssignment({ ...newAssignment, totalPoints: parseInt(e.target.value) })}
                    inputProps={{ min: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <DateTimePicker
                    label="Due Date"
                    value={newAssignment.dueDate}
                    onChange={(newValue) => newValue && setNewAssignment({ ...newAssignment, dueDate: newValue })}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          </LocalizationProvider>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateAssignment}
            disabled={!newAssignment.title}
          >
            Create Assignment
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button */}
      <Tooltip title="Quick Grade">
        <Fab
          color="secondary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <GradeIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default AssignmentManagement;
