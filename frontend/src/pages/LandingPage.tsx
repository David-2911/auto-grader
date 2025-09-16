import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { CircularProgress, Box, Typography, Button } from '@mui/material';

// Basic selectors (defensive in case types not fully defined yet)
interface RootStateLike {
  auth?: {
    isAuthenticated?: boolean;
    user?: { role?: string } | null;
    loading?: boolean;
  };
}

const roleToPath: Record<string, string> = {
  student: '/app/student',
  teacher: '/app/teacher',
  admin: '/app/admin',
};

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useSelector((state: RootStateLike) => state.auth || {});
  const { isAuthenticated, user, loading } = auth;

  useEffect(() => {
    // Decide redirect target
    if (loading) return; // Wait until auth slice resolves
    if (isAuthenticated && user?.role) {
      const target = roleToPath[user.role] || '/app/dashboard';
      navigate(target, { replace: true });
    } else {
      // Not authenticated ⇒ go to login
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, loading, navigate]);

  return (
    <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" minHeight="100vh" gap={3}>
      <CircularProgress />
      <Typography variant="h5" textAlign="center">Preparing your experience...</Typography>
      {!loading && !isAuthenticated && (
        <Button variant="contained" color="primary" onClick={() => navigate('/login')}>
          Go to Login
        </Button>
      )}
    </Box>
  );
};

export default LandingPage;
