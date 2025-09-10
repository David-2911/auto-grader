import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { store } from '@/store';
import { logout, refreshToken as refreshAuthToken } from '@/store/slices/authSlice';
import { addNotification } from '@/store/slices/notificationSlice';
import { setLoading, setError, clearError } from '@/store/slices/uiSlice';
import { ApiResponse, ApiError } from '@/types/api.types';
import { TokenManager } from './token.manager';
import { RequestQueue } from './request.queue';
import { CacheManager } from './cache.manager';
import { NetworkMonitor } from './network.monitor';
import { WebSocketManager } from './websocket.manager';

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

export class ApiCore {
  private instance: AxiosInstance;
  private tokenManager: TokenManager;
  private requestQueue: RequestQueue;
  private cacheManager: CacheManager;
  private networkMonitor: NetworkMonitor;
  private webSocketManager: WebSocketManager;
  private config: ApiConfig;
  private pendingRequests: Map<string, AbortController> = new Map();
  private retryQueue: Map<string, any> = new Map();

  constructor(config: Partial<ApiConfig> = {}) {
    this.config = {
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCache: true,
      enableOfflineQueue: true,
      enableWebSocket: true,
      enableProgressTracking: true,
      ...config,
    };

    this.instance = this.createAxiosInstance();
    this.tokenManager = new TokenManager();
    this.requestQueue = new RequestQueue();
    this.cacheManager = new CacheManager();
    this.networkMonitor = new NetworkMonitor();
    this.webSocketManager = new WebSocketManager();

    this.setupInterceptors();
    this.initializeNetworkMonitoring();
    this.initializeWebSocket();
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => this.handleRequest(config),
      (error: AxiosError) => this.handleRequestError(error)
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => this.handleResponse(response),
      (error: AxiosError) => this.handleResponseError(error)
    );
  }

  private async handleRequest(config: InternalAxiosRequestConfig): Promise<InternalAxiosRequestConfig> {
    const metadata: RequestMetadata = {
      endpoint: config.url || '',
      method: config.method?.toUpperCase() || 'GET',
      timestamp: Date.now(),
      retryCount: 0,
      priority: 'normal',
      ...config.metadata,
    };

    // Add request metadata
    config.metadata = metadata;

    // Generate request ID
    const requestId = this.generateRequestId(config);
    config.requestId = requestId;

    // Add abort controller for request cancellation
    const abortController = new AbortController();
    config.signal = abortController.signal;
    this.pendingRequests.set(requestId, abortController);

    // Authentication handling
    if (!metadata.skipAuth) {
      await this.handleAuthentication(config);
    }

    // Cache check for GET requests
    if (config.method === 'get' && this.config.enableCache) {
      const cacheKey = this.generateCacheKey(config);
      const cachedResponse = await this.cacheManager.get(cacheKey);
      if (cachedResponse) {
        // Return cached response
        throw new axios.Cancel('Request served from cache');
      }
      metadata.cacheKey = cacheKey;
    }

    // Loading state management
    if (!metadata.skipLoading) {
      store.dispatch(setLoading(true));
    }

    // Clear previous errors
    store.dispatch(clearError());

    // Network connectivity check
    if (!this.networkMonitor.isOnline() && !this.config.enableOfflineQueue) {
      throw new Error('No internet connection available');
    }

    // Queue request if offline
    if (!this.networkMonitor.isOnline() && this.config.enableOfflineQueue) {
      this.requestQueue.enqueue(config);
      throw new axios.Cancel('Request queued for offline processing');
    }

    return config;
  }

  private async handleAuthentication(config: InternalAxiosRequestConfig): Promise<void> {
    const token = await this.tokenManager.getValidToken();
    
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  private handleRequestError(error: AxiosError): Promise<AxiosError> {
    store.dispatch(setLoading(false));
    return Promise.reject(error);
  }

  private async handleResponse(response: AxiosResponse): Promise<AxiosResponse> {
    const requestId = response.config.requestId;
    const metadata = response.config.metadata as RequestMetadata;

    // Remove request from pending requests
    if (requestId) {
      this.pendingRequests.delete(requestId);
    }

    // Cache successful GET responses
    if (response.config.method === 'get' && metadata?.cacheKey && this.config.enableCache) {
      await this.cacheManager.set(metadata.cacheKey, response.data);
    }

    // Clear loading state
    if (!metadata?.skipLoading) {
      store.dispatch(setLoading(false));
    }

    // Process success response
    this.processSuccessResponse(response);

    return response;
  }

  private async handleResponseError(error: AxiosError): Promise<never> {
    const config = error.config as InternalAxiosRequestConfig;
    const metadata = config?.metadata as RequestMetadata;
    const requestId = config?.requestId;

    // Remove request from pending requests
    if (requestId) {
      this.pendingRequests.delete(requestId);
    }

    // Clear loading state
    if (!metadata?.skipLoading) {
      store.dispatch(setLoading(false));
    }

    // Handle different error types
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    // Network error handling
    if (!error.response) {
      return this.handleNetworkError(error, config);
    }

    // HTTP error handling
    return this.handleHttpError(error, config);
  }

  private async handleNetworkError(error: AxiosError, config: InternalAxiosRequestConfig): Promise<never> {
    const metadata = config?.metadata as RequestMetadata;

    // Queue request for retry if offline mode is enabled
    if (this.config.enableOfflineQueue) {
      this.requestQueue.enqueue(config);
      store.dispatch(addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Request will be retried when connection is restored',
      }));
      return Promise.reject(new Error('Request queued for retry'));
    }

    // Show network error notification
    store.dispatch(addNotification({
      type: 'error',
      title: 'Network Error',
      message: 'Please check your internet connection and try again',
    }));

    store.dispatch(setError('Network connection failed'));
    return Promise.reject(error);
  }

  private async handleHttpError(error: AxiosError, config: InternalAxiosRequestConfig): Promise<never> {
    const metadata = config?.metadata as RequestMetadata;
    const status = error.response?.status;

    switch (status) {
      case 401:
        return this.handleUnauthorizedError(error, config);
      case 403:
        return this.handleForbiddenError(error);
      case 404:
        return this.handleNotFoundError(error);
      case 422:
        return this.handleValidationError(error);
      case 429:
        return this.handleRateLimitError(error, config);
      case 500:
      case 502:
      case 503:
      case 504:
        return this.handleServerError(error, config);
      default:
        return this.handleGenericError(error);
    }
  }

  private async handleUnauthorizedError(error: AxiosError, config: InternalAxiosRequestConfig): Promise<never> {
    // Try to refresh token
    try {
      const newToken = await this.tokenManager.refreshToken();
      if (newToken && config) {
        // Retry the original request with new token
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${newToken}`;
        return this.instance.request(config);
      }
    } catch (refreshError) {
      // Refresh failed, logout user
      store.dispatch(logout());
      store.dispatch(addNotification({
        type: 'error',
        title: 'Session Expired',
        message: 'Please login again to continue',
      }));
    }

    return Promise.reject(error);
  }

  private async handleForbiddenError(error: AxiosError): Promise<never> {
    store.dispatch(addNotification({
      type: 'error',
      title: 'Access Denied',
      message: 'You do not have permission to perform this action',
    }));

    return Promise.reject(error);
  }

  private async handleNotFoundError(error: AxiosError): Promise<never> {
    store.dispatch(addNotification({
      type: 'error',
      title: 'Resource Not Found',
      message: 'The requested resource could not be found',
    }));

    return Promise.reject(error);
  }

  private async handleValidationError(error: AxiosError): Promise<never> {
    const errorData = error.response?.data as ApiError;
    
    store.dispatch(addNotification({
      type: 'error',
      title: 'Validation Error',
      message: errorData.message || 'Please check your input and try again',
    }));

    return Promise.reject(error);
  }

  private async handleRateLimitError(error: AxiosError, config: InternalAxiosRequestConfig): Promise<never> {
    const retryAfter = error.response?.headers['retry-after'];
    const delay = retryAfter ? parseInt(retryAfter) * 1000 : this.config.retryDelay;

    store.dispatch(addNotification({
      type: 'warning',
      title: 'Rate Limit Exceeded',
      message: `Please wait ${Math.ceil(delay / 1000)} seconds before trying again`,
    }));

    // Auto-retry after delay
    if (config) {
      setTimeout(() => {
        this.instance.request(config);
      }, delay);
    }

    return Promise.reject(error);
  }

  private async handleServerError(error: AxiosError, config: InternalAxiosRequestConfig): Promise<never> {
    const metadata = config?.metadata as RequestMetadata;

    // Retry logic for server errors
    if (metadata && metadata.retryCount < this.config.retryAttempts) {
      metadata.retryCount++;
      const delay = this.config.retryDelay * Math.pow(2, metadata.retryCount - 1); // Exponential backoff

      store.dispatch(addNotification({
        type: 'warning',
        title: 'Server Error',
        message: `Retrying request... (${metadata.retryCount}/${this.config.retryAttempts})`,
      }));

      await new Promise(resolve => setTimeout(resolve, delay));
      return this.instance.request(config);
    }

    store.dispatch(addNotification({
      type: 'error',
      title: 'Server Error',
      message: 'Something went wrong on our end. Please try again later',
    }));

    return Promise.reject(error);
  }

  private async handleGenericError(error: AxiosError): Promise<never> {
    const errorData = error.response?.data as ApiError;
    
    store.dispatch(addNotification({
      type: 'error',
      title: 'Error',
      message: errorData?.message || 'An unexpected error occurred',
    }));

    return Promise.reject(error);
  }

  private processSuccessResponse(response: AxiosResponse): void {
    const data = response.data as ApiResponse;
    
    // Show success message if provided
    if (data.message && response.config.method !== 'get') {
      store.dispatch(addNotification({
        type: 'success',
        title: 'Success',
        message: data.message,
      }));
    }
  }

  private generateRequestId(config: InternalAxiosRequestConfig): string {
    return `${config.method}_${config.url}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateCacheKey(config: InternalAxiosRequestConfig): string {
    const params = new URLSearchParams(config.params).toString();
    return `${config.method}_${config.url}_${params}`;
  }

  private initializeNetworkMonitoring(): void {
    this.networkMonitor.onOnline(() => {
      store.dispatch(addNotification({
        type: 'success',
        title: 'Connection Restored',
        message: 'Processing queued requests...',
      }));
      this.processQueuedRequests();
    });

    this.networkMonitor.onOffline(() => {
      store.dispatch(addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Working in offline mode',
      }));
    });
  }

  private initializeWebSocket(): void {
    if (this.config.enableWebSocket) {
      this.webSocketManager.connect();
    }
  }

  private async processQueuedRequests(): Promise<void> {
    const queuedRequests = this.requestQueue.getAll();
    
    for (const config of queuedRequests) {
      try {
        await this.instance.request(config);
        this.requestQueue.remove(config);
      } catch (error) {
        console.error('Failed to process queued request:', error);
      }
    }
  }

  // Public API methods
  public async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.get(url, config);
  }

  public async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.post(url, data, config);
  }

  public async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.put(url, data, config);
  }

  public async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.patch(url, data, config);
  }

  public async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.instance.delete(url, config);
  }

  public cancelRequest(requestId: string): void {
    const controller = this.pendingRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestId);
    }
  }

  public cancelAllRequests(): void {
    this.pendingRequests.forEach((controller) => controller.abort());
    this.pendingRequests.clear();
  }

  public getRequestQueue(): any[] {
    return this.requestQueue.getAll();
  }

  public clearCache(): void {
    this.cacheManager.clear();
  }

  public isOnline(): boolean {
    return this.networkMonitor.isOnline();
  }

  public subscribeToWebSocket(event: string, callback: (data: any) => void): void {
    this.webSocketManager.subscribe(event, callback);
  }

  public unsubscribeFromWebSocket(event: string, callback: (data: any) => void): void {
    this.webSocketManager.unsubscribe(event, callback);
  }
}

// Export singleton instance
export const apiCore = new ApiCore();
export default apiCore;
