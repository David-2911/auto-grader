import { CacheEntry } from '@/types/api.types';

export interface CacheOptions {
  defaultTTL: number;
  maxSize: number;
  storageType: 'memory' | 'localStorage' | 'indexedDB';
  prefix: string;
}

export interface CacheConfig {
  ttl?: number;
  key?: string;
  tags?: string[];
  version?: string;
}

export class CacheManager {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private storageKey = 'api_cache';
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      storageType: 'memory',
      prefix: 'api_cache_',
      ...options,
    };

    this.initializeStorage();
    this.startCleanupTimer();
  }

  public async set<T>(key: string, data: T, config: CacheConfig = {}): Promise<void> {
    const ttl = config.ttl || this.options.defaultTTL;
    const cacheKey = this.generateCacheKey(key);
    
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
      key: cacheKey,
    };

    switch (this.options.storageType) {
      case 'memory':
        await this.setInMemory(cacheKey, entry);
        break;
      case 'localStorage':
        await this.setInLocalStorage(cacheKey, entry);
        break;
      case 'indexedDB':
        await this.setInIndexedDB(cacheKey, entry);
        break;
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.generateCacheKey(key);
    let entry: CacheEntry<T> | null = null;

    switch (this.options.storageType) {
      case 'memory':
        entry = this.getFromMemory<T>(cacheKey);
        break;
      case 'localStorage':
        entry = await this.getFromLocalStorage<T>(cacheKey);
        break;
      case 'indexedDB':
        entry = await this.getFromIndexedDB<T>(cacheKey);
        break;
    }

    if (!entry) {
      return null;
    }

    // Check if entry is expired
    if (Date.now() > entry.expiresAt) {
      await this.delete(key);
      return null;
    }

    return entry.data;
  }

  public async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  public async delete(key: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(key);

    switch (this.options.storageType) {
      case 'memory':
        return this.deleteFromMemory(cacheKey);
      case 'localStorage':
        return this.deleteFromLocalStorage(cacheKey);
      case 'indexedDB':
        return await this.deleteFromIndexedDB(cacheKey);
    }

    return false;
  }

  public async clear(): Promise<void> {
    switch (this.options.storageType) {
      case 'memory':
        this.memoryCache.clear();
        break;
      case 'localStorage':
        await this.clearLocalStorage();
        break;
      case 'indexedDB':
        await this.clearIndexedDB();
        break;
    }
  }

  public async invalidateByPattern(pattern: string): Promise<number> {
    const regex = new RegExp(pattern);
    let invalidatedCount = 0;

    switch (this.options.storageType) {
      case 'memory':
        for (const key of this.memoryCache.keys()) {
          if (regex.test(key)) {
            this.memoryCache.delete(key);
            invalidatedCount++;
          }
        }
        break;
      case 'localStorage':
        invalidatedCount = await this.invalidateLocalStorageByPattern(regex);
        break;
      case 'indexedDB':
        invalidatedCount = await this.invalidateIndexedDBByPattern(regex);
        break;
    }

    return invalidatedCount;
  }

  public async invalidateByTags(tags: string[]): Promise<number> {
    // This would require storing tags with cache entries
    // Implementation depends on specific requirements
    return 0;
  }

  public async getSize(): Promise<number> {
    switch (this.options.storageType) {
      case 'memory':
        return this.memoryCache.size;
      case 'localStorage':
        return this.getLocalStorageSize();
      case 'indexedDB':
        return await this.getIndexedDBSize();
    }

    return 0;
  }

  public async getStats(): Promise<{
    size: number;
    hitRate: number;
    missRate: number;
    expiredEntries: number;
  }> {
    const size = await this.getSize();
    const expiredEntries = await this.countExpiredEntries();

    // Note: Hit/miss rate tracking would require additional implementation
    return {
      size,
      hitRate: 0,
      missRate: 0,
      expiredEntries,
    };
  }

  public async cleanup(): Promise<number> {
    let cleanedCount = 0;

    switch (this.options.storageType) {
      case 'memory':
        cleanedCount = this.cleanupMemory();
        break;
      case 'localStorage':
        cleanedCount = await this.cleanupLocalStorage();
        break;
      case 'indexedDB':
        cleanedCount = await this.cleanupIndexedDB();
        break;
    }

    return cleanedCount;
  }

  // Memory storage methods
  private async setInMemory<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Enforce size limit
    if (this.memoryCache.size >= this.options.maxSize) {
      this.evictOldestEntry();
    }

    this.memoryCache.set(key, entry);
  }

  private getFromMemory<T>(key: string): CacheEntry<T> | null {
    return this.memoryCache.get(key) as CacheEntry<T> || null;
  }

  private deleteFromMemory(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  private cleanupMemory(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
        cleanedCount++;
      }
    }

    return cleanedCount;
  }

  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }

  // LocalStorage methods
  private async setInLocalStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to set cache entry in localStorage:', error);
    }
  }

  private async getFromLocalStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Failed to get cache entry from localStorage:', error);
      return null;
    }
  }

  private deleteFromLocalStorage(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Failed to delete cache entry from localStorage:', error);
      return false;
    }
  }

  private async clearLocalStorage(): Promise<void> {
    const keys = Object.keys(localStorage);
    const prefix = this.options.prefix;

    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  private async invalidateLocalStorageByPattern(regex: RegExp): Promise<number> {
    const keys = Object.keys(localStorage);
    const prefix = this.options.prefix;
    let invalidatedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(prefix) && regex.test(key)) {
        localStorage.removeItem(key);
        invalidatedCount++;
      }
    });

    return invalidatedCount;
  }

  private getLocalStorageSize(): number {
    const keys = Object.keys(localStorage);
    const prefix = this.options.prefix;
    
    return keys.filter(key => key.startsWith(prefix)).length;
  }

  private async cleanupLocalStorage(): Promise<number> {
    const keys = Object.keys(localStorage);
    const prefix = this.options.prefix;
    const now = Date.now();
    let cleanedCount = 0;

    keys.forEach(key => {
      if (key.startsWith(prefix)) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const entry = JSON.parse(item);
            if (now > entry.expiresAt) {
              localStorage.removeItem(key);
              cleanedCount++;
            }
          }
        } catch (error) {
          // Remove invalid entries
          localStorage.removeItem(key);
          cleanedCount++;
        }
      }
    });

    return cleanedCount;
  }

  // IndexedDB methods (simplified implementation)
  private async setInIndexedDB<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    // Implementation would use IndexedDB API
    // This is a placeholder for the full implementation
  }

  private async getFromIndexedDB<T>(key: string): Promise<CacheEntry<T> | null> {
    // Implementation would use IndexedDB API
    return null;
  }

  private async deleteFromIndexedDB(key: string): Promise<boolean> {
    // Implementation would use IndexedDB API
    return false;
  }

  private async clearIndexedDB(): Promise<void> {
    // Implementation would use IndexedDB API
  }

  private async invalidateIndexedDBByPattern(regex: RegExp): Promise<number> {
    // Implementation would use IndexedDB API
    return 0;
  }

  private async getIndexedDBSize(): Promise<number> {
    // Implementation would use IndexedDB API
    return 0;
  }

  private async cleanupIndexedDB(): Promise<number> {
    // Implementation would use IndexedDB API
    return 0;
  }

  // Utility methods
  private generateCacheKey(key: string): string {
    return `${this.options.prefix}${key}`;
  }

  private async countExpiredEntries(): Promise<number> {
    const now = Date.now();
    let expiredCount = 0;

    switch (this.options.storageType) {
      case 'memory':
        for (const entry of this.memoryCache.values()) {
          if (now > entry.expiresAt) {
            expiredCount++;
          }
        }
        break;
      case 'localStorage':
        const keys = Object.keys(localStorage);
        const prefix = this.options.prefix;
        
        keys.forEach(key => {
          if (key.startsWith(prefix)) {
            try {
              const item = localStorage.getItem(key);
              if (item) {
                const entry = JSON.parse(item);
                if (now > entry.expiresAt) {
                  expiredCount++;
                }
              }
            } catch (error) {
              expiredCount++;
            }
          }
        });
        break;
      case 'indexedDB':
        // Implementation would use IndexedDB API
        break;
    }

    return expiredCount;
  }

  private initializeStorage(): void {
    // Load existing cache from storage if needed
    if (this.options.storageType === 'memory') {
      // Memory cache is already initialized
      return;
    }

    // For persistent storage, we might want to load existing data
    // This depends on specific requirements
  }

  private startCleanupTimer(): void {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('Cache cleanup failed:', error);
      });
    }, 5 * 60 * 1000);
  }

  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.memoryCache.clear();
  }
}

export default CacheManager;
