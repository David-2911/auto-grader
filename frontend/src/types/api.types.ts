import { InternalAxiosRequestConfig } from 'axios';

export interface RequestMetadata {
  endpoint: string;
  method: string;
  timestamp: number;
  retryCount: number;
  cacheKey?: string;
  priority: 'low' | 'normal' | 'high';
  skipAuth?: boolean;
  skipLoading?: boolean;
  skipErrorHandling?: boolean;
  timeout?: number;
}

export interface ExtendedAxiosConfig extends InternalAxiosRequestConfig {
  metadata?: RequestMetadata;
  requestId?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
  errors?: Record<string, string[]>;
  code?: string;
  statusCode?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FileUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  filename: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
}

export interface NetworkStatus {
  online: boolean;
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

export interface RequestQueueItem {
  id: string;
  config: ExtendedAxiosConfig;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  retryCount: number;
  maxRetries: number;
  expiresAt?: number;
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCache: boolean;
  enableOfflineQueue: boolean;
  enableWebSocket: boolean;
  enableProgressTracking: boolean;
}

export interface TokenData {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  tokenType: string;
}

export interface AuthState {
  token: string | TokenData | null;
  user: any | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: RequestMetadata;
    requestId?: string;
  }
}
