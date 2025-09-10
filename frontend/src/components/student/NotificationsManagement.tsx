import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  Divider,
  Paper,
  Badge,
  Avatar,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
} from '@mui/material';
import {
  Notifications,
  NotificationsActive,
  NotificationsOff,
  Email,
  Schedule,
  Assessment,
  Assignment,
  School,
  Delete,
  MarkEmailRead,
  MarkEmailUnread,
  Clear,
  FilterList,
  Search,
  Settings,
  Info,
  Warning,
  Error,
  CheckCircle,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import { Notification as NotificationType } from '@/types';

const NotificationCard = styled(Card)<{ read: boolean; type: string }>(({ theme, read, type }) => {
  const getTypeColor = () => {
    switch (type) {
      case 'error':
        return theme.palette.error.light;
      case 'warning':
        return theme.palette.warning.light;
      case 'success':
        return theme.palette.success.light;
      default:
        return theme.palette.info.light;
    }
  };

  return {
    marginBottom: theme.spacing(1),
    backgroundColor: read ? theme.palette.background.paper : theme.palette.background.default,
    borderLeft: `4px solid ${getTypeColor()}`,
    opacity: read ? 0.7 : 1,
    transition: 'all 0.2s ease-in-out',
    '&:hover': {
      boxShadow: theme.shadows[2],
      transform: 'translateX(4px)',
    },
  };
});

interface NotificationPreferences {
  emailNotifications: boolean;
  deadlineReminders: boolean;
  gradeNotifications: boolean;
  assignmentUpdates: boolean;
  courseAnnouncements: boolean;
  systemMaintenance: boolean;
  reminderFrequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

interface NotificationsManagementProps {
  notifications: NotificationType[];
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onDelete: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
}

const mockNotifications: NotificationType[] = [
  {
    id: '1',
    type: 'info',
    title: 'New Assignment Posted',
    message: 'CS101: Data Structures assignment has been posted. Due date: March 15, 2024.',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    read: false,
    actionUrl: '/assignments/123',
  },
  {
    id: '2',
    type: 'success',
    title: 'Grade Posted',
    message: 'Your grade for "Array Implementation" has been posted. Score: 95/100',
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    read: false,
    actionUrl: '/grades/456',
  },
  {
    id: '3',
    type: 'warning',
    title: 'Assignment Due Soon',
    message: 'Reminder: "Binary Tree Implementation" is due tomorrow at 11:59 PM.',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    read: true,
    actionUrl: '/assignments/789',
  },
  {
    id: '4',
    type: 'info',
    title: 'Course Announcement',
    message: 'Office hours have been moved to Fridays 2-4 PM for this week.',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    read: true,
  },
  {
    id: '5',
    type: 'error',
    title: 'Submission Failed',
    message: 'Your submission for "Database Design" failed to upload. Please try again.',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    read: false,
    actionUrl: '/assignments/101',
  },
];

export const NotificationsManagement: React.FC<NotificationsManagementProps> = ({
  notifications = mockNotifications,
  onMarkAsRead,
  onMarkAsUnread,
  onDelete,
  onMarkAllAsRead,
  onClearAll,
}) => {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailNotifications: true,
    deadlineReminders: true,
    gradeNotifications: true,
    assignmentUpdates: true,
    courseAnnouncements: true,
    systemMaintenance: false,
    reminderFrequency: 'daily',
    quietHours: {
      enabled: false,
      start: '22:00',
      end: '08:00',
    },
  });

  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const unreadCount = notifications.filter(n => !n.read).length;

  const filteredNotifications = notifications.filter(notification => {
    // Read/unread filter
    if (filter === 'unread' && notification.read) return false;
    if (filter === 'read' && !notification.read) return false;

    // Type filter
    if (typeFilter !== 'all' && notification.type !== typeFilter) return false;

    // Search filter
    if (searchTerm && !notification.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !notification.message.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    return true;
  });

  const handlePreferenceChange = (key: keyof NotificationPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'success':
        return <CheckCircle color="success" />;
      default:
        return <Info color="info" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ display: 'flex', alignItems: 'center' }}>
          <Badge badgeContent={unreadCount} color="error" sx={{ mr: 2 }}>
            <Notifications />
          </Badge>
          Notifications
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={onClearAll}
            disabled={notifications.length === 0}
          >
            Clear All
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Notification Settings */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <Settings sx={{ mr: 1 }} />
              Notification Settings
            </Typography>

            <List>
              <ListItem>
                <ListItemIcon>
                  <Email />
                </ListItemIcon>
                <ListItemText primary="Email Notifications" secondary="Receive notifications via email" />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.emailNotifications}
                    onChange={(e) => handlePreferenceChange('emailNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Schedule />
                </ListItemIcon>
                <ListItemText primary="Deadline Reminders" secondary="Get reminded about upcoming deadlines" />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.deadlineReminders}
                    onChange={(e) => handlePreferenceChange('deadlineReminders', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Assessment />
                </ListItemIcon>
                <ListItemText primary="Grade Notifications" secondary="Be notified when grades are posted" />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.gradeNotifications}
                    onChange={(e) => handlePreferenceChange('gradeNotifications', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <Assignment />
                </ListItemIcon>
                <ListItemText primary="Assignment Updates" secondary="Notifications about assignment changes" />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.assignmentUpdates}
                    onChange={(e) => handlePreferenceChange('assignmentUpdates', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>

              <ListItem>
                <ListItemIcon>
                  <School />
                </ListItemIcon>
                <ListItemText primary="Course Announcements" secondary="Important course updates" />
                <ListItemSecondaryAction>
                  <Switch
                    checked={preferences.courseAnnouncements}
                    onChange={(e) => handlePreferenceChange('courseAnnouncements', e.target.checked)}
                  />
                </ListItemSecondaryAction>
              </ListItem>
            </List>

            <Divider sx={{ my: 2 }} />

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Reminder Frequency</InputLabel>
              <Select
                value={preferences.reminderFrequency}
                label="Reminder Frequency"
                onChange={(e) => handlePreferenceChange('reminderFrequency', e.target.value)}
              >
                <MenuItem value="immediate">Immediate</MenuItem>
                <MenuItem value="daily">Daily Digest</MenuItem>
                <MenuItem value="weekly">Weekly Summary</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={preferences.quietHours.enabled}
                  onChange={(e) => handlePreferenceChange('quietHours', {
                    ...preferences.quietHours,
                    enabled: e.target.checked
                  })}
                />
              }
              label="Enable Quiet Hours"
              sx={{ mb: 2 }}
            />

            {preferences.quietHours.enabled && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  type="time"
                  label="Start"
                  value={preferences.quietHours.start}
                  onChange={(e) => handlePreferenceChange('quietHours', {
                    ...preferences.quietHours,
                    start: e.target.value
                  })}
                  size="small"
                />
                <TextField
                  type="time"
                  label="End"
                  value={preferences.quietHours.end}
                  onChange={(e) => handlePreferenceChange('quietHours', {
                    ...preferences.quietHours,
                    end: e.target.value
                  })}
                  size="small"
                />
              </Box>
            )}
          </Paper>

          {/* Quick Stats */}
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Notification Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {unreadCount}
                  </Typography>
                  <Typography variant="caption">
                    Unread
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="text.secondary">
                    {notifications.length}
                  </Typography>
                  <Typography variant="caption">
                    Total
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Notifications List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {/* Filters */}
            <Box sx={{ mb: 3 }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search notifications..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                      startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={3} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Filter</InputLabel>
                    <Select
                      value={filter}
                      label="Filter"
                      onChange={(e) => setFilter(e.target.value as any)}
                    >
                      <MenuItem value="all">All</MenuItem>
                      <MenuItem value="unread">Unread</MenuItem>
                      <MenuItem value="read">Read</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={3} md={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={typeFilter}
                      label="Type"
                      onChange={(e) => setTypeFilter(e.target.value)}
                    >
                      <MenuItem value="all">All Types</MenuItem>
                      <MenuItem value="info">Info</MenuItem>
                      <MenuItem value="success">Success</MenuItem>
                      <MenuItem value="warning">Warning</MenuItem>
                      <MenuItem value="error">Error</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Box>

            {/* Results Count */}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </Typography>

            {/* Notifications */}
            {filteredNotifications.length === 0 ? (
              <Alert severity="info" sx={{ textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  No notifications found
                </Typography>
                <Typography variant="body2">
                  {notifications.length === 0
                    ? "You're all caught up! No notifications to show."
                    : "Try adjusting your filters to see more notifications."
                  }
                </Typography>
              </Alert>
            ) : (
              <Box sx={{ maxHeight: 600, overflowY: 'auto' }}>
                <AnimatePresence>
                  {filteredNotifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <NotificationCard read={notification.read} type={notification.type}>
                        <CardContent sx={{ p: 2 }}>
                          <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <Avatar sx={{ mr: 2, bgcolor: 'transparent' }}>
                              {getNotificationIcon(notification.type)}
                            </Avatar>
                            
                            <Box sx={{ flexGrow: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                <Typography variant="h6" sx={{ fontWeight: notification.read ? 'normal' : 'bold' }}>
                                  {notification.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {formatTimestamp(notification.timestamp)}
                                </Typography>
                              </Box>
                              
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {notification.message}
                              </Typography>
                              
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Box>
                                  <Chip
                                    label={notification.type}
                                    size="small"
                                    color={
                                      notification.type === 'error' ? 'error' :
                                      notification.type === 'warning' ? 'warning' :
                                      notification.type === 'success' ? 'success' : 'info'
                                    }
                                    variant="outlined"
                                  />
                                  {notification.actionUrl && (
                                    <Button
                                      size="small"
                                      sx={{ ml: 1 }}
                                      onClick={() => console.log('Navigate to:', notification.actionUrl)}
                                    >
                                      View
                                    </Button>
                                  )}
                                </Box>
                                
                                <Box>
                                  <Tooltip title={notification.read ? 'Mark as unread' : 'Mark as read'}>
                                    <IconButton
                                      size="small"
                                      onClick={() => notification.read 
                                        ? onMarkAsUnread(notification.id) 
                                        : onMarkAsRead(notification.id)
                                      }
                                    >
                                      {notification.read ? <MarkEmailUnread /> : <MarkEmailRead />}
                                    </IconButton>
                                  </Tooltip>
                                  <Tooltip title="Delete">
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => onDelete(notification.id)}
                                    >
                                      <Delete />
                                    </IconButton>
                                  </Tooltip>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </NotificationCard>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default NotificationsManagement;
