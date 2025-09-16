console.log('=== DEBUGGING SERVER STARTUP ===');

try {
  console.log('1. Loading dependencies...');
  const express = require('express');
  const cors = require('cors');
  const path = require('path');
  const dotenv = require('dotenv');
  console.log('Basic dependencies loaded');

  console.log('2. Loading dotenv...');
  dotenv.config();
  console.log('Environment loaded');

  console.log('3. Loading logger...');
  const { logger, httpLogStream } = require('./src/utils/logger');
  console.log('Logger loaded');

  console.log('4. Loading database...');
  const { testConnection } = require('./src/config/database.optimized');
  console.log('Database module loaded');

  console.log('5. Loading cache...');
  const cacheManager = require('./src/services/cache.service');
  console.log('Cache module loaded');

  console.log('6. Loading performance monitor...');
  const performanceMonitor = require('./src/services/performance-monitor.service');
  console.log('Performance monitor loaded');

  console.log('7. Loading middleware...');
  const responseMiddleware = require('./src/middleware/response.middleware');
  console.log('Response middleware loaded');

  const {
    performanceMiddleware,
    requestSizeMiddleware,
    memoryMonitoringMiddleware,
    createAdaptiveRateLimit,
    validateRequestSize,
    cacheOptimizationMiddleware,
    performanceErrorHandler
  } = require('./src/middleware/performance.middleware');
  console.log('Performance middleware loaded');

  console.log('8. Testing connections...');
  testConnection().then(dbOk => {
    console.log('Database test result:', dbOk);
    return cacheManager.connect();
  }).then(cacheOk => {
    console.log('Cache test result:', cacheOk);
    console.log('=== ALL MODULES LOADED SUCCESSFULLY ===');
  }).catch(err => {
    console.error('Connection test failed:', err.message);
  });

} catch (error) {
  console.error('Failed to load modules:', error.message);
  console.error('Stack:', error.stack);
}