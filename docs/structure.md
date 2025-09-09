# Auto-Grade Project Structure

This document provides an overview of the new Auto-Grade project structure that has been reorganized for better separation of concerns, maintainability, and scalability.

## Directory Structure Overview

```
Auto-grade/
├── backend/                  # Backend API server
│   ├── ml/                   # Machine learning components
│   │   ├── models/           # Trained ML models
│   │   ├── notebooks/        # Jupyter notebooks for model development
│   │   ├── services/         # ML service integration
│   │   └── utils/            # ML utility scripts
│   ├── src/                  # Source code
│   │   ├── config/           # Configuration files
│   │   ├── controllers/      # Request handlers
│   │   ├── middleware/       # Middleware functions
│   │   ├── models/           # Database models
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   └── utils/            # Utility functions
│   ├── storage/              # File storage
│   │   ├── nbgrader_assignments/  # NBGrader assignments
│   │   ├── nbgrader_feedback/     # NBGrader feedback
│   │   ├── nbgrader_submissions/  # NBGrader submissions
│   │   ├── question_pdfs/         # Assignment PDFs
│   │   └── submission_pdfs/       # Student submission PDFs
│   └── tests/                # Test files
├── docs/                     # Documentation
│   ├── api/                  # API documentation
│   ├── architecture/         # System architecture docs
│   └── setup/                # Setup guides
└── frontend/                 # Frontend web application
    ├── public/               # Static assets
    │   └── assets/           # Images, CSS, etc.
    └── src/                  # Source code
        ├── components/       # Reusable UI components
        ├── models/           # TypeScript models/interfaces
        ├── pages/            # Page components
        ├── services/         # API service functions
        └── utils/            # Utility functions
```

## Key Changes

1. **Separated Frontend and Backend**: The application now follows a clear separation between the frontend (client) and backend (server) parts.

2. **Organized ML Components**: Machine learning components are now in a dedicated directory with clear separation of models, notebooks, and utilities.

3. **RESTful API Structure**: Backend follows RESTful principles with clear routes, controllers, models, and services structure.

4. **Centralized Storage**: All file storage is centralized in the backend/storage directory for better organization.

5. **Modern Frontend Architecture**: Frontend follows a component-based architecture with separation of concerns.

6. **Configuration Files**: Environment configuration templates and package files for easy setup and deployment.

7. **Comprehensive Documentation**: Dedicated documentation directory for all aspects of the system.

## Getting Started

Please refer to the main README.md file for instructions on setting up and running the application.

## Previous Files

All previous files have been moved to their appropriate locations in the new structure. The old directories have been removed to prevent redundancy.

A backup of the original files was created at `/tmp/autograde-backup/` for reference if needed.
