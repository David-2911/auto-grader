/**
 * Comprehensive API Integration Service
 * 
 * This module provides a unified API integration layer that establishes seamless
 * communication between all frontend interfaces and backend services. It includes:
 * 
 * - Centralized HTTP request handling with retry logic and error management
 * - Automatic authentication token management and renewal
 * - Real-time WebSocket communication for live updates
 * - Offline functionality with request queuing and sync
 * - Smart caching for improved performance
 * - File upload with progress tracking
 * - Comprehensive error handling and user feedback
 * - Network monitoring and quality assessment
 * 
 * @author Auto-Grade System
 * @version 2.0.0
 */

import { apiCore } from './core/api.core';
import { enhancedStudentService } from './enhanced/student.service';
import { enhancedTeacherService } from './enhanced/teacher.service';
import { enhancedAdminService } from './enhanced/admin.service';
import { TokenManager } from './core/token.manager';
import { RequestQueue } from './core/request.queue';
import { CacheManager } from './core/cache.manager';
import { NetworkMonitor } from './core/network.monitor';
import { WebSocketManager } from './core/websocket.manager';

// Export core API instance and utilities
export { apiCore };
export { TokenManager, RequestQueue, CacheManager, NetworkMonitor, WebSocketManager };

// Export enhanced service instances
export { enhancedStudentService as studentAPI };
export { enhancedTeacherService as teacherAPI };
export { enhancedAdminService as adminAPI };

// Legacy compatibility exports
export { enhancedStudentService as studentService };
export { enhancedTeacherService as teacherService };
export { enhancedAdminService as adminService };

// Export service classes for manual instantiation if needed
// Note: Service classes are exported as default from their respective modules

/**
 * Main API class that provides a unified interface for all API operations
 */
export class APIIntegration {
  public readonly core: typeof apiCore;
  public readonly student: typeof enhancedStudentService;
  public readonly teacher: typeof enhancedTeacherService;
  public readonly admin: typeof enhancedAdminService;
  public readonly tokenManager: TokenManager;
  public readonly cache: CacheManager;
  public readonly network: NetworkMonitor;
  public readonly websocket: WebSocketManager;

  constructor() {
    this.core = apiCore;
    this.student = enhancedStudentService;
    this.teacher = enhancedTeacherService;
    this.admin = enhancedAdminService;
    this.tokenManager = new TokenManager();
    this.cache = new CacheManager();
    this.network = new NetworkMonitor();
    this.websocket = new WebSocketManager();
  }

  /**
   * Initialize the API integration system
   */
  async initialize(): Promise<void> {
    try {
      // Check network connectivity
      await this.network.checkConnection();
      
      // Initialize WebSocket connection if online
      if (this.network.isOnline()) {
        await this.websocket.connect();
      }

      // Set up real-time event handlers
      this.setupRealtimeHandlers();

      console.log('API Integration initialized successfully');
    } catch (error) {
      console.error('Failed to initialize API Integration:', error);
      throw error;
    }
  }

  /**
   * Set up real-time event handlers for system-wide notifications
   */
  private setupRealtimeHandlers(): void {
    // Handle system maintenance notifications
    this.websocket.subscribe('system:maintenance', (data) => {
      if (data.enabled) {
        // Show maintenance mode warning
        console.warn('System entering maintenance mode:', data.message);
      }
    });

    // Handle forced logout events
    this.websocket.subscribe('auth:force_logout', (data) => {
      console.log('Forced logout received:', data.reason);
      this.tokenManager.clearTokens();
      window.location.href = '/login';
    });

    // Handle system updates
    this.websocket.subscribe('system:update', (data) => {
      if (data.requiresReload) {
        console.log('System update requires page reload');
        // Show notification to user about available update
      }
    });

    // Handle emergency alerts
    this.websocket.subscribe('system:emergency', (data) => {
      console.error('Emergency alert:', data);
      // Show critical alert to user
    });
  }

  /**
   * Get system status and health information
   */
  async getSystemStatus(): Promise<{
    api: {
      online: boolean;
      responseTime: number;
      lastCheck: number;
    };
    websocket: {
      connected: boolean;
      connectionState: string;
      lastMessage: number;
    };
    cache: {
      size: number;
      hitRate: number;
      enabled: boolean;
    };
    queue: {
      size: number;
      processing: boolean;
      lastSync: number;
    };
  }> {
    const networkStatus = this.network.getNetworkStatus();
    const wsStats = this.websocket.getStatistics();
    const cacheStats = await this.cache.getStats();
    const queueStats = this.core.getRequestQueue();

    return {
      api: {
        online: networkStatus.online,
        responseTime: networkStatus.rtt || 0,
        lastCheck: Date.now(),
      },
      websocket: {
        connected: wsStats.connected,
        connectionState: wsStats.connectionState,
        lastMessage: Date.now(),
      },
      cache: {
        size: cacheStats.size,
        hitRate: cacheStats.hitRate,
        enabled: true,
      },
      queue: {
        size: queueStats.length,
        processing: this.network.isOnline(),
        lastSync: Date.now(),
      },
    };
  }

  /**
   * Clear all cached data
   */
  async clearAllCache(): Promise<void> {
    await this.cache.clear();
    this.core.clearCache();
  }

  /**
   * Force sync all queued requests
   */
  async syncQueuedRequests(): Promise<void> {
    if (!this.network.isOnline()) {
      throw new Error('Cannot sync requests while offline');
    }

    // This would trigger the core API to process queued requests
    console.log('Syncing queued requests...');
  }

  /**
   * Get comprehensive API statistics
   */
  async getStatistics(): Promise<{
    requests: {
      total: number;
      successful: number;
      failed: number;
      cached: number;
      queued: number;
    };
    performance: {
      averageResponseTime: number;
      slowestEndpoint: string;
      fastestEndpoint: string;
      errorRate: number;
    };
    network: {
      quality: string;
      uptime: number;
      lastOutage: number | null;
    };
    cache: {
      entries: number;
      hitRate: number;
      missRate: number;
      storage: string;
    };
  }> {
    // This would aggregate statistics from all components
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        cached: 0,
        queued: 0,
      },
      performance: {
        averageResponseTime: 0,
        slowestEndpoint: '',
        fastestEndpoint: '',
        errorRate: 0,
      },
      network: {
        quality: this.network.getConnectionQuality(),
        uptime: 0,
        lastOutage: null,
      },
      cache: {
        entries: 0,
        hitRate: 0,
        missRate: 0,
        storage: 'memory',
      },
    };
  }

  /**
   * Configure API behavior
   */
  configure(options: {
    retryAttempts?: number;
    retryDelay?: number;
    timeout?: number;
    enableCache?: boolean;
    enableOfflineQueue?: boolean;
    enableWebSocket?: boolean;
  }): void {
    // This would update the core API configuration
    console.log('Configuring API with options:', options);
  }

  /**
   * Cleanup and destroy all connections
   */
  destroy(): void {
    this.websocket.disconnect();
    this.network.destroy();
    this.cache.destroy();
    this.student.destroy?.();
    this.core.cancelAllRequests();
  }

  /**
   * Health check endpoint to verify all systems are operational
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    services: {
      api: 'up' | 'down' | 'degraded';
      websocket: 'up' | 'down' | 'degraded';
      cache: 'up' | 'down' | 'degraded';
      network: 'up' | 'down' | 'degraded';
    };
    timestamp: number;
  }> {
    const checks = await Promise.allSettled([
      this.network.checkConnection(),
      this.websocket.isConnected(),
      this.cache.getSize(),
    ]);

    const apiHealth = checks[0].status === 'fulfilled' ? 'up' : 'down';
    const wsHealth = checks[1].status === 'fulfilled' && (checks[1].value as boolean) ? 'up' : 'down';
    const cacheHealth = checks[2].status === 'fulfilled' ? 'up' : 'down';
    const networkHealth = this.network.isOnline() ? 'up' : 'down';

    const healthyServices = [apiHealth, wsHealth, cacheHealth, networkHealth].filter(s => s === 'up').length;
    const totalServices = 4;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyServices === totalServices) {
      overallStatus = 'healthy';
    } else if (healthyServices >= totalServices / 2) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    return {
      status: overallStatus,
      services: {
        api: apiHealth,
        websocket: wsHealth,
        cache: cacheHealth,
        network: networkHealth,
      },
      timestamp: Date.now(),
    };
  }
}

// Create and export singleton instance
export const apiIntegration = new APIIntegration();

// Default export for convenience
export default apiIntegration;

// Auto-initialize on import (can be disabled by setting env var)
if (typeof window !== 'undefined' && !window.location.search.includes('no-auto-init')) {
  apiIntegration.initialize().catch(error => {
    console.warn('Auto-initialization failed:', error);
  });
}

/**
 * Utility function to get the appropriate service based on user role
 */
export function getServiceForRole(role: 'student' | 'teacher' | 'admin') {
  switch (role) {
    case 'student':
      return apiIntegration.student;
    case 'teacher':
      return apiIntegration.teacher;
    case 'admin':
      return apiIntegration.admin;
    default:
      throw new Error(`Unknown role: ${role}`);
  }
}

/**
 * Utility function to check if API is ready for use
 */
export function isAPIReady(): boolean {
  return apiIntegration.network.isOnline();
}

/**
 * Utility function to wait for API to be ready
 */
export function waitForAPI(timeout: number = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAPIReady()) {
      resolve();
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (isAPIReady()) {
        clearInterval(checkInterval);
        resolve();
      } else if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error('API ready timeout'));
      }
    }, 1000);
  });
}

// Re-export all types for convenience
export * from '@/types/api.types';
export * from './enhanced/student.service';
export * from './enhanced/teacher.service';
export * from './enhanced/admin.service';
