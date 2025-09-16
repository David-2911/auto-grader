import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Container, Paper, Box, Typography, TextField, Button, Alert, IconButton, InputAdornment, CircularProgress } from '@mui/material';
import { parseJsonSafe } from '@/utils/api';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface ResetForm { token: string; newPassword: string; confirmPassword: string }

const schema = yup.object({
  token: yup.string().required('Reset token required'),
  newPassword: yup.string().min(6, 'Min 6 characters').required('New password required'),
  confirmPassword: yup.string().oneOf([yup.ref('newPassword')], 'Passwords must match').required('Confirm password'),
});

const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [apiError, setApiError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ResetForm>({
    resolver: yupResolver(schema),
    defaultValues: { token: '', newPassword: '', confirmPassword: '' },
    mode: 'onBlur'
  });

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) setValue('token', token);
  }, [searchParams, setValue]);

  const [loading, setLoading] = useState(false);

  const onSubmit = async (values: ResetForm) => {
    setApiError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: values.token, newPassword: values.newPassword, confirmPassword: values.confirmPassword })
      });
      const data = await parseJsonSafe(res);
      if (!res.ok || !data?.success) throw new Error(data?.message || 'Reset failed');
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { reset: true, message: data.message } }), 1800);
    } catch (e: any) {
      setApiError(e.message || 'Error resetting password');
    } finally { setLoading(false); }
  };

  const newPassword = watch('newPassword');
  const strength = newPassword.length >= 10 ? 'strong' : newPassword.length >= 6 ? 'medium' : 'weak';
  const strengthColor = strength === 'strong' ? 'success.main' : strength === 'medium' ? 'warning.main' : 'error.main';

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h5" gutterBottom>Reset Password</Typography>
          {apiError && <Alert severity="error" sx={{ mb:2 }}>{apiError}</Alert>}
          {success && <Alert severity="success" sx={{ mb:2 }}>Password reset successful. Redirecting...</Alert>}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <TextField
              fullWidth margin="normal" label="Reset Token"
              {...register('token')}
              error={!!errors.token}
              helperText={errors.token?.message}
            />
            <TextField
              fullWidth margin="normal" label="New Password"
              type={showPassword ? 'text' : 'password'}
              {...register('newPassword')}
              error={!!errors.newPassword}
              helperText={errors.newPassword?.message}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(s=>!s)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />
            <TextField
              fullWidth margin="normal" label="Confirm Password"
              type={showPassword ? 'text' : 'password'}
              {...register('confirmPassword')}
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
            />
            <Box sx={{ mt:1, mb:2, height:6, borderRadius:1, backgroundColor:'grey.300', position:'relative' }}>
              <Box sx={{ position:'absolute', left:0, top:0, bottom:0, width:`${Math.min(100, newPassword.length*10)}%`, backgroundColor: strengthColor, transition:'width .3s' }} />
            </Box>
            <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 1 }}>
              {loading ? <CircularProgress size={22} /> : 'Reset Password'}
            </Button>
            <Button component={Link} to="/login" fullWidth sx={{ mt:2 }}>Back to Login</Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;