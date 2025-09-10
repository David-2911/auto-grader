import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
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
  Paper,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Download as DownloadIcon,
  Print as PrintIcon,
  FilterList as FilterIcon,
  DateRange as DateRangeIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Grade as GradeIcon,
} from '@mui/icons-material';
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
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { motion } from 'framer-motion';

// Mock data for analytics
const mockPerformanceData = [
  { week: 'Week 1', cs101: 78, cs201: 82, cs301: 85 },
  { week: 'Week 2', cs101: 82, cs201: 78, cs301: 88 },
  { week: 'Week 3', cs101: 85, cs201: 85, cs301: 84 },
  { week: 'Week 4', cs101: 88, cs201: 89, cs301: 91 },
  { week: 'Week 5', cs101: 84, cs201: 86, cs301: 89 },
  { week: 'Week 6', cs101: 91, cs201: 92, cs301: 94 },
];

const mockGradeDistribution = [
  { grade: 'A (90-100)', count: 35, percentage: 35 },
  { grade: 'B (80-89)', count: 42, percentage: 42 },
  { grade: 'C (70-79)', count: 18, percentage: 18 },
  { grade: 'D (60-69)', count: 4, percentage: 4 },
  { grade: 'F (0-59)', count: 1, percentage: 1 },
];

const mockAssignmentDifficulty = [
  { assignment: 'Python Basics', avgGrade: 88, submissions: 45, difficulty: 'Easy' },
  { assignment: 'Data Structures', avgGrade: 75, submissions: 42, difficulty: 'Medium' },
  { assignment: 'Algorithms', avgGrade: 68, submissions: 38, difficulty: 'Hard' },
  { assignment: 'Database Design', avgGrade: 82, submissions: 35, difficulty: 'Medium' },
  { assignment: 'Final Project', avgGrade: 85, submissions: 40, difficulty: 'Medium' },
];

const mockStudentProgress = [
  { student: 'John Doe', cs101: 85, cs201: 78, cs301: 92, trend: 'up' },
  { student: 'Jane Smith', cs101: 92, cs201: 88, cs301: 89, trend: 'stable' },
  { student: 'Mike Johnson', cs101: 74, cs201: 72, cs301: 76, trend: 'up' },
  { student: 'Sarah Wilson', cs101: 88, cs201: 91, cs301: 94, trend: 'up' },
  { student: 'Tom Brown', cs101: 79, cs201: 82, cs301: 80, trend: 'stable' },
];

const mockEngagementData = [
  { metric: 'Attendance', value: 92, max: 100 },
  { metric: 'Participation', value: 78, max: 100 },
  { metric: 'Assignment Completion', value: 89, max: 100 },
  { metric: 'Discussion Posts', value: 65, max: 100 },
  { metric: 'Office Hours', value: 45, max: 100 },
  { metric: 'Resource Access', value: 82, max: 100 },
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

const ReportsAnalytics: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('semester');
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const COLORS = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
  ];

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    icon: React.ReactNode;
    color: string;
    change?: string;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ title, value, icon, color, change, trend }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card>
        <CardContent>
          <Box display="flex" alignItems="center">
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 2,
                bgcolor: alpha(color, 0.1),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
              }}
            >
              {icon}
            </Box>
            <Box flex={1}>
              <Typography variant="body2" color="text.secondary">
                {title}
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                {value}
              </Typography>
              {change && (
                <Box display="flex" alignItems="center" mt={0.5}>
                  {trend === 'up' ? (
                    <TrendingUpIcon sx={{ fontSize: 16, color: theme.palette.success.main, mr: 0.5 }} />
                  ) : trend === 'down' ? (
                    <TrendingDownIcon sx={{ fontSize: 16, color: theme.palette.error.main, mr: 0.5 }} />
                  ) : null}
                  <Typography 
                    variant="body2" 
                    color={trend === 'up' ? 'success.main' : trend === 'down' ? 'error.main' : 'text.secondary'}
                  >
                    {change}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Reports & Analytics
        </Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<PrintIcon />}>
            Print Report
          </Button>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Export Data
          </Button>
        </Box>
      </Box>

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
                  <MenuItem value="all">All Courses</MenuItem>
                  <MenuItem value="cs101">CS101 - Intro to Computer Science</MenuItem>
                  <MenuItem value="cs201">CS201 - Data Structures</MenuItem>
                  <MenuItem value="cs301">CS301 - Database Systems</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={selectedTimeframe}
                  label="Timeframe"
                  onChange={(e) => setSelectedTimeframe(e.target.value)}
                >
                  <MenuItem value="week">This Week</MenuItem>
                  <MenuItem value="month">This Month</MenuItem>
                  <MenuItem value="semester">This Semester</MenuItem>
                  <MenuItem value="year">This Year</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                sx={{ height: 56 }}
              >
                Advanced Filters
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Average Class Performance"
            value="82.4%"
            icon={<GradeIcon sx={{ color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
            change="+3.2% from last month"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Assignment Completion"
            value="91.2%"
            icon={<AssignmentIcon sx={{ color: theme.palette.success.main }} />}
            color={theme.palette.success.main}
            change="+1.8% from last month"
            trend="up"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Student Engagement"
            value="78.5%"
            icon={<PeopleIcon sx={{ color: theme.palette.info.main }} />}
            color={theme.palette.info.main}
            change="-2.1% from last month"
            trend="down"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Course Satisfaction"
            value="4.6/5"
            icon={<SchoolIcon sx={{ color: theme.palette.warning.main }} />}
            color={theme.palette.warning.main}
            change="+0.3 from last month"
            trend="up"
          />
        </Grid>
      </Grid>

      {/* Analytics Tabs */}
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
          <Tab label="Performance Overview" />
          <Tab label="Grade Analysis" />
          <Tab label="Assignment Difficulty" />
          <Tab label="Student Progress" />
          <Tab label="Engagement Metrics" />
        </Tabs>
      </Card>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <Grid container spacing={3}>
          {/* Performance Trends */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Course Performance Trends
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="cs101"
                      stroke={COLORS[0]}
                      strokeWidth={2}
                      name="CS101"
                    />
                    <Line
                      type="monotone"
                      dataKey="cs201"
                      stroke={COLORS[1]}
                      strokeWidth={2}
                      name="CS201"
                    />
                    <Line
                      type="monotone"
                      dataKey="cs301"
                      stroke={COLORS[2]}
                      strokeWidth={2}
                      name="CS301"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grade Distribution */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Grade Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <PieChart>
                    <Pie
                      data={mockGradeDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                      label={({ name, percentage }) => `${percentage}%`}
                    >
                      {mockGradeDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {/* Grade Analysis Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Grade Analysis by Course
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="cs101" fill={COLORS[0]} name="CS101" />
                    <Bar dataKey="cs201" fill={COLORS[1]} name="CS201" />
                    <Bar dataKey="cs301" fill={COLORS[2]} name="CS301" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Grade Statistics */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Grade Statistics
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {mockGradeDistribution.map((grade, index) => (
                    <Box key={grade.grade} display="flex" justifyContent="space-between" mb={2}>
                      <Typography variant="body2">{grade.grade}</Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            borderRadius: '50%',
                            bgcolor: COLORS[index % COLORS.length],
                          }}
                        />
                        <Typography variant="body2" fontWeight="bold">
                          {grade.count} ({grade.percentage}%)
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {/* Assignment Difficulty Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Assignment Difficulty Analysis
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <ScatterChart data={mockAssignmentDifficulty}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="submissions" name="Submissions" />
                    <YAxis dataKey="avgGrade" name="Average Grade" domain={[0, 100]} />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter dataKey="avgGrade" fill={theme.palette.primary.main} />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Assignment Table */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Assignment Breakdown
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Assignment</TableCell>
                        <TableCell align="right">Avg Grade</TableCell>
                        <TableCell align="right">Difficulty</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockAssignmentDifficulty.map((assignment) => (
                        <TableRow key={assignment.assignment}>
                          <TableCell>{assignment.assignment}</TableCell>
                          <TableCell align="right">{assignment.avgGrade}%</TableCell>
                          <TableCell align="right">
                            <Chip
                              label={assignment.difficulty}
                              size="small"
                              color={
                                assignment.difficulty === 'Easy'
                                  ? 'success'
                                  : assignment.difficulty === 'Medium'
                                  ? 'warning'
                                  : 'error'
                              }
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        <Grid container spacing={3}>
          {/* Student Progress Chart */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Individual Student Progress
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={mockPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="week" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="cs101"
                      stackId="1"
                      stroke={COLORS[0]}
                      fill={COLORS[0]}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="cs201"
                      stackId="2"
                      stroke={COLORS[1]}
                      fill={COLORS[1]}
                      fillOpacity={0.6}
                    />
                    <Area
                      type="monotone"
                      dataKey="cs301"
                      stackId="3"
                      stroke={COLORS[2]}
                      fill={COLORS[2]}
                      fillOpacity={0.6}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Student List */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Top Performers
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Student</TableCell>
                        <TableCell align="right">Avg</TableCell>
                        <TableCell align="right">Trend</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mockStudentProgress
                        .sort((a, b) => ((a.cs101 + a.cs201 + a.cs301) / 3) - ((b.cs101 + b.cs201 + b.cs301) / 3))
                        .reverse()
                        .slice(0, 5)
                        .map((student) => (
                          <TableRow key={student.student}>
                            <TableCell>{student.student}</TableCell>
                            <TableCell align="right">
                              {Math.round((student.cs101 + student.cs201 + student.cs301) / 3)}%
                            </TableCell>
                            <TableCell align="right">
                              {student.trend === 'up' ? (
                                <TrendingUpIcon sx={{ color: theme.palette.success.main }} />
                              ) : (
                                <TrendingDownIcon sx={{ color: theme.palette.grey[500] }} />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        <Grid container spacing={3}>
          {/* Engagement Radar Chart */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Student Engagement Metrics
                </Typography>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={mockEngagementData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar
                      name="Engagement"
                      dataKey="value"
                      stroke={theme.palette.primary.main}
                      fill={theme.palette.primary.main}
                      fillOpacity={0.3}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Engagement Details */}
          <Grid item xs={12} lg={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  Engagement Breakdown
                </Typography>
                <Box sx={{ mt: 2 }}>
                  {mockEngagementData.map((metric) => (
                    <Box key={metric.metric} sx={{ mb: 3 }}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2">{metric.metric}</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {metric.value}%
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          width: '100%',
                          height: 8,
                          bgcolor: alpha(theme.palette.grey[500], 0.2),
                          borderRadius: 4,
                        }}
                      >
                        <Box
                          sx={{
                            width: `${metric.value}%`,
                            height: '100%',
                            bgcolor: metric.value >= 80 
                              ? theme.palette.success.main 
                              : metric.value >= 60 
                              ? theme.palette.warning.main 
                              : theme.palette.error.main,
                            borderRadius: 4,
                          }}
                        />
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>
    </Box>
  );
};

export default ReportsAnalytics;
