const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const path = require('path');
const config = require('./config');

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Auto-Grade API',
      version: '1.0.0',
      description: 'API documentation for the Auto-Grade system',
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      contact: {
        name: 'Auto-Grade Support',
        email: 'support@auto-grade.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.server.port}${config.server.apiPrefix}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false,
            },
            error: {
              type: 'object',
              properties: {
                status: {
                  type: 'integer',
                  example: 400,
                },
                message: {
                  type: 'string',
                  example: 'Error message',
                },
                details: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      field: {
                        type: 'string',
                        example: 'email',
                      },
                      message: {
                        type: 'string',
                        example: 'Email is required',
                      },
                    },
                  },
                },
              },
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'user@example.com',
            },
            role: {
              type: 'string',
              enum: ['student', 'teacher', 'admin'],
              example: 'student',
            },
            identifier: {
              type: 'string',
              example: 'STU001',
            },
            firstName: {
              type: 'string',
              example: 'John',
            },
            lastName: {
              type: 'string',
              example: 'Doe',
            },
            profileImage: {
              type: 'string',
              nullable: true,
              example: '/uploads/profiles/user1.jpg',
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z',
            },
          },
        },
        Course: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            code: {
              type: 'string',
              example: 'CS101',
            },
            title: {
              type: 'string',
              example: 'Introduction to Programming',
            },
            description: {
              type: 'string',
              nullable: true,
              example: 'An introductory course to programming concepts',
            },
            credits: {
              type: 'integer',
              example: 3,
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            startDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '2023-09-01',
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              example: '2023-12-15',
            },
            teacherId: {
              type: 'integer',
              example: 2,
            },
            teacherName: {
              type: 'string',
              example: 'Jane Smith',
            },
            syllabusPath: {
              type: 'string',
              nullable: true,
              example: '/uploads/syllabi/cs101.pdf',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z',
            },
          },
        },
        Assignment: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            title: {
              type: 'string',
              example: 'Programming Basics',
            },
            description: {
              type: 'string',
              example: 'Complete the programming exercises',
            },
            courseId: {
              type: 'integer',
              example: 1,
            },
            categoryId: {
              type: 'integer',
              nullable: true,
              example: 2,
            },
            openDate: {
              type: 'string',
              format: 'date-time',
              example: '2023-09-10T00:00:00.000Z',
            },
            deadline: {
              type: 'string',
              format: 'date-time',
              example: '2023-09-17T23:59:59.000Z',
            },
            lateDeadline: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2023-09-19T23:59:59.000Z',
            },
            latePenalty: {
              type: 'number',
              format: 'float',
              example: 10.0,
            },
            totalPoints: {
              type: 'number',
              format: 'float',
              example: 100.0,
            },
            isActive: {
              type: 'boolean',
              example: true,
            },
            isGroupAssignment: {
              type: 'boolean',
              example: false,
            },
            maxAttempts: {
              type: 'integer',
              example: 1,
            },
            questionPdf: {
              type: 'string',
              nullable: true,
              example: '/uploads/questions/assignment1.pdf',
            },
            submissionFormat: {
              type: 'string',
              enum: ['pdf', 'code', 'notebook', 'text'],
              example: 'pdf',
            },
            gradingMethod: {
              type: 'string',
              enum: ['auto', 'manual', 'hybrid'],
              example: 'auto',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              example: '2023-01-01T00:00:00.000Z',
            },
          },
        },
        Submission: {
          type: 'object',
          properties: {
            id: {
              type: 'integer',
              example: 1,
            },
            assignmentId: {
              type: 'integer',
              example: 1,
            },
            studentId: {
              type: 'integer',
              example: 3,
            },
            submissionNumber: {
              type: 'integer',
              example: 1,
            },
            submissionPdf: {
              type: 'string',
              nullable: true,
              example: '/uploads/submissions/submission1.pdf',
            },
            submissionText: {
              type: 'string',
              nullable: true,
              example: 'This is my submission',
            },
            submissionCode: {
              type: 'string',
              nullable: true,
              example: 'console.log("Hello World");',
            },
            submissionNotebook: {
              type: 'string',
              nullable: true,
              example: '/uploads/submissions/notebook1.ipynb',
            },
            status: {
              type: 'string',
              enum: ['submitted', 'processing', 'graded', 'error'],
              example: 'submitted',
            },
            isLate: {
              type: 'boolean',
              example: false,
            },
            grade: {
              type: 'number',
              format: 'float',
              nullable: true,
              example: 85.5,
            },
            normalizedGrade: {
              type: 'number',
              format: 'float',
              nullable: true,
              example: 80.0,
            },
            submissionTime: {
              type: 'string',
              format: 'date-time',
              example: '2023-09-15T10:30:00.000Z',
            },
            gradedAt: {
              type: 'string',
              format: 'date-time',
              nullable: true,
              example: '2023-09-16T14:20:00.000Z',
            },
            isAutoGraded: {
              type: 'boolean',
              example: true,
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Access token is missing or invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  status: 401,
                  message: 'Access denied. No token provided.',
                },
              },
            },
          },
        },
        ForbiddenError: {
          description: 'User does not have permission to access this resource',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  status: 403,
                  message: 'You do not have permission to access this resource.',
                },
              },
            },
          },
        },
        NotFoundError: {
          description: 'The requested resource was not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  status: 404,
                  message: 'Resource not found',
                },
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  status: 400,
                  message: 'Validation error',
                  details: [
                    {
                      field: 'email',
                      message: 'Please provide a valid email',
                    },
                    {
                      field: 'password',
                      message: 'Password must be at least 6 characters long',
                    },
                  ],
                },
              },
            },
          },
        },
        ServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                success: false,
                error: {
                  status: 500,
                  message: 'Internal server error',
                },
              },
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../controllers/*.js'),
  ],
};

// Initialize swagger-jsdoc
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Function to setup Swagger UI
const setupSwagger = (app) => {
  // Serve swagger docs
  app.use(
    '/api-docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customCss: '.swagger-ui .topbar { display: none }',
      customSiteTitle: 'Auto-Grade API Documentation',
    })
  );

  // Serve swagger spec as JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  console.log(`📚 Swagger API documentation available at /api-docs`);
};

module.exports = { setupSwagger };
