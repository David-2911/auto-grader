const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { logger, httpLogStream } = require('./src/utils/logger');
const responseMiddleware = require('./src/middleware/response.middleware');
const { testConnection } = require('./src/config/database.optimized');
const cacheManager = require('./src/services/cache.service');
const performanceMonitor = require('./src/services/performance-monitor.service');
const {
  performanceMiddleware,
  requestSizeMiddleware,
  memoryMonitoringMiddleware,
  createAdaptiveRateLimit,
  validateRequestSize,
  cacheOptimizationMiddleware,
  intelligentCompression,
  performanceErrorHandler
} = require('./src/middleware/performance.middleware');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for correct IP addresses in load balanced environments
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration with performance considerations
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Compression middleware with intelligent compression
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Request size validation
app.use(validateRequestSize(50 * 1024 * 1024)); // 50MB max

// HTTP request logging
app.use(morgan('combined', { stream: httpLogStream }));

// Performance monitoring middleware
app.use(performanceMiddleware);
app.use(requestSizeMiddleware);
app.use(memoryMonitoringMiddleware);

// Cache optimization
app.use(cacheOptimizationMiddleware());

// Rate limiting with adaptive scaling
app.use(createAdaptiveRateLimit(100, 15 * 60 * 1000)); // 100 req/15min base

// Body parsing with size limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 1000
}));

// Success response middleware
app.use(responseMiddleware);

// Serve static files with optimized caching
app.use('/storage', express.static(path.join(__dirname, 'storage'), {
  maxAge: '1y',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf') || path.endsWith('.doc') || path.endsWith('.docx')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for documents
    }
  }
}));

// Import routes
const authRoutes = require('./src/routes/auth.routes');
const userRoutes = require('./src/routes/user.routes');
const assignmentRoutes = require('./src/routes/assignment.routes');
const adminRoutes = require('./src/routes/admin.routes');
const teacherRoutes = require('./src/routes/teacher.routes');
const studentRoutes = require('./src/routes/student.routes');
const fileRoutes = require('./src/routes/file.routes');
const performanceRoutes = require('./src/routes/performance.routes');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/performance', performanceRoutes);

// Health check endpoints
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP', 
    timestamp: new Date(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

app.get('/api/health/detailed', async (req, res) => {
  const healthChecks = {
    server: true,
    database: false,
    cache: false,
    memory: process.memoryUsage().heapUsed / process.memoryUsage().heapTotal < 0.9
  };

  // Check database
  try {
    healthChecks.database = await testConnection();
  } catch (error) {
    logger.error('Database health check failed:', error);
  }

  // Check cache
  try {
    healthChecks.cache = await cacheManager.healthCheck();
  } catch (error) {
    logger.error('Cache health check failed:', error);
  }

  const allHealthy = Object.values(healthChecks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'UP' : 'DEGRADED',
    checks: healthChecks,
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Prometheus metrics endpoint
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await performanceMonitor.getDashboardData();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    
    // Convert metrics to Prometheus format
    let prometheusMetrics = '';
    
    if (metrics.systemHealth) {
      prometheusMetrics += `# HELP autograder_memory_usage_bytes Memory usage in bytes\n`;
      prometheusMetrics += `# TYPE autograder_memory_usage_bytes gauge\n`;
      prometheusMetrics += `autograder_memory_usage_bytes ${metrics.systemHealth.memory.used * 1024 * 1024}\n\n`;
      
      prometheusMetrics += `# HELP autograder_uptime_seconds Server uptime in seconds\n`;
      prometheusMetrics += `# TYPE autograder_uptime_seconds counter\n`;
      prometheusMetrics += `autograder_uptime_seconds ${metrics.systemHealth.uptime}\n\n`;
    }

    if (metrics.apiPerformance) {
      prometheusMetrics += `# HELP autograder_api_requests_total Total API requests\n`;
      prometheusMetrics += `# TYPE autograder_api_requests_total counter\n`;
      
      metrics.apiPerformance.forEach(api => {
        prometheusMetrics += `autograder_api_requests_total{endpoint="${api.endpoint}",method="${api.method}"} ${api.request_count}\n`;
      });
    }

    res.send(prometheusMetrics);
  } catch (error) {
    logger.error('Failed to generate Prometheus metrics:', error);
    res.status(500).send('# Error generating metrics');
  }
});

// Performance error handling
app.use(performanceErrorHandler);

// Global error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  res.status(err.status || 500).json({
    error: true,
    message: process.env.NODE_ENV === 'production' ? 'Server Error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: true,
    message: 'Route not found'
  });
});

// Graceful shutdown handling
const gracefulShutdown = async (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  const server = app.listen(PORT);
  
  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    
    try {
      // Close database connections
      if (typeof closePool === 'function') {
        await closePool();
      }
      
      // Close cache connections
      await cacheManager.disconnect();
      
      logger.info('All connections closed. Exiting process.');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force close after 30 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start server with enhanced initialization
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Initialize cache
    const cacheConnected = await cacheManager.connect();
    if (!cacheConnected) {
      logger.warn('Failed to connect to cache. Continuing without cache...');
    }

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
      logger.info(`Health check available at http://localhost:${PORT}/api/health`);
      logger.info(`Performance metrics at http://localhost:${PORT}/api/metrics`);
    });

    // Set server timeouts for better performance
    server.timeout = 30000; // 30 seconds
    server.keepAliveTimeout = 65000; // 65 seconds
    server.headersTimeout = 66000; // 66 seconds

    return server;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Only start server if this file is run directly
if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
      logger.error('Failed to connect to database. Server not started.');
      process.exit(1);
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app; // For testing purposes
