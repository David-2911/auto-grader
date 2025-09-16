import React from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import LandingPage from '@/pages/LandingPage';

// Test page
import TestPage from '@/pages/TestPage';

// Layout components
import Layout from '@/components/layout/Layout';
import ProtectedRoute from './ProtectedRoute';

// Authentication pages
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

// Dashboard pages
import StudentDashboard from '@/pages/dashboard/StudentDashboard';
import TeacherDashboard from '@/pages/dashboard/TeacherDashboard';
import AdminDashboard from '@/pages/dashboard/AdminDashboard';

// Course pages
import CoursesPage from '@/pages/courses/CoursesPage';
import CourseDetailPage from '@/pages/courses/CourseDetailPage';
import CreateCoursePage from '@/pages/courses/CreateCoursePage';

// Assignment pages
import AssignmentsPage from '@/pages/assignments/AssignmentsPage';
import AssignmentDetailPage from '@/pages/assignments/AssignmentDetailPage';
import CreateAssignmentPage from '@/pages/assignments/CreateAssignmentPage';
import SubmissionPage from '@/pages/assignments/SubmissionPage';

// User management pages
import StudentsPage from '@/pages/users/StudentsPage';
import ProfilePage from '@/pages/profile/ProfilePage';

// Analytics pages
import AnalyticsPage from '@/pages/analytics/AnalyticsPage';

// Settings pages
import SettingsPage from '@/pages/settings/SettingsPage';

// Error pages
import NotFoundPage from '@/pages/error/NotFoundPage';
import UnauthorizedPage from '@/pages/error/UnauthorizedPage';

const router = createBrowserRouter([
  // Authentication routes (public)
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
  {
    path: '/reset-password',
    element: <ResetPasswordPage />, 
  },
  
  // Test route for debugging
  {
    path: '/test',
    element: <TestPage />,
  },
  
  // Root landing (decides where to go based on auth/role)
  {
    path: '/',
    element: <LandingPage />,
  },
  
  // Protected routes with layout
  {
    path: '/app',
    element: (
      <ProtectedRoute requireAuth>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute requireAuth>
            <StudentDashboard />
          </ProtectedRoute>
        ), // Default dashboard, will be dynamically determined
      },
      {
        path: 'student',
        element: (
          <ProtectedRoute allowedRoles={['student']}>
            <StudentDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'teacher',
        element: (
          <ProtectedRoute requireAuth allowedRoles={['teacher']}>
            <TeacherDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute requireAuth allowedRoles={['admin']}>
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      
      // Course routes
      {
        path: 'courses',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}>
                <CoursesPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                <CreateCoursePage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'admin', 'student']}>
                <CourseDetailPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      
      // Assignment routes
      {
        path: 'assignments',
        children: [
          {
            index: true,
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'student']}>
                <AssignmentsPage />
              </ProtectedRoute>
            ),
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute allowedRoles={['teacher']}>
                <CreateAssignmentPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute allowedRoles={['teacher', 'student']}>
                <AssignmentDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/submit',
            element: (
              <ProtectedRoute allowedRoles={['student']}>
                <SubmissionPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      
      // User management routes
      {
        path: 'students',
        element: (
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <StudentsPage />
          </ProtectedRoute>
        ),
      },
      
      // Analytics routes
      {
        path: 'analytics',
        element: (
          <ProtectedRoute allowedRoles={['teacher', 'admin']}>
            <AnalyticsPage />
          </ProtectedRoute>
        ),
      },
      
      // Profile routes
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      
      // Settings routes
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
  
  // Error routes
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};

export default AppRouter;
