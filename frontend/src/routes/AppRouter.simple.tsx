import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Authentication pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

const router = createBrowserRouter([
  // Test route
  {
    path: '/test',
    element: <div style={{padding: '20px', fontSize: '24px'}}>Test Route Working!</div>,
  },
  
  // Public routes
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
  },
  
  // Temporary simple root route for testing
  {
    path: '/',
    element: <div style={{padding: '20px', fontSize: '24px'}}>Welcome to Auto-Grade System! <a href="/login">Login</a></div>,
  },
  
  // Error routes
  {
    path: '*',
    element: <div style={{padding: '20px', fontSize: '24px'}}>Page Not Found</div>,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;