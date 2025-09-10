const os = require('os');
const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * Health Check Service
 * Provides functions to check the health of different components of the system
 */
class HealthService {
  /**
   * Get system health information
   * @returns {Promise<Object>} Health information
   */
  async getHealthInfo() {
    try {
      const dbStatus = await this.checkDatabaseHealth();
      
      return {
        status: this.getOverallStatus(dbStatus.status),
        timestamp: new Date(),
        uptime: process.uptime(),
        components: {
          database: dbStatus,
          server: this.getServerHealth()
        }
      };
    } catch (error) {
      logger.error('Error getting health info:', error);
      return {
        status: 'ERROR',
        timestamp: new Date(),
        uptime: process.uptime(),
        error: error.message
      };
    }
  }
  
  /**
   * Check database health
   * @returns {Promise<Object>} Database health status
   */
  async checkDatabaseHealth() {
    try {
      const startTime = process.hrtime();
      
      // Try to execute a simple query
      await pool.query('SELECT 1');
      
      const [elapsed] = process.hrtime(startTime);
      
      return {
        status: 'UP',
        responseTime: `${elapsed}s`,
        connections: {
          max: pool.config.connectionLimit,
          active: pool.pool._allConnections.length,
          idle: pool.pool._freeConnections.length
        }
      };
    } catch (error) {
      logger.error('Database health check failed:', error);
      return {
        status: 'DOWN',
        error: error.message
      };
    }
  }
  
  /**
   * Get server resource usage
   * @returns {Object} Server health information
   */
  getServerHealth() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    
    return {
      status: 'UP',
      cpu: {
        cores: os.cpus().length,
        loadAvg: os.loadavg(),
        model: os.cpus()[0].model
      },
      memory: {
        total: this.formatBytes(totalMemory),
        free: this.formatBytes(freeMemory),
        used: this.formatBytes(usedMemory),
        usagePercentage: Math.round((usedMemory / totalMemory) * 100)
      },
      os: {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: this.formatUptime(os.uptime())
      },
      process: {
        pid: process.pid,
        version: process.version,
        memoryUsage: {
          rss: this.formatBytes(process.memoryUsage().rss),
          heapTotal: this.formatBytes(process.memoryUsage().heapTotal),
          heapUsed: this.formatBytes(process.memoryUsage().heapUsed),
          external: this.formatBytes(process.memoryUsage().external)
        }
      }
    };
  }
  
  /**
   * Get overall system status based on component statuses
   * @param {...String} statuses - Status strings
   * @returns {String} Overall status
   */
  getOverallStatus(...statuses) {
    if (statuses.includes('DOWN')) {
      return 'DOWN';
    }
    
    if (statuses.includes('DEGRADED')) {
      return 'DEGRADED';
    }
    
    return 'UP';
  }
  
  /**
   * Format bytes to human-readable format
   * @param {Number} bytes - Bytes to format
   * @returns {String} Formatted bytes
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(2))} ${sizes[i]}`;
  }
  
  /**
   * Format uptime in days, hours, minutes, seconds
   * @param {Number} uptime - Uptime in seconds
   * @returns {String} Formatted uptime
   */
  formatUptime(uptime) {
    const days = Math.floor(uptime / 86400);
    const hours = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
}

module.exports = new HealthService();
