import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Avatar,
  Switch,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  Add as AddIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/admin.service';

interface Course {
  id: number;
  code: string;
  title: string;
  description: string;
  teacherId: number;
  teacherName: string;
  status: 'active' | 'archived' | 'draft';
  enrollmentCount: number;
  assignmentCount: number;
  createdAt: string;
  startDate: string;
  endDate: string;
}

interface CourseFilters {
  status: string;
  teacher: string;
  search: string;
}

const CourseManagement: React.FC = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<CourseFilters>({
    status: '',
    teacher: '',
    search: '',
  });
  const [selectedCourses, setSelectedCourses] = useState<number[]>([]);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const queryClient = useQueryClient();

  // Fetch courses with pagination and filters
  const {
    data: coursesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['admin-courses', page, rowsPerPage, filters],
    queryFn: () => adminService.getAllCourses({
      page: page + 1,
      limit: rowsPerPage,
      ...filters,
    }),
  });

  // Mutations
  const archiveCourseMutation = useMutation({
    mutationFn: (id: number) => adminService.archiveCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setSnackbar({ open: true, message: 'Course archived successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to archive course', severity: 'error' });
    },
  });

  const unarchiveCourseMutation = useMutation({
    mutationFn: (id: number) => adminService.unarchiveCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setSnackbar({ open: true, message: 'Course unarchived successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to unarchive course', severity: 'error' });
    },
  });

  const deleteCourseMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteCourse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-courses'] });
      setSnackbar({ open: true, message: 'Course deleted successfully', severity: 'success' });
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to delete course', severity: 'error' });
    },
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field: keyof CourseFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPage(0);
  };

  const handleSelectCourse = (courseId: number) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedCourses(coursesData?.data?.courses?.map((course: Course) => course.id) || []);
    } else {
      setSelectedCourses([]);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, course: Course) => {
    setAnchorEl(event.currentTarget);
    setSelectedCourse(course);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCourse(null);
  };

  const handleViewDetails = () => {
    setDetailDialogOpen(true);
    handleMenuClose();
  };

  const handleArchive = () => {
    if (selectedCourse) {
      if (selectedCourse.status === 'archived') {
        unarchiveCourseMutation.mutate(selectedCourse.id);
      } else {
        archiveCourseMutation.mutate(selectedCourse.id);
      }
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    if (selectedCourse) {
      deleteCourseMutation.mutate(selectedCourse.id);
    }
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'archived':
        return 'warning';
      case 'draft':
        return 'info';
      default:
        return 'default';
    }
  };

  const getEnrollmentStatus = (count: number) => {
    if (count === 0) return { color: 'error', label: 'No Enrollment' };
    if (count < 10) return { color: 'warning', label: 'Low Enrollment' };
    if (count < 50) return { color: 'info', label: 'Good Enrollment' };
    return { color: 'success', label: 'High Enrollment' };
  };

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load courses. Please try again.
        </Alert>
      </Box>
    );
  }

  const courses = coursesData?.data?.courses || [];
  const totalCourses = coursesData?.data?.total || 0;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Course Management
      </Typography>

      {/* Course Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Courses
              </Typography>
              <Typography variant="h4" component="div">
                {totalCourses}
              </Typography>
              <Typography variant="body2" color="success.main">
                {courses.filter((course: Course) => course.status === 'active').length} active
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Enrollments
              </Typography>
              <Typography variant="h4" component="div">
                {courses.reduce((sum: number, course: Course) => sum + course.enrollmentCount, 0)}
              </Typography>
              <Typography variant="body2" color="info.main">
                Across all courses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Assignments
              </Typography>
              <Typography variant="h4" component="div">
                {courses.reduce((sum: number, course: Course) => sum + course.assignmentCount, 0)}
              </Typography>
              <Typography variant="body2" color="warning.main">
                Total assignments
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Avg Enrollment
              </Typography>
              <Typography variant="h4" component="div">
                {courses.length > 0 
                  ? Math.round(courses.reduce((sum: number, course: Course) => sum + course.enrollmentCount, 0) / courses.length)
                  : 0
                }
              </Typography>
              <Typography variant="body2" color="primary.main">
                Per course
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Actions */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Search courses..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <SearchIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">All Status</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="archived">Archived</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Filter by teacher..."
              value={filters.teacher}
              onChange={(e) => handleFilterChange('teacher', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {}}
              >
                Add Course
              </Button>
              <IconButton onClick={() => refetch()} color="primary">
                <RefreshIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        {/* Bulk Actions */}
        {selectedCourses.length > 0 && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {selectedCourses.length} course(s) selected
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<ArchiveIcon />}
              >
                Archive
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
              >
                Delete
              </Button>
            </Box>
          </Box>
        )}
      </Paper>

      {/* Courses Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selectedCourses.length > 0 && selectedCourses.length < courses.length}
                  checked={courses.length > 0 && selectedCourses.length === courses.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Course</TableCell>
              <TableCell>Teacher</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Enrollment</TableCell>
              <TableCell>Assignments</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  Loading courses...
                </TableCell>
              </TableRow>
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  No courses found
                </TableCell>
              </TableRow>
            ) : (
              courses.map((course: Course) => {
                const enrollmentStatus = getEnrollmentStatus(course.enrollmentCount);
                return (
                  <TableRow key={course.id}>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedCourses.includes(course.id)}
                        onChange={() => handleSelectCourse(course.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'primary.main' }}>
                          <SchoolIcon />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight="medium">
                            {course.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {course.code}
                          </Typography>
                          <Typography variant="body2" color="textSecondary" noWrap sx={{ maxWidth: 200 }}>
                            {course.description}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {course.teacherName}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={course.status}
                        color={getStatusColor(course.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PeopleIcon fontSize="small" />
                        <Typography variant="body2">
                          {course.enrollmentCount}
                        </Typography>
                        <Chip
                          label={enrollmentStatus.label}
                          color={enrollmentStatus.color as any}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AssignmentIcon fontSize="small" />
                        <Typography variant="body2">
                          {course.assignmentCount}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {course.startDate && course.endDate ? (
                          <>
                            {new Date(course.startDate).toLocaleDateString()} - 
                            {new Date(course.endDate).toLocaleDateString()}
                          </>
                        ) : (
                          'Not specified'
                        )}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuClick(e, course)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={totalCourses}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewDetails}>
          <SchoolIcon sx={{ mr: 1 }} /> View Details
        </MenuItem>
        <MenuItem onClick={handleArchive}>
          {selectedCourse?.status === 'archived' ? (
            <><UnarchiveIcon sx={{ mr: 1 }} /> Unarchive</>
          ) : (
            <><ArchiveIcon sx={{ mr: 1 }} /> Archive</>
          )}
        </MenuItem>
        <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>

      {/* Course Detail Dialog */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Course Details</DialogTitle>
        <DialogContent>
          {selectedCourse && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="h6">{selectedCourse.title}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {selectedCourse.code}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body1">
                  {selectedCourse.description}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Teacher: {selectedCourse.teacherName}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Status: {selectedCourse.status}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Enrollment: {selectedCourse.enrollmentCount} students
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="textSecondary">
                  Assignments: {selectedCourse.assignmentCount}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="textSecondary">
                  Created: {new Date(selectedCourse.createdAt).toLocaleDateString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default CourseManagement;
