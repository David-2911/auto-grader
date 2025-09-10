import { InternalAxiosRequestConfig } from 'axios';

export interface QueuedRequest {
  id: string;
  config: InternalAxiosRequestConfig;
  timestamp: number;
  priority: 'low' | 'normal' | 'high';
  retryCount: number;
  maxRetries: number;
  expiresAt?: number;
}

export interface QueueOptions {
  maxSize: number;
  maxRetries: number;
  defaultTTL: number; // Time to live in milliseconds
  priorityOrder: ('high' | 'normal' | 'low')[];
}

export class RequestQueue {
  private queue: Map<string, QueuedRequest> = new Map();
  private options: QueueOptions;
  private storageKey = 'api_request_queue';

  constructor(options: Partial<QueueOptions> = {}) {
    this.options = {
      maxSize: 100,
      maxRetries: 3,
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      priorityOrder: ['high', 'normal', 'low'],
      ...options,
    };

    this.loadFromStorage();
    this.startCleanupTimer();
  }

  public enqueue(config: InternalAxiosRequestConfig): string {
    const requestId = this.generateRequestId(config);
    const priority = this.determinePriority(config);
    const expiresAt = Date.now() + this.options.defaultTTL;

    const queuedRequest: QueuedRequest = {
      id: requestId,
      config: this.sanitizeConfig(config),
      timestamp: Date.now(),
      priority,
      retryCount: 0,
      maxRetries: this.options.maxRetries,
      expiresAt,
    };

    // Remove oldest request if queue is full
    if (this.queue.size >= this.options.maxSize) {
      this.removeOldestRequest();
    }

    this.queue.set(requestId, queuedRequest);
    this.saveToStorage();

    return requestId;
  }

  public dequeue(): QueuedRequest | null {
    const prioritizedRequests = this.getPrioritizedRequests();
    
    if (prioritizedRequests.length === 0) {
      return null;
    }

    const request = prioritizedRequests[0];
    this.queue.delete(request.id);
    this.saveToStorage();

    return request;
  }

  public remove(requestIdOrConfig: string | InternalAxiosRequestConfig): boolean {
    let requestId: string;

    if (typeof requestIdOrConfig === 'string') {
      requestId = requestIdOrConfig;
    } else {
      requestId = this.generateRequestId(requestIdOrConfig);
    }

    const removed = this.queue.delete(requestId);
    if (removed) {
      this.saveToStorage();
    }

    return removed;
  }

  public get(requestId: string): QueuedRequest | null {
    return this.queue.get(requestId) || null;
  }

  public getAll(): QueuedRequest[] {
    return this.getPrioritizedRequests();
  }

  public getAllConfigs(): InternalAxiosRequestConfig[] {
    return this.getPrioritizedRequests().map(request => request.config);
  }

  public clear(): void {
    this.queue.clear();
    this.saveToStorage();
  }

  public size(): number {
    return this.queue.size;
  }

  public isEmpty(): boolean {
    return this.queue.size === 0;
  }

  public updateRetryCount(requestId: string): boolean {
    const request = this.queue.get(requestId);
    
    if (!request) {
      return false;
    }

    request.retryCount++;
    
    // Remove request if max retries exceeded
    if (request.retryCount >= request.maxRetries) {
      this.queue.delete(requestId);
      this.saveToStorage();
      return false;
    }

    this.saveToStorage();
    return true;
  }

  public getRequestsByPriority(priority: 'low' | 'normal' | 'high'): QueuedRequest[] {
    return Array.from(this.queue.values()).filter(request => request.priority === priority);
  }

  public getRequestsByMethod(method: string): QueuedRequest[] {
    return Array.from(this.queue.values()).filter(
      request => request.config.method?.toLowerCase() === method.toLowerCase()
    );
  }

  public getExpiredRequests(): QueuedRequest[] {
    const now = Date.now();
    return Array.from(this.queue.values()).filter(
      request => request.expiresAt && request.expiresAt < now
    );
  }

  public removeExpiredRequests(): number {
    const expiredRequests = this.getExpiredRequests();
    let removedCount = 0;

    expiredRequests.forEach(request => {
      if (this.queue.delete(request.id)) {
        removedCount++;
      }
    });

    if (removedCount > 0) {
      this.saveToStorage();
    }

    return removedCount;
  }

  private generateRequestId(config: InternalAxiosRequestConfig): string {
    const method = config.method || 'get';
    const url = config.url || '';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    
    return `${method}_${url.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}_${random}`;
  }

  private determinePriority(config: InternalAxiosRequestConfig): 'low' | 'normal' | 'high' {
    // Check metadata for explicit priority
    if (config.metadata?.priority) {
      return config.metadata.priority;
    }

    // Determine priority based on method and URL
    const method = config.method?.toLowerCase();
    const url = config.url?.toLowerCase() || '';

    // High priority for authentication and critical operations
    if (url.includes('/auth/') || url.includes('/emergency/')) {
      return 'high';
    }

    // High priority for POST, PUT, DELETE operations
    if (method === 'post' || method === 'put' || method === 'delete') {
      return 'high';
    }

    // Low priority for analytics and logging
    if (url.includes('/analytics/') || url.includes('/logs/')) {
      return 'low';
    }

    return 'normal';
  }

  private sanitizeConfig(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
    // Remove non-serializable properties
    const sanitized = { ...config };
    
    // Remove functions and non-serializable objects
    delete sanitized.adapter;
    delete sanitized.transformRequest;
    delete sanitized.transformResponse;
    delete sanitized.validateStatus;
    delete sanitized.signal;
    delete sanitized.onUploadProgress;
    delete sanitized.onDownloadProgress;

    return sanitized;
  }

  private getPrioritizedRequests(): QueuedRequest[] {
    const requests = Array.from(this.queue.values());
    
    return requests.sort((a, b) => {
      // First sort by priority
      const priorityA = this.options.priorityOrder.indexOf(a.priority);
      const priorityB = this.options.priorityOrder.indexOf(b.priority);
      
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      // Then sort by timestamp (older first)
      return a.timestamp - b.timestamp;
    });
  }

  private removeOldestRequest(): void {
    const requests = Array.from(this.queue.values());
    
    if (requests.length === 0) {
      return;
    }

    // Find oldest low priority request first
    const lowPriorityRequests = requests.filter(r => r.priority === 'low');
    if (lowPriorityRequests.length > 0) {
      const oldest = lowPriorityRequests.reduce((prev, current) => 
        prev.timestamp < current.timestamp ? prev : current
      );
      this.queue.delete(oldest.id);
      return;
    }

    // If no low priority requests, remove oldest normal priority
    const normalPriorityRequests = requests.filter(r => r.priority === 'normal');
    if (normalPriorityRequests.length > 0) {
      const oldest = normalPriorityRequests.reduce((prev, current) => 
        prev.timestamp < current.timestamp ? prev : current
      );
      this.queue.delete(oldest.id);
      return;
    }

    // Last resort: remove oldest high priority request
    const oldest = requests.reduce((prev, current) => 
      prev.timestamp < current.timestamp ? prev : current
    );
    this.queue.delete(oldest.id);
  }

  private saveToStorage(): void {
    try {
      const queueData = Array.from(this.queue.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(queueData));
    } catch (error) {
      console.error('Failed to save request queue to storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const queueData = localStorage.getItem(this.storageKey);
      
      if (queueData) {
        const parsedData = JSON.parse(queueData) as [string, QueuedRequest][];
        this.queue = new Map(parsedData);
        
        // Remove expired requests on load
        this.removeExpiredRequests();
      }
    } catch (error) {
      console.error('Failed to load request queue from storage:', error);
      this.queue.clear();
    }
  }

  private startCleanupTimer(): void {
    // Clean up expired requests every 5 minutes
    setInterval(() => {
      this.removeExpiredRequests();
    }, 5 * 60 * 1000);
  }

  // Statistics and monitoring
  public getStatistics(): {
    totalRequests: number;
    requestsByPriority: Record<string, number>;
    requestsByMethod: Record<string, number>;
    oldestRequest: number | null;
    newestRequest: number | null;
    expiredRequests: number;
  } {
    const requests = Array.from(this.queue.values());
    
    const requestsByPriority = requests.reduce((acc, request) => {
      acc[request.priority] = (acc[request.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const requestsByMethod = requests.reduce((acc, request) => {
      const method = request.config.method || 'unknown';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const timestamps = requests.map(r => r.timestamp);
    const oldestRequest = timestamps.length > 0 ? Math.min(...timestamps) : null;
    const newestRequest = timestamps.length > 0 ? Math.max(...timestamps) : null;
    const expiredRequests = this.getExpiredRequests().length;

    return {
      totalRequests: requests.length,
      requestsByPriority,
      requestsByMethod,
      oldestRequest,
      newestRequest,
      expiredRequests,
    };
  }
}

export default RequestQueue;
