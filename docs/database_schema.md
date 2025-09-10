# Auto-Grade Database Schema

## Overview

This document explains the comprehensive database schema for the Auto-Grade system. The schema is designed to support all aspects of the automated grading platform, including user management, course administration, assignment creation, submission tracking, and ML-based grading.

## Database Structure

The database is organized into several logical sections:

1. **User Management**
2. **Course Management**
3. **Assignment Management**
4. **Submission and Grading**
5. **ML Model Management**
6. **System Management and Audit**

## Tables and Relationships

### User Management

#### `users`
- Core user table containing authentication details and basic information
- Role-based design (student, teacher, admin) with common attributes
- Indexed fields for performance: `email`, `identifier`, `role`

#### Role-specific Profile Tables
- `student_profiles`: Student-specific attributes
- `teacher_profiles`: Teacher-specific attributes
- `admin_profiles`: Admin-specific attributes

#### Authentication
- `refresh_tokens`: JWT refresh token storage
- `password_reset`: Password reset tokens

### Course Management

#### `courses`
- Core course information
- Linked to a teacher as the primary instructor
- Includes active status, date ranges, and credit information

#### `course_assistants`
- Teaching assistants or co-instructors for courses
- Allows multiple teachers to collaborate on a course

#### `enrollments`
- Student enrollment in courses
- Tracks status (active, withdrawn, completed)
- Stores final grades

### Assignment Management

#### `assignment_categories`
- Categories of assignments with weight in final grade
- Allows flexible grading schemes (e.g., "Homework 30%, Projects 40%, Exams 30%")

#### `assignments`
- Detailed assignment specifications
- Support for various submission formats and grading methods
- Deadline management with late submission handling

#### `assignment_questions`
- Structured questions within assignments
- Support for different question types (multiple choice, essay, code, etc.)
- Expected answers and grading rubrics

#### `question_options`
- Options for multiple-choice questions
- Tracks correct answers for auto-grading

#### `rubric_criteria`
- Detailed grading rubrics for assignments
- Weighted criteria for nuanced grading

#### `assignment_resources`
- Supplementary materials for assignments
- Files, links, and references for students

### Submission and Grading

#### `submissions`
- Records of student submissions
- Supports multiple submission attempts
- Tracks submission status, timestamps, and grading information

#### `grading_results`
- Detailed grading data for each submission
- Question-by-question assessment
- ML confidence levels and feedback

#### `rubric_assessments`
- Detailed assessment against rubric criteria
- Comments for each criterion

#### `submission_annotations`
- Specific feedback on parts of the submission
- Positional data for visual marking of PDFs

### ML Model Management

#### `ml_models`
- Information about available ML models
- Versioning and performance metrics
- Active status for model selection

#### `model_usage`
- Tracking of model usage in grading
- Performance data and confidence metrics

#### `performance_metrics`
- System and model performance tracking
- Time-series data for analysis

### System Management and Audit

#### `activity_logs`
- Comprehensive audit trail
- User actions and system events
- Security and troubleshooting data

#### `notifications`
- User notifications
- System alerts and messages

#### `system_settings`
- Configurable system parameters
- Public and private settings

## Key Indexes and Constraints

The schema includes carefully designed indexes for optimal query performance:

1. **Primary Keys**: All tables have integer primary keys
2. **Foreign Keys**: Proper relationships with appropriate CASCADE actions
3. **Unique Constraints**: Business key uniqueness (email, course code, etc.)
4. **Composite Indexes**: For common query patterns
5. **Full-Text Indexes**: For search functionality

## Data Types and Validation

- **ENUM fields** for constrained value sets
- **VARCHAR** with appropriate lengths
- **DECIMAL** for precise numeric values
- **TEXT** for longer content
- **TIMESTAMP** for accurate time tracking

## Migration and Deployment

The schema includes:

1. A comprehensive SQL file (`comprehensive_schema.sql`)
2. A migration script (`migrate.js`) for database creation and updates
3. Sample data generation for development and testing

## Security Considerations

- Passwords are stored as bcrypt hashes
- Tokens have explicit expiration times
- Activity logging for security auditing
- Role-based access control

## Performance Optimization

- Denormalized fields where appropriate for query efficiency
- Strategic indexing for common query patterns
- Status flags for quick filtering

## Entity Relationship Diagram

For a visual representation of the database schema, see the [ER Diagram](database_er_diagram.md).

## Usage

To apply this schema to your MySQL database:

```bash
# From the project root
cd backend
node scripts/migrate.js

# To reset the database (caution: destroys all data)
node scripts/migrate.js --reset
```

## Extension Points

The schema is designed to be extensible:

1. **New User Types**: Additional profile tables can be added
2. **Custom Assignment Types**: The submission format is flexible
3. **Additional ML Models**: New model types can be integrated
4. **Analytics**: The performance metrics table supports various metric types
