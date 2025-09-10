const { logger } = require('../utils/logger');
const { executeQuery } = require('../config/database.optimized');
const cacheManager = require('./cache.service');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.alerts = new Map();
    this.thresholds = {
      responseTime: 2000, // 2 seconds
      errorRate: 0.05, // 5%
      cpuUsage: 80, // 80%
      memoryUsage: 80, // 80%
      diskUsage: 85, // 85%
      dbConnections: 0.8, // 80% of max connections
      cacheHitRate: 0.7 // 70%
    };
    
    this.startMonitoring();
  }

  startMonitoring() {
    // Collect metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Collect performance metrics every 5 minutes
    setInterval(() => {
      this.collectPerformanceMetrics();
    }, 300000);

    // Check alerts every minute
    setInterval(() => {
      this.checkAlerts();
    }, 60000);
  }

  // Record API request metrics
  recordAPIRequest(req, res, responseTime) {
    const endpoint = `${req.method} ${req.route?.path || req.path}`;
    const timestamp = new Date();
    
    // Store in memory for quick access
    const key = `api:${endpoint}`;
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        requests: 0,
        totalTime: 0,
        errors: 0,
        lastUpdated: timestamp
      });
    }
    
    const metric = this.metrics.get(key);
    metric.requests++;
    metric.totalTime += responseTime;
    metric.lastUpdated = timestamp;
    
    if (res.statusCode >= 400) {
      metric.errors++;
    }
    
    // Log to database for historical analysis
    this.logAPIUsage(req, res, responseTime);
  }

  async logAPIUsage(req, res, responseTime) {
    try {
      await executeQuery(`
        INSERT INTO api_usage_tracking 
        (user_id, endpoint, method, ip_address, response_status, response_time_ms, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        req.user?.id || null,
        req.route?.path || req.path,
        req.method,
        req.ip,
        res.statusCode,
        responseTime
      ]);
    } catch (error) {
      logger.error('Failed to log API usage:', error);
    }
  }

  // Collect system metrics
  async collectSystemMetrics() {
    try {
      const used = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      await executeQuery(`
        INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, metadata)
        VALUES 
        ('memory_usage_mb', ?, 'MB', ?),
        ('heap_used_mb', ?, 'MB', ?),
        ('cpu_user_ms', ?, 'ms', ?),
        ('cpu_system_ms', ?, 'ms', ?)
      `, [
        used.rss / 1024 / 1024,
        JSON.stringify({ type: 'memory', process: 'node' }),
        used.heapUsed / 1024 / 1024,
        JSON.stringify({ type: 'heap', process: 'node' }),
        cpuUsage.user / 1000,
        JSON.stringify({ type: 'cpu_user', process: 'node' }),
        cpuUsage.system / 1000,
        JSON.stringify({ type: 'cpu_system', process: 'node' })
      ]);
    } catch (error) {
      logger.error('Failed to collect system metrics:', error);
    }
  }

  // Collect performance metrics
  async collectPerformanceMetrics() {
    try {
      // Database metrics
      const [dbStats] = await executeQuery(`
        SELECT 
          (SELECT COUNT(*) FROM information_schema.processlist) as active_connections,
          (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Threads_connected') as total_connections,
          (SELECT VARIABLE_VALUE FROM information_schema.GLOBAL_STATUS WHERE VARIABLE_NAME = 'Queries') as total_queries
      `);

      // Cache metrics
      const cacheStats = await cacheManager.getStats();
      
      // API metrics
      const apiMetrics = this.calculateAPIMetrics();

      await executeQuery(`
        INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, metadata)
        VALUES 
        ('db_active_connections', ?, 'count', ?),
        ('db_total_connections', ?, 'count', ?),
        ('cache_hit_rate', ?, 'percentage', ?),
        ('api_avg_response_time', ?, 'ms', ?),
        ('api_error_rate', ?, 'percentage', ?)
      `, [
        dbStats[0]?.active_connections || 0,
        JSON.stringify({ type: 'database' }),
        dbStats[0]?.total_connections || 0,
        JSON.stringify({ type: 'database' }),
        parseFloat(cacheStats.hitRate) || 0,
        JSON.stringify({ type: 'cache', service: 'redis' }),
        apiMetrics.avgResponseTime,
        JSON.stringify({ type: 'api', period: '5min' }),
        apiMetrics.errorRate,
        JSON.stringify({ type: 'api', period: '5min' })
      ]);
    } catch (error) {
      logger.error('Failed to collect performance metrics:', error);
    }
  }

  // Calculate API metrics
  calculateAPIMetrics() {
    let totalRequests = 0;
    let totalTime = 0;
    let totalErrors = 0;

    for (const [endpoint, metric] of this.metrics.entries()) {
      if (endpoint.startsWith('api:')) {
        totalRequests += metric.requests;
        totalTime += metric.totalTime;
        totalErrors += metric.errors;
      }
    }

    return {
      avgResponseTime: totalRequests > 0 ? totalTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    };
  }

  // Check performance alerts
  async checkAlerts() {
    try {
      const apiMetrics = this.calculateAPIMetrics();
      const cacheStats = await cacheManager.getStats();
      
      // Check response time alert
      if (apiMetrics.avgResponseTime > this.thresholds.responseTime) {
        this.triggerAlert('high_response_time', {
          current: apiMetrics.avgResponseTime,
          threshold: this.thresholds.responseTime,
          message: `Average response time (${apiMetrics.avgResponseTime}ms) exceeds threshold`
        });
      }

      // Check error rate alert
      if (apiMetrics.errorRate > this.thresholds.errorRate * 100) {
        this.triggerAlert('high_error_rate', {
          current: apiMetrics.errorRate,
          threshold: this.thresholds.errorRate * 100,
          message: `Error rate (${apiMetrics.errorRate}%) exceeds threshold`
        });
      }

      // Check cache hit rate alert
      const hitRate = parseFloat(cacheStats.hitRate) || 0;
      if (hitRate < this.thresholds.cacheHitRate * 100) {
        this.triggerAlert('low_cache_hit_rate', {
          current: hitRate,
          threshold: this.thresholds.cacheHitRate * 100,
          message: `Cache hit rate (${hitRate}%) below threshold`
        });
      }

      // Check memory usage
      const memUsage = process.memoryUsage();
      const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      if (memUsagePercent > this.thresholds.memoryUsage) {
        this.triggerAlert('high_memory_usage', {
          current: memUsagePercent,
          threshold: this.thresholds.memoryUsage,
          message: `Memory usage (${memUsagePercent.toFixed(2)}%) exceeds threshold`
        });
      }

    } catch (error) {
      logger.error('Failed to check alerts:', error);
    }
  }

  // Trigger performance alert
  triggerAlert(alertType, details) {
    const now = Date.now();
    const lastAlert = this.alerts.get(alertType);
    
    // Avoid alert spam - minimum 10 minutes between same alerts
    if (lastAlert && (now - lastAlert) < 600000) {
      return;
    }

    this.alerts.set(alertType, now);
    
    logger.warn(`Performance Alert: ${alertType}`, details);
    
    // Here you could integrate with external alerting systems
    // like Slack, email, PagerDuty, etc.
    this.sendAlert(alertType, details);
  }

  // Send alert to external systems
  async sendAlert(alertType, details) {
    try {
      // Example: Log to database for dashboard display
      await executeQuery(`
        INSERT INTO performance_alerts (alert_type, alert_details, created_at)
        VALUES (?, ?, NOW())
      `, [alertType, JSON.stringify(details)]);
      
      // Example: Send to monitoring webhook
      if (process.env.MONITORING_WEBHOOK_URL) {
        // Implementation for webhook notification
      }
    } catch (error) {
      logger.error('Failed to send alert:', error);
    }
  }

  // Get current performance dashboard data
  async getDashboardData() {
    try {
      // Recent metrics
      const [recentMetrics] = await executeQuery(`
        SELECT 
          metric_name,
          metric_value,
          metric_unit,
          recorded_at
        FROM performance_metrics 
        WHERE recorded_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
        ORDER BY recorded_at DESC
      `);

      // API performance over last 24 hours
      const [apiPerformance] = await executeQuery(`
        SELECT 
          endpoint,
          COUNT(*) as request_count,
          AVG(response_time_ms) as avg_response_time,
          MAX(response_time_ms) as max_response_time,
          SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count
        FROM api_usage_tracking 
        WHERE timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
        GROUP BY endpoint
        ORDER BY request_count DESC
        LIMIT 10
      `);

      // System health
      const cacheStats = await cacheManager.getStats();
      const memUsage = process.memoryUsage();
      
      return {
        systemHealth: {
          memory: {
            used: Math.round(memUsage.heapUsed / 1024 / 1024),
            total: Math.round(memUsage.heapTotal / 1024 / 1024),
            percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
          },
          cache: cacheStats,
          uptime: Math.round(process.uptime())
        },
        recentMetrics: recentMetrics.slice(0, 50),
        apiPerformance: apiPerformance.map(api => ({
          ...api,
          avg_response_time: Math.round(api.avg_response_time),
          error_rate: ((api.error_count / api.request_count) * 100).toFixed(2)
        }))
      };
    } catch (error) {
      logger.error('Failed to get dashboard data:', error);
      return null;
    }
  }

  // Get performance report
  async getPerformanceReport(timeRange = '24h') {
    try {
      let timeCondition;
      switch (timeRange) {
        case '1h':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 1 HOUR)';
          break;
        case '24h':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
          break;
        case '7d':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 7 DAY)';
          break;
        case '30d':
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 30 DAY)';
          break;
        default:
          timeCondition = 'DATE_SUB(NOW(), INTERVAL 24 HOUR)';
      }

      const [report] = await executeQuery(`
        SELECT 
          'api_requests' as metric,
          COUNT(*) as value,
          'total' as unit
        FROM api_usage_tracking 
        WHERE timestamp > ${timeCondition}
        
        UNION ALL
        
        SELECT 
          'avg_response_time' as metric,
          AVG(response_time_ms) as value,
          'ms' as unit
        FROM api_usage_tracking 
        WHERE timestamp > ${timeCondition}
        
        UNION ALL
        
        SELECT 
          'error_rate' as metric,
          (SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) / COUNT(*)) * 100 as value,
          'percentage' as unit
        FROM api_usage_tracking 
        WHERE timestamp > ${timeCondition}
      `);

      return report.reduce((acc, item) => {
        acc[item.metric] = {
          value: Math.round(item.value * 100) / 100,
          unit: item.unit
        };
        return acc;
      }, {});
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      return null;
    }
  }
}

module.exports = new PerformanceMonitor();
