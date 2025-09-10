/**
 * Middleware to standardize API responses
 * Adds helper methods to the response object for consistent formatting
 */
const responseMiddleware = (req, res, next) => {
  // Success response
  res.success = (data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data: data || null
    });
  };

  // Created response
  res.created = (data, message = 'Resource created successfully') => {
    return res.status(201).json({
      success: true,
      message,
      data: data || null
    });
  };

  // No content response
  res.noContent = () => {
    return res.status(204).send();
  };

  // Error response
  res.error = (message, statusCode = 400, errors = null) => {
    const response = {
      success: false,
      error: {
        status: statusCode,
        message
      }
    };

    if (errors) {
      response.error.details = errors;
    }

    return res.status(statusCode).json(response);
  };

  // Bad request response
  res.badRequest = (message = 'Bad request', errors = null) => {
    return res.error(message, 400, errors);
  };

  // Unauthorized response
  res.unauthorized = (message = 'Unauthorized') => {
    return res.error(message, 401);
  };

  // Forbidden response
  res.forbidden = (message = 'Forbidden') => {
    return res.error(message, 403);
  };

  // Not found response
  res.notFound = (message = 'Resource not found') => {
    return res.error(message, 404);
  };

  // Server error response
  res.serverError = (message = 'Internal server error') => {
    return res.error(
      process.env.NODE_ENV === 'production' ? 'Internal server error' : message, 
      500
    );
  };

  next();
};

module.exports = responseMiddleware;
