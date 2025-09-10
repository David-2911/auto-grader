import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  ButtonGroup,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Menu,
  MenuList,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  Divider,
  Avatar,
  Stack,
  Collapse,
  LinearProgress,
} from '@mui/material';
import {
  History as HistoryIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  FileDownload as DownloadIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  ExpandMore as ExpandMoreIcon,
  Visibility as ViewIcon,
  SecurityUpdateGood as SecurityIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as SuccessIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Computer as DeviceIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
  VpnKey as KeyIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
  School as SchoolIcon,
  Grade as GradeIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO, isValid } from 'date-fns';

import { adminService, ActivityLog } from '../../services/admin.service';
import { EnhancedDataTable } from './EnhancedDataTable';

interface AuditFilters {
  userId?: string;
  action?: string;
  resource?: string;
  severity?: string;
  dateFrom?: string;
  dateTo?: string;
  ipAddress?: string;
  searchTerm?: string;
}

interface LogDetailDialogProps {
  open: boolean;
  onClose: () => void;
  logEntry: ActivityLog | null;
}

const LogDetailDialog: React.FC<LogDetailDialogProps> = ({ open, onClose, logEntry }) => {
  if (!logEntry) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return <AddIcon />;
      case 'update': return <EditIcon />;
      case 'delete': return <DeleteIcon />;
      case 'login': return <LockIcon />;
      case 'logout': return <KeyIcon />;
      case 'upload': return <UploadIcon />;
      case 'grade': return <GradeIcon />;
      case 'assign': return <AssignmentIcon />;
      default: return <InfoIcon />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {getActionIcon(logEntry.action)}
          </Avatar>
          <Box>
            <Typography variant="h6">
              Audit Log Details
            </Typography>
            <Typography variant="body2" color="textSecondary">
              {format(parseISO(logEntry.timestamp), 'PPpp')}
            </Typography>
          </Box>
          <Chip
            label={logEntry.severity}
            color={getSeverityColor(logEntry.severity) as any}
            size="small"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Action Details
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><PersonIcon /></ListItemIcon>
                    <ListItemText
                      primary="User"
                      secondary={`${logEntry.user_name} (${logEntry.user_email})`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><SettingsIcon /></ListItemIcon>
                    <ListItemText
                      primary="Action"
                      secondary={logEntry.action}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><SchoolIcon /></ListItemIcon>
                    <ListItemText
                      primary="Resource"
                      secondary={logEntry.resource}
                    />
                  </ListItem>
                  {logEntry.resource_id && (
                    <ListItem>
                      <ListItemIcon><InfoIcon /></ListItemIcon>
                      <ListItemText
                        primary="Resource ID"
                        secondary={logEntry.resource_id}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Session Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon><LocationIcon /></ListItemIcon>
                    <ListItemText
                      primary="IP Address"
                      secondary={logEntry.ip_address || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><DeviceIcon /></ListItemIcon>
                    <ListItemText
                      primary="User Agent"
                      secondary={logEntry.user_agent || 'N/A'}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><ScheduleIcon /></ListItemIcon>
                    <ListItemText
                      primary="Timestamp"
                      secondary={format(parseISO(logEntry.timestamp), 'PPpp')}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {logEntry.description}
                </Typography>

                {logEntry.details && (
                  <>
                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                      Additional Details
                    </Typography>
                    <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                      <pre style={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.875rem',
                        whiteSpace: 'pre-wrap',
                        margin: 0 
                      }}>
                        {typeof logEntry.details === 'object' 
                          ? JSON.stringify(logEntry.details, null, 2)
                          : logEntry.details
                        }
                      </pre>
                    </Paper>
                  </>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" startIcon={<DownloadIcon />}>
          Export Details
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const EnhancedAuditLogs: React.FC = () => {
  const [filters, setFilters] = useState<AuditFilters>({});
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedLogs, setSelectedLogs] = useState<number[]>([]);

  // Fetch audit logs
  const {
    data: auditLogsResponse,
    isLoading: logsLoading,
    error: logsError,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['admin-audit-logs', page, rowsPerPage, filters],
    queryFn: () => adminService.getAuditLogs({
      page: page + 1,
      limit: rowsPerPage,
      ...filters,
    }),
  });

  // Fetch audit summary
  const {
    data: auditSummary,
    isLoading: summaryLoading,
  } = useQuery({
    queryKey: ['admin-audit-summary'],
    queryFn: () => adminService.getAuditSummary(),
    select: (response) => response.data,
  });

  const auditLogs = auditLogsResponse?.data?.items || [];
  const totalLogs = auditLogsResponse?.data?.total || 0;

  // Generate summary metrics
  const summaryMetrics = useMemo(() => {
    if (!auditSummary) return [];

    return [
      {
        title: 'Total Events',
        value: auditSummary.totalEvents || 0,
        icon: <HistoryIcon />,
        color: 'primary',
        change: auditSummary.eventsChange || 0,
      },
      {
        title: 'Critical Events',
        value: auditSummary.criticalEvents || 0,
        icon: <ErrorIcon />,
        color: 'error',
        change: auditSummary.criticalChange || 0,
      },
      {
        title: 'Security Events',
        value: auditSummary.securityEvents || 0,
        icon: <SecurityIcon />,
        color: 'warning',
        change: auditSummary.securityChange || 0,
      },
      {
        title: 'User Actions',
        value: auditSummary.userActions || 0,
        icon: <PersonIcon />,
        color: 'info',
        change: auditSummary.userActionsChange || 0,
      },
    ];
  }, [auditSummary]);

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
    }));
    setPage(0);
  };

  const handleViewDetails = (log: ActivityLog) => {
    setSelectedLog(log);
    setDetailDialogOpen(true);
  };

  const handleExpandRow = (logId: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedRows(newExpanded);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'create': return <AddIcon fontSize="small" />;
      case 'update': return <EditIcon fontSize="small" />;
      case 'delete': return <DeleteIcon fontSize="small" />;
      case 'login': return <LockIcon fontSize="small" />;
      case 'logout': return <KeyIcon fontSize="small" />;
      case 'upload': return <UploadIcon fontSize="small" />;
      case 'grade': return <GradeIcon fontSize="small" />;
      case 'assign': return <AssignmentIcon fontSize="small" />;
      default: return <InfoIcon fontSize="small" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = parseISO(timestamp);
      return isValid(date) ? format(date, 'MMM dd, yyyy HH:mm:ss') : 'Invalid Date';
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const clearFilters = () => {
    setFilters({});
    setPage(0);
  };

  const exportLogs = () => {
    // Implementation for exporting logs
    console.log('Exporting logs with filters:', filters);
  };

  const tableColumns = [
    {
      id: 'timestamp',
      label: 'Timestamp',
      render: (log: ActivityLog) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {formatTimestamp(log.timestamp)}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'user',
      label: 'User',
      render: (log: ActivityLog) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32 }}>
            {log.user_name?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight="medium">
              {log.user_name}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              {log.user_email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'action',
      label: 'Action',
      render: (log: ActivityLog) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getActionIcon(log.action)}
          <Typography variant="body2">
            {log.action}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'resource',
      label: 'Resource',
      render: (log: ActivityLog) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {log.resource}
          </Typography>
          {log.resource_id && (
            <Typography variant="caption" color="textSecondary">
              ID: {log.resource_id}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'severity',
      label: 'Severity',
      render: (log: ActivityLog) => (
        <Chip
          label={log.severity}
          color={getSeverityColor(log.severity) as any}
          size="small"
        />
      ),
    },
    {
      id: 'ip_address',
      label: 'IP Address',
      render: (log: ActivityLog) => (
        <Typography variant="body2" fontFamily="monospace">
          {log.ip_address || 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'actions',
      label: 'Actions',
      render: (log: ActivityLog) => (
        <Box>
          <IconButton
            size="small"
            onClick={() => handleViewDetails(log)}
          >
            <ViewIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleExpandRow(log.id)}
          >
            <ExpandMoreIcon
              sx={{
                transform: expandedRows.has(log.id) ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Audit Logs
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportLogs}
          >
            Export Logs
          </Button>
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetchLogs()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary Metrics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {summaryMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={metric.title}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${metric.color}.main`,
                        mr: 2,
                      }}
                    >
                      {metric.icon}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h4" component="div" fontWeight="bold">
                        {metric.value.toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {metric.title}
                      </Typography>
                    </Box>
                  </Box>
                  {metric.change !== 0 && (
                    <Typography
                      variant="body2"
                      color={metric.change > 0 ? 'error.main' : 'success.main'}
                    >
                      {metric.change > 0 ? '+' : ''}{metric.change}% from last period
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filters
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                placeholder="Search logs..."
                value={filters.searchTerm || ''}
                onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action || ''}
                  label="Action"
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                >
                  <MenuItem value="">All Actions</MenuItem>
                  <MenuItem value="create">Create</MenuItem>
                  <MenuItem value="update">Update</MenuItem>
                  <MenuItem value="delete">Delete</MenuItem>
                  <MenuItem value="login">Login</MenuItem>
                  <MenuItem value="logout">Logout</MenuItem>
                  <MenuItem value="upload">Upload</MenuItem>
                  <MenuItem value="grade">Grade</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource</InputLabel>
                <Select
                  value={filters.resource || ''}
                  label="Resource"
                  onChange={(e) => handleFilterChange('resource', e.target.value)}
                >
                  <MenuItem value="">All Resources</MenuItem>
                  <MenuItem value="user">User</MenuItem>
                  <MenuItem value="course">Course</MenuItem>
                  <MenuItem value="assignment">Assignment</MenuItem>
                  <MenuItem value="submission">Submission</MenuItem>
                  <MenuItem value="grade">Grade</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Severity</InputLabel>
                <Select
                  value={filters.severity || ''}
                  label="Severity"
                  onChange={(e) => handleFilterChange('severity', e.target.value)}
                >
                  <MenuItem value="">All Severities</MenuItem>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                  <MenuItem value="critical">Critical</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="From Date"
                value={filters.dateFrom || ''}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={1.5}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="To Date"
                value={filters.dateTo || ''}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs="auto">
              <Button
                variant="outlined"
                onClick={clearFilters}
                startIcon={<FilterIcon />}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          {logsLoading && <LinearProgress />}
          
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {tableColumns.map((column) => (
                    <TableCell key={column.id}>
                      {column.label}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                <AnimatePresence>
                  {auditLogs.map((log: ActivityLog, index: number) => (
                    <React.Fragment key={log.id}>
                      <motion.tr
                        component={TableRow}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        hover
                      >
                        {tableColumns.map((column) => (
                          <TableCell key={column.id}>
                            {column.render(log)}
                          </TableCell>
                        ))}
                      </motion.tr>
                      
                      {/* Expandable row details */}
                      <TableRow>
                        <TableCell colSpan={tableColumns.length} sx={{ py: 0 }}>
                          <Collapse
                            in={expandedRows.has(log.id)}
                            timeout="auto"
                            unmountOnExit
                          >
                            <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="subtitle2" gutterBottom>
                                Description
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 2 }}>
                                {log.description}
                              </Typography>
                              
                              {log.details && (
                                <>
                                  <Typography variant="subtitle2" gutterBottom>
                                    Additional Details
                                  </Typography>
                                  <Paper sx={{ p: 1, bgcolor: 'white' }}>
                                    <pre style={{ 
                                      fontFamily: 'monospace', 
                                      fontSize: '0.75rem',
                                      margin: 0,
                                      whiteSpace: 'pre-wrap'
                                    }}>
                                      {typeof log.details === 'object' 
                                        ? JSON.stringify(log.details, null, 2)
                                        : log.details
                                      }
                                    </pre>
                                  </Paper>
                                </>
                              )}
                            </Box>
                          </Collapse>
                        </TableCell>
                      </TableRow>
                    </React.Fragment>
                  ))}
                </AnimatePresence>
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            component="div"
            count={totalLogs}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(parseInt(event.target.value, 10));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <LogDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        logEntry={selectedLog}
      />

      {/* Error State */}
      {logsError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load audit logs. Please try refreshing the page.
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedAuditLogs;
