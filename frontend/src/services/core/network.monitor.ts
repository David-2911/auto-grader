import { NetworkStatus } from '@/types/api.types';

export interface NetworkMonitorOptions {
  enableConnectionQuality: boolean;
  checkInterval: number;
  timeoutThreshold: number;
  slowConnectionThreshold: number;
}

export class NetworkMonitor {
  private isOnlineState: boolean = navigator.onLine;
  private connectionQuality: 'fast' | 'slow' | 'offline' = 'fast';
  private networkStatus: NetworkStatus;
  private onlineCallbacks: Set<() => void> = new Set();
  private offlineCallbacks: Set<() => void> = new Set();
  private qualityChangeCallbacks: Set<(quality: 'fast' | 'slow' | 'offline') => void> = new Set();
  private options: NetworkMonitorOptions;
  private qualityCheckInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<NetworkMonitorOptions> = {}) {
    this.options = {
      enableConnectionQuality: true,
      checkInterval: 30000, // 30 seconds
      timeoutThreshold: 5000, // 5 seconds
      slowConnectionThreshold: 2000, // 2 seconds
      ...options,
    };

    this.networkStatus = {
      online: this.isOnlineState,
    };

    this.initializeNetworkMonitoring();
  }

  public isOnline(): boolean {
    return this.isOnlineState;
  }

  public getConnectionQuality(): 'fast' | 'slow' | 'offline' {
    return this.connectionQuality;
  }

  public getNetworkStatus(): NetworkStatus {
    return { ...this.networkStatus };
  }

  public onOnline(callback: () => void): () => void {
    this.onlineCallbacks.add(callback);
    
    return () => {
      this.onlineCallbacks.delete(callback);
    };
  }

  public onOffline(callback: () => void): () => void {
    this.offlineCallbacks.add(callback);
    
    return () => {
      this.offlineCallbacks.delete(callback);
    };
  }

  public onQualityChange(callback: (quality: 'fast' | 'slow' | 'offline') => void): () => void {
    this.qualityChangeCallbacks.add(callback);
    
    return () => {
      this.qualityChangeCallbacks.delete(callback);
    };
  }

  public async checkConnection(): Promise<NetworkStatus> {
    const status: NetworkStatus = {
      online: navigator.onLine,
    };

    // Get connection information if available
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      status.connectionType = connection.type;
      status.effectiveType = connection.effectiveType;
      status.downlink = connection.downlink;
      status.rtt = connection.rtt;
    }

    // Perform actual connectivity test
    if (status.online) {
      try {
        const connectivityTest = await this.performConnectivityTest();
        status.online = connectivityTest.success;
        
        if (connectivityTest.responseTime) {
          this.updateConnectionQuality(connectivityTest.responseTime);
        }
      } catch (error) {
        status.online = false;
        this.updateConnectionQuality(null);
      }
    } else {
      this.updateConnectionQuality(null);
    }

    this.updateNetworkStatus(status);
    return status;
  }

  private initializeNetworkMonitoring(): void {
    // Listen to browser online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));

    // Listen to connection change events
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.addEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Start periodic quality checks
    if (this.options.enableConnectionQuality) {
      this.startQualityMonitoring();
    }

    // Initial check
    this.checkConnection();
  }

  private handleOnline(): void {
    this.isOnlineState = true;
    this.checkConnection().then(() => {
      this.onlineCallbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in online callback:', error);
        }
      });
    });
  }

  private handleOffline(): void {
    this.isOnlineState = false;
    this.connectionQuality = 'offline';
    
    this.updateNetworkStatus({
      online: false,
    });

    this.offlineCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in offline callback:', error);
      }
    });

    this.qualityChangeCallbacks.forEach(callback => {
      try {
        callback('offline');
      } catch (error) {
        console.error('Error in quality change callback:', error);
      }
    });
  }

  private handleConnectionChange(): void {
    // Debounce connection change events
    setTimeout(() => {
      this.checkConnection();
    }, 1000);
  }

  private async performConnectivityTest(): Promise<{ success: boolean; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // Test connection with a simple GET request to a reliable endpoint
      const response = await fetch(`${window.location.origin}/favicon.ico`, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(this.options.timeoutThreshold),
      });

      const responseTime = Date.now() - startTime;
      
      return {
        success: response.ok,
        responseTime,
      };
    } catch (error) {
      return {
        success: false,
        responseTime: Date.now() - startTime,
      };
    }
  }

  private updateConnectionQuality(responseTime: number | null): void {
    let newQuality: 'fast' | 'slow' | 'offline';

    if (responseTime === null || !this.isOnlineState) {
      newQuality = 'offline';
    } else if (responseTime > this.options.slowConnectionThreshold) {
      newQuality = 'slow';
    } else {
      newQuality = 'fast';
    }

    if (newQuality !== this.connectionQuality) {
      this.connectionQuality = newQuality;
      
      this.qualityChangeCallbacks.forEach(callback => {
        try {
          callback(newQuality);
        } catch (error) {
          console.error('Error in quality change callback:', error);
        }
      });
    }
  }

  private updateNetworkStatus(status: NetworkStatus): void {
    this.networkStatus = status;
    this.isOnlineState = status.online;
  }

  private startQualityMonitoring(): void {
    this.qualityCheckInterval = setInterval(() => {
      if (this.isOnlineState) {
        this.checkConnection().catch(error => {
          console.error('Network quality check failed:', error);
        });
      }
    }, this.options.checkInterval);
  }

  private stopQualityMonitoring(): void {
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
      this.qualityCheckInterval = null;
    }
  }

  public destroy(): void {
    // Remove event listeners
    window.removeEventListener('online', this.handleOnline.bind(this));
    window.removeEventListener('offline', this.handleOffline.bind(this));

    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      connection.removeEventListener('change', this.handleConnectionChange.bind(this));
    }

    // Stop quality monitoring
    this.stopQualityMonitoring();

    // Clear callbacks
    this.onlineCallbacks.clear();
    this.offlineCallbacks.clear();
    this.qualityChangeCallbacks.clear();
  }

  // Utility methods for testing and debugging
  public simulateOffline(): void {
    this.isOnlineState = false;
    this.handleOffline();
  }

  public simulateOnline(): void {
    this.isOnlineState = true;
    this.handleOnline();
  }

  public getStatistics(): {
    isOnline: boolean;
    connectionQuality: string;
    lastCheck: number;
    onlineCallbacks: number;
    offlineCallbacks: number;
    qualityChangeCallbacks: number;
  } {
    return {
      isOnline: this.isOnlineState,
      connectionQuality: this.connectionQuality,
      lastCheck: Date.now(),
      onlineCallbacks: this.onlineCallbacks.size,
      offlineCallbacks: this.offlineCallbacks.size,
      qualityChangeCallbacks: this.qualityChangeCallbacks.size,
    };
  }

  // Advanced features
  public async measureLatency(url?: string, attempts: number = 3): Promise<number> {
    const testUrl = url || `${window.location.origin}/favicon.ico`;
    const measurements: number[] = [];

    for (let i = 0; i < attempts; i++) {
      try {
        const startTime = performance.now();
        await fetch(testUrl, {
          method: 'HEAD',
          cache: 'no-cache',
          signal: AbortSignal.timeout(this.options.timeoutThreshold),
        });
        const endTime = performance.now();
        measurements.push(endTime - startTime);
      } catch (error) {
        // Skip failed measurements
      }
    }

    if (measurements.length === 0) {
      throw new Error('All latency measurements failed');
    }

    // Return average latency
    return measurements.reduce((sum, time) => sum + time, 0) / measurements.length;
  }

  public async measureBandwidth(): Promise<number> {
    // This is a simplified bandwidth test
    // In production, you might want to use a more sophisticated approach
    try {
      const testSize = 100 * 1024; // 100KB test
      const startTime = performance.now();
      
      const response = await fetch(`${window.location.origin}/favicon.ico`, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(this.options.timeoutThreshold),
      });
      
      const blob = await response.blob();
      const endTime = performance.now();
      
      const duration = (endTime - startTime) / 1000; // Convert to seconds
      const sizeInBits = blob.size * 8;
      
      return sizeInBits / duration; // bits per second
    } catch (error) {
      throw new Error('Bandwidth measurement failed');
    }
  }
}

export default NetworkMonitor;
