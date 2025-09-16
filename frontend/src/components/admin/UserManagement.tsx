import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Card,
  CardContent,
  Alert,
  Snackbar,
  Avatar,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  Badge,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  LinearProgress,
  CircularProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
  FileUpload as FileUploadIcon,
  FileDownload as FileDownloadIcon,
  CheckCircle as CheckCircleIcon,
  Block as BlockIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  Work as WorkIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { adminService, User, PaginatedResponse } from '../../services/admin.service';
import EnhancedDataTable, { Column } from '../ui/EnhancedDataTable';
import { MetricsLineChart, PerformanceBarChart, DistributionPieChart } from '../charts/AdminCharts';

// Validation schemas
const userSchema = yup.object({
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
  email: yup.string().email('Invalid email').required('Email is required'),
  role: yup.string().oneOf(['admin', 'teacher', 'student']).required('Role is required'),
  department: yup.string(),
  status: yup.string().oneOf(['active', 'inactive', 'suspended', 'pending']),
});

interface UserFilters {
  role: string;
  status: string;
  department: string;
  search: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tabpanel-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<UserFilters>({
    role: '',
    status: '',
    department: '',
    search: '',
  });
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [userDetailDialogOpen, setUserDetailDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [snackbar, setSnackbar] = useState({ 
    open: false, 
    message: '', 
    severity: 'success' as 'success' | 'error' | 'warning' | 'info' 
  });

  const queryClient = useQueryClient();

  // Form handling
  const { control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: yupResolver(userSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      role: 'student',
      department: '',
      status: 'active',
    }
  });

  // Fetch users with pagination and filters
  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  } = useQuery({
    queryKey: ['admin-users', page, rowsPerPage, filters],
    queryFn: () => adminService.getAllUsers({
      page: page + 1,
      limit: rowsPerPage,
      ...filters,
    }),
    select: (response) => response.data,
  });

  // Fetch user analytics
  const {
    data: userAnalytics,
    isLoading: analyticsLoading,
  } = useQuery({
    queryKey: ['admin-user-analytics'],
    queryFn: () => adminService.getUserAnalytics(),
    select: (response) => response.data,
  });

  // Mutations
  const createUserMutation = useMutation({
    mutationFn: (userData: Partial<User>) => adminService.createUser(userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialogOpen(false);
      reset();
      setSnackbar({ open: true, message: 'User created successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.message || 'Failed to create user', severity: 'error' });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, userData }: { id: number; userData: Partial<User> }) =>
      adminService.updateUser(id, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setUserDialogOpen(false);
      setSelectedUser(null);
      reset();
      setSnackbar({ open: true, message: 'User updated successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.message || 'Failed to update user', severity: 'error' });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => adminService.deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSnackbar({ open: true, message: 'User deleted successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.message || 'Failed to delete user', severity: 'error' });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ userIds, updates }: { userIds: number[]; updates: Partial<User> }) =>
      adminService.bulkUpdateUsers(userIds, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUsers([]);
      setBulkDialogOpen(false);
      setSnackbar({ open: true, message: 'Users updated successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.message || 'Failed to update users', severity: 'error' });
    },
  });

  const suspendUserMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      adminService.suspendUser(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setSnackbar({ open: true, message: 'User suspended successfully', severity: 'success' });
    },
    onError: (error: any) => {
      setSnackbar({ open: true, message: error.message || 'Failed to suspend user', severity: 'error' });
    },
  });

  // Table columns configuration
  const columns: Column[] = useMemo(() => [
    {
      id: 'avatar',
      label: '',
      minWidth: 60,
      type: 'avatar',
      sortable: false,
    },
    {
      id: 'firstName',
      label: 'Name',
      minWidth: 150,
      sortable: true,
      renderCell: (value, row) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {row.firstName} {row.lastName}
          </Typography>
          <Typography variant="caption" color="textSecondary">
            {row.email}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'role',
      label: 'Role',
      minWidth: 100,
      type: 'chip',
      sortable: true,
      filterable: true,
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      type: 'chip',
      sortable: true,
      filterable: true,
    },
    {
      id: 'department',
      label: 'Department',
      minWidth: 120,
      sortable: true,
      filterable: true,
    },
    {
      id: 'lastLogin',
      label: 'Last Login',
      minWidth: 130,
      type: 'date',
      sortable: true,
    },
    {
      id: 'createdAt',
      label: 'Created',
      minWidth: 120,
      type: 'date',
      sortable: true,
    },
    {
      id: 'actions',
      label: 'Actions',
      minWidth: 150,
      type: 'actions',
      sortable: false,
    },
  ], []);

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleFilterChange = useCallback((newFilters: Record<string, any>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  }, []);

  const handleCreateUser = () => {
    setSelectedUser(null);
    reset();
    setUserDialogOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    reset(user);
    setUserDialogOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setUserDetailDialogOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      deleteUserMutation.mutate(user.id);
    }
  };

  const handleSuspendUser = (user: User) => {
    const reason = window.prompt('Please provide a reason for suspension:');
    if (reason) {
      suspendUserMutation.mutate({ id: user.id, reason });
    }
  };

  const onSubmit = (data: any) => {
    if (selectedUser) {
      updateUserMutation.mutate({ id: selectedUser.id, userData: data });
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleExport = () => {
    adminService.exportUsers(filters)
      .then(() => {
        setSnackbar({ open: true, message: 'Export completed successfully', severity: 'success' });
      })
      .catch(() => {
        setSnackbar({ open: true, message: 'Export failed', severity: 'error' });
      });
  };

  const bulkActions = [
    {
      label: 'Activate',
      icon: <CheckCircleIcon />,
      onClick: (users: User[]) => {
        bulkUpdateMutation.mutate({
          userIds: users.map(u => u.id),
          updates: { status: 'active' },
        });
      },
    },
    {
      label: 'Suspend',
      icon: <BlockIcon />,
      onClick: (users: User[]) => {
        setBulkDialogOpen(true);
      },
    },
    {
      label: 'Send Email',
      icon: <EmailIcon />,
      onClick: (users: User[]) => {
        // Handle bulk email
        setSnackbar({ open: true, message: `Email sent to ${users.length} users`, severity: 'info' });
      },
    },
  ];

  // Chart data preparation
  const userRoleData = useMemo(() => {
    if (!userAnalytics?.roleDistribution) return null;
    
    return {
      labels: Object.keys(userAnalytics.roleDistribution),
      datasets: [{
        data: Object.values(userAnalytics.roleDistribution),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ],
      }],
    };
  }, [userAnalytics]);

  const userActivityData = useMemo(() => {
    if (!userAnalytics?.activityTrend) return null;
    
    return {
      labels: userAnalytics.activityTrend.map((item: any) => item.date),
      datasets: [{
        label: 'Daily Active Users',
        data: userAnalytics.activityTrend.map((item: any) => item.count),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
      }],
    };
  }, [userAnalytics]);

  return (
    <Box>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tab label="User List" />
          <Tab label="Analytics" />
          <Tab label="Bulk Operations" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <EnhancedDataTable
          title="User Management"
          columns={columns}
          data={usersData?.data || []}
          loading={usersLoading}
          error={usersError?.message}
          totalCount={usersData?.total || 0}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          onFilter={handleFilterChange}
          onRefresh={refetchUsers}
          onExport={handleExport}
          onAdd={handleCreateUser}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
          onView={handleViewUser}
          selectable
          selectedRows={selectedUsers}
          onSelectionChange={setSelectedUsers}
          bulkActions={bulkActions}
          searchable
          filterable
          exportable
          refreshable
          addable
        />
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Role Distribution
                </Typography>
                {analyticsLoading ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : userRoleData ? (
                  <DistributionPieChart
                    data={userRoleData}
                    height={300}
                  />
                ) : (
                  <Typography>No data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Activity Trend
                </Typography>
                {analyticsLoading ? (
                  <Box display="flex" justifyContent="center" p={4}>
                    <CircularProgress />
                  </Box>
                ) : userActivityData ? (
                  <MetricsLineChart
                    data={userActivityData}
                    height={300}
                  />
                ) : (
                  <Typography>No data available</Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  User Statistics Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {userAnalytics?.totalUsers || 0}
                      </Typography>
                      <Typography variant="body2">Total Users</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {userAnalytics?.activeUsers || 0}
                      </Typography>
                      <Typography variant="body2">Active Users</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="warning.main">
                        {userAnalytics?.pendingUsers || 0}
                      </Typography>
                      <Typography variant="body2">Pending Approval</Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {userAnalytics?.suspendedUsers || 0}
                      </Typography>
                      <Typography variant="body2">Suspended</Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bulk Import Users
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Upload a CSV file to import multiple users at once.
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<FileUploadIcon />}
                  component="label"
                  sx={{ mr: 2 }}
                >
                  Upload CSV
                  <input type="file" accept=".csv" hidden />
                </Button>
                <Button
                  variant="text"
                  startIcon={<FileDownloadIcon />}
                >
                  Download Template
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bulk Export
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Export user data in various formats.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" size="small">CSV</Button>
                  <Button variant="outlined" size="small">Excel</Button>
                  <Button variant="outlined" size="small">PDF</Button>
                  <Button variant="outlined" size="small">JSON</Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Bulk Operations
                </Typography>
                <Typography variant="body2" color="textSecondary" paragraph>
                  Perform actions on multiple users simultaneously.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" startIcon={<CheckCircleIcon />}>
                    Activate Selected
                  </Button>
                  <Button variant="outlined" startIcon={<BlockIcon />}>
                    Suspend Selected
                  </Button>
                  <Button variant="outlined" startIcon={<EmailIcon />}>
                    Send Email
                  </Button>
                  <Button variant="outlined" startIcon={<SecurityIcon />}>
                    Reset Passwords
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* User Create/Edit Dialog */}
      <Dialog
        open={userDialogOpen}
        onClose={() => setUserDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>
            {selectedUser ? 'Edit User' : 'Create New User'}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="firstName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="First Name"
                      fullWidth
                      error={!!errors.firstName}
                      helperText={errors.firstName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="lastName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Last Name"
                      fullWidth
                      error={!!errors.lastName}
                      helperText={errors.lastName?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>Role</InputLabel>
                      <Select {...field} label="Role">
                        <MenuItem value="student">Student</MenuItem>
                        <MenuItem value="teacher">Teacher</MenuItem>
                        <MenuItem value="admin">Administrator</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select {...field} label="Status">
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="suspended">Suspended</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>
              <Grid item xs={12}>
                <Controller
                  name="department"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Department (Optional)"
                      fullWidth
                    />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {createUserMutation.isPending || updateUserMutation.isPending ? (
                <CircularProgress size={20} />
              ) : (
                selectedUser ? 'Update' : 'Create'
              )}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* User Detail Dialog */}
      <Dialog
        open={userDetailDialogOpen}
        onClose={() => setUserDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details
        </DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <Box textAlign="center">
                  <Avatar
                    sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
                    src={selectedUser.avatar}
                  >
                    {selectedUser.firstName[0]}{selectedUser.lastName[0]}
                  </Avatar>
                  <Typography variant="h5" gutterBottom>
                    {selectedUser.firstName} {selectedUser.lastName}
                  </Typography>
                  <Chip
                    label={selectedUser.status}
                    color={selectedUser.status === 'active' ? 'success' : 'default'}
                    sx={{ mb: 1 }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {selectedUser.role}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={8}>
                <List>
                  <ListItem>
                    <ListItemIcon><EmailIcon /></ListItemIcon>
                    <ListItemText primary="Email" secondary={selectedUser.email} />
                  </ListItem>
                  {selectedUser.department && (
                    <ListItem>
                      <ListItemIcon><WorkIcon /></ListItemIcon>
                      <ListItemText primary="Department" secondary={selectedUser.department} />
                    </ListItem>
                  )}
                  <ListItem>
                    <ListItemIcon><HistoryIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Last Login" 
                      secondary={selectedUser.lastLogin ? new Date(selectedUser.lastLogin).toLocaleString() : 'Never'} 
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><CheckCircleIcon /></ListItemIcon>
                    <ListItemText 
                      primary="Member Since" 
                      secondary={new Date(selectedUser.createdAt).toLocaleDateString()} 
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUserDetailDialogOpen(false)}>
            Close
          </Button>
          {selectedUser && (
            <>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => {
                  setUserDetailDialogOpen(false);
                  handleEditUser(selectedUser);
                }}
              >
                Edit
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BlockIcon />}
                onClick={() => handleSuspendUser(selectedUser)}
              >
                Suspend
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
