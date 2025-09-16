# Auto-Grade System

An automated grading system that uses OCR technology and machine learning to evaluate student assignments and projects.

## Project Overview

The Auto-Grade system is a full-stack web application designed to automate the grading process for educational institutions. It supports three user roles:

1. **Administrators**: Full system access, user management, and system configuration
2. **Teachers**: Course management, assignment creation, and student submission review
3. **Students**: Assignment submission and feedback review

The system leverages OCR (Optical Character Recognition) and Machine Learning to analyze student submissions and provide automated grading and feedback.

## Directory Structure

```
Auto-grade/
├── backend/                  # Backend API server
│   ├── ml/                   # Machine learning components
│   │   ├── models/           # Trained ML models
│   │   ├── notebooks/        # Jupyter notebooks for model development
│   │   └── utils/            # ML utility functions
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
├── frontend/                 # Frontend web application
│   ├── public/               # Static assets
│   │   └── assets/           # Images, CSS, etc.
│   └── src/                  # Source code
│       ├── components/       # Reusable UI components
│       ├── pages/            # Page components
│       ├── services/         # API service functions
│       └── utils/            # Utility functions
├── .gitignore                # Git ignore file
└── README.md                 # Project README
```

## Technology Stack

### Backend
- Node.js with Express
- MySQL database
- JWT for authentication
- Python for ML components
- NBGrader integration

### Frontend
- React with Vite
- React Router for navigation
- Axios for API requests
- Bootstrap for styling

### Machine Learning
- PyTorch/TensorFlow for model development
- OCR technology for PDF text extraction
- NLP for text analysis and grading

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MySQL (v8+)
- Python (v3.8+)
- NBGrader

### Backend Setup
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env`
4. Edit the `.env` file with your configuration
5. Start the server: `npm run dev`

### Frontend Setup
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Copy environment file: `cp .env.example .env`
4. Edit the `.env` file with your configuration
5. Start the development server: `npm run dev`

### Database Setup
1. Create a MySQL database
2. Run the database schema: `mysql -u <username> -p <database_name> < backend/src/config/schema.sql`

## Development Workflow

1. Pull the latest changes from the main branch
2. Create a feature branch for your work
3. Make your changes and commit them
4. Push your branch and create a pull request
5. After review, merge the pull request

## Frontend ↔ Backend Connectivity (Updated)

The frontend now uses an environment-driven or proxied base URL for API calls.

Priority resolution order:
1. `VITE_API_URL` (e.g. `http://localhost:5001/api`)
2. Fallback relative `/api` path passed through Vite dev proxy.

Vite dev server proxy (see `frontend/vite.config.ts`):
```
proxy: {
	'/api': {
		target: process.env.VITE_BACKEND_ORIGIN || 'http://localhost:5001',
		changeOrigin: true,
		secure: false
	}
}
```
Ensure backend (dev container) is mapped to port 5001.

### Registration API
Backend routes require role segment: `/api/auth/register/student` or `/api/auth/register/teacher`.

RTK Query exposes `registerRole` mutation and the `useAuth` hook now expects an explicit role parameter:
```ts
// Direct mutation
const [registerRole] = useRegisterRoleMutation();
await registerRole({ role: 'student', data: { email, password, identifier, firstName, lastName } });

// Via useAuth (does not auto-login after registration)
const { register } = useAuth();
await register('student', { email, password, identifier, firstName, lastName });
```

### Environment Example
See `.env.example` at project root:
```
VITE_API_URL=http://localhost:5001/api
VITE_BACKEND_ORIGIN=http://localhost:5001
```

### Common Connectivity Pitfalls
- 404 on `/auth/*`: Missing `/api` prefix or proxy not active.
- CORS error: Add frontend origin(s) to `CORS_ORIGIN` env var.
- Password validation failures: Must match backend regex (length ≥6, upper, lower, digit, special `!@#$%^&*`).

### Health Check
Backend: `GET http://localhost:5001/api/health`
Frontend proxied (once running): `GET http://localhost:3000/api/health`


## Deployment

The application can be deployed using Docker containers for both the frontend and backend components.

## License

[MIT License](LICENSE)