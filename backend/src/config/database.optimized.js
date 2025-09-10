const mysql = require('mysql2/promise');
const { logger } = require('../utils/logger');

// Enhanced database configuration with optimization
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'user_management',
  charset: 'utf8mb4',
  timezone: '+00:00',
  
  // Connection Pool Configuration for High Performance
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
  acquireTimeout: 60000,
  timeout: 60000,
  reconnect: true,
  queueLimit: 0,
  
  // Performance optimizations
  multipleStatements: false,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: false
  } : false,
  
  // MySQL specific optimizations
  typeCast: function (field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return (field.string() === '1'); // Convert TINYINT(1) to boolean
    }
    return next();
  }
};

// Create optimized connection pool
const pool = mysql.createPool(dbConfig);

// Connection health monitoring
let connectionHealthStats = {
  totalConnections: 0,
  activeConnections: 0,
  errorCount: 0,
  lastError: null,
  averageResponseTime: 0,
  slowQueries: []
};

// Query performance monitoring
const monitorQuery = (query, params = []) => {
  return async (...args) => {
    const startTime = Date.now();
    try {
      const result = await pool.query(query, params, ...args);
      const duration = Date.now() - startTime;
      
      // Update performance stats
      connectionHealthStats.averageResponseTime = 
        (connectionHealthStats.averageResponseTime + duration) / 2;
      
      // Log slow queries (>1000ms)
      if (duration > 1000) {
        connectionHealthStats.slowQueries.push({
          query: query.substring(0, 100) + '...',
          duration,
          timestamp: new Date(),
          params: JSON.stringify(params).substring(0, 100)
        });
        
        // Keep only last 50 slow queries
        if (connectionHealthStats.slowQueries.length > 50) {
          connectionHealthStats.slowQueries.shift();
        }
        
        logger.warn(`Slow query detected: ${duration}ms`, {
          query: query.substring(0, 200),
          duration,
          params
        });
      }
      
      return result;
    } catch (error) {
      connectionHealthStats.errorCount++;
      connectionHealthStats.lastError = {
        message: error.message,
        timestamp: new Date(),
        query: query.substring(0, 100)
      };
      throw error;
    }
  };
};

// Enhanced query method with monitoring
const executeQuery = async (query, params = []) => {
  return monitorQuery(query, params)();
};

// Transaction wrapper with error handling
const executeTransaction = async (queries) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    const results = [];
    for (const { query, params } of queries) {
      const result = await connection.execute(query, params);
      results.push(result);
    }
    
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

// Connection health check
const testConnection = async () => {
  try {
    const startTime = Date.now();
    const connection = await pool.getConnection();
    const duration = Date.now() - startTime;
    
    connectionHealthStats.totalConnections++;
    connectionHealthStats.activeConnections = pool._allConnections.length;
    
    logger.info('Database connection established successfully', {
      duration,
      activeConnections: connectionHealthStats.activeConnections,
      connectionLimit: dbConfig.connectionLimit
    });
    
    connection.release();
    return true;
  } catch (error) {
    connectionHealthStats.errorCount++;
    connectionHealthStats.lastError = {
      message: error.message,
      timestamp: new Date()
    };
    logger.error('Database connection failed:', error.message);
    return false;
  }
};

// Get connection health statistics
const getHealthStats = () => {
  return {
    ...connectionHealthStats,
    poolInfo: {
      activeConnections: pool._allConnections ? pool._allConnections.length : 0,
      freeConnections: pool._freeConnections ? pool._freeConnections.length : 0,
      connectionLimit: dbConfig.connectionLimit
    }
  };
};

// Graceful shutdown
const closePool = async () => {
  try {
    await pool.end();
    logger.info('Database connection pool closed gracefully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
};

module.exports = { 
  pool, 
  testConnection, 
  executeQuery,
  executeTransaction,
  getHealthStats,
  closePool
};
