import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  useTheme,
  alpha,
  Tooltip,
} from '@mui/material';
import {
  Grade as GradeIcon,
  Download as DownloadIcon,
  Upload as UploadIcon,
  Save as SaveIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import { motion } from 'framer-motion';

interface Student {
  id: number;
  name: string;
  studentId: string;
  email: string;
  assignments: { [key: string]: number | null };
  totalPoints: number;
  earnedPoints: number;
  percentage: number;
  letterGrade: string;
  trend: 'up' | 'down' | 'stable';
}

interface Assignment {
  id: string;
  name: string;
  maxPoints: number;
  dueDate: string;
  category: 'homework' | 'quiz' | 'exam' | 'project';
  weight: number;
}

// Mock data
const mockAssignments: Assignment[] = [
  { id: 'hw1', name: 'HW1: Python Basics', maxPoints: 100, dueDate: '2024-09-10', category: 'homework', weight: 0.4 },
  { id: 'hw2', name: 'HW2: Data Structures', maxPoints: 100, dueDate: '2024-09-17', category: 'homework', weight: 0.4 },
  { id: 'quiz1', name: 'Quiz 1: Variables', maxPoints: 50, dueDate: '2024-09-12', category: 'quiz', weight: 0.2 },
  { id: 'quiz2', name: 'Quiz 2: Functions', maxPoints: 50, dueDate: '2024-09-19', category: 'quiz', weight: 0.2 },
  { id: 'exam1', name: 'Midterm Exam', maxPoints: 200, dueDate: '2024-10-15', category: 'exam', weight: 0.3 },
  { id: 'project1', name: 'Final Project', maxPoints: 150, dueDate: '2024-12-10', category: 'project', weight: 0.3 },
];

const mockStudents: Student[] = [
  {
    id: 1,
    name: 'John Doe',
    studentId: 'ST001',
    email: 'john.doe@university.edu',
    assignments: { hw1: 85, hw2: 78, quiz1: 42, quiz2: 48, exam1: 165, project1: 135 },
    totalPoints: 650,
    earnedPoints: 553,
    percentage: 85.1,
    letterGrade: 'B',
    trend: 'up',
  },
  {
    id: 2,
    name: 'Jane Smith',
    studentId: 'ST002',
    email: 'jane.smith@university.edu',
    assignments: { hw1: 95, hw2: 88, quiz1: 48, quiz2: 45, exam1: 185, project1: 142 },
    totalPoints: 650,
    earnedPoints: 603,
    percentage: 92.8,
    letterGrade: 'A',
    trend: 'stable',
  },
  {
    id: 3,
    name: 'Mike Johnson',
    studentId: 'ST003',
    email: 'mike.johnson@university.edu',
    assignments: { hw1: 72, hw2: 68, quiz1: 35, quiz2: 38, exam1: 142, project1: 118 },
    totalPoints: 650,
    earnedPoints: 473,
    percentage: 72.8,
    letterGrade: 'C',
    trend: 'down',
  },
  {
    id: 4,
    name: 'Sarah Wilson',
    studentId: 'ST004',
    email: 'sarah.wilson@university.edu',
    assignments: { hw1: 92, hw2: 89, quiz1: 47, quiz2: 49, exam1: 178, project1: 145 },
    totalPoints: 650,
    earnedPoints: 600,
    percentage: 92.3,
    letterGrade: 'A',
    trend: 'up',
  },
  {
    id: 5,
    name: 'Tom Brown',
    studentId: 'ST005',
    email: 'tom.brown@university.edu',
    assignments: { hw1: 80, hw2: 75, quiz1: 40, quiz2: 42, exam1: 155, project1: 125 },
    totalPoints: 650,
    earnedPoints: 517,
    percentage: 79.5,
    letterGrade: 'C+',
    trend: 'stable',
  },
];

const GradeBook: React.FC = () => {
  const [students, setStudents] = useState<Student[]>(mockStudents);
  const [assignments, setAssignments] = useState<Assignment[]>(mockAssignments);
  const [selectedCourse, setSelectedCourse] = useState('cs101');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<number[]>([]);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingCell, setEditingCell] = useState<{ studentId: number; assignmentId: string } | null>(null);
  const theme = useTheme();

  const handleGradeChange = (studentId: number, assignmentId: string, newGrade: number) => {
    setStudents(students.map(student => {
      if (student.id === studentId) {
        const updatedAssignments = { ...student.assignments, [assignmentId]: newGrade };
        const earnedPoints = Object.values(updatedAssignments).reduce((sum, grade) => sum + (grade || 0), 0);
        const percentage = (earnedPoints / student.totalPoints) * 100;
        const letterGrade = getLetterGrade(percentage);
        
        return {
          ...student,
          assignments: updatedAssignments,
          earnedPoints,
          percentage,
          letterGrade,
        };
      }
      return student;
    }));
  };

  const getLetterGrade = (percentage: number): string => {
    if (percentage >= 97) return 'A+';
    if (percentage >= 93) return 'A';
    if (percentage >= 90) return 'A-';
    if (percentage >= 87) return 'B+';
    if (percentage >= 83) return 'B';
    if (percentage >= 80) return 'B-';
    if (percentage >= 77) return 'C+';
    if (percentage >= 73) return 'C';
    if (percentage >= 70) return 'C-';
    if (percentage >= 67) return 'D+';
    if (percentage >= 65) return 'D';
    return 'F';
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return theme.palette.success.main;
    if (percentage >= 80) return theme.palette.info.main;
    if (percentage >= 70) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  const getCategoryColor = (category: Assignment['category']) => {
    switch (category) {
      case 'homework':
        return theme.palette.primary.main;
      case 'quiz':
        return theme.palette.secondary.main;
      case 'exam':
        return theme.palette.error.main;
      case 'project':
        return theme.palette.success.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const columns: GridColDef[] = [
    {
      field: 'select',
      headerName: '',
      width: 50,
      renderCell: (params) => (
        <Checkbox
          checked={selectedStudents.includes(params.row.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedStudents([...selectedStudents, params.row.id]);
            } else {
              setSelectedStudents(selectedStudents.filter(id => id !== params.row.id));
            }
          }}
        />
      ),
    },
    {
      field: 'name',
      headerName: 'Student Name',
      width: 200,
      renderCell: (params) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.row.studentId}
          </Typography>
        </Box>
      ),
    },
    ...assignments.map((assignment): GridColDef => ({
      field: assignment.id,
      headerName: assignment.name,
      width: 120,
      renderCell: (params) => {
        const grade = params.row.assignments[assignment.id];
        const isEditing = editingCell?.studentId === params.row.id && editingCell?.assignmentId === assignment.id;
        
        return (
          <Box display="flex" alignItems="center" height="100%">
            {isEditing ? (
              <TextField
                size="small"
                type="number"
                value={grade || ''}
                onChange={(e) => {
                  const newGrade = parseFloat(e.target.value) || 0;
                  if (newGrade <= assignment.maxPoints) {
                    handleGradeChange(params.row.id, assignment.id, newGrade);
                  }
                }}
                onBlur={() => setEditingCell(null)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    setEditingCell(null);
                  }
                }}
                autoFocus
                inputProps={{ min: 0, max: assignment.maxPoints }}
                sx={{ width: 80 }}
              />
            ) : (
              <Chip
                label={grade !== null ? `${grade}/${assignment.maxPoints}` : '-'}
                size="small"
                onClick={() => setEditingCell({ studentId: params.row.id, assignmentId: assignment.id })}
                sx={{
                  bgcolor: grade !== null ? alpha(getCategoryColor(assignment.category), 0.1) : alpha(theme.palette.grey[500], 0.1),
                  color: grade !== null ? getCategoryColor(assignment.category) : theme.palette.grey[500],
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: alpha(getCategoryColor(assignment.category), 0.2),
                  },
                }}
              />
            )}
          </Box>
        );
      },
    })),
    {
      field: 'percentage',
      headerName: 'Overall Grade',
      width: 150,
      renderCell: (params) => (
        <Box display="flex" alignItems="center" gap={1}>
          <Chip
            label={`${params.value.toFixed(1)}%`}
            size="small"
            sx={{
              bgcolor: alpha(getGradeColor(params.value), 0.1),
              color: getGradeColor(params.value),
              fontWeight: 'bold',
            }}
          />
          <Typography variant="body2" fontWeight="bold">
            {params.row.letterGrade}
          </Typography>
          {params.row.trend === 'up' ? (
            <TrendingUpIcon sx={{ fontSize: 16, color: theme.palette.success.main }} />
          ) : params.row.trend === 'down' ? (
            <TrendingDownIcon sx={{ fontSize: 16, color: theme.palette.error.main }} />
          ) : (
            <RemoveIcon sx={{ fontSize: 16, color: theme.palette.grey[500] }} />
          )}
        </Box>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <Tooltip title="View Details">
            <IconButton size="small">
              <ViewIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit Grades">
            <IconButton size="small">
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Send Message">
            <IconButton size="small">
              <GradeIcon />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const rows = filteredStudents.map(student => ({
    id: student.id,
    name: student.name,
    studentId: student.studentId,
    assignments: student.assignments,
    percentage: student.percentage,
    letterGrade: student.letterGrade,
    trend: student.trend,
    ...student.assignments,
  }));

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Grade Book
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<UploadIcon />}>
            Import Grades
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={() => setIsExportDialogOpen(true)}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AssessmentIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {students.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Students
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
                <GradeIcon sx={{ fontSize: 40, color: theme.palette.success.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {(students.reduce((sum, s) => sum + s.percentage, 0) / students.length).toFixed(1)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Class Average
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
                <TrendingUpIcon sx={{ fontSize: 40, color: theme.palette.info.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {assignments.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Assignments
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
                <FilterIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {students.filter(s => s.percentage < 70).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    At Risk
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Course</InputLabel>
                <Select
                  value={selectedCourse}
                  label="Course"
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <MenuItem value="cs101">CS101 - Intro to Computer Science</MenuItem>
                  <MenuItem value="cs201">CS201 - Data Structures</MenuItem>
                  <MenuItem value="cs301">CS301 - Database Systems</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1}>
                <Button variant="outlined" startIcon={<SortIcon />} fullWidth>
                  Sort Options
                </Button>
                <Button variant="outlined" startIcon={<FilterIcon />} fullWidth>
                  Filter
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Assignment Categories */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Assignment Categories
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {Object.entries(
              assignments.reduce((acc, assignment) => {
                acc[assignment.category] = (acc[assignment.category] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([category, count]) => (
              <Chip
                key={category}
                label={`${category} (${count})`}
                sx={{
                  bgcolor: alpha(getCategoryColor(category as Assignment['category']), 0.1),
                  color: getCategoryColor(category as Assignment['category']),
                  textTransform: 'capitalize',
                }}
              />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Grade Book Table */}
      <Card>
        <CardContent>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={25}
              rowsPerPageOptions={[25, 50, 100]}
              checkboxSelection={false}
              disableSelectionOnClick
              sx={{
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${theme.palette.divider}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                  borderBottom: `2px solid ${theme.palette.primary.main}`,
                },
                '& .MuiDataGrid-row:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>

      {/* Export Dialog */}
      <Dialog
        open={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Export Grade Book
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Choose export format and options:
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Export Format</InputLabel>
              <Select defaultValue="csv" label="Export Format">
                <MenuItem value="csv">CSV (Excel Compatible)</MenuItem>
                <MenuItem value="xlsx">Excel (.xlsx)</MenuItem>
                <MenuItem value="pdf">PDF Report</MenuItem>
                <MenuItem value="json">JSON Data</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Include</InputLabel>
              <Select defaultValue="all" label="Include">
                <MenuItem value="all">All Students</MenuItem>
                <MenuItem value="selected">Selected Students Only</MenuItem>
                <MenuItem value="passing">Passing Students (≥70%)</MenuItem>
                <MenuItem value="failing">At-Risk Students (&lt;70%)</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsExportDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" startIcon={<DownloadIcon />}>
            Export
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GradeBook;
