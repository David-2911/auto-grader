const redis = require('redis');
const { logger } = require('../utils/logger');

// Load environment variables if not already loaded
require('dotenv').config();

class CacheManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      totalRequests: 0
    };
  }

  async connect() {
    try {
      const host = process.env.REDIS_HOST || '127.0.0.1';
      const port = parseInt(process.env.REDIS_PORT || '6379', 10);
      const password = process.env.REDIS_PASSWORD || undefined;

      // Prefer REDIS_URL if provided (supports rediss:// for TLS providers like Upstash/Redis Cloud)
      let url = process.env.REDIS_URL;
      if (!url) {
        url = password 
          ? `redis://:${encodeURIComponent(password)}@${host}:${port}`
          : `redis://${host}:${port}`;
      }

      const useTLS = url.startsWith('rediss://') || process.env.REDIS_TLS === 'true';

      this.client = redis.createClient({
        url,
        socket: {
          reconnectStrategy: (retries) => Math.min(1000 * retries, 5000),
          connectTimeout: 60000,
          ...(useTLS ? { tls: true } : {})
        }
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        logger.error('Redis client error:', err);
        this.stats.errors++;
        this.isConnected = false;
      });

      this.client.on('end', () => {
        logger.info('Redis client disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Generic cache operations
  async get(key) {
    if (!this.isConnected) return null;
    
    try {
      this.stats.totalRequests++;
      const value = await this.client.get(key);
      
      if (value) {
        this.stats.hits++;
        return JSON.parse(value);
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      logger.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  async set(key, value, expireInSeconds = 3600) {
    if (!this.isConnected) return false;
    
    try {
      this.stats.sets++;
      await this.client.setEx(key, expireInSeconds, JSON.stringify(value));
      return true;
    } catch (error) {
      logger.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async delete(key) {
    if (!this.isConnected) return false;
    
    try {
      this.stats.deletes++;
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  async deletePattern(pattern) {
    if (!this.isConnected) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
        this.stats.deletes += keys.length;
      }
      return true;
    } catch (error) {
      logger.error('Cache pattern delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  // Specialized caching for common use cases
  
  // User session caching
  async cacheUserSession(userId, sessionData, expireInSeconds = 86400) {
    const key = `session:${userId}`;
    return this.set(key, sessionData, expireInSeconds);
  }

  async getUserSession(userId) {
    const key = `session:${userId}`;
    return this.get(key);
  }

  async invalidateUserSession(userId) {
    const key = `session:${userId}`;
    return this.delete(key);
  }

  // Assignment caching
  async cacheAssignment(assignmentId, assignmentData, expireInSeconds = 1800) {
    const key = `assignment:${assignmentId}`;
    return this.set(key, assignmentData, expireInSeconds);
  }

  async getAssignment(assignmentId) {
    const key = `assignment:${assignmentId}`;
    return this.get(key);
  }

  async invalidateAssignment(assignmentId) {
    const key = `assignment:${assignmentId}`;
    return this.delete(key);
  }

  async invalidateUserAssignments(userId) {
    const pattern = `assignment:*:user:${userId}`;
    return this.deletePattern(pattern);
  }

  // OCR results caching
  async cacheOCRResult(fileHash, ocrData, expireInSeconds = 7200) {
    const key = `ocr:${fileHash}`;
    return this.set(key, ocrData, expireInSeconds);
  }

  async getOCRResult(fileHash) {
    const key = `ocr:${fileHash}`;
    return this.get(key);
  }

  // ML model predictions caching
  async cacheMLPrediction(inputHash, prediction, expireInSeconds = 3600) {
    const key = `ml:prediction:${inputHash}`;
    return this.set(key, prediction, expireInSeconds);
  }

  async getMLPrediction(inputHash) {
    const key = `ml:prediction:${inputHash}`;
    return this.get(key);
  }

  // Query result caching
  async cacheQueryResult(queryHash, result, expireInSeconds = 1800) {
    const key = `query:${queryHash}`;
    return this.set(key, result, expireInSeconds);
  }

  async getQueryResult(queryHash) {
    const key = `query:${queryHash}`;
    return this.get(key);
  }

  // Rate limiting
  async incrementRateLimit(identifier, windowSeconds = 3600) {
    if (!this.isConnected) return 0;
    
    try {
      const key = `rate_limit:${identifier}`;
      const current = await this.client.incr(key);
      
      if (current === 1) {
        await this.client.expire(key, windowSeconds);
      }
      
      return current;
    } catch (error) {
      logger.error('Rate limit increment error:', error);
      return 0;
    }
  }

  async getRateLimitCount(identifier) {
    if (!this.isConnected) return 0;
    
    try {
      const key = `rate_limit:${identifier}`;
      const count = await this.client.get(key);
      return parseInt(count) || 0;
    } catch (error) {
      logger.error('Rate limit get error:', error);
      return 0;
    }
  }

  // Performance statistics
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests) * 100 
      : 0;

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      isConnected: this.isConnected
    };
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected) return false;
    
    try {
      await this.client.ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Graceful shutdown
  async disconnect() {
    if (this.client && this.isConnected) {
      try {
        await this.client.quit();
        logger.info('Redis client disconnected gracefully');
      } catch (error) {
        logger.error('Error disconnecting Redis client:', error);
      }
    }
  }
}

// Create singleton instance
const cacheManager = new CacheManager();

module.exports = cacheManager;
