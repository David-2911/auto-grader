# Comprehensive API Integration Documentation

## Overview

This comprehensive API integration system provides seamless communication between all frontend interfaces and backend services in the Auto-Grade application. It establishes reliable data flow, proper error handling, and optimal user experiences across all user types and system functions.

## Architecture

### Core Components

1. **ApiCore** - Central HTTP request handler with retry logic and error management
2. **TokenManager** - Automatic authentication token management and renewal
3. **RequestQueue** - Offline functionality with request queuing and sync
4. **CacheManager** - Smart caching for improved performance
5. **NetworkMonitor** - Network quality assessment and connectivity monitoring
6. **WebSocketManager** - Real-time communication for live updates

### Enhanced Services

1. **EnhancedStudentService** - Student-specific API operations
2. **EnhancedTeacherService** - Teacher-specific API operations  
3. **EnhancedAdminService** - Admin-specific API operations

## Features

### 🔐 Authentication Integration
- Automatic token management and renewal
- Secure header injection for all API calls
- Session timeout handling
- Multi-factor authentication support

### 🔄 Request Management
- Automatic retry logic with exponential backoff
- Request prioritization (high, normal, low)
- Concurrent request management
- Request cancellation support

### 📡 Real-time Communication
- WebSocket integration for live updates
- System notifications and alerts
- Submission processing updates
- Grading completion notifications

### 💾 Offline Capability
- Request queuing when connectivity is poor
- Automatic sync when connection is restored
- Offline state management
- Progressive enhancement

### ⚡ Performance Optimization
- Smart caching with TTL support
- Request deduplication
- Response compression
- Connection pooling

### 🔍 Error Handling
- User-friendly error messages
- Technical error logging for debugging
- Contextual error recovery
- Graceful degradation

### 📊 Progress Tracking
- File upload progress indicators
- Long-running operation status
- Real-time processing updates
- Background task monitoring

## Quick Start

### Basic Usage

```typescript
import { apiIntegration, studentAPI, teacherAPI, adminAPI } from '@/services/api.integration';

// Initialize the API system
await apiIntegration.initialize();

// Use role-specific services
const assignments = await studentAPI.getAssignments();
const submissions = await teacherAPI.getSubmissions(assignmentId);
const users = await adminAPI.getUsers();
```

### Authentication

```typescript
import { authService } from '@/services/api.integration';

// Login
const result = await authService.login({
  email: 'student@example.com',
  password: 'password123'
});

// Auto-refresh tokens are handled automatically
```

### File Uploads with Progress

```typescript
const submission = await studentAPI.submitAssignment(
  {
    assignmentId: 123,
    file: selectedFile,
    submissionText: 'My submission text'
  },
  (progress) => {
    console.log(`Upload progress: ${progress.percentage}%`);
    setUploadProgress(progress.percentage);
  }
);
```

### Real-time Updates

```typescript
// Subscribe to real-time events
const unsubscribe = apiIntegration.websocket.onSubmissionUpdate((submission) => {
  console.log('Submission updated:', submission);
  updateSubmissionInUI(submission);
});

// Cleanup when component unmounts
useEffect(() => {
  return unsubscribe;
}, []);
```

### Offline Handling

```typescript
// Check network status
if (apiIntegration.network.isOnline()) {
  // Perform online operations
} else {
  // Show offline UI
  console.log('Working offline - requests will be queued');
}

// Listen for connectivity changes
apiIntegration.network.onOnline(() => {
  console.log('Back online - syncing queued requests');
});
```

## API Reference

### Core API Methods

#### `apiCore.get(url, config)`
```typescript
const response = await apiCore.get('/api/students', {
  metadata: {
    priority: 'high',
    cacheKey: 'students_list',
    skipLoading: false
  }
});
```

#### `apiCore.post(url, data, config)`
```typescript
const response = await apiCore.post('/api/assignments', assignmentData, {
  metadata: {
    priority: 'high',
    retryCount: 0
  }
});
```

### Student API Methods

#### Dashboard
- `getDashboardData(useCache?)` - Get student dashboard data
- `getAnalytics(dateRange?)` - Get student analytics

#### Assignments
- `getAssignments(courseId?, filters?)` - Get assignments list
- `getAssignment(id)` - Get specific assignment
- `getUpcomingDeadlines(limit?)` - Get upcoming deadlines

#### Submissions
- `submitAssignment(data, onProgress?)` - Submit assignment with progress
- `getSubmissions(assignmentId?, pagination?)` - Get submissions
- `resubmitAssignment(id, data, onProgress?)` - Resubmit assignment

#### Grades
- `getGrades(filters?)` - Get grades list
- `getGradeDetails(submissionId)` - Get detailed grading
- `requestGradeReview(submissionId, reason)` - Request grade review

### Teacher API Methods

#### Dashboard
- `getDashboardData(useCache?)` - Get teacher dashboard
- `getClassAnalytics(courseId, dateRange?)` - Get class analytics

#### Course Management
- `getCourses(filters?)` - Get courses list
- `createCourse(data)` - Create new course
- `updateCourse(id, data)` - Update course
- `getCourseStudents(courseId)` - Get enrolled students

#### Assignment Management
- `getAssignments(courseId?, filters?)` - Get assignments
- `createAssignment(data, onProgress?)` - Create assignment
- `updateAssignment(id, data, onProgress?)` - Update assignment
- `publishAssignment(id)` - Publish assignment

#### Grading
- `getSubmissions(assignmentId, filters?)` - Get submissions
- `gradeSubmission(id, gradingData)` - Grade submission
- `bulkGradeSubmissions(data)` - Bulk grading operations
- `requestAutoGrading(assignmentId, options?)` - Request AI grading

### Admin API Methods

#### Dashboard
- `getDashboardData(useCache?)` - Get admin dashboard
- `getSystemHealth()` - Get system health status
- `getSystemLogs(filters?)` - Get system logs

#### User Management
- `getUsers(filters?)` - Get users list
- `createUser(data)` - Create new user
- `updateUser(id, data)` - Update user
- `suspendUser(id, reason, duration?)` - Suspend user
- `bulkUserOperation(operation)` - Bulk user operations

#### System Management
- `getSystemSettings()` - Get system settings
- `updateSystemSettings(settings)` - Update settings
- `createSystemBackup()` - Create system backup
- `enableMaintenanceMode(message?, duration?)` - Enable maintenance

## Configuration

### Environment Setup

```typescript
// .env files
VITE_API_URL=http://localhost:5000/api
VITE_WS_URL=ws://localhost:5000/ws
VITE_ENABLE_CACHE=true
VITE_ENABLE_OFFLINE=true
VITE_ENABLE_WEBSOCKET=true
```

### API Configuration

```typescript
import { apiIntegration } from '@/services/api.integration';

apiIntegration.configure({
  retryAttempts: 3,
  retryDelay: 1000,
  timeout: 30000,
  enableCache: true,
  enableOfflineQueue: true,
  enableWebSocket: true
});
```

### Cache Configuration

```typescript
import { CacheManager } from '@/services/core/cache.manager';

const cache = new CacheManager({
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storageType: 'memory'
});
```

## Error Handling

### Error Types

1. **Network Errors** - Connection failures, timeouts
2. **Authentication Errors** - Token expiry, invalid credentials
3. **Validation Errors** - Invalid input data
4. **Server Errors** - 5xx HTTP status codes
5. **Rate Limit Errors** - Too many requests

### Error Recovery

```typescript
try {
  const data = await studentAPI.getAssignments();
} catch (error) {
  if (error.status === 401) {
    // Token expired - automatic refresh will be attempted
    console.log('Authentication error - token refreshing');
  } else if (error.status === 429) {
    // Rate limited - automatic retry with delay
    console.log('Rate limited - request will be retried');
  } else {
    // Other errors - show user-friendly message
    showErrorNotification(error.message);
  }
}
```

## Real-time Events

### System Events

- `system:maintenance` - Maintenance mode notifications
- `system:update` - System update notifications
- `system:emergency` - Emergency alerts
- `auth:force_logout` - Forced logout events

### User Events

- `notification:new` - New notifications
- `submission:status` - Submission processing updates
- `grading:complete` - Grading completion
- `assignment:update` - Assignment changes
- `user:update` - User profile changes

### Subscription Example

```typescript
// Subscribe to specific events
const unsubscribe = apiIntegration.websocket.subscribe('grading:complete', (data) => {
  console.log('Grading completed:', data);
  refreshGradesList();
});

// Unsubscribe when done
unsubscribe();
```

## Performance Monitoring

### Metrics Collection

```typescript
// Get API performance statistics
const stats = await apiIntegration.getStatistics();

console.log('Performance metrics:', {
  averageResponseTime: stats.performance.averageResponseTime,
  errorRate: stats.performance.errorRate,
  cacheHitRate: stats.cache.hitRate,
  queuedRequests: stats.requests.queued
});
```

### Health Monitoring

```typescript
// Perform health check
const health = await apiIntegration.healthCheck();

if (health.status !== 'healthy') {
  console.warn('API system is not fully operational:', health.services);
}
```

## Security

### Authentication Security
- JWT tokens with automatic refresh
- Secure token storage
- Session timeout management
- Multi-factor authentication support

### Request Security
- CSRF protection
- XSS prevention
- Content type validation
- Request size limits

### Data Security
- Automatic data sanitization
- Secure file upload handling
- PII data protection
- Audit logging

## Testing

### Unit Testing

```typescript
import { apiCore } from '@/services/core/api.core';
import { mockApiResponse } from '@/test/utils';

describe('API Core', () => {
  it('should retry failed requests', async () => {
    mockApiResponse('/api/test', { status: 500 });
    
    const promise = apiCore.get('/api/test');
    await expect(promise).resolves.toBeDefined();
  });
});
```

### Integration Testing

```typescript
import { apiIntegration } from '@/services/api.integration';

describe('API Integration', () => {
  beforeAll(async () => {
    await apiIntegration.initialize();
  });

  it('should handle offline mode', async () => {
    apiIntegration.network.simulateOffline();
    
    const promise = studentAPI.getAssignments();
    expect(apiIntegration.core.getRequestQueue().length).toBeGreaterThan(0);
  });
});
```

## Troubleshooting

### Common Issues

1. **Connection Timeouts**
   - Check network connectivity
   - Verify API endpoint URLs
   - Increase timeout values

2. **Authentication Failures**
   - Clear stored tokens
   - Check token expiry
   - Verify refresh token validity

3. **Cache Issues**
   - Clear application cache
   - Check cache TTL settings
   - Verify cache storage limits

4. **WebSocket Connection Problems**
   - Check WebSocket URL
   - Verify network firewall settings
   - Enable fallback to polling

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem('api_debug', 'true');

// Check system status
const status = await apiIntegration.getSystemStatus();
console.log('System status:', status);
```

## Migration Guide

### From Legacy API Service

```typescript
// Old way
import api from '@/services/api.service';
const assignments = await api.get('/student/assignments');

// New way
import { studentAPI } from '@/services/api.integration';
const assignments = await studentAPI.getAssignments();
```

### Breaking Changes

1. **Service Import Changes** - Use role-specific services
2. **Error Handling** - New error object structure
3. **Configuration** - New configuration format
4. **Cache Keys** - Automatic cache key generation

## Best Practices

### Performance
- Use caching for frequently accessed data
- Implement request deduplication
- Monitor API response times
- Use pagination for large datasets

### Error Handling
- Always handle network errors gracefully
- Provide meaningful error messages to users
- Log technical errors for debugging
- Implement retry logic for transient failures

### Security
- Never store sensitive data in local storage
- Validate all user inputs
- Use HTTPS in production
- Implement proper authentication flows

### Maintainability
- Use TypeScript for type safety
- Document API changes thoroughly
- Write comprehensive tests
- Monitor API usage patterns

## Support

For issues or questions about the API integration system:

1. Check the troubleshooting section
2. Review error logs in browser console
3. Contact the development team
4. File an issue in the project repository

## Changelog

### v2.0.0
- Complete rewrite with comprehensive features
- Added offline support and request queuing
- Implemented real-time WebSocket communication
- Enhanced error handling and retry logic
- Added file upload progress tracking
- Improved caching system
- Added network quality monitoring

### v1.0.0
- Initial API service implementation
- Basic HTTP request handling
- Simple authentication integration
