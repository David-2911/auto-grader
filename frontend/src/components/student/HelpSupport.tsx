import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Divider,
} from '@mui/material';
import {
  ExpandMore,
  Help,
  Email,
  Phone,
  Chat,
  VideoCall,
  QuestionAnswer,
  School,
  Assignment,
  Grade,
  Computer,
  Send,
  Search,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { motion } from 'framer-motion';

const HelpCard = styled(Card)(({ theme }) => ({
  height: '100%',
  transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
  cursor: 'pointer',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: theme.shadows[4],
  },
}));

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: 'assignments' | 'grades' | 'technical' | 'account';
  tags: string[];
}

interface SupportRequest {
  subject: string;
  message: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

const faqs: FAQ[] = [
  {
    id: '1',
    question: 'How do I submit an assignment?',
    answer: 'To submit an assignment, go to the Assignments tab, find your assignment, and click "Submit". You can upload files by dragging and dropping them or clicking to browse. Make sure to submit before the deadline!',
    category: 'assignments',
    tags: ['submit', 'upload', 'deadline'],
  },
  {
    id: '2',
    question: 'What file types are accepted for submissions?',
    answer: 'Commonly accepted file types include PDF, DOC, DOCX, TXT, and images (JPG, PNG). Each assignment may have specific requirements listed in the assignment details.',
    category: 'assignments',
    tags: ['file types', 'pdf', 'doc', 'upload'],
  },
  {
    id: '3',
    question: 'How can I view my grades and feedback?',
    answer: 'Navigate to the Grades tab to see all your graded assignments. Click on any grade to view detailed feedback, rubric scores, and suggestions for improvement.',
    category: 'grades',
    tags: ['grades', 'feedback', 'rubric'],
  },
  {
    id: '4',
    question: 'Can I resubmit an assignment?',
    answer: 'Resubmission depends on your instructor\'s settings. If allowed, you\'ll see a "Resubmit" button on the assignment. Some assignments may have limited resubmission attempts.',
    category: 'assignments',
    tags: ['resubmit', 'revise', 'attempts'],
  },
  {
    id: '5',
    question: 'How do I change my notification preferences?',
    answer: 'Go to your Profile & Settings, then navigate to the Notification Preferences section. You can customize email notifications, deadline reminders, and grade notifications.',
    category: 'account',
    tags: ['notifications', 'settings', 'email'],
  },
  {
    id: '6',
    question: 'What should I do if the website is not working properly?',
    answer: 'First, try refreshing the page or clearing your browser cache. If issues persist, try using a different browser or contact technical support with details about the problem.',
    category: 'technical',
    tags: ['technical', 'browser', 'cache'],
  },
  {
    id: '7',
    question: 'How do I track my academic progress?',
    answer: 'Visit the Progress tab to see your grade trends, achievements, and goal tracking. You can set personal academic goals and monitor your improvement over time.',
    category: 'grades',
    tags: ['progress', 'goals', 'achievements'],
  },
  {
    id: '8',
    question: 'How do I contact my instructor?',
    answer: 'You can contact your instructor through the course communication tools or use the contact information provided in your course syllabus. For urgent matters, use the support system.',
    category: 'account',
    tags: ['instructor', 'contact', 'communication'],
  },
];

export const HelpSupport: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [supportRequest, setSupportRequest] = useState<SupportRequest>({
    subject: '',
    message: '',
    category: 'technical',
    priority: 'medium',
  });

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleSubmitSupport = () => {
    // Submit support request logic
    console.log('Support request submitted:', supportRequest);
    setSupportRequest({
      subject: '',
      message: '',
      category: 'technical',
      priority: 'medium',
    });
    setShowSupportDialog(false);
  };

  const contactOptions = [
    {
      title: 'Live Chat',
      description: 'Get instant help from our support team',
      icon: <Chat />,
      available: true,
      action: () => console.log('Open live chat'),
    },
    {
      title: 'Email Support',
      description: 'Send us an email and we\'ll respond within 24 hours',
      icon: <Email />,
      available: true,
      action: () => setShowSupportDialog(true),
    },
    {
      title: 'Video Call',
      description: 'Schedule a video call for complex issues',
      icon: <VideoCall />,
      available: false,
      action: () => console.log('Schedule video call'),
    },
    {
      title: 'Phone Support',
      description: 'Call our helpdesk during business hours',
      icon: <Phone />,
      available: true,
      action: () => console.log('Show phone number'),
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Typography variant="h4" gutterBottom>
        Help & Support
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Find answers to common questions or get in touch with our support team.
      </Typography>

      {/* Quick Help Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {contactOptions.map((option, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <HelpCard onClick={option.available ? option.action : undefined}>
                <CardContent sx={{ textAlign: 'center', p: 3 }}>
                  <Box sx={{ 
                    color: option.available ? 'primary.main' : 'text.disabled',
                    mb: 2,
                  }}>
                    {React.cloneElement(option.icon, { sx: { fontSize: 48 } })}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {option.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {option.description}
                  </Typography>
                  <Chip
                    label={option.available ? 'Available' : 'Coming Soon'}
                    color={option.available ? 'success' : 'default'}
                    size="small"
                  />
                </CardContent>
              </HelpCard>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Quick Tip */}
      <Alert severity="info" sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom>
          💡 Quick Tip
        </Typography>
        Before contacting support, try searching our FAQ section below. Most questions can be answered quickly!
      </Alert>

      {/* FAQ Section */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <QuestionAnswer sx={{ mr: 1 }} />
          Frequently Asked Questions
        </Typography>

        {/* Search and Filter */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search FAQs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                <MenuItem value="assignments">Assignments</MenuItem>
                <MenuItem value="grades">Grades</MenuItem>
                <MenuItem value="technical">Technical</MenuItem>
                <MenuItem value="account">Account</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* FAQ Results */}
        {filteredFAQs.length === 0 ? (
          <Alert severity="info">
            No FAQs found matching your search criteria. Try adjusting your search terms or contact support directly.
          </Alert>
        ) : (
          <Box>
            {filteredFAQs.map((faq, index) => (
              <motion.div
                key={faq.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Box sx={{ mr: 2 }}>
                        {faq.category === 'assignments' && <Assignment color="primary" />}
                        {faq.category === 'grades' && <Grade color="success" />}
                        {faq.category === 'technical' && <Computer color="error" />}
                        {faq.category === 'account' && <School color="info" />}
                      </Box>
                      <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>
                        {faq.question}
                      </Typography>
                      <Chip
                        label={faq.category}
                        size="small"
                        variant="outlined"
                        sx={{ ml: 1 }}
                      />
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Typography variant="body2" paragraph>
                      {faq.answer}
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {faq.tags.map((tag) => (
                        <Chip
                          key={tag}
                          label={tag}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      ))}
                    </Box>
                  </AccordionDetails>
                </Accordion>
              </motion.div>
            ))}
          </Box>
        )}
      </Paper>

      {/* Contact Support Section */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Still Need Help?
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Can't find what you're looking for? Our support team is here to help!
        </Typography>
        <Button
          variant="contained"
          startIcon={<Send />}
          onClick={() => setShowSupportDialog(true)}
        >
          Contact Support
        </Button>
      </Paper>

      {/* Support Request Dialog */}
      <Dialog 
        open={showSupportDialog} 
        onClose={() => setShowSupportDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Contact Support</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={supportRequest.category}
                  label="Category"
                  onChange={(e) => setSupportRequest(prev => ({ ...prev, category: e.target.value }))}
                >
                  <MenuItem value="technical">Technical Issue</MenuItem>
                  <MenuItem value="assignments">Assignment Help</MenuItem>
                  <MenuItem value="grades">Grade Inquiry</MenuItem>
                  <MenuItem value="account">Account Settings</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={supportRequest.priority}
                  label="Priority"
                  onChange={(e) => setSupportRequest(prev => ({ ...prev, priority: e.target.value as any }))}
                >
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Subject"
                value={supportRequest.subject}
                onChange={(e) => setSupportRequest(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Brief description of your issue"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Message"
                value={supportRequest.message}
                onChange={(e) => setSupportRequest(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Please provide detailed information about your issue..."
              />
            </Grid>
          </Grid>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Tips for faster resolution:
            </Typography>
            <Typography variant="body2" component="div">
              • Be specific about the issue you're experiencing
              <br />
              • Include steps you've already tried
              <br />
              • Mention your browser and operating system if it's a technical issue
              <br />
              • Include relevant assignment or course information
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSupportDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmitSupport}
            variant="contained"
            disabled={!supportRequest.subject || !supportRequest.message}
          >
            Send Request
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HelpSupport;
