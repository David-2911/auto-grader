import React from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Grid, 
  Button,
  Card,
  CardContent,
  CardActions,
  Chip,
  LinearProgress
} from '@mui/material';
import { 
  Add as AddIcon, 
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon 
} from '@mui/icons-material';

const AssignmentsPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Assignments
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="primary"
          >
            Create Assignment
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Sample assignment card */}
          <Grid item xs={12} md={6} lg={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AssignmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    Sample Assignment
                  </Typography>
                </Box>
                
                <Box sx={{ mb: 2 }}>
                  <Chip label="Due Soon" color="warning" size="small" sx={{ mr: 1 }} />
                  <Chip label="Math 101" variant="outlined" size="small" />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <ScheduleIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    Due: Oct 15, 2025
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary" paragraph>
                  Sample assignment description. This will show the actual assignment details.
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" display="block" gutterBottom>
                    Submissions: 5/30
                  </Typography>
                  <LinearProgress variant="determinate" value={17} />
                </Box>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">
                  View Details
                </Button>
                <Button size="small" color="primary">
                  Grade
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        {/* Empty state */}
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Assignment management is under development
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page will display and manage assignments once the backend integration is complete.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default AssignmentsPage;