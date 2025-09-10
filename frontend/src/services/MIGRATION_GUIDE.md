# Migration Guide: Transitioning to New API Integration

## Overview

This guide helps you migrate from the existing API service to the new comprehensive API integration system. The migration can be done gradually, allowing you to test each component before fully switching over.

## Migration Strategy

### Phase 1: Parallel Implementation (Recommended)
- Keep existing API service running
- Implement new API services alongside existing ones
- Test new features with small components
- Gradually replace existing service calls

### Phase 2: Full Migration
- Replace all service calls with new API integration
- Remove legacy API service
- Update all components to use new patterns

## Before You Start

### 1. Backup Current Implementation
```bash
# Create backup of current services
cp -r src/services src/services.backup
```

### 2. Install Dependencies (if needed)
```bash
npm install axios
# or
yarn add axios
```

### 3. Update TypeScript Types
Ensure your `src/types/index.ts` includes all necessary types from the new API integration.

## Step-by-Step Migration

### Step 1: Import New Services

Replace existing imports:
```typescript
// OLD
import apiService from '@/services/api.service';

// NEW
import { studentService, teacherService, adminService } from '@/services';
// or
import apiIntegration from '@/services';
```

### Step 2: Update Authentication Calls

#### Old Authentication Pattern
```typescript
// OLD
const login = async (email: string, password: string) => {
  try {
    const response = await apiService.post('/auth/login', { email, password });
    localStorage.setItem('token', response.data.token);
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

#### New Authentication Pattern
```typescript
// NEW
const login = async (email: string, password: string) => {
  try {
    // Token management is handled automatically
    const result = await studentService.login(email, password);
    return result;
  } catch (error) {
    // Error handling is built-in
    throw error;
  }
};
```

### Step 3: Update Data Fetching

#### Old Data Fetching
```typescript
// OLD
const getDashboard = async () => {
  try {
    const token = localStorage.getItem('token');
    const response = await apiService.get('/student/dashboard', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      // Handle token refresh manually
      await refreshToken();
      return getDashboard(); // Retry
    }
    throw error;
  }
};
```

#### New Data Fetching
```typescript
// NEW
const getDashboard = async () => {
  // Authentication, caching, error handling, and retries are automatic
  return await studentService.getDashboard();
};
```

### Step 4: Update File Uploads

#### Old File Upload
```typescript
// OLD
const submitAssignment = async (assignmentId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('assignmentId', assignmentId);

  try {
    const token = localStorage.getItem('token');
    const response = await apiService.post('/student/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${token}`
      },
      onUploadProgress: (progressEvent) => {
        const progress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`Upload progress: ${progress}%`);
      }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
```

#### New File Upload
```typescript
// NEW
const submitAssignment = async (assignmentId: string, files: File[]) => {
  return await studentService.submitAssignment(assignmentId, files, {
    onProgress: (progress) => {
      console.log(`Upload progress: ${progress}%`);
      // Progress tracking is built-in and more sophisticated
    }
  });
};
```

### Step 5: Replace Manual Error Handling

#### Old Error Handling
```typescript
// OLD - Manual error handling in every component
const fetchData = async () => {
  try {
    const response = await apiService.get('/data');
    setData(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      // Redirect to login
      navigate('/login');
    } else if (error.response?.status === 500) {
      setError('Server error occurred');
    } else {
      setError('An unexpected error occurred');
    }
  }
};
```

#### New Error Handling
```typescript
// NEW - Global error handling with local overrides
const fetchData = async () => {
  try {
    const data = await studentService.getData();
    setData(data);
  } catch (error) {
    // Global error handler manages common cases
    // Local handling only for specific business logic
    setError('Failed to fetch data');
  }
};

// Set up global error handler once in App.tsx
apiIntegration.onError((error) => {
  switch (error.status) {
    case 401:
      navigate('/login');
      break;
    case 500:
      showNotification('Server error', 'error');
      break;
  }
});
```

## Component Migration Examples

### Migrating Student Components

#### Before
```typescript
// OLD StudentDashboard.tsx
import React, { useState, useEffect } from 'react';
import apiService from '@/services/api.service';

const StudentDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await apiService.get('/student/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setDashboard(response.data);
      } catch (err) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Component render logic...
};
```

#### After
```typescript
// NEW StudentDashboard.tsx
import React, { useState, useEffect } from 'react';
import { studentService } from '@/services';

const StudentDashboard = () => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        // Automatic authentication, caching, and error handling
        const dashboardData = await studentService.getDashboard();
        setDashboard(dashboardData);
      } catch (err) {
        setError('Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  // Component render logic remains the same...
};
```

### Migrating Teacher Components

#### Before
```typescript
// OLD TeacherGrading.tsx
const gradeSubmission = async (submissionId: string, grade: number) => {
  try {
    const token = localStorage.getItem('token');
    await apiService.put(`/teacher/grade/${submissionId}`, 
      { grade },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    // Manually refresh data
    await fetchSubmissions();
  } catch (error) {
    setError('Failed to grade submission');
  }
};
```

#### After
```typescript
// NEW TeacherGrading.tsx
const gradeSubmission = async (submissionId: string, grade: number) => {
  try {
    await teacherService.gradeSubmission(submissionId, {
      grade,
      feedback: '',
      gradedAt: new Date().toISOString()
    });
    
    // Data refresh is automatic due to cache invalidation
    // Or manually refresh if needed
    await refreshSubmissions();
  } catch (error) {
    setError('Failed to grade submission');
  }
};
```

## Advanced Features Migration

### Adding Real-time Updates

```typescript
// NEW - Add WebSocket support for real-time updates
import React, { useEffect } from 'react';
import apiIntegration from '@/services';

const TeacherDashboard = () => {
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    const wsManager = apiIntegration.getWebSocketManager();
    
    // Subscribe to new submissions
    wsManager.subscribe('new-submission', (submission) => {
      setSubmissions(prev => [submission, ...prev]);
      // Show notification
      showNotification('New submission received!');
    });

    return () => {
      wsManager.unsubscribe('new-submission');
    };
  }, []);

  // Component logic...
};
```

### Adding Offline Support

```typescript
// NEW - Components automatically get offline support
const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const networkMonitor = apiIntegration.getNetworkMonitor();
    
    networkMonitor.onStatusChange((online) => {
      setIsOffline(!online);
      if (online) {
        // Data will sync automatically when back online
        showNotification('Back online - syncing data...');
      }
    });
  }, []);

  const loadAssignments = async () => {
    try {
      // Works offline with cached data, queues requests when offline
      const data = await studentService.getAssignments();
      setAssignments(data);
    } catch (error) {
      // Error handling includes offline scenarios
      console.error('Failed to load assignments:', error);
    }
  };

  // Component render includes offline indicator...
};
```

## Testing Migration

### 1. Create Test Environment
```typescript
// Create test file for new API integration
import { studentService, teacherService } from '@/services';

describe('API Migration Tests', () => {
  test('student service matches old behavior', async () => {
    const dashboard = await studentService.getDashboard();
    expect(dashboard).toHaveProperty('totalAssignments');
    expect(dashboard).toHaveProperty('pendingAssignments');
  });

  test('teacher service matches old behavior', async () => {
    const courses = await teacherService.getCourses();
    expect(Array.isArray(courses)).toBe(true);
  });
});
```

### 2. A/B Testing
```typescript
// Temporarily run both old and new services for comparison
const ENABLE_NEW_API = process.env.NODE_ENV === 'development';

const getDashboard = async () => {
  if (ENABLE_NEW_API) {
    return await studentService.getDashboard();
  } else {
    // Old implementation
    const response = await apiService.get('/student/dashboard');
    return response.data;
  }
};
```

## Performance Comparison

### Before Migration
- Manual token management
- No request caching
- No retry logic
- No offline support
- Manual error handling in each component

### After Migration
- Automatic token management and refresh
- Intelligent caching with configurable TTL
- Built-in retry logic with exponential backoff
- Offline support with request queuing
- Centralized error handling
- Real-time updates via WebSocket
- File upload progress tracking
- Network quality monitoring

## Migration Checklist

### Pre-Migration
- [ ] Backup current services
- [ ] Update TypeScript types
- [ ] Install dependencies
- [ ] Review current API usage patterns

### During Migration
- [ ] Import new services
- [ ] Update authentication calls
- [ ] Replace data fetching methods
- [ ] Update file upload implementations
- [ ] Set up global error handling
- [ ] Add real-time features (optional)
- [ ] Test offline functionality

### Post-Migration
- [ ] Remove old API service files
- [ ] Update all component imports
- [ ] Test all user workflows
- [ ] Monitor performance improvements
- [ ] Update documentation

### Validation Tests
- [ ] Login/logout flow works
- [ ] Data fetching is cached appropriately
- [ ] File uploads show progress
- [ ] Offline mode queues requests
- [ ] Real-time updates work
- [ ] Error handling is consistent
- [ ] Token refresh is automatic

## Rollback Plan

If issues arise during migration:

1. **Immediate Rollback**
   ```typescript
   // Switch back to old service temporarily
   import apiService from '@/services/api.service.backup';
   ```

2. **Gradual Rollback**
   - Identify problematic components
   - Revert specific components while keeping others on new system
   - Fix issues and re-migrate

3. **Debug Tools**
   ```typescript
   // Enable debug mode
   localStorage.setItem('API_DEBUG', 'true');
   
   // Check service health
   await apiIntegration.healthCheck();
   ```

## Getting Help

If you encounter issues during migration:

1. Check the console for debug logs (enable with `API_DEBUG=true`)
2. Review the Integration Guide for usage examples
3. Test individual services in isolation
4. Compare network requests in browser dev tools
5. Validate that all required environment variables are set

## Common Migration Issues

### Issue: Authentication Not Working
**Solution**: Ensure JWT tokens are being stored correctly and refresh logic is working
```typescript
// Check token status
const tokenManager = apiIntegration.getTokenManager();
console.log('Token valid:', tokenManager.isTokenValid());
```

### Issue: WebSocket Connection Fails
**Solution**: Check WebSocket URL and protocol (ws vs wss)
```typescript
// Debug WebSocket connection
const wsManager = apiIntegration.getWebSocketManager();
wsManager.onConnectionChange((connected) => {
  console.log('WebSocket connected:', connected);
});
```

### Issue: Caching Not Working
**Solution**: Verify cache configuration and storage availability
```typescript
// Check cache status
const cacheManager = apiIntegration.getCacheManager();
console.log('Cache stats:', cacheManager.getStats());
```

This migration guide provides a comprehensive path to upgrade your existing API implementation to the new comprehensive system while minimizing risks and ensuring functionality.
