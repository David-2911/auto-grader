const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth.middleware');
const performanceMonitor = require('../services/performance-monitor.service');
const cacheManager = require('../services/cache.service');
const fileProcessingService = require('../services/file-processing.optimized.service');
const { executeQuery, getHealthStats } = require('../config/database.optimized');

// Basic UI-friendly summary for dashboard cards
router.get('/ui-summary', authenticate, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const hours = parseInt(req.query.hours || '24', 10);

    // Totals over the time window
    const [totalsRows] = await executeQuery(`
      SELECT 
        COUNT(*) AS request_count,
        AVG(response_time_ms) AS avg_response_time,
        SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) AS error_count,
        SUM(CASE WHEN response_status >= 200 AND response_status < 400 THEN 1 ELSE 0 END) AS success_count
      FROM api_usage_tracking
      WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR)
    `, [hours]);

    const totals = totalsRows[0] || { request_count: 0, avg_response_time: 0, error_count: 0, success_count: 0 };
    const errorRate = totals.request_count > 0 ? (totals.error_count / totals.request_count) * 100 : 0;

    // Top endpoints by volume
    const [topEndpointsRows] = await executeQuery(`
      SELECT 
        endpoint,
        method,
        COUNT(*) AS request_count,
        AVG(response_time_ms) AS avg_response_time,
        SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) AS error_count
      FROM api_usage_tracking
      WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY endpoint, method
      ORDER BY request_count DESC
      LIMIT 5
    `, [hours]);

    const topEndpoints = (topEndpointsRows || []).map(r => ({
      endpoint: r.endpoint,
      method: r.method,
      requestCount: r.request_count,
      avgResponseTime: r.avg_response_time ? Math.round(r.avg_response_time) : 0,
      errorRate: r.request_count > 0 ? Number(((r.error_count / r.request_count) * 100).toFixed(2)) : 0
    }));

    // System + cache stats for quick cards
    const mem = process.memoryUsage();
    const memoryUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
    const memoryTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
    const memoryPercent = memoryTotalMB > 0 ? Math.round((memoryUsedMB / memoryTotalMB) * 100) : 0;
    const uptimeSeconds = Math.round(process.uptime());
    const cacheStats = await cacheManager.getStats();
    const cacheHitRate = Number(parseFloat(cacheStats.hitRate || 0).toFixed(2));

    res.success({
      generatedAt: new Date().toISOString(),
      windowHours: hours,
      totals: {
        requests: totals.request_count || 0,
        successes: totals.success_count || 0,
        errors: totals.error_count || 0,
        errorRate: Number(errorRate.toFixed(2)),
        avgResponseTime: totals.avg_response_time ? Math.round(totals.avg_response_time) : 0
      },
      topEndpoints,
      system: {
        memoryUsedMB,
        memoryTotalMB,
        memoryPercent,
        uptimeSeconds
      },
      cache: {
        hitRate: cacheHitRate
      }
    }, 'UI summary retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Get performance dashboard data
router.get('/dashboard', authenticate, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const dashboardData = await performanceMonitor.getDashboardData();
    
    if (!dashboardData) {
      return res.status(500).json({
        success: false,
        message: 'Failed to retrieve dashboard data'
      });
    }
    
    res.success(dashboardData, 'Dashboard data retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Get detailed performance metrics
router.get('/metrics', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Get performance report
    const performanceReport = await performanceMonitor.getPerformanceReport(timeRange);
    
    // Get cache statistics
    const cacheStats = await cacheManager.getStats();
    
    // Get database health
    const dbHealth = getHealthStats();
    
    // Get file processing stats
    const processingStats = await fileProcessingService.getStats();
    
    // Get system metrics
    const systemMetrics = {
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      cpuUsage: process.cpuUsage(),
      version: process.version,
      platform: process.platform
    };
    
    res.success({
      performance: performanceReport,
      cache: cacheStats,
      database: dbHealth,
      fileProcessing: processingStats,
      system: systemMetrics,
      timestamp: new Date().toISOString()
    }, 'Performance metrics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Get real-time system status
router.get('/status', authenticate, async (req, res, next) => {
  try {
    const healthChecks = {
      database: false,
      cache: false,
      fileProcessing: false,
      system: true
    };
    
    // Check database connection
    try {
      await executeQuery('SELECT 1');
      healthChecks.database = true;
    } catch (error) {
      console.error('Database health check failed:', error);
    }
    
    // Check cache connection
    healthChecks.cache = await cacheManager.healthCheck();
    
    // Check file processing service
    try {
      const stats = await fileProcessingService.getStats();
      healthChecks.fileProcessing = stats !== null;
    } catch (error) {
      console.error('File processing health check failed:', error);
    }
    
    const overallHealth = Object.values(healthChecks).every(Boolean);
    
    const status = {
      status: overallHealth ? 'healthy' : 'degraded',
      services: healthChecks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    };
    
    res.status(overallHealth ? 200 : 503).json({
      success: true,
      data: status
    });
  } catch (error) {
    next(error);
  }
});

// Get API performance statistics
router.get('/api-stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { hours = 24 } = req.query;
    
    const [apiStats] = await executeQuery(`
      SELECT 
        endpoint,
        method,
        COUNT(*) as request_count,
        AVG(response_time_ms) as avg_response_time,
        MIN(response_time_ms) as min_response_time,
        MAX(response_time_ms) as max_response_time,
        STDDEV(response_time_ms) as response_time_stddev,
        SUM(CASE WHEN response_status >= 200 AND response_status < 300 THEN 1 ELSE 0 END) as success_count,
        SUM(CASE WHEN response_status >= 400 THEN 1 ELSE 0 END) as error_count,
        AVG(CASE WHEN response_status >= 200 AND response_status < 300 THEN response_time_ms END) as avg_success_time,
        AVG(CASE WHEN response_status >= 400 THEN response_time_ms END) as avg_error_time
      FROM api_usage_tracking 
      WHERE timestamp > DATE_SUB(NOW(), INTERVAL ? HOUR)
      GROUP BY endpoint, method
      ORDER BY request_count DESC
      LIMIT 50
    `, [hours]);
    
    const processedStats = apiStats.map(stat => ({
      ...stat,
      avg_response_time: Math.round(stat.avg_response_time * 100) / 100,
      min_response_time: Math.round(stat.min_response_time),
      max_response_time: Math.round(stat.max_response_time),
      response_time_stddev: Math.round((stat.response_time_stddev || 0) * 100) / 100,
      success_rate: ((stat.success_count / stat.request_count) * 100).toFixed(2),
      error_rate: ((stat.error_count / stat.request_count) * 100).toFixed(2)
    }));
    
    res.success(processedStats, 'API statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Get slow queries
router.get('/slow-queries', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    
    const [slowQueries] = await executeQuery(`
      SELECT 
        query_hash,
        query_type,
        execution_time_ms,
        query_text,
        executed_at,
        COUNT(*) as occurrence_count
      FROM slow_query_log 
      WHERE executed_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
      GROUP BY query_hash
      ORDER BY AVG(execution_time_ms) DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    res.success(slowQueries, 'Slow queries retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Cache management endpoints
router.post('/cache/clear', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { pattern } = req.body;
    
    if (pattern) {
      await cacheManager.deletePattern(pattern);
      res.success(null, `Cache cleared for pattern: ${pattern}`);
    } else {
      // Clear all cache - use with caution
      await cacheManager.deletePattern('*');
      res.success(null, 'All cache cleared');
    }
  } catch (error) {
    next(error);
  }
});

router.get('/cache/stats', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const stats = await cacheManager.getStats();
    res.success(stats, 'Cache statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Performance optimization suggestions
router.get('/optimization-suggestions', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const suggestions = [];
    
    // Check cache hit rate
    const cacheStats = await cacheManager.getStats();
    const hitRate = parseFloat(cacheStats.hitRate) || 0;
    
    if (hitRate < 70) {
      suggestions.push({
        type: 'cache',
        severity: 'warning',
        message: `Cache hit rate is ${hitRate}%. Consider reviewing cache strategies.`,
        recommendation: 'Increase cache TTL for frequently accessed data or improve cache key design.'
      });
    }
    
    // Check database performance
    const dbHealth = getHealthStats();
    if (dbHealth.slowQueries.length > 10) {
      suggestions.push({
        type: 'database',
        severity: 'warning',
        message: `${dbHealth.slowQueries.length} slow queries detected in recent activity.`,
        recommendation: 'Review and optimize slow queries, consider adding indexes.'
      });
    }
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    
    if (memUsagePercent > 80) {
      suggestions.push({
        type: 'memory',
        severity: 'critical',
        message: `Memory usage is at ${memUsagePercent.toFixed(2)}%.`,
        recommendation: 'Consider increasing available memory or optimizing memory usage.'
      });
    }
    
    // Check file processing queue
    const processingStats = await fileProcessingService.getStats();
    if (processingStats && processingStats.processing.waiting > 50) {
      suggestions.push({
        type: 'processing',
        severity: 'warning',
        message: `${processingStats.processing.waiting} files waiting in processing queue.`,
        recommendation: 'Consider scaling file processing workers or optimizing processing pipeline.'
      });
    }
    
    res.success({
      suggestions,
      generatedAt: new Date().toISOString(),
      totalSuggestions: suggestions.length
    }, 'Optimization suggestions generated successfully');
  } catch (error) {
    next(error);
  }
});

// Performance alerts configuration
router.get('/alerts', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [alerts] = await executeQuery(`
      SELECT 
        alert_type,
        alert_details,
        created_at,
        COUNT(*) as occurrence_count
      FROM performance_alerts 
      WHERE created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY alert_type, DATE(created_at)
      ORDER BY created_at DESC
      LIMIT 100
    `);
    
    res.success(alerts, 'Performance alerts retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Export performance data
router.get('/export', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { format = 'json', timeRange = '24h' } = req.query;
    
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        timeRange,
        format
      },
      performance: await performanceMonitor.getPerformanceReport(timeRange),
      cache: await cacheManager.getStats(),
      database: getHealthStats(),
      system: {
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        version: process.version
      }
    };
    
    if (format === 'csv') {
      // Convert to CSV format for easier analysis
      const csv = convertToCSV(exportData);
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=performance-export-${Date.now()}.csv`
      });
      res.send(csv);
    } else {
      res.set({
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=performance-export-${Date.now()}.json`
      });
      res.send(JSON.stringify(exportData, null, 2));
    }
  } catch (error) {
    next(error);
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  // Simple CSV conversion - in production, use a proper CSV library
  const rows = [];
  rows.push(['Metric', 'Value', 'Unit', 'Timestamp']);
  
  // Add performance metrics
  if (data.performance) {
    Object.entries(data.performance).forEach(([key, value]) => {
      rows.push([key, value.value || value, value.unit || '', data.metadata.exportedAt]);
    });
  }
  
  return rows.map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

module.exports = router;
