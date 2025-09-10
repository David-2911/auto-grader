const dotenv = require('dotenv');
const path = require('path');
const { logger } = require('../utils/logger');

// Load appropriate env file based on environment
const loadEnvConfig = () => {
  const env = process.env.NODE_ENV || 'development';
  const envPath = path.resolve(process.cwd(), `.env.${env}`);
  
  // Try loading environment-specific config first, fall back to default .env
  const envResult = dotenv.config({ path: envPath });
  
  if (envResult.error) {
    // Fall back to default .env file
    dotenv.config();
    logger.info(`Using default environment configuration`);
  } else {
    logger.info(`Loaded environment configuration for ${env}`);
  }
  
  return {
    env,
    isProduction: env === 'production',
    isDevelopment: env === 'development',
    isTest: env === 'test',
  };
};

// Create unified configuration object
const config = {
  ...loadEnvConfig(),
  
  // Server config
  server: {
    port: parseInt(process.env.PORT || '5000', 10),
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    apiPrefix: process.env.API_PREFIX || '/api',
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  },
  
  // Database config
  database: {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'auto_grade',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
  },
  
  // Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10),
  },
  
  // File storage
  storage: {
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../storage'),
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB in bytes
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES ? 
      process.env.ALLOWED_FILE_TYPES.split(',') : 
      ['application/pdf', 'text/plain', 'application/json', 'application/x-ipynb+json'],
  },
  
  // ML service
  ml: {
    modelBasePath: process.env.ML_MODEL_BASE_PATH || path.join(__dirname, '../../ml/models'),
    confidenceThreshold: parseFloat(process.env.ML_CONFIDENCE_THRESHOLD || '0.75'),
    maxProcessingTime: parseInt(process.env.ML_MAX_PROCESSING_TIME || '300000', 10), // 5 minutes
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5', 10),
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },
};

module.exports = config;
