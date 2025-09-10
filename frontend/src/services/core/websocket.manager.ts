import { WebSocketMessage } from '@/types/api.types';
import { store } from '@/store';
import { addNotification } from '@/store/slices/notificationSlice';

export interface WebSocketOptions {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  enableHeartbeat: boolean;
  enableAutoReconnect: boolean;
  protocols?: string[];
}

export interface WebSocketSubscription {
  event: string;
  callback: (data: any) => void;
  once?: boolean;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private options: WebSocketOptions;
  private subscriptions: Map<string, Set<WebSocketSubscription>> = new Map();
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isConnecting: boolean = false;
  private isDestroyed: boolean = false;
  private messageQueue: WebSocketMessage[] = [];

  constructor(options: Partial<WebSocketOptions> = {}) {
    this.options = {
      url: this.getWebSocketUrl(),
      reconnectInterval: 5000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      enableHeartbeat: true,
      enableAutoReconnect: true,
      protocols: ['json'],
      ...options,
    };
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        // Wait for current connection attempt
        setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            resolve();
          } else {
            reject(new Error('Connection attempt failed'));
          }
        }, 5000);
        return;
      }

      this.isConnecting = true;

      try {
        this.ws = new WebSocket(this.options.url, this.options.protocols);

        this.ws.onopen = () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processQueuedMessages();
          
          store.dispatch(addNotification({
            type: 'success',
            title: 'Connected',
            message: 'Real-time connection established',
          }));

          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onclose = (event) => {
          this.handleClose(event);
        };

        this.ws.onerror = (error) => {
          this.handleError(error);
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  public disconnect(): void {
    this.isDestroyed = true;
    this.stopReconnectTimer();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  public subscribe(event: string, callback: (data: any) => void, once: boolean = false): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }

    const subscription: WebSocketSubscription = { event, callback, once };
    this.subscriptions.get(event)!.add(subscription);

    // Return unsubscribe function
    return () => {
      const eventSubscriptions = this.subscriptions.get(event);
      if (eventSubscriptions) {
        eventSubscriptions.delete(subscription);
        if (eventSubscriptions.size === 0) {
          this.subscriptions.delete(event);
        }
      }
    };
  }

  public unsubscribe(event: string, callback: (data: any) => void): void {
    const eventSubscriptions = this.subscriptions.get(event);
    if (eventSubscriptions) {
      for (const subscription of eventSubscriptions) {
        if (subscription.callback === callback) {
          eventSubscriptions.delete(subscription);
          break;
        }
      }
      if (eventSubscriptions.size === 0) {
        this.subscriptions.delete(event);
      }
    }
  }

  public send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        // Queue message for retry if connection recovers
        this.messageQueue.push(message);
      }
    } else {
      // Queue message if not connected
      this.messageQueue.push(message);
      
      // Try to reconnect if not already connecting
      if (!this.isConnecting && this.options.enableAutoReconnect) {
        this.reconnect();
      }
    }
  }

  public emit(type: string, data: any): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    this.send(message);
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  public getConnectionState(): string {
    if (!this.ws) return 'CLOSED';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'CONNECTING';
      case WebSocket.OPEN:
        return 'OPEN';
      case WebSocket.CLOSING:
        return 'CLOSING';
      case WebSocket.CLOSED:
        return 'CLOSED';
      default:
        return 'UNKNOWN';
    }
  }

  public getStatistics(): {
    connected: boolean;
    connectionState: string;
    reconnectAttempts: number;
    subscriptionsCount: number;
    queuedMessages: number;
  } {
    return {
      connected: this.isConnected(),
      connectionState: this.getConnectionState(),
      reconnectAttempts: this.reconnectAttempts,
      subscriptionsCount: this.subscriptions.size,
      queuedMessages: this.messageQueue.length,
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      this.dispatchMessage(message);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private dispatchMessage(message: WebSocketMessage): void {
    const eventSubscriptions = this.subscriptions.get(message.type);
    
    if (eventSubscriptions) {
      const subscriptionsToRemove: WebSocketSubscription[] = [];
      
      eventSubscriptions.forEach(subscription => {
        try {
          subscription.callback(message.data);
          
          if (subscription.once) {
            subscriptionsToRemove.push(subscription);
          }
        } catch (error) {
          console.error('Error in WebSocket subscription callback:', error);
        }
      });

      // Remove one-time subscriptions
      subscriptionsToRemove.forEach(subscription => {
        eventSubscriptions.delete(subscription);
      });

      if (eventSubscriptions.size === 0) {
        this.subscriptions.delete(message.type);
      }
    }

    // Handle system messages
    this.handleSystemMessage(message);
  }

  private handleSystemMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case 'system:ping':
        this.emit('system:pong', { timestamp: Date.now() });
        break;
      
      case 'system:notification':
        store.dispatch(addNotification(message.data));
        break;
      
      case 'system:error':
        console.error('WebSocket system error:', message.data);
        store.dispatch(addNotification({
          type: 'error',
          title: 'System Error',
          message: message.data.message || 'An error occurred',
        }));
        break;
      
      case 'system:reload':
        if (message.data.force) {
          window.location.reload();
        } else {
          store.dispatch(addNotification({
            type: 'info',
            title: 'Update Available',
            message: 'Please refresh the page to get the latest updates',
          }));
        }
        break;
    }
  }

  private handleClose(event: CloseEvent): void {
    this.stopHeartbeat();
    
    if (!this.isDestroyed && this.options.enableAutoReconnect) {
      console.log('WebSocket connection closed, attempting to reconnect...', event.reason);
      
      store.dispatch(addNotification({
        type: 'warning',
        title: 'Connection Lost',
        message: 'Attempting to reconnect...',
      }));

      this.scheduleReconnect();
    }
  }

  private handleError(error: Event): void {
    this.isConnecting = false;
    console.error('WebSocket error:', error);
    
    store.dispatch(addNotification({
      type: 'error',
      title: 'Connection Error',
      message: 'Failed to establish real-time connection',
    }));
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      store.dispatch(addNotification({
        type: 'error',
        title: 'Connection Failed',
        message: 'Unable to establish real-time connection. Please refresh the page.',
      }));
      return;
    }

    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.reconnectAttempts),
      30000 // Max 30 seconds
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  private reconnect(): void {
    if (this.isDestroyed || this.isConnecting) {
      return;
    }

    this.reconnectAttempts++;
    console.log(`WebSocket reconnect attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts}`);

    this.connect().catch(error => {
      console.error('WebSocket reconnect failed:', error);
    });
  }

  private stopReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    if (!this.options.enableHeartbeat) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.emit('system:ping', { timestamp: Date.now() });
      }
    }, this.options.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private processQueuedMessages(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getWebSocketUrl(): string {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const wsUrl = baseUrl.replace(/^http/, 'ws');
    return `${wsUrl}/ws`;
  }

  // Public utility methods
  public clearMessageQueue(): void {
    this.messageQueue = [];
  }

  public getQueuedMessages(): WebSocketMessage[] {
    return [...this.messageQueue];
  }

  public forceReconnect(): void {
    if (this.ws) {
      this.ws.close();
    }
    this.reconnectAttempts = 0;
    this.connect();
  }

  // Subscription shortcuts for common events
  public onNotification(callback: (notification: any) => void): () => void {
    return this.subscribe('notification', callback);
  }

  public onSubmissionUpdate(callback: (submission: any) => void): () => void {
    return this.subscribe('submission:update', callback);
  }

  public onGradingComplete(callback: (result: any) => void): () => void {
    return this.subscribe('grading:complete', callback);
  }

  public onAssignmentUpdate(callback: (assignment: any) => void): () => void {
    return this.subscribe('assignment:update', callback);
  }

  public onUserUpdate(callback: (user: any) => void): () => void {
    return this.subscribe('user:update', callback);
  }

  public onSystemUpdate(callback: (update: any) => void): () => void {
    return this.subscribe('system:update', callback);
  }
}

export default WebSocketManager;
