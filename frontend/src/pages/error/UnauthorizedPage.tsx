import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Box, 
  Button,
  Paper
} from '@mui/material';
import { 
  Home as HomeIcon, 
  ArrowBack as ArrowBackIcon,
  Block as BlockIcon 
} from '@mui/icons-material';

const UnauthorizedPage: React.FC = () => {
  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 6 }}>
          <BlockIcon sx={{ fontSize: '4rem', color: 'error.main', mb: 2 }} />
          
          <Typography variant="h3" component="h1" gutterBottom color="error.main">
            Unauthorized
          </Typography>
          
          <Typography variant="h5" component="h2" gutterBottom>
            Access Denied
          </Typography>
          
          <Typography variant="body1" color="text.secondary" paragraph>
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </Typography>

          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<HomeIcon />}
              component={Link}
              to="/dashboard"
              color="primary"
            >
              Go to Dashboard
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default UnauthorizedPage;