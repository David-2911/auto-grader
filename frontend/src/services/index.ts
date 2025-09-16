/**
 * API Services Index
 * 
 * This file provides a clean interface for importing API services and utilities
 * throughout the application
 */

// Main API integration export
export {
  apiIntegration as default,
  apiIntegration,
  APIIntegration,
  apiCore,
  getServiceForRole,
  isAPIReady,
  waitForAPI,
} from './api.integration';

// Enhanced service exports
export {
  enhancedStudentService as studentService,
  enhancedTeacherService as teacherService,
  enhancedAdminService as adminService,
  studentAPI,
  teacherAPI,
  adminAPI,
} from './api.integration';

// Core components
export {
  TokenManager,
  RequestQueue,
  CacheManager,
  NetworkMonitor,
  WebSocketManager,
} from './api.integration';

// Configuration
export { default as apiConfiguration } from './config/api.config';

// Types
export * from '@/types/api.types';

// Legacy compatibility - these will be deprecated
export { default as legacyApiService } from './api.service';

// Utility functions for common operations
export const apiUtils = {
  formatFileSize: (bytes: number): string => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },

  getFileExtension: (filename: string): string => {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  isImageFile: (filename: string): boolean => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
    const ext = apiUtils.getFileExtension(filename).toLowerCase();
    return imageExtensions.includes(ext);
  },

  isPdfFile: (filename: string): boolean => {
    return apiUtils.getFileExtension(filename).toLowerCase() === 'pdf';
  },

  validateEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  debounce: <T extends (...args: any[]) => void>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  throttle: <T extends (...args: any[]) => void>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  retry: async <T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    try {
      return await fn();
    } catch (error) {
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return apiUtils.retry(fn, retries - 1, delay * 2);
      }
      throw error;
    }
  },

  getErrorMessage: (error: any): string => {
    if (typeof error === 'string') return error;
    if (error?.response?.data?.message) return error.response.data.message;
    if (error?.message) return error.message;
    return 'An unexpected error occurred';
  },

  createAbortController: (): AbortController => {
    return new AbortController();
  },

  timeout: (ms: number): Promise<never> => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
  },

  withTimeout: async <T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> => {
    return Promise.race([
      promise,
      apiUtils.timeout(timeoutMs)
    ]);
  },
};
