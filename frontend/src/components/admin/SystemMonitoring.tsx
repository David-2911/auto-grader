import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Computer as ComputerIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Storage as DatabaseIcon,
  Speed as SpeedIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { Line } from 'react-chartjs-2';

import { adminService } from '../../services/admin.service';

interface SystemMetrics {
  cpu: {
    usage: number;
    cores: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  network: {
    inbound: number;
    outbound: number;
    connections: number;
  };
  database: {
    connections: number;
    maxConnections: number;
    queryTime: number;
    size: number;
  };
  services: {
    api: string;
    database: string;
    ocr: string;
    ml: string;
    storage: string;
  };
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
  service: string;
}

const SystemMonitoring: React.FC = () => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [performanceData, setPerformanceData] = useState<any>(null);

  // Fetch system status
  const {
    data: systemStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => adminService.getSystemStatus(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Fetch system performance
  const {
    data: performanceMetrics,
    isLoading: performanceLoading,
    refetch: refetchPerformance,
  } = useQuery({
    queryKey: ['admin-system-performance', selectedTimeRange],
    queryFn: () => adminService.getSystemPerformance({ timeRange: selectedTimeRange }),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Fetch database stats
  const {
    data: databaseStats,
    refetch: refetchDatabase,
  } = useQuery({
    queryKey: ['admin-database-stats'],
    queryFn: () => adminService.getDatabaseStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch system logs
  const {
    data: systemLogs,
    refetch: refetchLogs,
  } = useQuery({
    queryKey: ['admin-system-logs'],
    queryFn: () => adminService.getSystemLogs({ limit: 100 }),
    enabled: logsDialogOpen,
  });

  // Set up real-time performance data for charts
  useEffect(() => {
    if (performanceMetrics?.data) {
      const chartData = {
        labels: performanceMetrics.data.timestamps || [],
        datasets: [
          {
            label: 'CPU Usage (%)',
            data: performanceMetrics.data.cpu || [],
            borderColor: 'rgb(255, 99, 132)',
            backgroundColor: 'rgba(255, 99, 132, 0.2)',
            tension: 0.1,
          },
          {
            label: 'Memory Usage (%)',
            data: performanceMetrics.data.memory || [],
            borderColor: 'rgb(54, 162, 235)',
            backgroundColor: 'rgba(54, 162, 235, 0.2)',
            tension: 0.1,
          },
          {
            label: 'Disk Usage (%)',
            data: performanceMetrics.data.disk || [],
            borderColor: 'rgb(255, 206, 86)',
            backgroundColor: 'rgba(255, 206, 86, 0.2)',
            tension: 0.1,
          },
        ],
      };
      setPerformanceData(chartData);
    }
  }, [performanceMetrics]);

  const handleRefreshAll = () => {
    refetchStatus();
    refetchPerformance();
    refetchDatabase();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'online':
      case 'up':
        return 'success';
      case 'warning':
      case 'slow':
        return 'warning';
      case 'error':
      case 'down':
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getProgressColor = (value: number) => {
    if (value < 50) return 'success';
    if (value < 80) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (statusError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load system status. Please try again.
        </Alert>
      </Box>
    );
  }

  const metrics: SystemMetrics = systemStatus?.data || {};

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          System Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedTimeRange}
              label="Time Range"
              onChange={(e) => setSelectedTimeRange(e.target.value)}
            >
              <MenuItem value="15m">15 minutes</MenuItem>
              <MenuItem value="1h">1 hour</MenuItem>
              <MenuItem value="6h">6 hours</MenuItem>
              <MenuItem value="24h">24 hours</MenuItem>
              <MenuItem value="7d">7 days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<SettingsIcon />}
            onClick={() => setLogsDialogOpen(true)}
          >
            View Logs
          </Button>
          <IconButton onClick={handleRefreshAll} color="primary">
            <RefreshIcon />
          </IconButton>
        </Box>
      </Box>

      {/* System Health Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <ComputerIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6">CPU</Typography>
              <Typography variant="h4" component="div">
                {metrics.cpu?.usage || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.cpu?.usage || 0}
                color={getProgressColor(metrics.cpu?.usage || 0)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                {metrics.cpu?.cores || 0} cores
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <MemoryIcon sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6">Memory</Typography>
              <Typography variant="h4" component="div">
                {metrics.memory?.usage || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.memory?.usage || 0}
                color={getProgressColor(metrics.memory?.usage || 0)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                {formatBytes(metrics.memory?.used || 0)} / {formatBytes(metrics.memory?.total || 0)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <StorageIcon sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h6">Disk</Typography>
              <Typography variant="h4" component="div">
                {metrics.disk?.usage || 0}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.disk?.usage || 0}
                color={getProgressColor(metrics.disk?.usage || 0)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                {formatBytes(metrics.disk?.free || 0)} free
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <NetworkIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h6">Network</Typography>
              <Typography variant="h4" component="div">
                {metrics.network?.connections || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ↑ {formatBytes(metrics.network?.outbound || 0)}/s
              </Typography>
              <Typography variant="caption" color="textSecondary">
                ↓ {formatBytes(metrics.network?.inbound || 0)}/s
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <DatabaseIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h6">Database</Typography>
              <Typography variant="h4" component="div">
                {metrics.database?.connections || 0}
              </Typography>
              <LinearProgress
                variant="determinate"
                value={((metrics.database?.connections || 0) / (metrics.database?.maxConnections || 100)) * 100}
                color={getProgressColor(((metrics.database?.connections || 0) / (metrics.database?.maxConnections || 100)) * 100)}
                sx={{ mt: 1 }}
              />
              <Typography variant="caption" color="textSecondary">
                {metrics.database?.queryTime || 0}ms avg query
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <SpeedIcon sx={{ fontSize: 40, color: 'error.main', mb: 1 }} />
              <Typography variant="h6">Load</Typography>
              <Typography variant="h4" component="div">
                {metrics.cpu?.load?.[0]?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                1m: {metrics.cpu?.load?.[0]?.toFixed(2) || '0.00'}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                5m: {metrics.cpu?.load?.[1]?.toFixed(2) || '0.00'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Performance Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Performance Trends
            </Typography>
            {performanceLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <Typography>Loading performance data...</Typography>
              </Box>
            ) : performanceData ? (
              <Box sx={{ height: 300 }}>
                <Line 
                  data={performanceData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top' as const,
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                      },
                    },
                  }}
                />
              </Box>
            ) : (
              <Typography>No performance data available</Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Service Status */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Service Status
            </Typography>
            <List>
              {metrics.services && Object.entries(metrics.services).map(([service, status]) => (
                <ListItem key={service}>
                  <ListItemIcon>
                    {status === 'healthy' || status === 'online' ? (
                      <CheckCircleIcon color="success" />
                    ) : status === 'warning' ? (
                      <WarningIcon color="warning" />
                    ) : (
                      <ErrorIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={service.toUpperCase()}
                    secondary={
                      <Chip 
                        label={status} 
                        color={getStatusColor(status) as any}
                        size="small"
                      />
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Database Information
            </Typography>
            {databaseStats?.data && (
              <List>
                <ListItem>
                  <ListItemText
                    primary="Database Size"
                    secondary={formatBytes(databaseStats.data.size || 0)}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Active Connections"
                    secondary={`${metrics.database?.connections || 0} / ${metrics.database?.maxConnections || 0}`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Average Query Time"
                    secondary={`${metrics.database?.queryTime || 0}ms`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Tables"
                    secondary={databaseStats.data.tables || 0}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Total Records"
                    secondary={databaseStats.data.records?.toLocaleString() || '0'}
                  />
                </ListItem>
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* System Logs Dialog */}
      <Dialog
        open={logsDialogOpen}
        onClose={() => setLogsDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>System Logs</DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Level</TableCell>
                  <TableCell>Service</TableCell>
                  <TableCell>Message</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {systemLogs?.data?.logs?.map((log: LogEntry) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Typography variant="caption">
                        {new Date(log.timestamp).toLocaleString()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.level}
                        color={getStatusColor(log.level) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{log.service}</TableCell>
                    <TableCell>{log.message}</TableCell>
                  </TableRow>
                )) || (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      No logs available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLogsDialogOpen(false)}>Close</Button>
          <Button onClick={() => refetchLogs()} variant="outlined">
            Refresh
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SystemMonitoring;
