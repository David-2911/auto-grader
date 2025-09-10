import React from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Collapse,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon,
  People as PeopleIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/store/hooks';

const DRAWER_WIDTH = 240;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
  width: DRAWER_WIDTH,
  flexShrink: 0,
  '& .MuiDrawer-paper': {
    width: DRAWER_WIDTH,
    boxSizing: 'border-box',
    backgroundColor: theme.palette.background.paper,
    borderRight: `1px solid ${theme.palette.divider}`,
  },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-start',
}));

interface NavigationItem {
  title: string;
  path?: string;
  icon: React.ReactNode;
  roles?: string[];
  children?: NavigationItem[];
}

const navigationItems: NavigationItem[] = [
  {
    title: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    roles: ['student', 'teacher', 'admin'],
  },
  {
    title: 'Courses',
    icon: <SchoolIcon />,
    roles: ['teacher', 'admin'],
    children: [
      { title: 'All Courses', path: '/courses', icon: <SchoolIcon /> },
      { title: 'Create Course', path: '/courses/create', icon: <SchoolIcon /> },
    ],
  },
  {
    title: 'Assignments',
    icon: <AssignmentIcon />,
    roles: ['student', 'teacher'],
    children: [
      { title: 'All Assignments', path: '/assignments', icon: <AssignmentIcon /> },
      { title: 'Create Assignment', path: '/assignments/create', icon: <AssignmentIcon />, roles: ['teacher'] },
    ],
  },
  {
    title: 'Students',
    path: '/students',
    icon: <PeopleIcon />,
    roles: ['teacher', 'admin'],
  },
  {
    title: 'Analytics',
    path: '/analytics',
    icon: <AnalyticsIcon />,
    roles: ['teacher', 'admin'],
  },
  {
    title: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
    roles: ['student', 'teacher', 'admin'],
  },
];

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  
  const [openItems, setOpenItems] = React.useState<string[]>([]);

  const handleToggleItem = (title: string) => {
    setOpenItems(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  const handleNavigate = (path: string) => {
    navigate(path);
  };

  const hasAccess = (item: NavigationItem) => {
    if (!item.roles || !user?.role) return true;
    return item.roles.includes(user.role);
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    if (!hasAccess(item)) return null;

    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openItems.includes(item.title);
    const isActive = item.path ? isActiveRoute(item.path) : false;

    return (
      <React.Fragment key={item.title}>
        <ListItem disablePadding>
          <ListItemButton
            selected={isActive}
            onClick={() => {
              if (hasChildren) {
                handleToggleItem(item.title);
              } else if (item.path) {
                handleNavigate(item.path);
              }
            }}
            sx={{
              pl: 2 + level * 2,
              backgroundColor: isActive ? 'action.selected' : 'transparent',
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.title} />
            {hasChildren && (isOpen ? <ExpandLess /> : <ExpandMore />)}
          </ListItemButton>
        </ListItem>
        
        {hasChildren && (
          <Collapse in={isOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map((child) => renderNavigationItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <StyledDrawer
      variant="persistent"
      anchor="left"
      open={sidebarOpen}
    >
      <DrawerHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" noWrap component="div" color="primary">
            Auto-Grader
          </Typography>
        </Box>
      </DrawerHeader>
      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle2" color="textSecondary">
          Welcome back, {user?.firstName}!
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Role: {user?.role}
        </Typography>
      </Box>
      
      <Divider />
      
      <List>
        {navigationItems.map((item) => renderNavigationItem(item))}
      </List>
    </StyledDrawer>
  );
};

export default Sidebar;
