import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  Chip,
  Divider
} from '@mui/material';
import { ArrowBack as ArrowBackIcon, Assignment as AssignmentIcon } from '@mui/icons-material';

const CourseDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            to="/courses"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Back to Courses
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            Course Details
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Course ID: {id}
          </Typography>
        </Box>

        <Paper sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Sample Course Title
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Chip label="Active" color="success" sx={{ mr: 1 }} />
            <Chip label="Computer Science" variant="outlined" />
          </Box>

          <Typography variant="body1" paragraph>
            This is a placeholder course detail page. Course information will be loaded from the API based on the course ID.
          </Typography>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Course Assignments
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <AssignmentIcon sx={{ mr: 2, color: 'primary.main' }} />
            <Typography variant="body1">
              Assignment management integration is under development
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default CourseDetailPage;