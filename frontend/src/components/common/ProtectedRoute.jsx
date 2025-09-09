import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * Protected Route component for route-based authentication and authorization
 * 
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {Array} [props.roles] - Optional array of roles allowed to access the route
 * @param {React.ReactNode} props.children - Child components to render if authenticated
 * @returns {React.ReactElement} Protected route with children or redirect to login
 */
const ProtectedRoute = ({ user, roles, children }) => {
  // If user is not logged in, redirect to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // If roles are specified, check if user has the required role
  if (roles && !roles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    switch (user.role) {
      case 'student':
        return <Navigate to="/dashboard" replace />;
      case 'teacher':
        return <Navigate to="/dashboard" replace />;
      case 'admin':
        return <Navigate to="/dashboard" replace />;
      default:
        return <Navigate to="/" replace />;
    }
  }
  
  // User is authenticated and authorized, render children
  return children;
};

export default ProtectedRoute;
