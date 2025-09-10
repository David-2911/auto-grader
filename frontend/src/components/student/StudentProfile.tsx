import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Paper,
} from '@mui/material';
import {
  Person,
  Email,
  Notifications,
  Security,
  School,
  Save,
  Edit,
  PhotoCamera,
  NotificationsActive,
  Schedule,
  Assessment,
  CheckCircle,
  Settings,
  Help,
  ExitToApp,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { User, Course } from '@/types';

const ProfileAvatar = styled(Avatar)(({ theme }) => ({
  width: 120,
  height: 120,
  margin: '0 auto',
  border: `4px solid ${theme.palette.primary.main}`,
  cursor: 'pointer',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'scale(1.05)',
  },
}));

const SettingsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'box-shadow 0.2s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
  },
}));

interface StudentProfileProps {
  user: User | null;
  courses: Course[];
  onUpdateProfile: (data: any) => void;
  onChangePassword: (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => void;
  onLogout: () => void;
  loading?: boolean;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  deadlineReminders: boolean;
  gradeNotifications: boolean;
  assignmentUpdates: boolean;
  courseAnnouncements: boolean;
  reminderFrequency: 'immediate' | 'daily' | 'weekly';
}

interface AcademicGoals {
  targetGPA: number;
  studyHoursPerWeek: number;
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night';
  goals: string[];
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  user,
  courses,
  onUpdateProfile,
  onChangePassword,
  onLogout,
  loading = false,
}) => {
  const [editMode, setEditMode] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    identifier: user?.identifier || '',
  });
  
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    emailNotifications: true,
    deadlineReminders: true,
    gradeNotifications: true,
    assignmentUpdates: true,
    courseAnnouncements: true,
    reminderFrequency: 'daily',
  });

  const [academicGoals, setAcademicGoals] = useState<AcademicGoals>({
    targetGPA: 3.5,
    studyHoursPerWeek: 20,
    preferredStudyTime: 'evening',
    goals: [
      'Maintain high grade average',
      'Complete all assignments on time',
      'Improve programming skills',
    ],
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleProfileSave = () => {
    onUpdateProfile(profileData);
    setEditMode(false);
    setSuccessMessage('Profile updated successfully!');
    setShowSuccessMessage(true);
  };

  const handlePasswordChange = () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    onChangePassword(passwordData);
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setShowPasswordDialog(false);
    setSuccessMessage('Password changed successfully!');
    setShowSuccessMessage(true);
  };

  const handleNotificationChange = (setting: keyof NotificationPreferences, value: boolean | string) => {
    setNotifications(prev => ({ ...prev, [setting]: value }));
  };

  const addGoal = () => {
    const newGoal = prompt('Enter a new academic goal:');
    if (newGoal) {
      setAcademicGoals(prev => ({
        ...prev,
        goals: [...prev.goals, newGoal],
      }));
    }
  };

  const removeGoal = (index: number) => {
    setAcademicGoals(prev => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Profile & Settings
      </Typography>

      <Grid container spacing={3}>
        {/* Profile Information */}
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SettingsCard>
              <CardContent sx={{ textAlign: 'center', p: 3 }}>
                <Box sx={{ position: 'relative', display: 'inline-block', mb: 2 }}>
                  <ProfileAvatar>
                    {user ? `${user.firstName[0]}${user.lastName[0]}` : 'ST'}
                  </ProfileAvatar>
                  <Button
                    size="small"
                    sx={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      minWidth: 'auto',
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': { backgroundColor: 'primary.dark' },
                    }}
                  >
                    <PhotoCamera fontSize="small" />
                  </Button>
                </Box>

                <Typography variant="h6" gutterBottom>
                  {user ? `${user.firstName} ${user.lastName}` : 'Student Name'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {user?.identifier || 'Student ID'}
                </Typography>
                <Chip
                  icon={<School />}
                  label={`${courses.length} Courses Enrolled`}
                  color="primary"
                  variant="outlined"
                />

                <Box sx={{ mt: 3 }}>
                  <Button
                    variant={editMode ? 'contained' : 'outlined'}
                    startIcon={editMode ? <Save /> : <Edit />}
                    onClick={editMode ? handleProfileSave : () => setEditMode(true)}
                    disabled={loading}
                    fullWidth
                  >
                    {editMode ? 'Save Changes' : 'Edit Profile'}
                  </Button>
                </Box>
              </CardContent>
            </SettingsCard>
          </motion.div>
        </Grid>

        {/* Profile Details */}
        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <SettingsCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Person sx={{ mr: 1 }} />
                  Personal Information
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profileData.firstName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                      disabled={!editMode}
                      variant={editMode ? 'outlined' : 'filled'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profileData.lastName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                      disabled={!editMode}
                      variant={editMode ? 'outlined' : 'filled'}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      disabled={!editMode}
                      variant={editMode ? 'outlined' : 'filled'}
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Student ID"
                      value={profileData.identifier}
                      disabled
                      variant="filled"
                    />
                  </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                    <Security sx={{ mr: 1 }} />
                    Security
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => setShowPasswordDialog(true)}
                  >
                    Change Password
                  </Button>
                </Box>
              </CardContent>
            </SettingsCard>
          </motion.div>
        </Grid>

        {/* Notification Settings */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <SettingsCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <Notifications sx={{ mr: 1 }} />
                  Notification Preferences
                </Typography>

                <List>
                  <ListItem>
                    <ListItemIcon>
                      <Email />
                    </ListItemIcon>
                    <ListItemText primary="Email Notifications" secondary="Receive notifications via email" />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.emailNotifications}
                          onChange={(e) => handleNotificationChange('emailNotifications', e.target.checked)}
                        />
                      }
                      label=""
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Schedule />
                    </ListItemIcon>
                    <ListItemText primary="Deadline Reminders" secondary="Get reminded about upcoming deadlines" />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.deadlineReminders}
                          onChange={(e) => handleNotificationChange('deadlineReminders', e.target.checked)}
                        />
                      }
                      label=""
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <Assessment />
                    </ListItemIcon>
                    <ListItemText primary="Grade Notifications" secondary="Be notified when grades are posted" />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.gradeNotifications}
                          onChange={(e) => handleNotificationChange('gradeNotifications', e.target.checked)}
                        />
                      }
                      label=""
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <NotificationsActive />
                    </ListItemIcon>
                    <ListItemText primary="Assignment Updates" secondary="Notifications about assignment changes" />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.assignmentUpdates}
                          onChange={(e) => handleNotificationChange('assignmentUpdates', e.target.checked)}
                        />
                      }
                      label=""
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <School />
                    </ListItemIcon>
                    <ListItemText primary="Course Announcements" secondary="Important course updates and announcements" />
                    <FormControlLabel
                      control={
                        <Switch
                          checked={notifications.courseAnnouncements}
                          onChange={(e) => handleNotificationChange('courseAnnouncements', e.target.checked)}
                        />
                      }
                      label=""
                    />
                  </ListItem>
                </List>

                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    select
                    label="Reminder Frequency"
                    value={notifications.reminderFrequency}
                    onChange={(e) => handleNotificationChange('reminderFrequency', e.target.value)}
                    SelectProps={{ native: true }}
                  >
                    <option value="immediate">Immediate</option>
                    <option value="daily">Daily Digest</option>
                    <option value="weekly">Weekly Summary</option>
                  </TextField>
                </Box>
              </CardContent>
            </SettingsCard>
          </motion.div>
        </Grid>

        {/* Academic Goals */}
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <SettingsCard>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <School sx={{ mr: 1 }} />
                  Academic Goals
                </Typography>

                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Target GPA"
                      value={academicGoals.targetGPA}
                      onChange={(e) => setAcademicGoals(prev => ({ ...prev, targetGPA: parseFloat(e.target.value) }))}
                      inputProps={{ min: 0, max: 4, step: 0.1 }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Study Hours/Week"
                      value={academicGoals.studyHoursPerWeek}
                      onChange={(e) => setAcademicGoals(prev => ({ ...prev, studyHoursPerWeek: parseInt(e.target.value) }))}
                      inputProps={{ min: 0, max: 100 }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      select
                      label="Preferred Study Time"
                      value={academicGoals.preferredStudyTime}
                      onChange={(e) => setAcademicGoals(prev => ({ ...prev, preferredStudyTime: e.target.value as any }))}
                      SelectProps={{ native: true }}
                    >
                      <option value="morning">Morning (6 AM - 12 PM)</option>
                      <option value="afternoon">Afternoon (12 PM - 6 PM)</option>
                      <option value="evening">Evening (6 PM - 10 PM)</option>
                      <option value="night">Night (10 PM - 6 AM)</option>
                    </TextField>
                  </Grid>
                </Grid>

                <Typography variant="subtitle2" gutterBottom>
                  Personal Goals
                </Typography>
                <Box sx={{ mb: 2 }}>
                  {academicGoals.goals.map((goal, index) => (
                    <Chip
                      key={index}
                      label={goal}
                      onDelete={() => removeGoal(index)}
                      sx={{ m: 0.5 }}
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={addGoal}
                >
                  Add Goal
                </Button>
              </CardContent>
            </SettingsCard>
          </motion.div>
        </Grid>

        {/* Quick Actions */}
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                <Settings sx={{ mr: 1 }} />
                Quick Actions
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Help />}
                    sx={{ py: 2 }}
                  >
                    Help & Support
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Assessment />}
                    sx={{ py: 2 }}
                  >
                    Academic Progress
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Settings />}
                    sx={{ py: 2 }}
                  >
                    Advanced Settings
                  </Button>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    fullWidth
                    variant="outlined"
                    color="error"
                    startIcon={<ExitToApp />}
                    onClick={onLogout}
                    sx={{ py: 2 }}
                  >
                    Sign Out
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onClose={() => setShowPasswordDialog(false)}>
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="password"
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
            margin="normal"
          />
          <TextField
            fullWidth
            type="password"
            label="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
            margin="normal"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPasswordDialog(false)}>Cancel</Button>
          <Button onClick={handlePasswordChange} variant="contained">
            Change Password
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Message */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={6000}
        onClose={() => setShowSuccessMessage(false)}
      >
        <Alert
          onClose={() => setShowSuccessMessage(false)}
          severity="success"
          sx={{ width: '100%' }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default StudentProfile;
