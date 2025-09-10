import React from 'react';
import {
  Card as MuiCard,
  CardContent,
  CardHeader,
  CardActions,
  Typography,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface CardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  elevation?: number;
  className?: string;
}

const StyledCard = styled(MuiCard)(({ theme }) => ({
  borderRadius: theme.spacing(1.5),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
}));

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  actions,
  elevation = 2,
  className,
}) => {
  return (
    <StyledCard elevation={elevation} className={className}>
      {(title || subtitle) && (
        <>
          <CardHeader
            title={title && <Typography variant="h6">{title}</Typography>}
            subheader={subtitle && <Typography variant="body2" color="text.secondary">{subtitle}</Typography>}
          />
          <Divider />
        </>
      )}
      <CardContent>{children}</CardContent>
      {actions && (
        <>
          <Divider />
          <CardActions>{actions}</CardActions>
        </>
      )}
    </StyledCard>
  );
};

export default Card;
