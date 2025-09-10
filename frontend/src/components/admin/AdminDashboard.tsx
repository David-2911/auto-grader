import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Grid,
  Paper,
  Alert,
  AlertTitle,
  Collapse,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  Analytics as AnalyticsIcon,
  Security as SecurityIcon,
  Settings as SettingsIcon,
  Backup as BackupIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  ChevronLeft as ChevronLeftIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Logout as LogoutIcon,
  MonitorHeart as MonitorIcon,
  History as HistoryIcon,
  FileDownload as ExportIcon,
  ExpandLess,
  ExpandMore,
  KeyboardArrowDown,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';

// Import enhanced components
import DashboardOverview from './DashboardOverview';
import UserManagement from './UserManagement';
import CourseManagement from './CourseManagement';
import AssignmentManagement from './AssignmentManagement';
import EnhancedAnalytics from './EnhancedAnalytics';
import EnhancedSystemMonitoring from './EnhancedSystemMonitoring';
import EnhancedAuditLogs from './EnhancedAuditLogs';
import EnhancedDataExport from './EnhancedDataExport';
import ConfigurationManagement from './ConfigurationManagement';

import { adminService } from '../../services/admin.service';

const drawerWidth = 280;

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType;
  badge?: number;
  children?: NavigationItem[];
}

interface AdminDashboardProps {
  onLogout?: () => void;
  onToggleTheme?: () => void;
  isDarkMode?: boolean;
  user?: {
    name: string;
    email: string;
    avatar?: string;
    role: string;
  };
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
  onToggleTheme,
  isDarkMode = false,
  user = {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Administrator',
  },
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['management']));

  // Fetch notifications and system status
  const { data: notifications } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: () => adminService.getNotifications(),
    select: (response) => response.data,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: systemStatus } = useQuery({
    queryKey: ['admin-system-status'],
    queryFn: () => adminService.getSystemStatus(),
    select: (response) => response.data,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Navigation structure
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: <DashboardIcon />,
      component: DashboardOverview,
    },
    {
      id: 'management',
      label: 'Management',
      icon: <SettingsIcon />,
      component: DashboardOverview, // Placeholder
      children: [
        {
          id: 'users',
          label: 'User Management',
          icon: <PeopleIcon />,
          component: UserManagement,
          badge: notifications?.pendingUsers || 0,
        },
        {
          id: 'courses',
          label: 'Course Management',
          icon: <SchoolIcon />,
          component: CourseManagement,
        },
        {
          id: 'assignments',
          label: 'Assignment Management',
          icon: <AssignmentIcon />,
          component: AssignmentManagement,
        },
      ],
    },
    {
      id: 'analytics',
      label: 'Analytics & Reports',
      icon: <AnalyticsIcon />,
      component: EnhancedAnalytics,
    },
    {
      id: 'monitoring',
      label: 'System Monitoring',
      icon: <MonitorIcon />,
      component: EnhancedSystemMonitoring,
      badge: systemStatus?.alerts?.length || 0,
    },
    {
      id: 'audit',
      label: 'Audit Logs',
      icon: <HistoryIcon />,
      component: EnhancedAuditLogs,
    },
    {
      id: 'export',
      label: 'Data Export',
      icon: <ExportIcon />,
      component: EnhancedDataExport,
    },
    {
      id: 'security',
      label: 'Security & Compliance',
      icon: <SecurityIcon />,
      component: ConfigurationManagement,
      badge: notifications?.securityAlerts || 0,
    },
    {
      id: 'configuration',
      label: 'System Configuration',
      icon: <SettingsIcon />,
      component: ConfigurationManagement,
    },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleSectionToggle = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const getCurrentComponent = () => {
    const findItem = (items: NavigationItem[]): NavigationItem | undefined => {
      for (const item of items) {
        if (item.id === currentView) return item;
        if (item.children) {
          const found = findItem(item.children);
          if (found) return found;
        }
      }
      return undefined;
    };

    const item = findItem(navigationItems);
    return item?.component || DashboardOverview;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.id);
    const isSelected = currentView === item.id;

    return (
      <React.Fragment key={item.id}>
        <ListItem disablePadding>
          <ListItemButton
            selected={isSelected && !hasChildren}
            onClick={() => {
              if (hasChildren) {
                handleSectionToggle(item.id);
              } else {
                setCurrentView(item.id);
                if (isMobile) {
                  setMobileOpen(false);
                }
              }
            }}
            sx={{
              pl: 2 + level * 2,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontSize: level > 0 ? '0.875rem' : '1rem',
                fontWeight: isSelected ? 600 : 400,
              }}
            />
            {item.badge ? (
              <Badge badgeContent={item.badge} color="error" sx={{ mr: 1 }} />
            ) : null}
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  const drawer = (
    <Box>
      <Toolbar sx={{ px: 2 }}>
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          Auto-Grade Admin
        </Typography>
        {!isMobile && (
          <IconButton
            color="inherit"
            onClick={handleDrawerToggle}
            sx={{ ml: 'auto' }}
          >
            <ChevronLeftIcon />
          </IconButton>
        )}
      </Toolbar>
      <Divider />
      
      {/* System Status Indicator */}
      <Box sx={{ p: 2 }}>
        <Card variant="outlined">
          <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor: systemStatus?.healthy ? 'success.main' : 'error.main',
                }}
              />
              <Typography variant="body2" fontWeight="medium">
                System {systemStatus?.healthy ? 'Healthy' : 'Issues Detected'}
              </Typography>
            </Box>
            {systemStatus?.version && (
              <Typography variant="caption" color="textSecondary">
                v{systemStatus.version}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      <List>
        {navigationItems.map(item => renderNavigationItem(item))}
      </List>
    </Box>
  );

  const CurrentComponent = getCurrentComponent();

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {navigationItems.find(item => {
              if (item.id === currentView) return true;
              return item.children?.some(child => child.id === currentView);
            })?.label || 'Dashboard'}
          </Typography>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Notifications */}
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationClick}>
                <Badge badgeContent={notifications?.unread || 0} color="error">
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* Theme Toggle */}
            <Tooltip title="Toggle Theme">
              <IconButton color="inherit" onClick={onToggleTheme}>
                {isDarkMode ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* User Menu */}
            <Tooltip title="Account">
              <IconButton color="inherit" onClick={handleMenuClick}>
                <Avatar
                  sx={{ width: 32, height: 32 }}
                  src={user.avatar}
                  alt={user.name}
                >
                  {user.name.charAt(0)}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Navigation Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          container={window.document.body}
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true, // Better open performance on mobile.
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <Toolbar />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <CurrentComponent />
          </motion.div>
        </AnimatePresence>
      </Box>

      {/* User Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">{user.name}</Typography>
          <Typography variant="caption" color="textSecondary">
            {user.email}
          </Typography>
          <Chip label={user.role} size="small" sx={{ mt: 0.5 }} />
        </Box>
        <MenuItem onClick={handleMenuClose}>
          <ListItemIcon>
            <AccountCircleIcon fontSize="small" />
          </ListItemIcon>
          Profile Settings
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => { handleMenuClose(); onLogout?.(); }}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      {/* Notifications Menu */}
      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{
          sx: { width: 350, maxHeight: 400 },
        }}
      >
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2">Notifications</Typography>
        </Box>
        {notifications?.items?.length > 0 ? (
          notifications.items.map((notification: any) => (
            <MenuItem key={notification.id} onClick={handleNotificationClose}>
              <ListItemText
                primary={notification.title}
                secondary={notification.message}
                primaryTypographyProps={{ fontSize: '0.875rem' }}
                secondaryTypographyProps={{ fontSize: '0.75rem' }}
              />
            </MenuItem>
          ))
        ) : (
          <MenuItem disabled>
            <Typography variant="body2" color="textSecondary">
              No new notifications
            </Typography>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default AdminDashboard;
