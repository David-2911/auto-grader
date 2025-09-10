# Auto-Grade Backend API Architecture

This document outlines the architecture of the Auto-Grade backend API, which serves as the central hub for all client applications and external integrations.

## Architecture Overview

The Auto-Grade backend implements a layered architecture pattern with the following components:

1. **Routes Layer**: Handles HTTP requests and delegates to controllers
2. **Controllers Layer**: Implements request handling logic and invokes services
3. **Services Layer**: Contains business logic and domain operations
4. **Data Access Layer**: Manages database interactions
5. **Utilities**: Cross-cutting concerns like logging, error handling, etc.

## Key Features

- **RESTful API Design**: Implements standard REST principles for resource access
- **Authentication/Authorization**: JWT-based authentication with role-based access control
- **Input Validation**: Comprehensive validation for all API endpoints
- **Error Handling**: Standardized error responses with appropriate HTTP status codes
- **Logging**: Structured logging for debugging and monitoring
- **Rate Limiting**: Protection against abuse with configurable rate limits
- **API Documentation**: OpenAPI/Swagger documentation

## Directory Structure

```
backend/
├── server.js                # Application entry point
├── src/
│   ├── config/              # Configuration files
│   │   ├── config.js        # Environment-specific configuration
│   │   ├── database.js      # Database connection setup
│   │   ├── swagger.js       # API documentation setup
│   │   └── *.sql            # Database schema files
│   ├── controllers/         # Request handlers
│   │   ├── auth.controller.js
│   │   ├── user.controller.js
│   │   └── ...
│   ├── middleware/          # Express middleware
│   │   ├── auth.middleware.js    # Authentication/authorization
│   │   ├── validator.middleware.js # Input validation
│   │   ├── upload.middleware.js  # File upload handling
│   │   ├── response.middleware.js # Response formatting
│   │   ├── logging.middleware.js  # Request logging
│   │   └── rate-limit.middleware.js # Rate limiting
│   ├── models/              # Data models
│   │   ├── user.model.js
│   │   ├── course.model.js
│   │   └── ...
│   ├── routes/              # API routes
│   │   ├── auth.routes.js
│   │   ├── user.routes.js
│   │   └── ...
│   ├── services/            # Business logic
│   │   ├── auth.service.js
│   │   ├── user.service.js
│   │   ├── course.service.js
│   │   ├── health.service.js
│   │   └── ...
│   └── utils/               # Utility functions
│       ├── logger.js        # Logging utility
│       ├── error.util.js    # Error handling utility
│       └── ...
├── storage/                 # File storage
├── logs/                    # Application logs
└── tests/                   # Tests
```

## API Authentication

The API uses JWT (JSON Web Tokens) for authentication. The authentication flow works as follows:

1. User logs in with email/password or registers a new account
2. Server validates credentials and issues access and refresh tokens
3. Client includes access token in the Authorization header for subsequent requests
4. Server validates token and authorizes access based on user role
5. When the access token expires, client can use refresh token to get a new access token

## User Roles and Permissions

The system supports three primary user roles:

1. **Student**: Can view and submit assignments, access their own grades and feedback
2. **Teacher**: Can create and manage courses, assignments, and view/grade submissions
3. **Admin**: Has full access to all system features and management capabilities

## Error Handling

All API endpoints use a standardized error response format:

```json
{
  "success": false,
  "error": {
    "status": 400,
    "message": "Validation error",
    "details": [
      {
        "field": "email",
        "message": "Please provide a valid email"
      }
    ]
  }
}
```

## Health Monitoring

The API includes health check endpoints that provide information about system status:

- `/api/health`: Basic health status
- `/api/health/details`: Detailed system health information (admin only)
- `/api/health/database`: Database health information (admin only)
- `/api/health/server`: Server resource usage information (admin only)

## API Documentation

API documentation is available at `/api-docs` when the server is running, providing detailed information about all endpoints, request/response formats, and authentication requirements.

## Configuration

The application is configured using environment variables. Default values are provided, but can be overridden by creating a `.env` file or by setting environment variables directly.

Environment-specific configurations can be created using `.env.development`, `.env.production`, etc. files.

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file based on `.env.development`
4. Start the development server: `npm run dev`
5. Access the API documentation at `http://localhost:5000/api-docs`
