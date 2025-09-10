import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Alert,
  Snackbar,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CloudDownload as CloudDownloadIcon,
  Backup as BackupIcon,
  Restore as RestoreIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Schedule as ScheduleIcon,
  Storage as StorageIcon,
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  History as HistoryIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { adminService } from '../../services/admin.service';

interface BackupJob {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'database' | 'files';
  status: 'running' | 'completed' | 'failed' | 'scheduled';
  size: number;
  startTime: string;
  endTime?: string;
  progress: number;
  description: string;
}

interface ExportRequest {
  id: string;
  name: string;
  type: 'users' | 'courses' | 'assignments' | 'submissions' | 'grades';
  format: 'csv' | 'json' | 'xlsx';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestedBy: string;
  requestedAt: string;
  completedAt?: string;
  downloadUrl?: string;
  size?: number;
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
      id={`data-tabpanel-${index}`}
      aria-labelledby={`data-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const DataExportBackup: React.FC = () => {
  const [currentTab, setCurrentTab] = useState(0);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupJob | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // Export form state
  const [exportForm, setExportForm] = useState({
    name: '',
    types: [] as string[],
    format: 'csv',
    filters: {
      dateRange: 'all',
      status: 'all',
    },
  });

  // Backup form state
  const [backupForm, setBackupForm] = useState({
    name: '',
    type: 'full',
    description: '',
    includeFiles: true,
    includeDatabase: true,
    compression: true,
  });

  const queryClient = useQueryClient();

  // Fetch backup status
  const {
    data: backupStatus,
    isLoading: backupLoading,
    refetch: refetchBackups,
  } = useQuery({
    queryKey: ['admin-backup-status'],
    queryFn: () => adminService.getBackupStatus(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Create backup mutation
  const createBackupMutation = useMutation({
    mutationFn: (backupData: any) => adminService.createBackup(backupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-backup-status'] });
      setSnackbar({ open: true, message: 'Backup started successfully', severity: 'success' });
      setBackupDialogOpen(false);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to start backup', severity: 'error' });
    },
  });

  // Export data mutation
  const exportDataMutation = useMutation({
    mutationFn: (exportData: any) => adminService.exportSystemData(exportData),
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Export started successfully', severity: 'success' });
      setExportDialogOpen(false);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to start export', severity: 'error' });
    },
  });

  // Restore backup mutation
  const restoreBackupMutation = useMutation({
    mutationFn: (backupId: string) => adminService.restoreBackup(backupId),
    onSuccess: () => {
      setSnackbar({ open: true, message: 'Restore started successfully', severity: 'success' });
      setRestoreDialogOpen(false);
    },
    onError: () => {
      setSnackbar({ open: true, message: 'Failed to start restore', severity: 'error' });
    },
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleCreateExport = () => {
    const exportData = {
      name: exportForm.name,
      types: exportForm.types,
      format: exportForm.format,
      filters: exportForm.filters,
    };
    exportDataMutation.mutate(exportData);
  };

  const handleCreateBackup = () => {
    const backupData = {
      name: backupForm.name,
      type: backupForm.type,
      description: backupForm.description,
      options: {
        includeFiles: backupForm.includeFiles,
        includeDatabase: backupForm.includeDatabase,
        compression: backupForm.compression,
      },
    };
    createBackupMutation.mutate(backupData);
  };

  const handleRestoreBackup = () => {
    if (selectedBackup) {
      restoreBackupMutation.mutate(selectedBackup.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'running':
      case 'processing':
        return 'info';
      case 'failed':
        return 'error';
      case 'scheduled':
      case 'pending':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const backupJobs: BackupJob[] = backupStatus?.data?.backups || [];
  const exportRequests: ExportRequest[] = backupStatus?.data?.exports || [];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Data Export & Backup
      </Typography>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <CloudDownloadIcon sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">Data Export</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Export system data in various formats
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={() => setExportDialogOpen(true)}
                startIcon={<DownloadIcon />}
              >
                Create Export
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <BackupIcon sx={{ fontSize: 40, color: 'secondary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">System Backup</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Create full or incremental backups
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                variant="contained"
                onClick={() => setBackupDialogOpen(true)}
                startIcon={<BackupIcon />}
              >
                Create Backup
              </Button>
            </CardActions>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <RestoreIcon sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h6">System Restore</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Restore from previous backups
                  </Typography>
                </Box>
              </Box>
            </CardContent>
            <CardActions>
              <Button
                variant="outlined"
                onClick={() => setRestoreDialogOpen(true)}
                startIcon={<RestoreIcon />}
              >
                Restore System
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Storage Information */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4" component="div">
                {backupStatus?.data?.storage?.used ? formatBytes(backupStatus.data.storage.used) : '0 MB'}
              </Typography>
              <Typography color="textSecondary">Used Storage</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div">
                {backupJobs.length}
              </Typography>
              <Typography color="textSecondary">Total Backups</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div">
                {exportRequests.length}
              </Typography>
              <Typography color="textSecondary">Export Requests</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" component="div">
                {backupStatus?.data?.lastBackup ? 
                  new Date(backupStatus.data.lastBackup).toLocaleDateString() : 'Never'}
              </Typography>
              <Typography color="textSecondary">Last Backup</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="data management tabs"
          >
            <Tab icon={<BackupIcon />} label="Backups" />
            <Tab icon={<DownloadIcon />} label="Exports" />
            <Tab icon={<HistoryIcon />} label="History" />
          </Tabs>
        </Box>

        {/* Backups Tab */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Backup Jobs</Typography>
            <IconButton onClick={() => refetchBackups()} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Progress</TableCell>
                  <TableCell>Started</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {backupJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No backups found
                    </TableCell>
                  </TableRow>
                ) : (
                  backupJobs.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {backup.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {backup.description}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip label={backup.type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={backup.status}
                          color={getStatusColor(backup.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{formatBytes(backup.size)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <LinearProgress
                            variant="determinate"
                            value={backup.progress}
                            sx={{ width: 100, mr: 1 }}
                          />
                          <Typography variant="caption">
                            {backup.progress}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(backup.startTime).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelectedBackup(backup);
                            setRestoreDialogOpen(true);
                          }}
                          disabled={backup.status !== 'completed'}
                        >
                          <RestoreIcon />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* Exports Tab */}
        <TabPanel value={currentTab} index={1}>
          <Typography variant="h6" sx={{ mb: 2 }}>Export Requests</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Format</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Requested By</TableCell>
                  <TableCell>Requested At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {exportRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No export requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  exportRequests.map((exportReq) => (
                    <TableRow key={exportReq.id}>
                      <TableCell>{exportReq.name}</TableCell>
                      <TableCell>
                        <Chip label={exportReq.type} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip label={exportReq.format.toUpperCase()} size="small" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={exportReq.status}
                          color={getStatusColor(exportReq.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{exportReq.requestedBy}</TableCell>
                      <TableCell>
                        {new Date(exportReq.requestedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          disabled={exportReq.status !== 'completed' || !exportReq.downloadUrl}
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton size="small" color="error">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        {/* History Tab */}
        <TabPanel value={currentTab} index={2}>
          <Typography variant="h6" sx={{ mb: 2 }}>Activity History</Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <BackupIcon />
              </ListItemIcon>
              <ListItemText
                primary="System backup completed"
                secondary="2 hours ago"
              />
            </ListItem>
            <Divider />
            <ListItem>
              <ListItemIcon>
                <DownloadIcon />
              </ListItemIcon>
              <ListItemText
                primary="User data export completed"
                secondary="1 day ago"
              />
            </ListItem>
          </List>
        </TabPanel>
      </Paper>

      {/* Export Dialog */}
      <Dialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create Data Export</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Export Name"
            value={exportForm.name}
            onChange={(e) => setExportForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Data Types to Export
          </Typography>
          <FormGroup sx={{ mb: 2 }}>
            {['users', 'courses', 'assignments', 'submissions', 'grades'].map((type) => (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={exportForm.types.includes(type)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setExportForm(prev => ({ ...prev, types: [...prev.types, type] }));
                      } else {
                        setExportForm(prev => ({ ...prev, types: prev.types.filter(t => t !== type) }));
                      }
                    }}
                  />
                }
                label={type.charAt(0).toUpperCase() + type.slice(1)}
              />
            ))}
          </FormGroup>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Export Format</InputLabel>
            <Select
              value={exportForm.format}
              label="Export Format"
              onChange={(e) => setExportForm(prev => ({ ...prev, format: e.target.value }))}
            >
              <MenuItem value="csv">CSV</MenuItem>
              <MenuItem value="json">JSON</MenuItem>
              <MenuItem value="xlsx">Excel (XLSX)</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateExport}
            variant="contained"
            disabled={exportForm.types.length === 0 || !exportForm.name}
          >
            Create Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Backup Dialog */}
      <Dialog
        open={backupDialogOpen}
        onClose={() => setBackupDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create System Backup</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Backup Name"
            value={backupForm.name}
            onChange={(e) => setBackupForm(prev => ({ ...prev, name: e.target.value }))}
            sx={{ mb: 2, mt: 1 }}
          />
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Backup Type</InputLabel>
            <Select
              value={backupForm.type}
              label="Backup Type"
              onChange={(e) => setBackupForm(prev => ({ ...prev, type: e.target.value }))}
            >
              <MenuItem value="full">Full Backup</MenuItem>
              <MenuItem value="incremental">Incremental Backup</MenuItem>
              <MenuItem value="database">Database Only</MenuItem>
              <MenuItem value="files">Files Only</MenuItem>
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={backupForm.description}
            onChange={(e) => setBackupForm(prev => ({ ...prev, description: e.target.value }))}
            sx={{ mb: 2 }}
          />

          <FormGroup>
            <FormControlLabel
              control={
                <Checkbox
                  checked={backupForm.includeDatabase}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, includeDatabase: e.target.checked }))}
                />
              }
              label="Include Database"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={backupForm.includeFiles}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, includeFiles: e.target.checked }))}
                />
              }
              label="Include Files"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={backupForm.compression}
                  onChange={(e) => setBackupForm(prev => ({ ...prev, compression: e.target.checked }))}
                />
              }
              label="Enable Compression"
            />
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBackupDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateBackup}
            variant="contained"
            disabled={!backupForm.name}
          >
            Create Backup
          </Button>
        </DialogActions>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Restore System</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action will restore the system to a previous state. All current data will be replaced.
          </Alert>
          {selectedBackup && (
            <Box>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Backup:</strong> {selectedBackup.name}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Type:</strong> {selectedBackup.type}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Size:</strong> {formatBytes(selectedBackup.size)}
              </Typography>
              <Typography variant="body1">
                <strong>Created:</strong> {new Date(selectedBackup.startTime).toLocaleString()}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRestoreDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleRestoreBackup}
            variant="contained"
            color="warning"
          >
            Restore
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
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

export default DataExportBackup;
