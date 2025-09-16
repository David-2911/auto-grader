import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button,
  Grid,
  Card,
  CardContent,
  Chip,
  Divider,
  TextField
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon, 
  Upload as UploadIcon,
  Download as DownloadIcon,
  Send as SendIcon 
} from '@mui/icons-material';

const SubmissionPage: React.FC = () => {
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
            Submit Assignment
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Assignment ID: {id}
          </Typography>
        </Box>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" gutterBottom>
                Assignment Submission
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Chip label="Due Soon" color="warning" sx={{ mr: 1 }} />
                <Chip label="100 Points" variant="outlined" />
              </Box>

              <Typography variant="body1" paragraph>
                Submit your completed assignment below. Make sure to review the requirements before submission.
              </Typography>

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Upload Your Solution
              </Typography>
              
              <Paper sx={{ p: 3, bgcolor: 'grey.50', mb: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<UploadIcon />}
                    component="label"
                    size="large"
                    sx={{ mb: 2 }}
                  >
                    Choose File
                    <input type="file" hidden accept=".pdf,.doc,.docx,.txt" />
                  </Button>
                  <Typography variant="body2" color="text.secondary">
                    Supported formats: PDF, DOC, DOCX, TXT (Max 10MB)
                  </Typography>
                </Box>
              </Paper>

              <Typography variant="h6" gutterBottom>
                Submission Notes (Optional)
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Add any notes or comments about your submission..."
                variant="outlined"
                sx={{ mb: 3 }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<SendIcon />}
                  color="primary"
                  size="large"
                >
                  Submit Assignment
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                >
                  Save Draft
                </Button>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Assignment Details
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
                    Time Remaining
                  </Typography>
                  <Typography variant="body2" color="warning.main">
                    2 days, 5 hours
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Attempts Allowed
                  </Typography>
                  <Typography variant="body2">
                    Multiple submissions allowed
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  sx={{ mb: 2 }}
                >
                  Download Question
                </Button>

                <Typography variant="caption" color="text.secondary">
                  Need help? Contact your instructor or check the course forum.
                </Typography>
              </CardContent>
            </Card>

            {/* Previous submissions */}
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Previous Submissions
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  No previous submissions found.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default SubmissionPage;