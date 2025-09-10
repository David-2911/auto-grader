-- Auto-Grade Comprehensive Database Schema
-- This schema includes all tables needed for user management, courses, assignments, submissions,
-- grading results, and system analytics with appropriate relationships and constraints.

-- Drop database if it exists and create a new one
DROP DATABASE IF EXISTS auto_grade;
CREATE DATABASE auto_grade;
USE auto_grade;

-- =========================================
-- User Management Tables
-- =========================================

-- Users table (base table for all user types)
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('student', 'teacher', 'admin') NOT NULL,
    identifier VARCHAR(255) NOT NULL UNIQUE COMMENT 'Student ID, Staff ID, or Admin ID',
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    profile_image VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- User profile extensions for different user types
CREATE TABLE student_profiles (
    id INT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    year_level VARCHAR(50) NULL,
    major VARCHAR(100) NULL,
    cumulative_gpa DECIMAL(3,2) NULL,
    bio TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE teacher_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    department VARCHAR(100) NULL,
    title VARCHAR(100) NULL,
    office_location VARCHAR(100) NULL,
    office_hours TEXT NULL,
    bio TEXT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE admin_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    department VARCHAR(100) NULL,
    position VARCHAR(100) NULL,
    access_level INT DEFAULT 1 COMMENT 'Higher number means higher access level',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User authentication and sessions
CREATE TABLE refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE password_reset (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    reset_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- =========================================
-- Course Management Tables
-- =========================================

-- Courses table
CREATE TABLE courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    credits INT DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE NULL,
    end_date DATE NULL,
    teacher_id INT NOT NULL,
    syllabus_path VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Course assistants (for TAs or co-teachers)
CREATE TABLE course_assistants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    teacher_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'TA' COMMENT 'TA, Co-Teacher, etc.',
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    UNIQUE KEY (course_id, teacher_id)
);

-- Course enrollments
CREATE TABLE enrollments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('active', 'withdrawn', 'completed') DEFAULT 'active',
    final_grade VARCHAR(5) NULL,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    UNIQUE KEY (course_id, student_id)
);

-- =========================================
-- Assignment Management Tables
-- =========================================

-- Assignment categories
CREATE TABLE assignment_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 0.00 COMMENT 'Percentage weight in final grade',
    description TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY (course_id, name)
);

-- Assignments table
CREATE TABLE assignments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    course_id INT NOT NULL,
    category_id INT NULL,
    open_date DATETIME NOT NULL,
    deadline DATETIME NOT NULL,
    late_deadline DATETIME NULL,
    late_penalty DECIMAL(5,2) DEFAULT 0 COMMENT 'Percentage penalty for late submissions',
    total_points DECIMAL(8,2) DEFAULT 100.00,
    is_active BOOLEAN DEFAULT TRUE,
    is_group_assignment BOOLEAN DEFAULT FALSE,
    max_attempts INT DEFAULT 1,
    question_pdf VARCHAR(255) NULL,
    nbgrader_expectation TEXT NULL,
    submission_format ENUM('pdf', 'code', 'notebook', 'text') DEFAULT 'pdf',
    grading_method ENUM('auto', 'manual', 'hybrid') DEFAULT 'auto',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES assignment_categories(id) ON DELETE SET NULL
);

-- Assignment questions for structured assignments
CREATE TABLE assignment_questions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    question_number INT NOT NULL,
    question_text TEXT NOT NULL,
    question_type ENUM('multiple_choice', 'true_false', 'short_answer', 'essay', 'code') NOT NULL,
    points DECIMAL(5,2) DEFAULT 1.00,
    expected_answer TEXT NULL,
    rubric TEXT NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    UNIQUE KEY (assignment_id, question_number)
);

-- Multiple choice options
CREATE TABLE question_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question_id INT NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    option_order INT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES assignment_questions(id) ON DELETE CASCADE
);

-- Assignment rubrics
CREATE TABLE rubric_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    criterion_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    max_score DECIMAL(5,2) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.00,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- Assignment resources/materials
CREATE TABLE assignment_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    file_path VARCHAR(255) NULL,
    external_url VARCHAR(255) NULL,
    resource_type ENUM('file', 'link', 'reference') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE
);

-- =========================================
-- Submission and Grading Tables
-- =========================================

-- Submissions table
CREATE TABLE submissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    submission_number INT DEFAULT 1 COMMENT 'For multiple attempts',
    submission_pdf VARCHAR(255) NULL,
    submission_text TEXT NULL,
    submission_code TEXT NULL,
    submission_notebook VARCHAR(255) NULL,
    status ENUM('submitted', 'processing', 'graded', 'error') DEFAULT 'submitted',
    is_late BOOLEAN DEFAULT FALSE,
    grade DECIMAL(8,2) NULL,
    normalized_grade DECIMAL(5,2) NULL COMMENT 'Grade after applying late penalties',
    submission_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP NULL,
    graded_at TIMESTAMP NULL,
    graded_by INT NULL COMMENT 'User ID of the grader, NULL if auto-graded',
    is_auto_graded BOOLEAN DEFAULT FALSE,
    error_message TEXT NULL,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id),
    FOREIGN KEY (graded_by) REFERENCES users(id),
    UNIQUE KEY (assignment_id, student_id, submission_number)
);

-- Detailed grading results
CREATE TABLE grading_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    question_id INT NULL COMMENT 'NULL if overall assessment',
    score DECIMAL(8,2) NOT NULL,
    max_score DECIMAL(8,2) NOT NULL,
    feedback TEXT NULL,
    confidence_level DECIMAL(5,2) NULL COMMENT 'ML model confidence (0-1)',
    grading_notes TEXT NULL COMMENT 'Internal notes for graders',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES assignment_questions(id) ON DELETE SET NULL
);

-- Rubric assessment
CREATE TABLE rubric_assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    criterion_id INT NOT NULL,
    score DECIMAL(5,2) NOT NULL,
    comments TEXT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (criterion_id) REFERENCES rubric_criteria(id) ON DELETE CASCADE
);

-- Feedback and annotations
CREATE TABLE submission_annotations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    page_number INT NULL,
    x_position DECIMAL(8,2) NULL,
    y_position DECIMAL(8,2) NULL,
    width DECIMAL(8,2) NULL,
    height DECIMAL(8,2) NULL,
    annotation_text TEXT NOT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- =========================================
-- ML Model and Analytics Tables
-- =========================================

-- ML Models
CREATE TABLE ml_models (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    version VARCHAR(50) NOT NULL,
    model_path VARCHAR(255) NOT NULL,
    model_type ENUM('similarity', 'nlp', 'code_analysis', 'custom') NOT NULL,
    accuracy_metrics TEXT NULL COMMENT 'JSON containing performance metrics',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ML Model usage tracking
CREATE TABLE model_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    model_id INT NOT NULL,
    submission_id INT NOT NULL,
    processing_time_ms INT NULL,
    result_confidence DECIMAL(5,2) NULL,
    status ENUM('success', 'error', 'timeout') NOT NULL,
    error_message TEXT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (model_id) REFERENCES ml_models(id),
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- System performance metrics
CREATE TABLE performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type ENUM('system', 'database', 'ml_model', 'api') NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,2) NOT NULL,
    additional_data TEXT NULL COMMENT 'JSON with additional metric details',
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- Audit and System Tables
-- =========================================

-- Activity logs
CREATE TABLE activity_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL COMMENT 'user, course, assignment, submission, etc.',
    entity_id INT NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    additional_data TEXT NULL COMMENT 'JSON with additional details',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- System notifications
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'NULL for system-wide notifications',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    notification_type ENUM('info', 'warning', 'error', 'success') DEFAULT 'info',
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- System settings
CREATE TABLE system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    data_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    description TEXT NULL,
    is_public BOOLEAN DEFAULT FALSE COMMENT 'Whether visible to non-admin users',
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================
-- Indexes for Optimization
-- =========================================

-- User indexes
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_identifier ON users(identifier);
CREATE INDEX idx_users_name ON users(first_name, last_name);

-- Course indexes
CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_active ON courses(is_active);
CREATE INDEX idx_courses_code ON courses(code);

-- Enrollment indexes
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);

-- Assignment indexes
CREATE INDEX idx_assignments_course ON assignments(course_id);
CREATE INDEX idx_assignments_category ON assignments(category_id);
CREATE INDEX idx_assignments_deadline ON assignments(deadline);
CREATE INDEX idx_assignments_active ON assignments(is_active);

-- Submission indexes
CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_grade ON submissions(grade);
CREATE INDEX idx_submissions_time ON submissions(submission_time);
CREATE INDEX idx_submissions_graded_at ON submissions(graded_at);
CREATE INDEX idx_submissions_assignment_student ON submissions(assignment_id, student_id);

-- Activity log indexes
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_action ON activity_logs(action);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);

-- =========================================
-- Sample Data
-- =========================================

-- Insert sample users
INSERT INTO users (email, password, role, identifier, first_name, last_name, is_active) VALUES
-- Admin user
('admin@autograde.com', '$2a$10$VCJ0sCsR0JsQjuYY.tBBoeWK1UB.YTgZpRl2gvN0xh6iLZIGD0JdO', 'admin', 'ADMIN001', 'System', 'Administrator', TRUE),
-- Teachers
('smith@autograde.com', '$2a$10$MoNaAoLNRfnSLWHbhSLE6.QQXDnD93HgYzPaYbMGrZtwvvkNHFDji', 'teacher', 'TCHR001', 'John', 'Smith', TRUE),
('johnson@autograde.com', '$2a$10$MoNaAoLNRfnSLWHbhSLE6.QQXDnD93HgYzPaYbMGrZtwvvkNHFDji', 'teacher', 'TCHR002', 'Emily', 'Johnson', TRUE),
-- Students
('student1@autograde.com', '$2a$10$MoNaAoLNRfnSLWHbhSLE6.QQXDnD93HgYzPaYbMGrZtwvvkNHFDji', 'student', 'STU001', 'Alex', 'Williams', TRUE),
('student2@autograde.com', '$2a$10$MoNaAoLNRfnSLWHbhSLE6.QQXDnD93HgYzPaYbMGrZtwvvkNHFDji', 'student', 'STU002', 'Samantha', 'Brown', TRUE),
('student3@autograde.com', '$2a$10$MoNaAoLNRfnSLWHbhSLE6.QQXDnD93HgYzPaYbMGrZtwvvkNHFDji', 'student', 'STU003', 'Michael', 'Davis', TRUE),
('student4@autograde.com', '$2a$10$MoNaAoLNRfnSLWHbhSLE6.QQXDnD93HgYzPaYbMGrZtwvvkNHFDji', 'student', 'STU004', 'Jessica', 'Miller', TRUE);

-- Insert sample profiles
INSERT INTO admin_profiles (user_id, department, position, access_level) VALUES
(1, 'IT Department', 'System Administrator', 10);

INSERT INTO teacher_profiles (user_id, department, title, office_location, office_hours) VALUES
(2, 'Computer Science', 'Professor', 'Building A, Room 101', 'Monday, Wednesday 14:00-16:00'),
(3, 'Mathematics', 'Associate Professor', 'Building B, Room 205', 'Tuesday, Thursday 10:00-12:00');

INSERT INTO student_profiles (user_id, year_level, major, cumulative_gpa) VALUES
(4, 'Junior', 'Computer Science', 3.75),
(5, 'Sophomore', 'Data Science', 3.82),
(6, 'Senior', 'Information Technology', 3.45),
(7, 'Freshman', 'Computer Engineering', 3.92);

-- Insert sample courses
INSERT INTO courses (code, title, description, credits, is_active, start_date, end_date, teacher_id) VALUES
('CS101', 'Introduction to Programming', 'Fundamentals of programming using Python', 3, TRUE, '2025-09-01', '2025-12-15', 2),
('CS201', 'Data Structures and Algorithms', 'Advanced programming concepts', 4, TRUE, '2025-09-01', '2025-12-15', 2),
('MATH150', 'Discrete Mathematics', 'Mathematical structures for computer science', 3, TRUE, '2025-09-01', '2025-12-15', 3);

-- Insert sample enrollments
INSERT INTO enrollments (course_id, student_id, status) VALUES
(1, 4, 'active'),
(1, 5, 'active'),
(1, 6, 'active'),
(1, 7, 'active'),
(2, 4, 'active'),
(2, 6, 'active'),
(3, 5, 'active'),
(3, 7, 'active');

-- Insert sample assignment categories
INSERT INTO assignment_categories (course_id, name, weight, description) VALUES
(1, 'Quizzes', 20.00, 'Short weekly quizzes'),
(1, 'Programming Assignments', 40.00, 'Hands-on programming exercises'),
(1, 'Midterm Exam', 15.00, 'Midterm examination'),
(1, 'Final Project', 25.00, 'Comprehensive final project'),
(2, 'Homework', 30.00, 'Weekly problem sets'),
(2, 'Programming Labs', 30.00, 'Implementation of data structures and algorithms'),
(2, 'Exams', 40.00, 'Midterm and final examinations'),
(3, 'Problem Sets', 50.00, 'Weekly problem solving assignments'),
(3, 'Exams', 50.00, 'Midterm and final examinations');

-- Insert sample assignments
INSERT INTO assignments (title, description, course_id, category_id, open_date, deadline, total_points, is_active, submission_format, grading_method) VALUES
('Python Basics', 'Introduction to Python syntax and basic constructs', 1, 2, '2025-09-10 00:00:00', '2025-09-17 23:59:59', 100.00, TRUE, 'code', 'auto'),
('Control Structures', 'Implementing conditional statements and loops', 1, 2, '2025-09-17 00:00:00', '2025-09-24 23:59:59', 100.00, TRUE, 'code', 'auto'),
('Functions and Modules', 'Creating and using functions and modules', 1, 2, '2025-09-24 00:00:00', '2025-10-01 23:59:59', 100.00, TRUE, 'code', 'auto'),
('Quiz 1', 'Basic Python concepts', 1, 1, '2025-09-15 00:00:00', '2025-09-15 23:59:59', 20.00, TRUE, 'pdf', 'auto'),
('Array Implementation', 'Implementing array-based data structures', 2, 6, '2025-09-12 00:00:00', '2025-09-19 23:59:59', 100.00, TRUE, 'code', 'auto'),
('Set Theory Problems', 'Problems on set operations and properties', 3, 8, '2025-09-14 00:00:00', '2025-09-21 23:59:59', 100.00, TRUE, 'pdf', 'hybrid');

-- Insert ML models
INSERT INTO ml_models (name, description, version, model_path, model_type, is_active) VALUES
('Basic Text Similarity', 'Simple text similarity model for basic assignments', '1.0.0', '/models/text_similarity_v1.pkl', 'similarity', TRUE),
('Python Code Analyzer', 'Static analysis for Python code submissions', '1.0.0', '/models/python_analyzer_v1.pkl', 'code_analysis', TRUE),
('Math Expression Evaluator', 'Evaluates mathematical expressions and proofs', '1.0.0', '/models/math_evaluator_v1.pkl', 'custom', TRUE);

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, data_type, description, is_public) VALUES
('system.name', 'Auto-Grade System', 'string', 'Name of the system', TRUE),
('system.version', '1.0.0', 'string', 'Current system version', TRUE),
('grading.default_confidence_threshold', '0.75', 'number', 'Minimum confidence level for auto-grading', FALSE),
('ui.theme', 'light', 'string', 'Default UI theme', TRUE),
('email.notifications.enabled', 'true', 'boolean', 'Whether email notifications are enabled', FALSE),
('upload.max_file_size', '10', 'number', 'Maximum file size in MB', TRUE);

-- Commit transaction
COMMIT;
