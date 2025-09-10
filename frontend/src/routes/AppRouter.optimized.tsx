import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import ErrorBoundary from '../components/ErrorBoundary';
import Layout from '../components/Layout/Layout';

// Lazy load components for better performance
const Dashboard = lazy(() => import('../pages/Dashboard/Dashboard'));
const Login = lazy(() => import('../pages/Auth/Login'));
const Register = lazy(() => import('../pages/Auth/Register'));
const Assignments = lazy(() => import('../pages/Assignments/Assignments'));
const AssignmentDetail = lazy(() => import('../pages/Assignments/AssignmentDetail'));
const CreateAssignment = lazy(() => import('../pages/Assignments/CreateAssignment'));
const Submissions = lazy(() => import('../pages/Submissions/Submissions'));
const SubmissionDetail = lazy(() => import('../pages/Submissions/SubmissionDetail'));
const Profile = lazy(() => import('../pages/Profile/Profile'));
const Settings = lazy(() => import('../pages/Settings/Settings'));
const Users = lazy(() => import('../pages/Admin/Users'));
const Analytics = lazy(() => import('../pages/Analytics/Analytics'));
const Reports = lazy(() => import('../pages/Reports/Reports'));

// Preload critical components
const preloadComponents = () => {
  import('../pages/Dashboard/Dashboard');
  import('../pages/Auth/Login');
};

// Start preloading immediately
if (typeof window !== 'undefined') {
  // Preload on idle or after a short delay
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(preloadComponents);
  } else {
    setTimeout(preloadComponents, 100);
  }
}

// Loading fallback component
const LoadingFallback = ({ size = 40 }: { size?: number }) => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="200px"
    data-testid="loading-spinner"
  >
    <CircularProgress size={size} />
  </Box>
);

// Route-based code splitting wrapper
const AsyncRoute = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// Protected route wrapper
const ProtectedRoute = ({ 
  children, 
  requiredRole 
}: { 
  children: React.ReactNode;
  requiredRole?: string;
}) => {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

const AppRouter: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AsyncRoute>
                <Login />
              </AsyncRoute>
            )
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <AsyncRoute>
                <Register />
              </AsyncRoute>
            )
          }
        />

        {/* Protected routes with layout */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          
          <Route
            path="dashboard"
            element={
              <AsyncRoute>
                <Dashboard />
              </AsyncRoute>
            }
          />
          
          <Route
            path="assignments"
            element={
              <AsyncRoute>
                <Assignments />
              </AsyncRoute>
            }
          />
          
          <Route
            path="assignments/:id"
            element={
              <AsyncRoute>
                <AssignmentDetail />
              </AsyncRoute>
            }
          />
          
          <Route
            path="assignments/create"
            element={
              <ProtectedRoute requiredRole="teacher">
                <AsyncRoute>
                  <CreateAssignment />
                </AsyncRoute>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="submissions"
            element={
              <AsyncRoute>
                <Submissions />
              </AsyncRoute>
            }
          />
          
          <Route
            path="submissions/:id"
            element={
              <AsyncRoute>
                <SubmissionDetail />
              </AsyncRoute>
            }
          />
          
          <Route
            path="profile"
            element={
              <AsyncRoute>
                <Profile />
              </AsyncRoute>
            }
          />
          
          <Route
            path="settings"
            element={
              <AsyncRoute>
                <Settings />
              </AsyncRoute>
            }
          />
          
          {/* Admin routes */}
          <Route
            path="admin/users"
            element={
              <ProtectedRoute requiredRole="admin">
                <AsyncRoute>
                  <Users />
                </AsyncRoute>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="analytics"
            element={
              <ProtectedRoute requiredRole="teacher">
                <AsyncRoute>
                  <Analytics />
                </AsyncRoute>
              </ProtectedRoute>
            }
          />
          
          <Route
            path="reports"
            element={
              <ProtectedRoute requiredRole="teacher">
                <AsyncRoute>
                  <Reports />
                </AsyncRoute>
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
