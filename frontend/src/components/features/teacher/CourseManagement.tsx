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
  Avatar,
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Settings as SettingsIcon,
  Visibility as ViewIcon,
  School as SchoolIcon,
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Course {
  id: number;
  title: string;
  code: string;
  description: string;
  students: number;
  assignments: number;
  term: string;
  year: number;
  status: 'active' | 'archived' | 'draft';
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

// Mock data
const mockCourses: Course[] = [
  {
    id: 1,
    title: 'Introduction to Computer Science',
    code: 'CS101',
    description: 'Fundamentals of programming and computational thinking',
    students: 45,
    assignments: 8,
    term: 'Fall',
    year: 2024,
    status: 'active',
    createdAt: '2024-08-15',
    updatedAt: '2024-09-08',
  },
  {
    id: 2,
    title: 'Data Structures and Algorithms',
    code: 'CS201',
    description: 'Advanced programming concepts and algorithm design',
    students: 38,
    assignments: 6,
    term: 'Fall',
    year: 2024,
    status: 'active',
    createdAt: '2024-08-15',
    updatedAt: '2024-09-07',
  },
  {
    id: 3,
    title: 'Database Systems',
    code: 'CS301',
    description: 'Database design, SQL, and data management',
    students: 32,
    assignments: 5,
    term: 'Fall',
    year: 2024,
    status: 'active',
    createdAt: '2024-08-15',
    updatedAt: '2024-09-06',
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

const CourseManagement: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(mockCourses);
  const [activeTab, setActiveTab] = useState(0);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const theme = useTheme();

  const [newCourse, setNewCourse] = useState({
    title: '',
    code: '',
    description: '',
    term: 'Fall',
    year: 2024,
    status: 'draft' as const,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleCreateCourse = () => {
    const course: Course = {
      id: Date.now(),
      ...newCourse,
      students: 0,
      assignments: 0,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setCourses([...courses, course]);
    setIsCreateDialogOpen(false);
    setNewCourse({
      title: '',
      code: '',
      description: '',
      term: 'Fall',
      year: 2024,
      status: 'draft',
    });
  };

  const getStatusColor = (status: Course['status']) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'archived':
        return theme.palette.grey[500];
      case 'draft':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const CourseCard: React.FC<{ course: Course }> = ({ course }) => (
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
          '&:hover': {
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <Box
          sx={{
            height: 120,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            position: 'relative',
          }}
        >
          <SchoolIcon sx={{ fontSize: 48, opacity: 0.7 }} />
          <Chip
            label={course.status}
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              bgcolor: getStatusColor(course.status),
              color: 'white',
            }}
          />
        </Box>
        <CardContent sx={{ flexGrow: 1 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            {course.title}
          </Typography>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            {course.code} • {course.term} {course.year}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {course.description}
          </Typography>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={2}>
              <Box display="flex" alignItems="center">
                <PeopleIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2">{course.students}</Typography>
              </Box>
              <Box display="flex" alignItems="center">
                <AssignmentIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="body2">{course.assignments}</Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
        <CardActions>
          <Button size="small" startIcon={<ViewIcon />}>
            View
          </Button>
          <Button size="small" startIcon={<EditIcon />}>
            Edit
          </Button>
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </CardActions>
      </Card>
    </motion.div>
  );

  const filteredCourses = courses.filter((course) => {
    switch (activeTab) {
      case 0:
        return true; // All courses
      case 1:
        return course.status === 'active';
      case 2:
        return course.status === 'draft';
      case 3:
        return course.status === 'archived';
      default:
        return true;
    }
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Course Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateDialogOpen(true)}
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          }}
        >
          Create Course
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
          <Tab label={`All Courses (${courses.length})`} />
          <Tab label={`Active (${courses.filter(c => c.status === 'active').length})`} />
          <Tab label={`Draft (${courses.filter(c => c.status === 'draft').length})`} />
          <Tab label={`Archived (${courses.filter(c => c.status === 'archived').length})`} />
        </Tabs>
      </Card>

      {/* Course Grid */}
      <TabPanel value={activeTab} index={activeTab}>
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredCourses.map((course) => (
              <Grid item xs={12} sm={6} lg={4} key={course.id}>
                <CourseCard course={course} />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
        {filteredCourses.length === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
          >
            <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No courses found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              {activeTab === 0
                ? "You haven't created any courses yet."
                : `No courses in this category.`}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              Create Your First Course
            </Button>
          </Box>
        )}
      </TabPanel>

      {/* Create Course Dialog */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Create New Course
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Course Title"
                  value={newCourse.title}
                  onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Course Code"
                  value={newCourse.code}
                  onChange={(e) => setNewCourse({ ...newCourse, code: e.target.value })}
                  required
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Description"
                  value={newCourse.description}
                  onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Term</InputLabel>
                  <Select
                    value={newCourse.term}
                    label="Term"
                    onChange={(e) => setNewCourse({ ...newCourse, term: e.target.value })}
                  >
                    <MenuItem value="Fall">Fall</MenuItem>
                    <MenuItem value="Spring">Spring</MenuItem>
                    <MenuItem value="Summer">Summer</MenuItem>
                    <MenuItem value="Winter">Winter</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  type="number"
                  label="Year"
                  value={newCourse.year}
                  onChange={(e) => setNewCourse({ ...newCourse, year: parseInt(e.target.value) })}
                  inputProps={{ min: 2020, max: 2030 }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={newCourse.status}
                    label="Status"
                    onChange={(e) => setNewCourse({ ...newCourse, status: e.target.value as Course['status'] })}
                  >
                    <MenuItem value="draft">Draft</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreateCourse}
            disabled={!newCourse.title || !newCourse.code}
          >
            Create Course
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CourseManagement;
