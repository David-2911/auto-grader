import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  LinearProgress,
  Alert,
  AlertTitle,
  Button,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  CircularProgress,
  Divider,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Computer as ComputerIcon,
  Memory as MemoryIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
  Speed as SpeedIcon,
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  NotificationsOff as NotificationsOffIcon,
  Timeline as TimelineIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Cloud as CloudIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';

import { adminService, SystemMetrics, SystemAlert } from '../../services/admin.service';
import { 
  MetricsLineChart, 
  PerformanceBarChart, 
  SystemMetricsDoughnut,
  RealTimeLineChart 
} from '../charts/AdminCharts';

interface SystemStatus {
  status: 'healthy' | 'warning' | 'critical';
  uptime: number;
  version: string;
  environment: string;
  services: ServiceStatus[];
  performance: PerformanceMetrics;
  resources: ResourceUsage;
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  responseTime: number;
  lastCheck: string;
  url?: string;
}

interface PerformanceMetrics {
  averageResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  activeConnections: number;
}

interface ResourceUsage {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    inbound: number;
    outbound: number;
  };
}

const EnhancedSystemMonitoring: React.FC = () => {
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);
  const [selectedMetricRange, setSelectedMetricRange] = useState('1h');
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<SystemAlert | null>(null);
  const [metricsData, setMetricsData] = useState<SystemMetrics[]>([]);

  const queryClient = useQueryClient();

  // Fetch system status
  const {
    data: systemStatus,
    isLoading: statusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => adminService.getSystemStatus(),
    refetchInterval: realTimeEnabled ? 10000 : false, // Refetch every 10 seconds
    select: (response) => response.data,
  });

  // Fetch system metrics
  const {
    data: systemMetrics,
    isLoading: metricsLoading,
  } = useQuery({
    queryKey: ['admin-system-metrics', selectedMetricRange],
    queryFn: () => adminService.getSystemMetrics(),
    refetchInterval: realTimeEnabled ? 30000 : false, // Refetch every 30 seconds
    select: (response) => response.data,
  });

  // Fetch system alerts
  const {
    data: systemAlerts,
    isLoading: alertsLoading,
  } = useQuery({
    queryKey: ['admin-system-alerts'],
    queryFn: () => adminService.getSystemAlerts(),
    refetchInterval: realTimeEnabled ? 15000 : false, // Refetch every 15 seconds
    select: (response) => response.data,
  });

  // Acknowledge alert mutation
  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: number) => adminService.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-system-alerts'] });
      setAlertDialogOpen(false);
    },
  });

  // Update metrics data for real-time charts
  useEffect(() => {
    if (systemMetrics && Array.isArray(systemMetrics)) {
      setMetricsData(prev => {
        const newData = [...prev, ...systemMetrics].slice(-50); // Keep last 50 data points
        return newData;
      });
    }
  }, [systemMetrics]);

  // Generate chart data
  const cpuChartData = useMemo(() => {
    if (!metricsData.length) return null;
    
    return {
      labels: metricsData.map(metric => new Date(metric.timestamp).toLocaleTimeString()),
      datasets: [{
        label: 'CPU Usage (%)',
        data: metricsData.map(metric => metric.cpuUsage),
        borderColor: '#FF6384',
        backgroundColor: 'rgba(255, 99, 132, 0.1)',
        fill: true,
      }],
    };
  }, [metricsData]);

  const memoryChartData = useMemo(() => {
    if (!metricsData.length) return null;
    
    return {
      labels: metricsData.map(metric => new Date(metric.timestamp).toLocaleTimeString()),
      datasets: [{
        label: 'Memory Usage (%)',
        data: metricsData.map(metric => metric.memoryUsage),
        borderColor: '#36A2EB',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
      }],
    };
  }, [metricsData]);

  const networkChartData = useMemo(() => {
    if (!metricsData.length) return null;
    
    return {
      labels: metricsData.map(metric => new Date(metric.timestamp).toLocaleTimeString()),
      datasets: [
        {
          label: 'Network In (MB/s)',
          data: metricsData.map(metric => metric.networkIn),
          borderColor: '#4BC0C0',
          backgroundColor: 'rgba(75, 192, 192, 0.1)',
        },
        {
          label: 'Network Out (MB/s)',
          data: metricsData.map(metric => metric.networkOut),
          borderColor: '#FF9F40',
          backgroundColor: 'rgba(255, 159, 64, 0.1)',
        },
      ],
    };
  }, [metricsData]);

  const performanceChartData = useMemo(() => {
    if (!systemStatus?.performance) return null;
    
    return {
      labels: ['Response Time (ms)', 'Requests/sec', 'Error Rate (%)', 'Active Connections'],
      datasets: [{
        label: 'Performance Metrics',
        data: [
          systemStatus.performance.averageResponseTime,
          systemStatus.performance.requestsPerSecond,
          systemStatus.performance.errorRate * 100,
          systemStatus.performance.activeConnections,
        ],
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
        ],
      }],
    };
  }, [systemStatus?.performance]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'success';
      case 'warning':
      case 'degraded':
        return 'warning';
      case 'critical':
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return <CheckCircleIcon color="success" />;
      case 'warning':
      case 'degraded':
        return <WarningIcon color="warning" />;
      case 'critical':
      case 'offline':
        return <ErrorIcon color="error" />;
      default:
        return <CheckCircleIcon />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  const unacknowledgedAlerts = systemAlerts?.filter(alert => !alert.acknowledged) || [];

  return (
    <Box>
      {/* Header Controls */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          System Monitoring
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={selectedMetricRange}
              label="Time Range"
              onChange={(e) => setSelectedMetricRange(e.target.value)}
            >
              <MenuItem value="1h">Last Hour</MenuItem>
              <MenuItem value="6h">Last 6 Hours</MenuItem>
              <MenuItem value="24h">Last 24 Hours</MenuItem>
              <MenuItem value="7d">Last 7 Days</MenuItem>
            </Select>
          </FormControl>
          <FormControlLabel
            control={
              <Switch
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
              />
            }
            label="Real-time Updates"
          />
          <Tooltip title="Refresh">
            <IconButton onClick={() => refetchStatus()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* System Status Overview */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  System Status
                </Typography>
                <Chip
                  icon={getStatusIcon(systemStatus?.status || 'healthy')}
                  label={systemStatus?.status || 'Loading...'}
                  color={getStatusColor(systemStatus?.status || 'healthy') as any}
                  variant="outlined"
                />
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <TimerIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {systemStatus ? formatUptime(systemStatus.uptime) : '--'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Uptime
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <CloudIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {systemStatus?.version || '--'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Version
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <SpeedIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {systemStatus?.performance?.averageResponseTime || '--'}ms
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Avg Response
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <AssessmentIcon color="primary" sx={{ fontSize: 40, mb: 1 }} />
                    <Typography variant="h6">
                      {systemStatus?.performance?.requestsPerSecond || '--'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Requests/sec
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  System Alerts
                </Typography>
                <Badge badgeContent={unacknowledgedAlerts.length} color="error">
                  <NotificationsIcon />
                </Badge>
              </Box>
              
              {alertsLoading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : unacknowledgedAlerts.length > 0 ? (
                <List dense>
                  {unacknowledgedAlerts.slice(0, 3).map((alert) => (
                    <ListItem
                      key={alert.id}
                      button
                      onClick={() => {
                        setSelectedAlert(alert);
                        setAlertDialogOpen(true);
                      }}
                    >
                      <ListItemIcon>
                        {alert.type === 'critical' ? (
                          <ErrorIcon color="error" />
                        ) : alert.type === 'warning' ? (
                          <WarningIcon color="warning" />
                        ) : (
                          <CheckCircleIcon color="info" />
                        )}
                      </ListItemIcon>
                      <ListItemText
                        primary={alert.title}
                        secondary={new Date(alert.timestamp).toLocaleString()}
                        primaryTypographyProps={{ variant: 'body2' }}
                        secondaryTypographyProps={{ variant: 'caption' }}
                      />
                    </ListItem>
                  ))}
                  {unacknowledgedAlerts.length > 3 && (
                    <ListItem>
                      <ListItemText
                        primary={`+${unacknowledgedAlerts.length - 3} more alerts`}
                        primaryTypographyProps={{ variant: 'caption', align: 'center' }}
                      />
                    </ListItem>
                  )}
                </List>
              ) : (
                <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                  No active alerts
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Resource Usage Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <ComputerIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" color="primary" gutterBottom>
                  {systemStatus?.resources?.cpu || 0}%
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  CPU Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemStatus?.resources?.cpu || 0}
                  color={
                    (systemStatus?.resources?.cpu || 0) > 80 ? 'error' :
                    (systemStatus?.resources?.cpu || 0) > 60 ? 'warning' : 'primary'
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <MemoryIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" color="primary" gutterBottom>
                  {systemStatus?.resources?.memory || 0}%
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Memory Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemStatus?.resources?.memory || 0}
                  color={
                    (systemStatus?.resources?.memory || 0) > 80 ? 'error' :
                    (systemStatus?.resources?.memory || 0) > 60 ? 'warning' : 'primary'
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <StorageIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" color="primary" gutterBottom>
                  {systemStatus?.resources?.disk || 0}%
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Disk Usage
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemStatus?.resources?.disk || 0}
                  color={
                    (systemStatus?.resources?.disk || 0) > 80 ? 'error' :
                    (systemStatus?.resources?.disk || 0) > 60 ? 'warning' : 'primary'
                  }
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div whileHover={{ scale: 1.02 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <NetworkIcon color="primary" sx={{ fontSize: 48, mb: 1 }} />
                <Typography variant="h4" color="primary" gutterBottom>
                  {systemStatus?.performance?.activeConnections || 0}
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  Active Connections
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption">
                    In: {systemStatus?.resources?.network?.inbound || 0} MB/s
                  </Typography>
                  <Typography variant="caption">
                    Out: {systemStatus?.resources?.network?.outbound || 0} MB/s
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Real-time Charts */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          {cpuChartData ? (
            <RealTimeLineChart
              title="CPU Usage Over Time"
              data={cpuChartData}
              height={300}
              isRealTime={realTimeEnabled}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading CPU metrics...
              </Typography>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {memoryChartData ? (
            <RealTimeLineChart
              title="Memory Usage Over Time"
              data={memoryChartData}
              height={300}
              isRealTime={realTimeEnabled}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading memory metrics...
              </Typography>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {networkChartData ? (
            <MetricsLineChart
              title="Network Traffic"
              data={networkChartData}
              height={300}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading network metrics...
              </Typography>
            </Paper>
          )}
        </Grid>

        <Grid item xs={12} md={6}>
          {performanceChartData ? (
            <PerformanceBarChart
              title="Performance Metrics"
              data={performanceChartData}
              height={300}
            />
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <CircularProgress />
              <Typography variant="body2" sx={{ mt: 2 }}>
                Loading performance metrics...
              </Typography>
            </Paper>
          )}
        </Grid>
      </Grid>

      {/* Services Status */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Service Status
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Service</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Response Time</TableCell>
                      <TableCell>Last Check</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {systemStatus?.services?.map((service) => (
                      <TableRow key={service.name}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {getStatusIcon(service.status)}
                            <Typography sx={{ ml: 1 }}>{service.name}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={service.status}
                            size="small"
                            color={getStatusColor(service.status) as any}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>{service.responseTime}ms</TableCell>
                        <TableCell>
                          {new Date(service.lastCheck).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <IconButton size="small">
                            <RefreshIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    )) || (
                      <TableRow>
                        <TableCell colSpan={5} align="center">
                          {statusLoading ? 'Loading services...' : 'No services data available'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Alert Detail Dialog */}
      <Dialog
        open={alertDialogOpen}
        onClose={() => setAlertDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {selectedAlert?.type === 'critical' ? (
              <ErrorIcon color="error" sx={{ mr: 1 }} />
            ) : selectedAlert?.type === 'warning' ? (
              <WarningIcon color="warning" sx={{ mr: 1 }} />
            ) : (
              <CheckCircleIcon color="info" sx={{ mr: 1 }} />
            )}
            {selectedAlert?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedAlert.message}
              </Typography>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Type: {selectedAlert.type}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Time: {new Date(selectedAlert.timestamp).toLocaleString()}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="textSecondary">
                    Status: {selectedAlert.acknowledged ? 'Acknowledged' : 'Pending'}
                  </Typography>
                </Grid>
                {selectedAlert.acknowledgedBy && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="textSecondary">
                      Acknowledged by: {selectedAlert.acknowledgedBy}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAlertDialogOpen(false)}>
            Close
          </Button>
          {selectedAlert && !selectedAlert.acknowledged && (
            <Button
              variant="contained"
              onClick={() => acknowledgeAlertMutation.mutate(selectedAlert.id)}
              disabled={acknowledgeAlertMutation.isPending}
            >
              {acknowledgeAlertMutation.isPending ? 'Acknowledging...' : 'Acknowledge'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EnhancedSystemMonitoring;
