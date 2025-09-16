import React, { useEffect } from 'react';
import { Box, Typography, TextField, Button, Alert, Paper, InputAdornment, IconButton, Stack, Link as MLink } from '@mui/material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useLoginMutation } from '@/store/api/apiSlice';
import { useDispatch, useSelector } from 'react-redux';
import { loginStart, loginSuccess, loginFailure } from '@/store/slices/authSlice';
import { useNavigate, Link } from 'react-router-dom';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface RootStateAuth {
  auth?: {
    isAuthenticated?: boolean;
    user?: { role?: string } | null;
    loading?: boolean;
    error?: string | null;
  };
}

interface LoginFormValues {
  email: string;
  password: string;
}

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string().min(6, 'Min 6 characters').required('Password is required'),
}).required();

const roleRedirect: Record<string, string> = {
  student: '/app/student',
  teacher: '/app/teacher',
  admin: '/app/admin',
};

export const LoginPage: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const auth = useSelector((s: RootStateAuth) => s.auth || {});
  const { isAuthenticated, user, error } = auth;
  const [login, { isLoading }] = useLoginMutation();
  const [showPassword, setShowPassword] = React.useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: yupResolver(schema),
    mode: 'onBlur'
  });

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const dest = roleRedirect[user.role] || '/app/dashboard';
      navigate(dest, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (values: LoginFormValues) => {
    dispatch(loginStart());
    try {
      const response: any = await login(values).unwrap();
      // Backend returns tokens + user inside success response: { success, message, data: { accessToken, refreshToken, user, ... } }
      const payload = response.data?.user ? response.data : response;
      dispatch(loginSuccess({ 
        user: payload.user, 
        token: payload.accessToken || payload.token, 
        refreshToken: payload.refreshToken || null 
      }));
    } catch (e: any) {
      dispatch(loginFailure(e?.data?.message || 'Login failed'));
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" p={2}>
      <Paper elevation={4} sx={{ p: 4, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box textAlign="center">
          <Typography variant="h5" fontWeight={600}>Welcome Back</Typography>
          <Typography variant="body2" color="text.secondary">Sign in to continue</Typography>
        </Box>
        {error && <Alert severity="error">{error}</Alert>}
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <TextField
            label="Email"
            type="email"
            fullWidth
            autoComplete="email"
            {...register('email')}
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <TextField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            fullWidth
            autoComplete="current-password"
            {...register('password')}
            error={!!errors.password}
            helperText={errors.password?.message}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword(s => !s)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" variant="contained" size="large" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </Button>
        </form>
        <Box textAlign="center">
              <Stack spacing={1} textAlign="center">
                <Typography variant="body2">
                  <MLink component={Link} to="/forgot-password" underline="hover">Forgot password?</MLink>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Need an account? <MLink component={Link} to="/register" underline="hover">Register</MLink>
                </Typography>
              </Stack>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
