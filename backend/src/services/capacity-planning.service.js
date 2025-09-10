const { logger } = require('../utils/logger');
const { executeQuery } = require('../config/database.optimized');
const performanceMonitor = require('./performance-monitor.service');

class CapacityPlanningService {
  constructor() {
    this.growthModels = {
      userGrowth: {
        monthlyRate: 0.15, // 15% monthly growth
        seasonalFactors: {
          'Q1': 1.2, // Start of academic year
          'Q2': 1.0,
          'Q3': 0.8, // Summer break
          'Q4': 1.1
        }
      },
      usageGrowth: {
        fileProcessingRate: 0.20, // 20% growth in file processing
        databaseQueryRate: 0.18,  // 18% growth in queries
        cacheRequestRate: 0.25    // 25% growth in cache requests
      }
    };

    this.resourceThresholds = {
      cpu: 70,        // 70% CPU utilization target
      memory: 75,     // 75% memory utilization target
      storage: 80,    // 80% storage utilization target
      network: 60     // 60% network utilization target
    };
  }

  // Analyze current resource utilization trends
  async analyzeCurrentUtilization(timeRange = '30d') {
    try {
      const [metrics] = await executeQuery(`
        SELECT 
          metric_name,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          MIN(metric_value) as min_value,
          STDDEV(metric_value) as stddev_value,
          COUNT(*) as data_points
        FROM performance_metrics 
        WHERE recorded_at > DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY metric_name
        ORDER BY metric_name
      `, [parseInt(timeRange.replace('d', ''))]);

      // Calculate growth trends
      const [growthTrends] = await executeQuery(`
        SELECT 
          metric_name,
          DATE(recorded_at) as date,
          AVG(metric_value) as daily_avg
        FROM performance_metrics 
        WHERE recorded_at > DATE_SUB(NOW(), INTERVAL ? DAY)
        GROUP BY metric_name, DATE(recorded_at)
        ORDER BY metric_name, date
      `, [parseInt(timeRange.replace('d', ''))]);

      return {
        currentUtilization: this.processMetrics(metrics),
        growthTrends: this.calculateGrowthTrends(growthTrends),
        analysisTimestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to analyze current utilization:', error);
      throw error;
    }
  }

  // Project future resource needs
  async projectResourceNeeds(projectionMonths = 12) {
    try {
      const currentUtilization = await this.analyzeCurrentUtilization();
      const projections = [];

      for (let month = 1; month <= projectionMonths; month++) {
        const quarterFactor = this.getQuarterFactor(month);
        const userGrowthFactor = Math.pow(1 + this.growthModels.userGrowth.monthlyRate, month) * quarterFactor;
        
        const monthProjection = {
          month,
          projectedDate: new Date(Date.now() + (month * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
          userGrowthFactor,
          resourceProjections: this.calculateResourceProjections(currentUtilization.currentUtilization, userGrowthFactor, month),
          recommendations: []
        };

        // Generate scaling recommendations
        monthProjection.recommendations = this.generateScalingRecommendations(monthProjection.resourceProjections);
        projections.push(monthProjection);
      }

      return {
        projections,
        assumptions: this.growthModels,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to project resource needs:', error);
      throw error;
    }
  }

  // Calculate cost optimization recommendations
  async calculateCostOptimization() {
    try {
      const currentUtilization = await this.analyzeCurrentUtilization();
      const recommendations = [];

      // Analyze underutilized resources
      Object.entries(currentUtilization.currentUtilization).forEach(([resource, metrics]) => {
        if (metrics.avg_value < this.resourceThresholds[resource] * 0.5) {
          recommendations.push({
            type: 'downsize',
            resource,
            currentUtilization: metrics.avg_value,
            potentialSavings: this.calculatePotentialSavings(resource, metrics.avg_value),
            recommendation: `Consider downsizing ${resource} - current utilization is only ${metrics.avg_value.toFixed(2)}%`
          });
        }
      });

      // Analyze cache efficiency
      const cacheStats = await this.analyzeCacheEfficiency();
      if (cacheStats.hitRate < 70) {
        recommendations.push({
          type: 'optimize_cache',
          resource: 'cache',
          currentEfficiency: cacheStats.hitRate,
          potentialSavings: this.calculateCacheSavings(cacheStats.hitRate),
          recommendation: `Optimize cache strategy - hit rate is only ${cacheStats.hitRate}%`
        });
      }

      // Database optimization opportunities
      const dbOptimizations = await this.analyzeDatabaseOptimization();
      recommendations.push(...dbOptimizations);

      return {
        recommendations,
        totalPotentialSavings: recommendations.reduce((sum, rec) => sum + (rec.potentialSavings || 0), 0),
        analysisDate: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Failed to calculate cost optimization:', error);
      throw error;
    }
  }

  // Generate auto-scaling configuration
  async generateAutoScalingConfig() {
    try {
      const currentUtilization = await this.analyzeCurrentUtilization();
      
      const autoScalingConfig = {
        services: {
          backend: {
            minInstances: 2,
            maxInstances: 10,
            scaleUpThreshold: {
              cpu: 70,
              memory: 75,
              responseTime: 2000
            },
            scaleDownThreshold: {
              cpu: 30,
              memory: 40,
              responseTime: 500
            },
            cooldownPeriod: 300 // seconds
          },
          fileProcessor: {
            minInstances: 1,
            maxInstances: 8,
            scaleUpThreshold: {
              queueSize: 50,
              cpu: 80
            },
            scaleDownThreshold: {
              queueSize: 10,
              cpu: 20
            },
            cooldownPeriod: 600
          },
          mlService: {
            minInstances: 1,
            maxInstances: 4,
            scaleUpThreshold: {
              cpu: 75,
              responseTime: 10000
            },
            scaleDownThreshold: {
              cpu: 25,
              responseTime: 3000
            },
            cooldownPeriod: 900
          }
        },
        database: {
          connectionPooling: {
            minConnections: 10,
            maxConnections: Math.max(20, Math.ceil(currentUtilization.currentUtilization.db_active_connections?.avg_value * 2)),
            adaptiveScaling: true
          }
        },
        cache: {
          memory: {
            maxMemory: '512mb',
            evictionPolicy: 'allkeys-lru',
            adaptiveExpiry: true
          }
        }
      };

      return autoScalingConfig;
    } catch (error) {
      logger.error('Failed to generate auto-scaling config:', error);
      throw error;
    }
  }

  // Monitor and alert on capacity thresholds
  async checkCapacityAlerts() {
    try {
      const alerts = [];
      const currentUtilization = await this.analyzeCurrentUtilization('7d');

      // Check CPU utilization
      if (currentUtilization.currentUtilization.cpu_usage_5m?.avg_value > this.resourceThresholds.cpu) {
        alerts.push({
          type: 'capacity_warning',
          resource: 'cpu',
          currentValue: currentUtilization.currentUtilization.cpu_usage_5m.avg_value,
          threshold: this.resourceThresholds.cpu,
          recommendation: 'Consider scaling up CPU resources or optimizing CPU-intensive operations'
        });
      }

      // Check memory utilization
      if (currentUtilization.currentUtilization.memory_usage_mb?.avg_value > this.resourceThresholds.memory) {
        alerts.push({
          type: 'capacity_warning',
          resource: 'memory',
          currentValue: currentUtilization.currentUtilization.memory_usage_mb.avg_value,
          threshold: this.resourceThresholds.memory,
          recommendation: 'Consider increasing memory allocation or optimizing memory usage'
        });
      }

      // Check storage utilization
      const storageUtilization = await this.getStorageUtilization();
      if (storageUtilization > this.resourceThresholds.storage) {
        alerts.push({
          type: 'capacity_critical',
          resource: 'storage',
          currentValue: storageUtilization,
          threshold: this.resourceThresholds.storage,
          recommendation: 'Urgent: Increase storage capacity or implement data archival'
        });
      }

      return alerts;
    } catch (error) {
      logger.error('Failed to check capacity alerts:', error);
      return [];
    }
  }

  // Helper methods
  processMetrics(metrics) {
    return metrics.reduce((acc, metric) => {
      acc[metric.metric_name] = {
        avg_value: parseFloat(metric.avg_value),
        max_value: parseFloat(metric.max_value),
        min_value: parseFloat(metric.min_value),
        stddev_value: parseFloat(metric.stddev_value),
        data_points: metric.data_points
      };
      return acc;
    }, {});
  }

  calculateGrowthTrends(trends) {
    const grouped = trends.reduce((acc, trend) => {
      if (!acc[trend.metric_name]) acc[trend.metric_name] = [];
      acc[trend.metric_name].push({
        date: trend.date,
        value: parseFloat(trend.daily_avg)
      });
      return acc;
    }, {});

    return Object.entries(grouped).reduce((acc, [metric, data]) => {
      acc[metric] = this.calculateLinearRegression(data);
      return acc;
    }, {});
  }

  calculateLinearRegression(data) {
    if (data.length < 2) return { slope: 0, trend: 'insufficient_data' };

    const n = data.length;
    const sumX = data.reduce((sum, _, index) => sum + index, 0);
    const sumY = data.reduce((sum, point) => sum + point.value, 0);
    const sumXY = data.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = data.reduce((sum, _, index) => sum + (index * index), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    return {
      slope,
      trend: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'decreasing' : 'stable',
      dailyGrowthRate: (slope / (sumY / n)) * 100
    };
  }

  getQuarterFactor(month) {
    const quarter = Math.ceil((new Date().getMonth() + month) / 3);
    const quarterKey = `Q${((quarter - 1) % 4) + 1}`;
    return this.growthModels.userGrowth.seasonalFactors[quarterKey];
  }

  calculateResourceProjections(currentUtilization, userGrowthFactor, month) {
    const projections = {};
    
    Object.entries(currentUtilization).forEach(([resource, metrics]) => {
      const baseGrowth = userGrowthFactor;
      const usageGrowth = 1 + (this.growthModels.usageGrowth[resource + 'Rate'] || 0.1) * (month / 12);
      
      projections[resource] = {
        current: metrics.avg_value,
        projected: metrics.avg_value * baseGrowth * usageGrowth,
        growthFactor: baseGrowth * usageGrowth,
        utilizationPercentage: (metrics.avg_value * baseGrowth * usageGrowth / 100) * 100
      };
    });

    return projections;
  }

  generateScalingRecommendations(resourceProjections) {
    const recommendations = [];

    Object.entries(resourceProjections).forEach(([resource, projection]) => {
      if (projection.utilizationPercentage > this.resourceThresholds[resource]) {
        const scaleFactor = Math.ceil(projection.utilizationPercentage / this.resourceThresholds[resource]);
        recommendations.push({
          resource,
          action: 'scale_up',
          scaleFactor,
          reason: `Projected utilization (${projection.utilizationPercentage.toFixed(2)}%) exceeds threshold (${this.resourceThresholds[resource]}%)`
        });
      }
    });

    return recommendations;
  }

  calculatePotentialSavings(resource, currentUtilization) {
    // Simplified cost calculation - in production, use actual cloud pricing
    const resourceCosts = {
      cpu: 0.05, // per hour per core
      memory: 0.01, // per hour per GB
      storage: 0.001 // per hour per GB
    };

    const utilizationDiff = this.resourceThresholds[resource] - currentUtilization;
    const potentialReduction = utilizationDiff / 100;
    
    return (resourceCosts[resource] || 0) * potentialReduction * 24 * 30; // Monthly savings
  }

  async analyzeCacheEfficiency() {
    try {
      const [cacheMetrics] = await executeQuery(`
        SELECT 
          AVG(CASE WHEN metric_name = 'cache_hit_rate' THEN metric_value END) as hit_rate,
          AVG(CASE WHEN metric_name = 'cache_memory_usage' THEN metric_value END) as memory_usage
        FROM performance_metrics 
        WHERE recorded_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      return {
        hitRate: cacheMetrics[0]?.hit_rate || 0,
        memoryUsage: cacheMetrics[0]?.memory_usage || 0
      };
    } catch (error) {
      logger.error('Failed to analyze cache efficiency:', error);
      return { hitRate: 0, memoryUsage: 0 };
    }
  }

  calculateCacheSavings(hitRate) {
    const targetHitRate = 85;
    const improvementPotential = (targetHitRate - hitRate) / 100;
    return improvementPotential * 50; // Estimated monthly savings
  }

  async analyzeDatabaseOptimization() {
    const recommendations = [];

    try {
      const [slowQueries] = await executeQuery(`
        SELECT COUNT(*) as slow_query_count
        FROM slow_query_log 
        WHERE executed_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      if (slowQueries[0].slow_query_count > 100) {
        recommendations.push({
          type: 'optimize_database',
          resource: 'database',
          currentIssue: `${slowQueries[0].slow_query_count} slow queries in last 7 days`,
          potentialSavings: 25,
          recommendation: 'Optimize slow queries and add missing indexes'
        });
      }

      return recommendations;
    } catch (error) {
      logger.error('Failed to analyze database optimization:', error);
      return [];
    }
  }

  async getStorageUtilization() {
    try {
      const [storageInfo] = await executeQuery(`
        SELECT 
          SUM(data_length + index_length) / 1024 / 1024 / 1024 as used_gb
        FROM information_schema.tables 
        WHERE table_schema = DATABASE()
      `);

      // Simplified calculation - in production, check actual disk usage
      const totalStorage = 100; // GB
      const usedStorage = storageInfo[0].used_gb || 0;
      
      return (usedStorage / totalStorage) * 100;
    } catch (error) {
      logger.error('Failed to get storage utilization:', error);
      return 0;
    }
  }
}

module.exports = new CapacityPlanningService();
