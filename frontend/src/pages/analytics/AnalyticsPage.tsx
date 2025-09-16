import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid,
  Card,
  CardContent
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  School as SchoolIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';

const AnalyticsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Analytics
        </Typography>

        {/* Key Metrics */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SchoolIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Typography variant="h6">
                    Students
                  </Typography>
                </Box>
                <Typography variant="h4" color="primary.main">
                  156
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total enrolled students
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 2, color: 'success.main' }} />
                  <Typography variant="h6">
                    Assignments
                  </Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  24
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Active assignments
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUpIcon sx={{ mr: 2, color: 'warning.main' }} />
                  <Typography variant="h6">
                    Avg Grade
                  </Typography>
                </Box>
                <Typography variant="h4" color="warning.main">
                  84.5%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Class average
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssessmentIcon sx={{ mr: 2, color: 'info.main' }} />
                  <Typography variant="h6">
                    Submissions
                  </Typography>
                </Box>
                <Typography variant="h4" color="info.main">
                  342
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total submissions
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts and Analytics */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 4, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Performance Trends
              </Typography>
              <Box 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  borderRadius: 1
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Chart component will be integrated here
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 4, height: 400 }}>
              <Typography variant="h6" gutterBottom>
                Grade Distribution
              </Typography>
              <Box 
                sx={{ 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  bgcolor: 'grey.50',
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  borderRadius: 1
                }}
              >
                <Typography variant="body1" color="text.secondary">
                  Pie chart will be here
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Activity feed and analytics dashboard features are under development.
                This will include:
              </Typography>
              <Box component="ul" sx={{ mt: 2 }}>
                <li>Student performance analytics</li>
                <li>Assignment completion rates</li>
                <li>Grade distribution analysis</li>
                <li>Course engagement metrics</li>
                <li>Time-based performance trends</li>
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AnalyticsPage;