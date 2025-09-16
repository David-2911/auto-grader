import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Typography,
  Container,
  Paper,
  Box,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Divider,
  Tooltip
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import SecurityIcon from '@mui/icons-material/Security';
import { RegisterData, UserRole } from '@/types';
import { useRegisterRoleMutation } from '@/store/api/apiSlice';

// Role-specific registration handled by RTK Query mutation

// Mirror backend password rule: at least 6 chars, 1 number, 1 uppercase, 1 lowercase, 1 special !@#$%^&*
const passwordRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[!@#$%^&*]).{6,}$/;
const schema = yup.object({
  role: yup.mixed<UserRole>().oneOf(['student', 'teacher']).required(),
  email: yup.string().email('Invalid email').required('Email is required'),
  password: yup.string()
    .required('Password is required')
    .matches(passwordRegex, 'Must be 6+ chars incl upper, lower, number & special char'),
  confirmPassword: yup.string().oneOf([yup.ref('password')], 'Passwords must match').required('Confirm password is required'),
  identifier: yup.string().required('Identifier is required'),
  firstName: yup.string().required('First name is required'),
  lastName: yup.string().required('Last name is required'),
});

type FormValues = Omit<RegisterData, 'role'> & { role: UserRole };

const defaultValues: FormValues = {
  role: 'student',
  email: '',
  password: '',
  confirmPassword: '',
  identifier: '',
  firstName: '',
  lastName: '',
};

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [registerRole, { isLoading }] = useRegisterRoleMutation();

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: yupResolver(schema),
    defaultValues,
    mode: 'onBlur'
  });

  const role = watch('role');

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      const result = await registerRole({
        role: values.role,
        data: {
          email: values.email,
          password: values.password,
          identifier: values.identifier,
          firstName: values.firstName,
          lastName: values.lastName,
        }
      }).unwrap();
      if (!result.success) {
        throw new Error(result.message || 'Registration failed');
      }
      navigate('/login', { state: { registered: true, message: result.message || 'Registered successfully. Please verify your email.' } });
    } catch (e: any) {
      const msg = e?.data?.error?.message || e?.data?.message || e.message || 'Registration error';
      setApiError(msg);
    }
  };

  const passwordValue = watch('password');
  const strength = passwordValue.length >= 10 ? 'strong' : passwordValue.length >= 6 ? 'medium' : 'weak';
  const strengthColor = strength === 'strong' ? 'success.main' : strength === 'medium' ? 'warning.main' : 'error.main';

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 6, mb: 4 }}>
        <Paper elevation={4} sx={{ p: 4 }}>
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <SecurityIcon color="primary" />
            <Typography component="h1" variant="h5">Create an Account</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" mb={2}>
            {role === 'student' ? 'Register as a student to access courses and submit assignments.' : role === 'teacher' ? 'Register as a teacher to manage courses and assignments.' : 'Admin registration requires elevated privileges.'}
          </Typography>
          <Divider sx={{ mb: 3 }} />
          {apiError && <Alert severity="error" sx={{ mb: 2 }}>{apiError}</Alert>}
          <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
            <TextField
              select fullWidth margin="normal" label="Role" defaultValue={defaultValues.role}
              {...register('role')}
              helperText={errors.role?.message}
              error={!!errors.role}
            >
              <MenuItem value="student">Student</MenuItem>
              <MenuItem value="teacher">Teacher</MenuItem>
            </TextField>
            <TextField
              fullWidth margin="normal" label="Email" type="email"
              {...register('email')}
              error={!!errors.email}
              helperText={errors.email?.message}
              autoComplete="email"
            />
            <TextField
              fullWidth margin="normal" label="First Name"
              {...register('firstName')}
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
              autoComplete="given-name"
            />
            <TextField
              fullWidth margin="normal" label="Last Name"
              {...register('lastName')}
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
              autoComplete="family-name"
            />
            <TextField
              fullWidth margin="normal" label={role === 'student' ? 'Student ID' : 'Staff ID'}
              {...register('identifier')}
              error={!!errors.identifier}
              helperText={errors.identifier?.message}
              autoComplete="off"
            />
            <TextField
              fullWidth margin="normal" label="Password"
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              error={!!errors.password}
              helperText={errors.password?.message}
              autoComplete="new-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(s => !s)} edge="end" aria-label="toggle password visibility">
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
              autoComplete="new-password"
            />
            <Tooltip title={`Password strength: ${strength}`}> 
              <Box sx={{ mt: 1, mb: 2, height: 6, borderRadius: 1, backgroundColor: 'grey.300', position: 'relative' }}>
                <Box sx={{ position: 'absolute', left:0, top:0, bottom:0, width: `${Math.min(100, passwordValue.length * 10)}%`, backgroundColor: strengthColor, transition: 'width 0.3s' }} />
              </Box>
            </Tooltip>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={isLoading}
              sx={{ mt: 1, py: 1.2 }}
            >
              {isLoading ? <CircularProgress size={22} /> : 'Register'}
            </Button>
            <Button
              component={Link}
              to="/login"
              fullWidth
              color="secondary"
              sx={{ mt: 2 }}
            >
              Back to Login
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;