/**
 * Create a custom error object with status code
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {Object} additionalInfo - Additional error information
 * @returns {Error} - Custom error object
 */
const createError = (statusCode, message, additionalInfo = {}) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.additionalInfo = additionalInfo;
  return error;
};

/**
 * Handle API errors in a consistent way
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 && process.env.NODE_ENV === 'production' 
    ? 'Internal Server Error' 
    : err.message;
  
  // Prepare response object
  const errorResponse = {
    success: false,
    error: {
      status: statusCode,
      message
    }
  };
  
  // Add stack trace in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.error.stack = err.stack;
    
    if (err.additionalInfo) {
      errorResponse.error.additionalInfo = err.additionalInfo;
    }
  }
  
  // Send response
  res.status(statusCode).json(errorResponse);
};

/**
 * Handle 404 errors for routes that don't exist
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      status: 404,
      message: `Route not found: ${req.method} ${req.originalUrl}`
    }
  });
};

module.exports = {
  createError,
  errorHandler,
  notFoundHandler
};
