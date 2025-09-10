# API Integration Implementation Guide

## Overview

This guide provides complete instructions for integrating the new comprehensive API service layer into your existing React application. The API integration provides centralized HTTP request management, authentication handling, offline capabilities, real-time communication, and enhanced error handling.

## Quick Start

### 1. Import the API Services

```typescript
// Basic import for default functionality
import apiIntegration from '@/services';

// Named imports for specific services
import { studentService, teacherService, adminService } from '@/services';

// Import specific core components
import { TokenManager, CacheManager, NetworkMonitor } from '@/services';
```

### 2. Initialize in Your App

```typescript
// App.tsx or main.tsx
import React, { useEffect } from 'react';
import apiIntegration from '@/services';

function App() {
  useEffect(() => {
    // API integration auto-initializes, but you can manually initialize if needed
    apiIntegration.initialize();
    
    // Optional: Set up global error handler
    apiIntegration.onError((error) => {
      console.error('Global API Error:', error);
      // Handle global errors (show notifications, redirect to login, etc.)
    });
  }, []);

  return (
    <div className="App">
      {/* Your app content */}
    </div>
  );
}
```

## Component Integration Examples

### Student Dashboard Integration

```typescript
// components/StudentDashboard.tsx
import React, { useState, useEffect } from 'react';
import { studentService } from '@/services';
import type { StudentDashboard, Assignment } from '@/types';

const StudentDashboard: React.FC = () => {
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load dashboard data with automatic caching and offline support
      const [dashboardData, assignmentData] = await Promise.all([
        studentService.getDashboard(),
        studentService.getAssignments()
      ]);

      setDashboard(dashboardData);
      setAssignments(assignmentData);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmission = async (assignmentId: string, files: File[]) => {
    try {
      // Submit with progress tracking
      const result = await studentService.submitAssignment(
        assignmentId,
        files,
        {
          onProgress: (progress) => {
            console.log(`Upload progress: ${progress}%`);
            // Update UI with progress
          }
        }
      );

      console.log('Submission successful:', result);
      // Refresh assignments to show updated status
      loadDashboard();
    } catch (err) {
      setError('Failed to submit assignment');
      console.error('Submission error:', err);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="student-dashboard">
      <h1>Student Dashboard</h1>
      
      {dashboard && (
        <div className="dashboard-summary">
          <p>Total Assignments: {dashboard.totalAssignments}</p>
          <p>Pending: {dashboard.pendingAssignments}</p>
          <p>Completed: {dashboard.completedAssignments}</p>
          <p>Overall Grade: {dashboard.overallGrade}</p>
        </div>
      )}

      <div className="assignments">
        <h2>Assignments</h2>
        {assignments.map(assignment => (
          <div key={assignment.id} className="assignment-card">
            <h3>{assignment.title}</h3>
            <p>Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
            <p>Status: {assignment.status}</p>
            
            <input
              type="file"
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  handleSubmission(assignment.id, Array.from(e.target.files));
                }
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
```

### Teacher Course Management

```typescript
// components/TeacherCourseManager.tsx
import React, { useState, useEffect } from 'react';
import { teacherService } from '@/services';
import type { Course, Assignment, Student } from '@/types';

const TeacherCourseManager: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    if (selectedCourse) {
      loadCourseData(selectedCourse.id);
    }
  }, [selectedCourse]);

  const loadCourses = async () => {
    try {
      const coursesData = await teacherService.getCourses();
      setCourses(coursesData);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  };

  const loadCourseData = async (courseId: string) => {
    try {
      setLoading(true);
      
      const [assignmentsData, studentsData] = await Promise.all([
        teacherService.getCourseAssignments(courseId),
        teacherService.getCourseStudents(courseId)
      ]);

      setAssignments(assignmentsData);
      setStudents(studentsData);
    } catch (err) {
      console.error('Failed to load course data:', err);
    } finally {
      setLoading(false);
    }
  };

  const createAssignment = async (assignmentData: Partial<Assignment>) => {
    if (!selectedCourse) return;

    try {
      const newAssignment = await teacherService.createAssignment({
        ...assignmentData,
        courseId: selectedCourse.id
      } as Assignment);

      setAssignments(prev => [...prev, newAssignment]);
    } catch (err) {
      console.error('Failed to create assignment:', err);
    }
  };

  const gradeSubmission = async (submissionId: string, grade: number, feedback: string) => {
    try {
      await teacherService.gradeSubmission(submissionId, {
        grade,
        feedback,
        gradedAt: new Date().toISOString()
      });

      // Refresh data to show updated grades
      if (selectedCourse) {
        loadCourseData(selectedCourse.id);
      }
    } catch (err) {
      console.error('Failed to grade submission:', err);
    }
  };

  return (
    <div className="teacher-course-manager">
      <h1>Course Management</h1>
      
      <div className="course-selector">
        <select
          value={selectedCourse?.id || ''}
          onChange={(e) => {
            const course = courses.find(c => c.id === e.target.value);
            setSelectedCourse(course || null);
          }}
        >
          <option value="">Select a course</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </select>
      </div>

      {selectedCourse && (
        <div className="course-details">
          <h2>{selectedCourse.name}</h2>
          
          {loading ? (
            <div>Loading course data...</div>
          ) : (
            <>
              <div className="assignments-section">
                <h3>Assignments ({assignments.length})</h3>
                {assignments.map(assignment => (
                  <div key={assignment.id} className="assignment-item">
                    <h4>{assignment.title}</h4>
                    <p>Due: {new Date(assignment.dueDate).toLocaleDateString()}</p>
                    <p>Submissions: {assignment.submissionCount || 0}</p>
                  </div>
                ))}
              </div>

              <div className="students-section">
                <h3>Students ({students.length})</h3>
                {students.map(student => (
                  <div key={student.id} className="student-item">
                    <span>{student.name}</span>
                    <span>{student.email}</span>
                    <span>Grade: {student.currentGrade || 'N/A'}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
```

### Real-time Notifications

```typescript
// components/NotificationCenter.tsx
import React, { useState, useEffect } from 'react';
import apiIntegration from '@/services';

const NotificationCenter: React.FC = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Set up WebSocket connection for real-time notifications
    const webSocketManager = apiIntegration.getWebSocketManager();
    
    // Subscribe to notifications
    webSocketManager.subscribe('notifications', (data) => {
      setNotifications(prev => [data, ...prev.slice(0, 9)]); // Keep last 10
    });

    // Subscribe to grade updates
    webSocketManager.subscribe('grade-updates', (data) => {
      setNotifications(prev => [{
        type: 'grade',
        message: `Grade updated for ${data.assignmentTitle}: ${data.grade}`,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    });

    // Subscribe to assignment submissions
    webSocketManager.subscribe('submissions', (data) => {
      setNotifications(prev => [{
        type: 'submission',
        message: `New submission for ${data.assignmentTitle}`,
        timestamp: new Date().toISOString()
      }, ...prev.slice(0, 9)]);
    });

    // Monitor connection status
    webSocketManager.onConnectionChange((isConnected) => {
      setConnected(isConnected);
    });

    // Cleanup on unmount
    return () => {
      webSocketManager.unsubscribe('notifications');
      webSocketManager.unsubscribe('grade-updates');
      webSocketManager.unsubscribe('submissions');
    };
  }, []);

  return (
    <div className="notification-center">
      <div className="connection-status">
        <span className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}>
          {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </span>
      </div>

      <div className="notifications">
        <h3>Recent Notifications</h3>
        {notifications.length === 0 ? (
          <p>No recent notifications</p>
        ) : (
          notifications.map((notification, index) => (
            <div key={index} className={`notification ${notification.type}`}>
              <div className="notification-message">{notification.message}</div>
              <div className="notification-time">
                {new Date(notification.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

### Offline Support Example

```typescript
// components/OfflineIndicator.tsx
import React, { useState, useEffect } from 'react';
import apiIntegration from '@/services';

const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [queuedRequests, setQueuedRequests] = useState(0);

  useEffect(() => {
    const networkMonitor = apiIntegration.getNetworkMonitor();
    const requestQueue = apiIntegration.getRequestQueue();

    // Monitor network status
    networkMonitor.onStatusChange((online) => {
      setIsOnline(online);
    });

    // Monitor queue size
    const updateQueueSize = () => {
      setQueuedRequests(requestQueue.getQueueSize());
    };

    // Update queue size periodically
    const interval = setInterval(updateQueueSize, 1000);
    updateQueueSize(); // Initial update

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (isOnline && queuedRequests === 0) {
    return null; // Don't show indicator when everything is normal
  }

  return (
    <div className={`offline-indicator ${isOnline ? 'syncing' : 'offline'}`}>
      {isOnline ? (
        <div className="syncing">
          🔄 Syncing {queuedRequests} queued request{queuedRequests !== 1 ? 's' : ''}...
        </div>
      ) : (
        <div className="offline">
          📡 Offline - {queuedRequests} request{queuedRequests !== 1 ? 's' : ''} queued
        </div>
      )}
    </div>
  );
};
```

## Error Handling Examples

### Global Error Handler

```typescript
// utils/errorHandler.ts
import apiIntegration from '@/services';
import { toast } from 'react-toastify'; // or your preferred notification library

export const setupGlobalErrorHandler = () => {
  apiIntegration.onError((error) => {
    const message = getErrorMessage(error);
    
    switch (error.status) {
      case 401:
        // Unauthorized - redirect to login
        toast.error('Session expired. Please log in again.');
        window.location.href = '/login';
        break;
      
      case 403:
        // Forbidden
        toast.error('You do not have permission to perform this action.');
        break;
      
      case 404:
        // Not found
        toast.warning('The requested resource was not found.');
        break;
      
      case 429:
        // Rate limited
        toast.warning('Too many requests. Please try again later.');
        break;
      
      case 500:
        // Server error
        toast.error('Server error. Please try again later.');
        break;
      
      default:
        // Generic error
        toast.error(message);
    }
  });
};

const getErrorMessage = (error: any): string => {
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.message) return error.message;
  return 'An unexpected error occurred';
};
```

### Component-Level Error Handling

```typescript
// hooks/useApiCall.ts
import { useState, useCallback } from 'react';

export const useApiCall = <T>() => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
      return result;
    } catch (err: any) {
      const errorMessage = err?.response?.data?.message || err?.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset
  };
};

// Usage in component
const MyComponent: React.FC = () => {
  const { data, loading, error, execute } = useApiCall<Assignment[]>();

  const loadAssignments = () => {
    execute(() => studentService.getAssignments());
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {data?.map(assignment => (
        <div key={assignment.id}>{assignment.title}</div>
      ))}
    </div>
  );
};
```

## Configuration

### Environment Variables

Add these to your `.env` files:

```env
# .env.development
VITE_API_BASE_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
VITE_ENABLE_CACHE=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_WEBSOCKETS=true
VITE_API_TIMEOUT=10000
VITE_MAX_RETRIES=3

# .env.production
VITE_API_BASE_URL=https://your-api-domain.com/api
VITE_WS_URL=wss://your-api-domain.com
VITE_ENABLE_CACHE=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_WEBSOCKETS=true
VITE_API_TIMEOUT=15000
VITE_MAX_RETRIES=2
```

## Testing

### Unit Tests Example

```typescript
// __tests__/services/api.integration.test.ts
import { apiIntegration, studentService } from '@/services';
import { jest } from '@jest/globals';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  }))
}));

describe('API Integration', () => {
  beforeEach(() => {
    apiIntegration.initialize();
  });

  test('should initialize successfully', () => {
    expect(apiIntegration.isReady()).toBe(true);
  });

  test('should handle student dashboard request', async () => {
    const mockDashboard = {
      totalAssignments: 5,
      pendingAssignments: 2,
      completedAssignments: 3,
      overallGrade: 85
    };

    // Mock the API response
    jest.spyOn(studentService, 'getDashboard').mockResolvedValue(mockDashboard);

    const result = await studentService.getDashboard();
    expect(result).toEqual(mockDashboard);
  });

  test('should handle offline mode', async () => {
    // Simulate offline
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });

    const requestQueue = apiIntegration.getRequestQueue();
    
    // Make request while offline
    const promise = studentService.getAssignments();
    
    // Should be queued
    expect(requestQueue.getQueueSize()).toBeGreaterThan(0);
    
    // Simulate going back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });

    // Trigger queue processing
    window.dispatchEvent(new Event('online'));
    
    // Wait for processing
    await promise;
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/api.integration.e2e.test.ts
import { studentService, teacherService } from '@/services';

describe('API Integration E2E', () => {
  test('should complete full student workflow', async () => {
    // Login
    const loginResult = await studentService.login('student@test.com', 'password');
    expect(loginResult.token).toBeDefined();

    // Get dashboard
    const dashboard = await studentService.getDashboard();
    expect(dashboard.totalAssignments).toBeGreaterThanOrEqual(0);

    // Get assignments
    const assignments = await studentService.getAssignments();
    expect(Array.isArray(assignments)).toBe(true);

    // If there are assignments, test submission
    if (assignments.length > 0) {
      const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
      const submission = await studentService.submitAssignment(assignments[0].id, [file]);
      expect(submission.id).toBeDefined();
    }
  });

  test('should handle teacher grading workflow', async () => {
    // Login as teacher
    const loginResult = await teacherService.login('teacher@test.com', 'password');
    expect(loginResult.token).toBeDefined();

    // Get courses
    const courses = await teacherService.getCourses();
    expect(Array.isArray(courses)).toBe(true);

    if (courses.length > 0) {
      // Get course assignments
      const assignments = await teacherService.getCourseAssignments(courses[0].id);
      expect(Array.isArray(assignments)).toBe(true);

      // Get submissions for grading
      if (assignments.length > 0) {
        const submissions = await teacherService.getSubmissions(assignments[0].id);
        expect(Array.isArray(submissions)).toBe(true);
      }
    }
  });
});
```

## Performance Optimization

### Caching Strategy

```typescript
// Configure caching for different data types
import { apiIntegration } from '@/services';

const cacheManager = apiIntegration.getCacheManager();

// Set up cache policies
cacheManager.setPolicy('user-data', {
  ttl: 1000 * 60 * 30, // 30 minutes
  storage: 'localStorage'
});

cacheManager.setPolicy('assignments', {
  ttl: 1000 * 60 * 10, // 10 minutes
  storage: 'memory'
});

cacheManager.setPolicy('static-data', {
  ttl: 1000 * 60 * 60 * 24, // 24 hours
  storage: 'indexedDB'
});
```

### Request Optimization

```typescript
// Use request deduplication for identical requests
import { apiUtils } from '@/services';

const debouncedSearch = apiUtils.debounce((query: string) => {
  return studentService.searchAssignments(query);
}, 300);

const throttledSubmit = apiUtils.throttle((data: any) => {
  return studentService.saveProgress(data);
}, 1000);
```

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure your backend allows requests from your frontend domain
2. **Authentication Issues**: Check token storage and refresh logic
3. **WebSocket Connection**: Verify WebSocket endpoint and protocol (ws/wss)
4. **Offline Mode**: Test with Network tab throttling or offline simulation

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('API_DEBUG', 'true');

// This will log all requests, responses, and cache operations
```

### Health Check

```typescript
// Check API health
const healthCheck = async () => {
  try {
    const status = await apiIntegration.healthCheck();
    console.log('API Status:', status);
  } catch (error) {
    console.error('API Health Check Failed:', error);
  }
};
```

This comprehensive integration guide provides everything needed to start using the new API service layer in your React application. The system is designed to be robust, performant, and developer-friendly while handling complex scenarios like offline support, real-time updates, and file uploads.
