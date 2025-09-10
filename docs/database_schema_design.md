# Auto-Grade Database Schema Design

## Overview

The Auto-Grade database schema has been designed to efficiently store and manage all aspects of the automated grading system, including user management, course administration, assignment creation, submission tracking, and grading processes. The schema follows best practices for relational database design, with proper normalization, relationships, constraints, and indexing.

## Design Decisions

### 1. User Management System

The user management system employs a role-based approach with three distinct user types: administrators, teachers, and students. Each user type has specific attributes and permissions:

- **Base Users Table**: Stores common attributes for all user types (id, email, password, etc.)
- **Role-Specific Profile Tables**: Extended information unique to each role is stored in separate tables (student_profiles, teacher_profiles, admin_profiles)
  
This design allows for:
- Common authentication and basic user information in a unified table
- Role-specific attributes without using nullable fields or storing irrelevant data
- Easy extension for new user types if needed in the future

### 2. Course and Assignment Structure

The course management system is designed to support a hierarchical structure:

- **Courses**: The top-level entity created and managed by teachers
- **Assignment Categories**: Groupings of assignments with different weights (e.g., Homework, Quizzes, Projects)
- **Assignments**: Individual tasks assigned to students with specific requirements and deadlines
- **Assignment Questions**: For structured assignments with multiple components

This hierarchical approach allows for:
- Flexible grading schemes with weighted categories
- Detailed tracking of individual components within assignments
- Support for different assignment types (PDF submissions, code, notebooks)

### 3. Submission Tracking System

The submission system captures all aspects of student work:

- **Submissions**: Records core submission metadata, including timestamps and status
- **Grading Results**: Stores detailed grading information for each submission
- **Rubric Assessments**: For detailed scoring against specific criteria
- **Annotations**: For specific feedback on portions of submitted work

This comprehensive approach enables:
- Tracking of multiple submission attempts
- Support for different submission formats (PDF, code, text, notebooks)
- Detailed feedback at various levels of granularity

### 4. ML Model Integration

The schema includes dedicated tables for ML model management and tracking:

- **ML Models**: Information about available grading models
- **Model Usage**: Tracking when and how models are used in the grading process
- **Performance Metrics**: System and model performance data

This design supports:
- Multiple ML models for different assignment types
- Model versioning and performance tracking
- Audit trails for automated grading decisions

### 5. Audit and System Tables

For administrative oversight and debugging:

- **Activity Logs**: Comprehensive tracking of user actions
- **Notifications**: System and user notifications
- **System Settings**: Configurable parameters for system operation

## Key Relationships

1. **Users to Courses**:
   - Teachers create and manage multiple courses
   - Students enroll in multiple courses
   - Many-to-many relationship through enrollments

2. **Courses to Assignments**:
   - Courses contain multiple assignments
   - Assignments belong to a single course
   - One-to-many relationship

3. **Assignments to Submissions**:
   - Assignments receive multiple student submissions
   - Students make submissions for multiple assignments
   - Submissions tracked with status, timestamps, and results

4. **Submissions to Grading Results**:
   - Each submission has detailed grading information
   - Results can be question-specific or overall
   - Confidence levels and feedback stored for each evaluation

## Performance Optimizations

1. **Indexing Strategy**:
   - Indexes on frequently queried columns (user_id, course_id, etc.)
   - Composite indexes for common query patterns
   - Index on timestamp fields for date-range queries

2. **Query Optimization**:
   - Denormalized fields where appropriate for query efficiency
   - Thoughtful foreign key constraints with appropriate cascading
   - Status flags for quick filtering (is_active, status enums)

3. **Data Integrity**:
   - Unique constraints on business keys
   - Foreign key constraints with appropriate actions
   - Enum fields for constrained value sets

## Scalability Considerations

The schema is designed with scalability in mind:

- Clear separation of concerns allows for selective scaling of specific components
- Normalized design minimizes data redundancy
- Effective indexing strategy supports large datasets
- Audit tables for tracking system performance and usage patterns

## Migration Path

The schema includes all tables needed for the complete system, extending the basic schema already in place. It maintains backward compatibility with existing data while adding the necessary structures for advanced features.

## Conclusion

This comprehensive database schema provides a solid foundation for the Auto-Grade system, supporting all the required functionality while maintaining data integrity, query performance, and scalability. The design accommodates the complex relationships between users, courses, assignments, and grading processes, making it well-suited for an educational environment.
