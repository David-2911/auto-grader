import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  PersonAdd as PersonAddIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Message as MessageIcon,
  FileDownload as DownloadIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface Student {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  studentId: string;
  enrolledCourses: string[];
  totalAssignments: number;
  completedAssignments: number;
  averageGrade: number;
  lastSubmission: string;
  status: 'active' | 'inactive' | 'dropped';
  enrollmentDate: string;
  profilePicture?: string;
  phone?: string;
  year: 'Freshman' | 'Sophomore' | 'Junior' | 'Senior';
  major: string;
}

// Mock data
const mockStudents: Student[] = [
  {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@university.edu',
    studentId: 'ST001',
    enrolledCourses: ['CS101', 'CS201'],
    totalAssignments: 15,
    completedAssignments: 13,
    averageGrade: 85.2,
    lastSubmission: '2024-09-08T14:30:00',
    status: 'active',
    enrollmentDate: '2024-08-15',
    year: 'Sophomore',
    major: 'Computer Science',
  },
  {
    id: 2,
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@university.edu',
    studentId: 'ST002',
    enrolledCourses: ['CS101', 'CS301'],
    totalAssignments: 12,
    completedAssignments: 12,
    averageGrade: 92.1,
    lastSubmission: '2024-09-09T10:15:00',
    status: 'active',
    enrollmentDate: '2024-08-15',
    year: 'Junior',
    major: 'Computer Science',
  },
  {
    id: 3,
    firstName: 'Mike',
    lastName: 'Johnson',
    email: 'mike.johnson@university.edu',
    studentId: 'ST003',
    enrolledCourses: ['CS201'],
    totalAssignments: 8,
    completedAssignments: 6,
    averageGrade: 74.8,
    lastSubmission: '2024-09-06T16:45:00',
    status: 'active',
    enrollmentDate: '2024-08-15',
    year: 'Sophomore',
    major: 'Computer Science',
  },
];

const mockPerformanceData = [
  { week: 'Week 1', grade: 78 },
  { week: 'Week 2', grade: 82 },
  { week: 'Week 3', grade: 85 },
  { week: 'Week 4', grade: 88 },
  { week: 'Week 5', grade: 84 },
  { week: 'Week 6', grade: 91 },
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

const StudentManagement: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getStatusColor = (status: Student['status']) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'inactive':
        return theme.palette.warning.main;
      case 'dropped':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return theme.palette.success.main;
    if (grade >= 80) return theme.palette.info.main;
    if (grade >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const StudentCard: React.FC<{ student: Student }> = ({ student }) => {
    const completionRate = (student.completedAssignments / student.totalAssignments) * 100;
    
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
            cursor: 'pointer',
            '&:hover': {
              boxShadow: theme.shadows[8],
            },
          }}
          onClick={() => {
            setSelectedStudent(student);
            setIsDetailDialogOpen(true);
          }}
        >
          <CardContent>
            <Box display="flex" alignItems="center" mb={2}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: theme.palette.primary.main,
                  mr: 2,
                }}
              >
                {getInitials(student.firstName, student.lastName)}
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6" fontWeight="bold">
                  {student.firstName} {student.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {student.studentId} • {student.year}
                </Typography>
                <Chip
                  label={student.status}
                  size="small"
                  sx={{
                    bgcolor: getStatusColor(student.status),
                    color: 'white',
                    mt: 0.5,
                  }}
                />
              </Box>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Enrolled Courses
              </Typography>
              <Box display="flex" flexWrap="wrap" gap={0.5}>
                {student.enrolledCourses.map((course) => (
                  <Chip
                    key={course}
                    label={course}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                ))}
              </Box>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold" color={getGradeColor(student.averageGrade)}>
                    {student.averageGrade.toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg Grade
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h6" fontWeight="bold">
                    {completionRate.toFixed(0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completion
                  </Typography>
                </Box>
              </Grid>
            </Grid>

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {student.completedAssignments}/{student.totalAssignments} assignments
              </Typography>
              <Box display="flex" gap={1}>
                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                  <MessageIcon />
                </IconButton>
                <IconButton size="small" onClick={(e) => e.stopPropagation()}>
                  <MoreVertIcon />
                </IconButton>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const filteredStudents = students.filter((student) => {
    const matchesSearch = 
      student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCourse = selectedCourse === 'all' || student.enrolledCourses.includes(selectedCourse);
    
    const matchesTab = (() => {
      switch (activeTab) {
        case 0: return true; // All students
        case 1: return student.status === 'active';
        case 2: return student.averageGrade < 75; // At-risk students
        case 3: return student.averageGrade >= 90; // High performers
        default: return true;
      }
    })();

    return matchesSearch && matchesCourse && matchesTab;
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Student Management
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<DownloadIcon />}>
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAddIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Add Student
          </Button>
        </Box>
      </Box>

      {/* Search and Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={selectedCourse}
                  label="Course"
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <MenuItem value="all">All Courses</MenuItem>
                  <MenuItem value="CS101">CS101</MenuItem>
                  <MenuItem value="CS201">CS201</MenuItem>
                  <MenuItem value="CS301">CS301</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                sx={{ height: 56 }}
              >
                More Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

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
          <Tab label={`All Students (${students.length})`} />
          <Tab label={`Active (${students.filter(s => s.status === 'active').length})`} />
          <Tab label={`At Risk (${students.filter(s => s.averageGrade < 75).length})`} />
          <Tab label={`High Performers (${students.filter(s => s.averageGrade >= 90).length})`} />
        </Tabs>
      </Card>

      {/* Student Grid */}
      <TabPanel value={activeTab} index={activeTab}>
        <Grid container spacing={3}>
          <AnimatePresence>
            {filteredStudents.map((student) => (
              <Grid item xs={12} sm={6} lg={4} key={student.id}>
                <StudentCard student={student} />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
        
        {filteredStudents.length === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
          >
            <SchoolIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No students found
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Try adjusting your search or filter criteria
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Student Detail Dialog */}
      <Dialog
        open={isDetailDialogOpen}
        onClose={() => setIsDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedStudent && (
          <>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <Avatar
                  sx={{
                    width: 48,
                    height: 48,
                    bgcolor: theme.palette.primary.main,
                    mr: 2,
                  }}
                >
                  {getInitials(selectedStudent.firstName, selectedStudent.lastName)}
                </Avatar>
                <Box>
                  <Typography variant="h6" fontWeight="bold">
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedStudent.studentId} • {selectedStudent.major}
                  </Typography>
                </Box>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                {/* Basic Info */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Student Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1) }}>
                              <EmailIcon color="primary" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Email"
                            secondary={selectedStudent.email}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.1) }}>
                              <SchoolIcon color="secondary" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Year"
                            secondary={selectedStudent.year}
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alpha(theme.palette.success.main, 0.1) }}>
                              <GradeIcon color="success" />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary="Average Grade"
                            secondary={`${selectedStudent.averageGrade.toFixed(1)}%`}
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Performance Chart */}
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Performance Trend
                      </Typography>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={mockPerformanceData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis domain={[0, 100]} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="grade"
                            stroke={theme.palette.primary.main}
                            strokeWidth={2}
                            dot={{ fill: theme.palette.primary.main }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Enrolled Courses */}
                <Grid item xs={12}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight="bold" gutterBottom>
                        Enrolled Courses
                      </Typography>
                      <Grid container spacing={2}>
                        {selectedStudent.enrolledCourses.map((course) => (
                          <Grid item xs={12} sm={6} key={course}>
                            <Box
                              sx={{
                                p: 2,
                                border: 1,
                                borderColor: 'divider',
                                borderRadius: 1,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                            >
                              <Typography fontWeight="medium">{course}</Typography>
                              <Button size="small" variant="outlined">
                                View Details
                              </Button>
                            </Box>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setIsDetailDialogOpen(false)}>Close</Button>
              <Button variant="outlined" startIcon={<MessageIcon />}>
                Send Message
              </Button>
              <Button variant="contained" startIcon={<EditIcon />}>
                Edit Student
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
};

export default StudentManagement;
