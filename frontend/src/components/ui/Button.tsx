import React from 'react';
import {
  Button as MuiButton,
  ButtonProps as MuiButtonProps,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface CustomButtonProps extends MuiButtonProps {
  loading?: boolean;
  icon?: React.ReactNode;
}

const StyledButton = styled(MuiButton)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  textTransform: 'none',
  fontWeight: 500,
  padding: theme.spacing(1, 2),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: theme.shadows[4],
  },
  '&.Mui-disabled': {
    transform: 'none',
    boxShadow: 'none',
  },
}));

export const Button: React.FC<CustomButtonProps> = ({
  loading = false,
  icon,
  children,
  disabled,
  ...props
}) => {
  return (
    <StyledButton
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} /> : icon}
      {...props}
    >
      {children}
    </StyledButton>
  );
};

export default Button;
