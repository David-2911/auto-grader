/**
 * API Configuration and Setup
 * 
 * This file contains configuration settings and setup utilities for the
 * comprehensive API integration system.
 */

import { ApiConfig } from '@/types/api.types';

// Default API configuration
export const defaultApiConfig: ApiConfig = {
  baseURL: 'http://localhost:5000/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
  enableCache: true,
  enableOfflineQueue: true,
  enableWebSocket: true,
  enableProgressTracking: true,
};

// Environment-specific configurations
export const apiConfigs = {
  development: {
    ...defaultApiConfig,
    baseURL: 'http://localhost:5000/api',
    timeout: 30000,
    retryAttempts: 3,
  },
  staging: {
    ...defaultApiConfig,
    baseURL: 'https://staging-api.autograde.com/api',
    timeout: 20000,
    retryAttempts: 2,
  },
  production: {
    ...defaultApiConfig,
    baseURL: 'https://api.autograde.com/api',
    timeout: 15000,
    retryAttempts: 2,
    enableCache: true,
    enableOfflineQueue: false, // Disable in production for reliability
  },
};

// Get configuration based on environment
export function getApiConfig(): ApiConfig {
  const env = process.env.NODE_ENV || 'development';
  return apiConfigs[env as keyof typeof apiConfigs] || defaultApiConfig;
}

// Cache configuration
export const cacheConfig = {
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  maxSize: 100,
  storageType: 'memory' as const,
  enablePersistent: false,
};

// Network monitoring configuration
export const networkConfig = {
  enableConnectionQuality: true,
  checkInterval: 30000,
  timeoutThreshold: 5000,
  slowConnectionThreshold: 2000,
};

// WebSocket configuration
export const webSocketConfig = {
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  enableHeartbeat: true,
  enableAutoReconnect: true,
};

// Request queue configuration
export const queueConfig = {
  maxSize: 100,
  maxRetries: 3,
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  priorityOrder: ['high', 'normal', 'low'] as const,
};

// Token management configuration
export const tokenConfig = {
  refreshThreshold: 5 * 60 * 1000, // 5 minutes
  storageKey: 'auth_tokens',
  enableSecureStorage: true,
};

// Error handling configuration
export const errorConfig = {
  showNotifications: true,
  logErrors: true,
  retryableErrors: [500, 502, 503, 504, 408, 429],
  skipRetryErrors: [400, 401, 403, 404, 422],
};

// File upload configuration
export const uploadConfig = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
  ],
  chunkSize: 1024 * 1024, // 1MB chunks
  enableResumable: true,
};

// Performance monitoring configuration
export const performanceConfig = {
  enableMetrics: true,
  sampleRate: 0.1, // 10% of requests
  slowRequestThreshold: 2000, // 2 seconds
  errorRateThreshold: 0.05, // 5%
};

// Security configuration
export const securityConfig = {
  enableCSRF: true,
  enableXSS: true,
  enableContentTypeValidation: true,
  maxRequestSize: 100 * 1024 * 1024, // 100MB
  trustedDomains: [
    'localhost',
    '*.autograde.com',
    '*.autograde.dev',
  ],
};

// Logging configuration
export const loggingConfig = {
  level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
  enableConsole: process.env.NODE_ENV !== 'production',
  enableRemote: true,
  remoteEndpoint: '/api/logs',
  bufferSize: 100,
  flushInterval: 30000,
};

// Feature flags
export const featureFlags = {
  enableOfflineMode: true,
  enableRealTimeUpdates: true,
  enableAnalytics: true,
  enableFilePreview: true,
  enableBulkOperations: true,
  enableAdvancedSearch: true,
  enableExport: true,
  enableNotifications: true,
  enableProgressTracking: true,
  enableAutoSave: true,
};

// API endpoint mappings
export const endpoints = {
  auth: {
    login: '/auth/login',
    logout: '/auth/logout',
    refresh: '/auth/refresh-token',
    register: '/auth/register',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email',
    changePassword: '/auth/change-password',
    profile: '/auth/user',
  },
  student: {
    dashboard: '/student/dashboard',
    assignments: '/student/assignments',
    submissions: '/student/submissions',
    grades: '/student/grades',
    courses: '/student/courses',
    profile: '/student/profile',
    notifications: '/student/notifications',
    performance: '/student/performance',
    upload: '/student/upload',
    support: '/student/support',
  },
  teacher: {
    dashboard: '/teacher/dashboard',
    courses: '/teacher/courses',
    assignments: '/teacher/assignments',
    submissions: '/teacher/submissions',
    students: '/teacher/students',
    grading: '/teacher/grading',
    analytics: '/teacher/analytics',
    rubrics: '/teacher/rubrics',
    upload: '/teacher/upload',
  },
  admin: {
    dashboard: '/admin/dashboard',
    users: '/admin/users',
    courses: '/admin/courses',
    system: '/admin/system',
    settings: '/admin/settings',
    reports: '/admin/reports',
    logs: '/admin/logs',
    security: '/admin/security',
    backup: '/admin/backup',
  },
  files: {
    upload: '/files/upload',
    download: '/files/download',
    preview: '/files/preview',
    delete: '/files/delete',
  },
  websocket: {
    endpoint: '/ws',
    auth: '/ws/auth',
  },
};

// Validation schemas and rules
export const validationRules = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  fileName: /^[a-zA-Z0-9._-]+$/,
  fileSize: {
    min: 1, // 1 byte
    max: 50 * 1024 * 1024, // 50MB
  },
};

// Rate limiting configuration
export const rateLimitConfig = {
  requests: {
    auth: {
      window: 15 * 60 * 1000, // 15 minutes
      max: 5, // 5 attempts
    },
    api: {
      window: 60 * 1000, // 1 minute
      max: 100, // 100 requests
    },
    upload: {
      window: 60 * 1000, // 1 minute
      max: 10, // 10 uploads
    },
  },
};

// Internationalization configuration
export const i18nConfig = {
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
  fallbackLanguage: 'en',
  enableRTL: false,
};

// Export all configurations as a single object
export const apiConfiguration = {
  api: getApiConfig(),
  cache: cacheConfig,
  network: networkConfig,
  websocket: webSocketConfig,
  queue: queueConfig,
  token: tokenConfig,
  error: errorConfig,
  upload: uploadConfig,
  performance: performanceConfig,
  security: securityConfig,
  logging: loggingConfig,
  features: featureFlags,
  endpoints,
  validation: validationRules,
  rateLimit: rateLimitConfig,
  i18n: i18nConfig,
};

export default apiConfiguration;
