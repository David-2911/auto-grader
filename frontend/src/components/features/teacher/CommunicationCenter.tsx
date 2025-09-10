import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Avatar,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Badge,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Message as MessageIcon,
  Send as SendIcon,
  Announcement as AnnouncementIcon,
  Group as GroupIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  Attachment as AttachmentIcon,
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  MarkEmailRead as ReadIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: number;
  type: 'message' | 'announcement' | 'feedback';
  subject: string;
  content: string;
  sender: string;
  recipient: string | string[];
  timestamp: string;
  read: boolean;
  starred: boolean;
  attachments?: string[];
  course?: string;
  assignment?: string;
}

interface Template {
  id: number;
  name: string;
  subject: string;
  content: string;
  category: 'feedback' | 'announcement' | 'reminder' | 'welcome';
}

// Mock data
const mockMessages: Message[] = [
  {
    id: 1,
    type: 'message',
    subject: 'Question about Assignment 2',
    content: 'Hi Professor, I have a question about the second assignment. Could you clarify the requirements for the database schema design?',
    sender: 'John Doe',
    recipient: 'You',
    timestamp: '2024-09-09T10:30:00',
    read: false,
    starred: false,
    course: 'CS301',
  },
  {
    id: 2,
    type: 'announcement',
    subject: 'Midterm Exam Schedule',
    content: 'The midterm exam for CS101 will be held on October 15th at 2:00 PM in Room 202. Please bring your student ID and a pencil.',
    sender: 'You',
    recipient: ['All CS101 Students'],
    timestamp: '2024-09-08T14:15:00',
    read: true,
    starred: true,
    course: 'CS101',
  },
  {
    id: 3,
    type: 'feedback',
    subject: 'Assignment 1 Feedback',
    content: 'Great work on your Python assignment! Your code structure is clear and well-commented. Consider optimizing the algorithm for better performance.',
    sender: 'You',
    recipient: 'Jane Smith',
    timestamp: '2024-09-07T16:20:00',
    read: true,
    starred: false,
    course: 'CS201',
    assignment: 'Python Basics',
  },
];

const mockTemplates: Template[] = [
  {
    id: 1,
    name: 'Assignment Feedback',
    subject: 'Feedback on {assignment_name}',
    content: 'Dear {student_name},\n\nI have reviewed your submission for {assignment_name}. Overall, {general_feedback}.\n\nStrengths:\n- {strength_1}\n- {strength_2}\n\nAreas for improvement:\n- {improvement_1}\n- {improvement_2}\n\nYour grade: {grade}%\n\nBest regards,\n{teacher_name}',
    category: 'feedback',
  },
  {
    id: 2,
    name: 'Assignment Reminder',
    subject: 'Reminder: {assignment_name} due {due_date}',
    content: 'Dear Students,\n\nThis is a friendly reminder that {assignment_name} is due on {due_date} at {due_time}.\n\nPlease make sure to:\n- Submit your work on time\n- Follow the submission guidelines\n- Include all required files\n\nIf you have any questions, please don\'t hesitate to reach out.\n\nBest regards,\n{teacher_name}',
    category: 'reminder',
  },
  {
    id: 3,
    name: 'Course Welcome',
    subject: 'Welcome to {course_name}!',
    content: 'Dear Students,\n\nWelcome to {course_name}! I\'m excited to have you in this course.\n\nImportant information:\n- Course schedule: {schedule}\n- Office hours: {office_hours}\n- Course website: {course_url}\n\nPlease review the syllabus and let me know if you have any questions.\n\nLooking forward to a great semester!\n\n{teacher_name}',
    category: 'welcome',
  },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div hidden={value !== index}>
      {value === index && <Box sx={{ p: 0 }}>{children}</Box>}
    </div>
  );
};

const CommunicationCenter: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [activeTab, setActiveTab] = useState(0);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [isComposeDialogOpen, setIsComposeDialogOpen] = useState(false);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const theme = useTheme();

  const [newMessage, setNewMessage] = useState({
    type: 'message' as Message['type'],
    subject: '',
    content: '',
    recipient: '',
    course: '',
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleSendMessage = () => {
    const message: Message = {
      id: Date.now(),
      ...newMessage,
      sender: 'You',
      timestamp: new Date().toISOString(),
      read: true,
      starred: false,
      recipient: newMessage.recipient.split(',').map(r => r.trim()),
    };
    setMessages([message, ...messages]);
    setIsComposeDialogOpen(false);
    setNewMessage({
      type: 'message',
      subject: '',
      content: '',
      recipient: '',
      course: '',
    });
  };

  const handleUseTemplate = (template: Template) => {
    setNewMessage({
      ...newMessage,
      subject: template.subject,
      content: template.content,
    });
    setIsTemplateDialogOpen(false);
    setIsComposeDialogOpen(true);
  };

  const getMessageIcon = (type: Message['type']) => {
    switch (type) {
      case 'announcement':
        return <AnnouncementIcon />;
      case 'feedback':
        return <StarIcon />;
      default:
        return <MessageIcon />;
    }
  };

  const getMessageColor = (type: Message['type']) => {
    switch (type) {
      case 'announcement':
        return theme.palette.warning.main;
      case 'feedback':
        return theme.palette.success.main;
      default:
        return theme.palette.primary.main;
    }
  };

  const MessageCard: React.FC<{ message: Message }> = ({ message }) => (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        sx={{
          cursor: 'pointer',
          bgcolor: message.read ? 'background.paper' : alpha(theme.palette.primary.main, 0.05),
          '&:hover': {
            boxShadow: theme.shadows[4],
          },
        }}
        onClick={() => setSelectedMessage(message)}
      >
        <CardContent>
          <Box display="flex" alignItems="flex-start" gap={2}>
            <Avatar sx={{ bgcolor: getMessageColor(message.type) }}>
              {getMessageIcon(message.type)}
            </Avatar>
            <Box flex={1}>
              <Box display="flex" justifyContent="between" alignItems="flex-start" mb={1}>
                <Box flex={1}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight={message.read ? 'normal' : 'bold'}
                    gutterBottom
                  >
                    {message.subject}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    From: {message.sender} • To: {Array.isArray(message.recipient) ? message.recipient.join(', ') : message.recipient}
                  </Typography>
                  {message.course && (
                    <Chip label={message.course} size="small" variant="outlined" sx={{ mt: 0.5 }} />
                  )}
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  {message.starred && (
                    <StarIcon sx={{ color: theme.palette.warning.main, fontSize: 20 }} />
                  )}
                  {!message.read && (
                    <Badge color="primary" variant="dot" />
                  )}
                  <Typography variant="body2" color="text.secondary">
                    {new Date(message.timestamp).toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {message.content}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );

  const TemplateCard: React.FC<{ template: Template }> = ({ template }) => (
    <Card sx={{ cursor: 'pointer' }} onClick={() => handleUseTemplate(template)}>
      <CardContent>
        <Box display="flex" justifyContent="between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" fontWeight="bold">
            {template.name}
          </Typography>
          <Chip
            label={template.category}
            size="small"
            color="primary"
            variant="outlined"
          />
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Subject: {template.subject}
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {template.content}
        </Typography>
      </CardContent>
    </Card>
  );

  const filteredMessages = messages.filter((message) => {
    switch (activeTab) {
      case 0:
        return true; // All messages
      case 1:
        return !message.read; // Unread
      case 2:
        return message.starred; // Starred
      case 3:
        return message.sender === 'You'; // Sent
      default:
        return true;
    }
  });

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" fontWeight="bold">
          Communication Center
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setIsTemplateDialogOpen(true)}
          >
            Templates
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsComposeDialogOpen(true)}
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            }}
          >
            Compose
          </Button>
        </Box>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <MessageIcon sx={{ fontSize: 40, color: theme.palette.primary.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {messages.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Messages
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Badge badgeContent={messages.filter(m => !m.read).length} color="error">
                  <ReadIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 2 }} />
                </Badge>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {messages.filter(m => !m.read).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Unread
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <StarIcon sx={{ fontSize: 40, color: theme.palette.warning.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {messages.filter(m => m.starred).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Starred
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AnnouncementIcon sx={{ fontSize: 40, color: theme.palette.info.main, mr: 2 }} />
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {messages.filter(m => m.type === 'announcement').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Announcements
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filter Tabs */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
            },
          }}
        >
          <Tab label={`All (${messages.length})`} />
          <Tab label={`Unread (${messages.filter(m => !m.read).length})`} />
          <Tab label={`Starred (${messages.filter(m => m.starred).length})`} />
          <Tab label={`Sent (${messages.filter(m => m.sender === 'You').length})`} />
        </Tabs>
      </Card>

      {/* Messages List */}
      <TabPanel value={activeTab} index={activeTab}>
        <Grid container spacing={2}>
          <AnimatePresence>
            {filteredMessages.map((message) => (
              <Grid item xs={12} key={message.id}>
                <MessageCard message={message} />
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
        
        {filteredMessages.length === 0 && (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
          >
            <MessageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No messages found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {activeTab === 0 ? "Your inbox is empty" : "No messages in this category"}
            </Typography>
          </Box>
        )}
      </TabPanel>

      {/* Compose Message Dialog */}
      <Dialog
        open={isComposeDialogOpen}
        onClose={() => setIsComposeDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Compose Message
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box component="form" sx={{ mt: 2 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Message Type</InputLabel>
                  <Select
                    value={newMessage.type}
                    label="Message Type"
                    onChange={(e) => setNewMessage({ ...newMessage, type: e.target.value as Message['type'] })}
                  >
                    <MenuItem value="message">Personal Message</MenuItem>
                    <MenuItem value="announcement">Announcement</MenuItem>
                    <MenuItem value="feedback">Feedback</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Course (Optional)</InputLabel>
                  <Select
                    value={newMessage.course}
                    label="Course (Optional)"
                    onChange={(e) => setNewMessage({ ...newMessage, course: e.target.value })}
                  >
                    <MenuItem value="">None</MenuItem>
                    <MenuItem value="CS101">CS101 - Intro to Computer Science</MenuItem>
                    <MenuItem value="CS201">CS201 - Data Structures</MenuItem>
                    <MenuItem value="CS301">CS301 - Database Systems</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Recipients"
                  value={newMessage.recipient}
                  onChange={(e) => setNewMessage({ ...newMessage, recipient: e.target.value })}
                  placeholder="Enter email addresses separated by commas"
                  helperText="You can use 'All CS101 Students' for course-wide messages"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject"
                  value={newMessage.subject}
                  onChange={(e) => setNewMessage({ ...newMessage, subject: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={8}
                  label="Message"
                  value={newMessage.content}
                  onChange={(e) => setNewMessage({ ...newMessage, content: e.target.value })}
                  placeholder="Type your message here..."
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsComposeDialogOpen(false)}>Cancel</Button>
          <Button variant="outlined" startIcon={<AttachmentIcon />}>
            Attach File
          </Button>
          <Button
            variant="contained"
            startIcon={<SendIcon />}
            onClick={handleSendMessage}
            disabled={!newMessage.subject || !newMessage.content || !newMessage.recipient}
          >
            Send Message
          </Button>
        </DialogActions>
      </Dialog>

      {/* Templates Dialog */}
      <Dialog
        open={isTemplateDialogOpen}
        onClose={() => setIsTemplateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Message Templates
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {templates.map((template) => (
              <Grid item xs={12} sm={6} key={template.id}>
                <TemplateCard template={template} />
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsTemplateDialogOpen(false)}>Close</Button>
          <Button variant="outlined" startIcon={<AddIcon />}>
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Message Detail Dialog */}
      {selectedMessage && (
        <Dialog
          open={!!selectedMessage}
          onClose={() => setSelectedMessage(null)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box display="flex" justifyContent="between" alignItems="center">
              <Typography variant="h6" fontWeight="bold">
                {selectedMessage.subject}
              </Typography>
              <Box display="flex" gap={1}>
                <IconButton size="small">
                  <StarIcon />
                </IconButton>
                <IconButton size="small">
                  <ReplyIcon />
                </IconButton>
                <IconButton size="small">
                  <ForwardIcon />
                </IconButton>
                <IconButton size="small">
                  <DeleteIcon />
                </IconButton>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              From: {selectedMessage.sender} • {new Date(selectedMessage.timestamp).toLocaleString()}
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {selectedMessage.content}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedMessage(null)}>Close</Button>
            <Button variant="outlined" startIcon={<ReplyIcon />}>
              Reply
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default CommunicationCenter;
