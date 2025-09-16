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
  CardActions
} from '@mui/material';
import { Add as AddIcon, School as SchoolIcon } from '@mui/icons-material';

const CoursesPage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            My Courses
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            color="primary"
          >
            Add Course
          </Button>
        </Box>

        <Grid container spacing={3}>
          {/* Sample course card */}
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SchoolIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="h2">
                    Sample Course
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  This is a placeholder course. Courses will be loaded from the API.
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" color="primary">
                  View Details
                </Button>
                <Button size="small" color="primary">
                  Assignments
                </Button>
              </CardActions>
            </Card>
          </Grid>
        </Grid>

        {/* Empty state */}
        <Paper sx={{ p: 4, textAlign: 'center', mt: 3 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Course management is under development
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This page will display and manage your courses once the backend integration is complete.
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default CoursesPage;