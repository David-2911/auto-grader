import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Download as DownloadIcon,
  Upload as UploadIcon,
  Grade as GradeIcon 
} from '@mui/icons-material';

const AssignmentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Button
            component={Link}
            to="/assignments"
            startIcon={<ArrowBackIcon />}
            variant="outlined"
            sx={{ mb: 2 }}
          >
            Back to Assignments
          </Button>
          
          <Typography variant="h4" component="h1" gutterBottom>
            Assignment Details
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Assignment ID: {id}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Sample Assignment Title
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Chip label="Active" color="success" sx={{ mr: 1 }} />
                <Chip label="Due Soon" color="warning" sx={{ mr: 1 }} />
                <Chip label="Math 101" variant="outlined" />
              </Box>

              <Typography variant="body1" paragraph>
                This is a placeholder assignment detail page. Assignment information will be loaded from the API based on the assignment ID.
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Assignment Instructions
              </Typography>
              
              <Typography variant="body1" paragraph>
                Detailed instructions for the assignment will be displayed here. This may include:
                - Problem descriptions
                - Required deliverables
                - Grading criteria
                - File format requirements
              </Typography>

              <Box sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  sx={{ mr: 2 }}
                >
                  Download PDF
                </Button>
                <Button
                  variant="contained"
                  startIcon={<UploadIcon />}
                  color="primary"
                >
                  Submit Assignment
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assignment Info
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Due Date
                  </Typography>
                  <Typography variant="body2">
                    October 15, 2025 at 11:59 PM
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Total Points
                  </Typography>
                  <Typography variant="body2">
                    100 points
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Submissions
                  </Typography>
                  <Typography variant="body2">
                    5 out of 30 students
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<GradeIcon />}
                  color="primary"
                >
                  View Submissions
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AssignmentDetailPage;