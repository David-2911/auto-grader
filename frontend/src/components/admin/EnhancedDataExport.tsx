import React, { useState, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  ButtonGroup,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Switch,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  AlertTitle,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  LinearProgress,
  CircularProgress,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  Badge,
} from '@mui/material';
import {
  FileDownload as DownloadIcon,
  CloudDownload as CloudDownloadIcon,
  Schedule as ScheduleIcon,
  Settings as SettingsIcon,
  DataObject as DataIcon,
  TableChart as TableIcon,
  PictureAsPdf as PdfIcon,
  Description as CsvIcon,
  Code as JsonIcon,
  Article as XmlIcon,
  ExpandMore as ExpandMoreIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  GetApp as GetAppIcon,
  FileCopy as FileCopyIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Grade as GradeIcon,
  Security as SecurityIcon,
  Analytics as AnalyticsIcon,
  Storage as StorageIcon,
  Backup as BackupIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import { adminService } from '../../services/admin.service';

interface ExportJob {
  id: string;
  name: string;
  type: string;
  format: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  size?: number;
  downloadUrl?: string;
  createdAt: string;
  completedAt?: string;
  error?: string;
  parameters: ExportParameters;
}

interface ExportParameters {
  dataType: string;
  format: string;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  columns?: string[];
  includeMetadata?: boolean;
  compression?: boolean;
  encryption?: boolean;
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
      id={`export-tabpanel-${index}`}
      aria-labelledby={`export-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ExportWizardDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  onSubmit: (params: ExportParameters) => void;
}> = ({ open, onClose, onSubmit }) => {
  const [activeStep, setActiveStep] = useState(0);
  const [exportParams, setExportParams] = useState<ExportParameters>({
    dataType: '',
    format: 'csv',
    includeMetadata: false,
    compression: false,
    encryption: false,
  });

  const dataTypes = [
    { id: 'users', label: 'Users', icon: <PeopleIcon />, description: 'User accounts and profiles' },
    { id: 'courses', label: 'Courses', icon: <SchoolIcon />, description: 'Course information and enrollment' },
    { id: 'assignments', label: 'Assignments', icon: <AssignmentIcon />, description: 'Assignment data and requirements' },
    { id: 'submissions', label: 'Submissions', icon: <GradeIcon />, description: 'Student submissions and files' },
    { id: 'grades', label: 'Grades', icon: <GradeIcon />, description: 'Grading data and feedback' },
    { id: 'audit_logs', label: 'Audit Logs', icon: <SecurityIcon />, description: 'System activity and security logs' },
    { id: 'analytics', label: 'Analytics', icon: <AnalyticsIcon />, description: 'Usage statistics and metrics' },
    { id: 'system_data', label: 'System Data', icon: <StorageIcon />, description: 'System configuration and metadata' },
  ];

  const formats = [
    { id: 'csv', label: 'CSV', icon: <CsvIcon />, description: 'Comma-separated values' },
    { id: 'json', label: 'JSON', icon: <JsonIcon />, description: 'JavaScript Object Notation' },
    { id: 'xml', label: 'XML', icon: <XmlIcon />, description: 'Extensible Markup Language' },
    { id: 'pdf', label: 'PDF', icon: <PdfIcon />, description: 'Portable Document Format' },
    { id: 'excel', label: 'Excel', icon: <TableIcon />, description: 'Microsoft Excel spreadsheet' },
  ];

  const steps = [
    'Select Data Type',
    'Choose Format',
    'Configure Options',
    'Review & Export',
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleSubmit = () => {
    onSubmit(exportParams);
    onClose();
    setActiveStep(0);
    setExportParams({
      dataType: '',
      format: 'csv',
      includeMetadata: false,
      compression: false,
      encryption: false,
    });
  };

  const canProceed = () => {
    switch (activeStep) {
      case 0: return exportParams.dataType !== '';
      case 1: return exportParams.format !== '';
      case 2: return true;
      case 3: return true;
      default: return false;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Export Data Wizard
      </DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((label, index) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
              <StepContent>
                {/* Step 0: Select Data Type */}
                {index === 0 && (
                  <Grid container spacing={2}>
                    {dataTypes.map((type) => (
                      <Grid item xs={12} sm={6} md={4} key={type.id}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            border: exportParams.dataType === type.id ? 2 : 1,
                            borderColor: exportParams.dataType === type.id ? 'primary.main' : 'divider',
                          }}
                          onClick={() => setExportParams(prev => ({ ...prev, dataType: type.id }))}
                        >
                          <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Box sx={{ color: 'primary.main', mb: 1 }}>
                              {type.icon}
                            </Box>
                            <Typography variant="subtitle2" gutterBottom>
                              {type.label}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {type.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {/* Step 1: Choose Format */}
                {index === 1 && (
                  <Grid container spacing={2}>
                    {formats.map((format) => (
                      <Grid item xs={12} sm={6} md={4} key={format.id}>
                        <Card
                          sx={{
                            cursor: 'pointer',
                            border: exportParams.format === format.id ? 2 : 1,
                            borderColor: exportParams.format === format.id ? 'primary.main' : 'divider',
                          }}
                          onClick={() => setExportParams(prev => ({ ...prev, format: format.id }))}
                        >
                          <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Box sx={{ color: 'primary.main', mb: 1 }}>
                              {format.icon}
                            </Box>
                            <Typography variant="subtitle2" gutterBottom>
                              {format.label}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {format.description}
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}

                {/* Step 2: Configure Options */}
                {index === 2 && (
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        Date Range
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <TextField
                          type="date"
                          label="Start Date"
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          value={exportParams.dateRange?.start || ''}
                          onChange={(e) => setExportParams(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, start: e.target.value, end: prev.dateRange?.end || '' }
                          }))}
                        />
                        <TextField
                          type="date"
                          label="End Date"
                          size="small"
                          InputLabelProps={{ shrink: true }}
                          value={exportParams.dateRange?.end || ''}
                          onChange={(e) => setExportParams(prev => ({
                            ...prev,
                            dateRange: { ...prev.dateRange, end: e.target.value, start: prev.dateRange?.start || '' }
                          }))}
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom>
                        Export Options
                      </Typography>
                      <FormGroup>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={exportParams.includeMetadata || false}
                              onChange={(e) => setExportParams(prev => ({ ...prev, includeMetadata: e.target.checked }))}
                            />
                          }
                          label="Include metadata"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={exportParams.compression || false}
                              onChange={(e) => setExportParams(prev => ({ ...prev, compression: e.target.checked }))}
                            />
                          }
                          label="Enable compression"
                        />
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={exportParams.encryption || false}
                              onChange={(e) => setExportParams(prev => ({ ...prev, encryption: e.target.checked }))}
                            />
                          }
                          label="Encrypt export file"
                        />
                      </FormGroup>
                    </Grid>
                  </Grid>
                )}

                {/* Step 3: Review & Export */}
                {index === 3 && (
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      Export Summary
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemText
                          primary="Data Type"
                          secondary={dataTypes.find(t => t.id === exportParams.dataType)?.label}
                        />
                      </ListItem>
                      <ListItem>
                        <ListItemText
                          primary="Format"
                          secondary={formats.find(f => f.id === exportParams.format)?.label}
                        />
                      </ListItem>
                      {exportParams.dateRange?.start && (
                        <ListItem>
                          <ListItemText
                            primary="Date Range"
                            secondary={`${exportParams.dateRange.start} to ${exportParams.dateRange.end}`}
                          />
                        </ListItem>
                      )}
                      <ListItem>
                        <ListItemText
                          primary="Options"
                          secondary={[
                            exportParams.includeMetadata && 'Metadata included',
                            exportParams.compression && 'Compressed',
                            exportParams.encryption && 'Encrypted',
                          ].filter(Boolean).join(', ') || 'None'}
                        />
                      </ListItem>
                    </List>
                  </Box>
                )}

                <Box sx={{ mb: 2, mt: 2 }}>
                  <div>
                    {index === steps.length - 1 ? (
                      <Button
                        variant="contained"
                        onClick={handleSubmit}
                        sx={{ mt: 1, mr: 1 }}
                        startIcon={<StartIcon />}
                      >
                        Start Export
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        onClick={handleNext}
                        sx={{ mt: 1, mr: 1 }}
                        disabled={!canProceed()}
                      >
                        Continue
                      </Button>
                    )}
                    <Button
                      disabled={index === 0}
                      onClick={handleBack}
                      sx={{ mt: 1, mr: 1 }}
                    >
                      Back
                    </Button>
                  </div>
                </Box>
              </StepContent>
            </Step>
          ))}
        </Stepper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

const EnhancedDataExport: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const queryClient = useQueryClient();

  // Fetch export jobs
  const {
    data: exportJobs,
    isLoading: jobsLoading,
    error: jobsError,
  } = useQuery({
    queryKey: ['admin-export-jobs', page, rowsPerPage],
    queryFn: () => adminService.getExportJobs({
      page: page + 1,
      limit: rowsPerPage,
    }),
    select: (response) => response.data,
  });

  // Fetch export templates
  const {
    data: exportTemplates,
    isLoading: templatesLoading,
  } = useQuery({
    queryKey: ['admin-export-templates'],
    queryFn: () => adminService.getExportTemplates(),
    select: (response) => response.data,
  });

  // Create export job mutation
  const createExportMutation = useMutation({
    mutationFn: (params: ExportParameters) => adminService.createExportJob(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-export-jobs'] });
    },
  });

  // Cancel export job mutation
  const cancelExportMutation = useMutation({
    mutationFn: (jobId: string) => adminService.cancelExportJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-export-jobs'] });
    },
  });

  // Delete export job mutation
  const deleteExportMutation = useMutation({
    mutationFn: (jobId: string) => adminService.deleteExportJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-export-jobs'] });
    },
  });

  const handleCreateExport = (params: ExportParameters) => {
    createExportMutation.mutate(params);
  };

  const handleCancelJob = (jobId: string) => {
    cancelExportMutation.mutate(jobId);
  };

  const handleDeleteJob = (jobId: string) => {
    deleteExportMutation.mutate(jobId);
  };

  const handleDownload = (job: ExportJob) => {
    if (job.downloadUrl) {
      window.open(job.downloadUrl, '_blank');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'info';
      case 'failed': return 'error';
      case 'cancelled': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <SuccessIcon />;
      case 'running': return <CircularProgress size={16} />;
      case 'failed': return <ErrorIcon />;
      case 'cancelled': return <WarningIcon />;
      default: return <InfoIcon />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const runningJobs = exportJobs?.items?.filter((job: ExportJob) => job.status === 'running') || [];
  const completedJobs = exportJobs?.items?.filter((job: ExportJob) => job.status === 'completed') || [];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Data Export & Backup
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={() => setWizardOpen(true)}
          >
            New Export
          </Button>
          <Button
            variant="outlined"
            startIcon={<BackupIcon />}
          >
            System Backup
          </Button>
        </Box>
      </Box>

      {/* Quick Stats */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <DownloadIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {exportJobs?.total || 0}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Exports
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <CircularProgress size={24} />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {runningJobs.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Running Jobs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <SuccessIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {completedJobs.length}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
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
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <StorageIcon />
                </Avatar>
                <Box>
                  <Typography variant="h6">
                    {formatFileSize(
                      completedJobs.reduce((total: number, job: ExportJob) => total + (job.size || 0), 0)
                    )}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Size
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Export Jobs" />
          <Tab label="Templates" />
          <Tab label="Scheduled Exports" />
        </Tabs>
      </Box>

      {/* Export Jobs Tab */}
      <TabPanel value={activeTab} index={0}>
        <Card>
          <CardContent sx={{ p: 0 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Format</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {exportJobs?.items?.map((job: ExportJob, index: number) => (
                      <motion.tr
                        component={TableRow}
                        key={job.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: index * 0.05 }}
                        hover
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {job.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={job.type} size="small" />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" textTransform="uppercase">
                            {job.format}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {getStatusIcon(job.status)}
                            <Chip
                              label={job.status}
                              color={getStatusColor(job.status) as any}
                              size="small"
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ width: 100 }}>
                            <LinearProgress
                              variant="determinate"
                              value={job.progress}
                              sx={{ mb: 0.5 }}
                            />
                            <Typography variant="caption">
                              {job.progress}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {job.size ? formatFileSize(job.size) : '-'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {format(new Date(job.createdAt), 'MMM dd, yyyy HH:mm')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            {job.status === 'completed' && (
                              <Tooltip title="Download">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownload(job)}
                                >
                                  <GetAppIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            {job.status === 'running' && (
                              <Tooltip title="Cancel">
                                <IconButton
                                  size="small"
                                  onClick={() => handleCancelJob(job.id)}
                                >
                                  <StopIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Delete">
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteJob(job.id)}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </TableCell>
                      </motion.tr>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={8} align="center">
                          <Typography variant="body2" color="textSecondary">
                            No export jobs found
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>

            <TablePagination
              component="div"
              count={exportJobs?.total || 0}
              page={page}
              onPageChange={(event, newPage) => setPage(newPage)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(event) => {
                setRowsPerPage(parseInt(event.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[5, 10, 25]}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* Templates Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {exportTemplates?.map((template: any) => (
            <Grid item xs={12} sm={6} md={4} key={template.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                      <DataIcon />
                    </Avatar>
                    <Box>
                      <Typography variant="h6">
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {template.description}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip label={template.dataType} size="small" sx={{ mr: 1 }} />
                  <Chip label={template.format} size="small" />
                </CardContent>
                <CardActions>
                  <Button size="small" startIcon={<StartIcon />}>
                    Use Template
                  </Button>
                  <Button size="small" startIcon={<EditIcon />}>
                    Edit
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          )) || (
            <Grid item xs={12}>
              <Alert severity="info">
                <AlertTitle>No Templates</AlertTitle>
                No export templates have been created yet. Create your first template to streamline the export process.
              </Alert>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* Scheduled Exports Tab */}
      <TabPanel value={activeTab} index={2}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <AlertTitle>Coming Soon</AlertTitle>
          Scheduled exports feature is currently in development. You will be able to set up automated exports on a recurring schedule.
        </Alert>
        
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Schedule New Export
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Frequency</InputLabel>
                  <Select defaultValue="">
                    <MenuItem value="daily">Daily</MenuItem>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="time"
                  label="Time"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
            <Button
              variant="contained"
              startIcon={<ScheduleIcon />}
              sx={{ mt: 2 }}
              disabled
            >
              Schedule Export
            </Button>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Export Wizard Dialog */}
      <ExportWizardDialog
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreateExport}
      />

      {/* Error State */}
      {jobsError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed to load export jobs. Please try refreshing the page.
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedDataExport;
