import { QueryClient } from '@tanstack/react-query';

// Create persister for offline caching
const localStoragePersister = createSyncStoragePersister({
  storage: window.localStorage,
  key: 'AUTOGRADER_CACHE',
  serialize: JSON.stringify,
  deserialize: JSON.parse,
});

// Enhanced Query Client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache configuration
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (previously cacheTime)
      
      // Network configuration
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors except 401
        if (error?.response?.status >= 400 && error?.response?.status < 500) {
          return error?.response?.status === 401 && failureCount < 2;
        }
        // Retry up to 3 times for network errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Background updates
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: true,
      
      // Performance optimizations
      structuralSharing: true,
      
      // Error handling
      throwOnError: false,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
      
      // Global mutation error handling
      onError: (error: any) => {
        console.error('Mutation failed:', error);
        // You can add global error handling here
      },
    },
  },
});

// Setup persistence
persistQueryClient({
  queryClient,
  persister: localStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
  buster: 'v1.0', // Change this to invalidate old cache
});

// Query key factories for consistent caching
export const queryKeys = {
  // User queries
  user: {
    all: ['users'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    sessions: () => [...queryKeys.user.all, 'sessions'] as const,
  },
  
  // Assignment queries
  assignments: {
    all: ['assignments'] as const,
    lists: () => [...queryKeys.assignments.all, 'list'] as const,
    list: (filters: Record<string, any>) => 
      [...queryKeys.assignments.lists(), filters] as const,
    details: () => [...queryKeys.assignments.all, 'detail'] as const,
    detail: (id: string | number) => 
      [...queryKeys.assignments.details(), id] as const,
    submissions: (id: string | number) => 
      [...queryKeys.assignments.detail(id), 'submissions'] as const,
  },
  
  // Submission queries
  submissions: {
    all: ['submissions'] as const,
    lists: () => [...queryKeys.submissions.all, 'list'] as const,
    list: (filters: Record<string, any>) => 
      [...queryKeys.submissions.lists(), filters] as const,
    details: () => [...queryKeys.submissions.all, 'detail'] as const,
    detail: (id: string | number) => 
      [...queryKeys.submissions.details(), id] as const,
    grades: (id: string | number) => 
      [...queryKeys.submissions.detail(id), 'grades'] as const,
  },
  
  // Analytics queries
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    performance: () => [...queryKeys.analytics.all, 'performance'] as const,
    reports: () => [...queryKeys.analytics.all, 'reports'] as const,
    report: (type: string, params: Record<string, any>) => 
      [...queryKeys.analytics.reports(), type, params] as const,
  },
  
  // Admin queries
  admin: {
    all: ['admin'] as const,
    users: () => [...queryKeys.admin.all, 'users'] as const,
    metrics: () => [...queryKeys.admin.all, 'metrics'] as const,
    logs: () => [...queryKeys.admin.all, 'logs'] as const,
  },
};

// Cache invalidation utilities
export const cacheUtils = {
  // Invalidate all user-related queries
  invalidateUser: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
  },
  
  // Invalidate specific assignment and related data
  invalidateAssignment: (assignmentId: string | number) => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.assignments.detail(assignmentId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.assignments.lists() 
    });
  },
  
  // Invalidate submissions for an assignment
  invalidateAssignmentSubmissions: (assignmentId: string | number) => {
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.assignments.submissions(assignmentId) 
    });
    queryClient.invalidateQueries({ 
      queryKey: queryKeys.submissions.lists() 
    });
  },
  
  // Optimistically update cache
  updateAssignmentCache: (assignmentId: string | number, updater: (old: any) => any) => {
    queryClient.setQueryData(
      queryKeys.assignments.detail(assignmentId),
      updater
    );
  },
  
  // Prefetch related data
  prefetchAssignmentDetail: (assignmentId: string | number) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.assignments.detail(assignmentId),
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  },
  
  // Clear all caches
  clearAll: () => {
    queryClient.clear();
    localStorage.removeItem('AUTOGRADER_CACHE');
  },
};

// Performance monitoring for queries
export const queryPerformance = {
  // Track slow queries
  onQueryExecute: (query: any) => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      query.promise?.finally(() => {
        const duration = performance.now() - startTime;
        if (duration > 1000) {
          console.warn(`Slow query detected: ${query.queryKey.join('.')} took ${duration.toFixed(2)}ms`);
        }
      });
    }
  },
  
  // Get cache statistics
  getCacheStats: () => {
    const queryCache = queryClient.getQueryCache();
    const mutationCache = queryClient.getMutationCache();
    
    return {
      queries: {
        total: queryCache.getAll().length,
        stale: queryCache.getAll().filter(query => query.isStale()).length,
        fetching: queryCache.getAll().filter(query => query.isFetching()).length,
      },
      mutations: {
        total: mutationCache.getAll().length,
        pending: mutationCache.getAll().filter(mutation => mutation.isPending()).length,
      },
    };
  },
};

export { queryClient };

export default queryClient;
