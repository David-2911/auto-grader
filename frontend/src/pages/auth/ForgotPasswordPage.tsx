import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { Typography, Container, Paper, Box, TextField, Button, Alert, CircularProgress } from '@mui/material';
import { parseJsonSafe } from '@/utils/api';

interface ForgotForm { email: string }

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Email is required')
});

const ForgotPasswordPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotForm>({
    resolver: yupResolver(schema),
    mode: 'onBlur'
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (values: ForgotForm) => {
    setError(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email })
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.message || 'Request failed');
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message || 'Error requesting reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>Forgot Password</Typography>
          {submitted ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              If your email exists in our system, you will receive a reset link shortly.
            </Alert>
          ) : (
            <Typography variant="body2" align="center" sx={{ mb: 2 }}>
              Enter your email address and we'll send you a password reset link if it exists.
            </Typography>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {!submitted && (
            <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
              <TextField
                fullWidth
                label="Email"
                type="email"
                margin="normal"
                {...register('email')}
                error={!!errors.email}
                helperText={errors.email?.message}
                autoComplete="email"
              />
              <Button type="submit" fullWidth variant="contained" disabled={loading} sx={{ mt: 2 }}>
                {loading ? <CircularProgress size={22} /> : 'Send Reset Link'}
              </Button>
            </Box>
          )}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Link to="/login">Back to Login</Link>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
