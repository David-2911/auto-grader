-- Additional schema for enhanced teacher portal functionality
-- This extends the existing teacher_portal_schema.sql

-- Table for storing grading criteria for assignments
CREATE TABLE IF NOT EXISTS grading_criteria (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    criteria_name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    max_points DECIMAL(8,2) NOT NULL,
    weight DECIMAL(5,2) DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_grading_criteria_assignment (assignment_id)
);

-- Table for storing assignment resource files
CREATE TABLE IF NOT EXISTS assignment_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_assignment_resources_assignment (assignment_id)
);

-- Table for storing criteria-based grades for submissions
CREATE TABLE IF NOT EXISTS submission_criteria_grades (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    criteria_id INT NOT NULL,
    points_awarded DECIMAL(8,2) NOT NULL,
    feedback TEXT NULL,
    graded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (criteria_id) REFERENCES grading_criteria(id) ON DELETE CASCADE,
    UNIQUE KEY unique_submission_criteria (submission_id, criteria_id),
    INDEX idx_submission_criteria_submission (submission_id),
    INDEX idx_submission_criteria_criteria (criteria_id)
);

-- Table for tracking grading adjustments
CREATE TABLE IF NOT EXISTS grading_adjustments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    adjustment_type ENUM('late_penalty', 'extra_credit', 'curve', 'manual') NOT NULL,
    adjustment_value DECIMAL(8,2) NOT NULL,
    reason TEXT NULL,
    applied_by INT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (applied_by) REFERENCES users(id),
    INDEX idx_grading_adjustments_submission (submission_id)
);

-- Table for grading queue (for reprocessing submissions)
CREATE TABLE IF NOT EXISTS grading_queue (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    requested_by INT NOT NULL,
    processing_options JSON NULL,
    status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    error_message TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (requested_by) REFERENCES users(id),
    INDEX idx_grading_queue_status (status),
    INDEX idx_grading_queue_priority (priority, created_at)
);

-- Table for notification attachments
CREATE TABLE IF NOT EXISTS notification_attachments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    notification_id INT NOT NULL,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE,
    INDEX idx_notification_attachments_notification (notification_id)
);

-- Table for course metadata (objectives, requirements, etc.)
CREATE TABLE IF NOT EXISTS course_metadata (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    metadata_type VARCHAR(100) NOT NULL,
    metadata_value JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_metadata_course_type (course_id, metadata_type)
);

-- Table for course prerequisites
CREATE TABLE IF NOT EXISTS course_prerequisites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    prerequisite_course_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (prerequisite_course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_prerequisite (course_id, prerequisite_course_id),
    INDEX idx_course_prerequisites_course (course_id)
);

-- Add columns to existing tables if they don't exist
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) NULL AFTER description,
ADD COLUMN IF NOT EXISTS submission_format ENUM('pdf', 'code', 'notebook', 'text') DEFAULT 'pdf' AFTER category,
ADD COLUMN IF NOT EXISTS grading_method ENUM('auto', 'manual', 'hybrid') DEFAULT 'auto' AFTER submission_format,
ADD COLUMN IF NOT EXISTS allow_late_submissions BOOLEAN DEFAULT TRUE AFTER grading_method,
ADD COLUMN IF NOT EXISTS late_penalty DECIMAL(5,2) DEFAULT 0 AFTER allow_late_submissions,
ADD COLUMN IF NOT EXISTS max_attempts INT DEFAULT 1 AFTER late_penalty,
ADD COLUMN IF NOT EXISTS show_grading_rubric BOOLEAN DEFAULT TRUE AFTER max_attempts,
ADD COLUMN IF NOT EXISTS auto_publish_grades BOOLEAN DEFAULT FALSE AFTER show_grading_rubric,
ADD COLUMN IF NOT EXISTS weight DECIMAL(5,2) DEFAULT 1.0 AFTER auto_publish_grades,
ADD COLUMN IF NOT EXISTS is_extra_credit BOOLEAN DEFAULT FALSE AFTER weight;

ALTER TABLE submissions
ADD COLUMN IF NOT EXISTS points_earned DECIMAL(8,2) NULL AFTER grade,
ADD COLUMN IF NOT EXISTS normalized_grade DECIMAL(5,2) NULL AFTER points_earned,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE AFTER normalized_grade,
ADD COLUMN IF NOT EXISTS needs_manual_review BOOLEAN DEFAULT FALSE AFTER is_late,
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE AFTER needs_manual_review,
ADD COLUMN IF NOT EXISTS graded_by INT NULL AFTER is_published,
ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP NULL AFTER graded_by;

-- Add foreign key for graded_by if it doesn't exist
ALTER TABLE submissions 
ADD CONSTRAINT fk_submissions_graded_by 
FOREIGN KEY (graded_by) REFERENCES users(id);

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS semester VARCHAR(50) NULL AFTER end_date,
ADD COLUMN IF NOT EXISTS academic_year VARCHAR(10) NULL AFTER semester,
ADD COLUMN IF NOT EXISTS max_enrollment INT NULL AFTER academic_year,
ADD COLUMN IF NOT EXISTS department VARCHAR(100) NULL AFTER max_enrollment,
ADD COLUMN IF NOT EXISTS level ENUM('undergraduate', 'graduate', 'professional') DEFAULT 'undergraduate' AFTER department,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP NULL AFTER is_active;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_submissions_grade_status ON submissions(grade, status);
CREATE INDEX IF NOT EXISTS idx_submissions_normalized_grade ON submissions(normalized_grade);
CREATE INDEX IF NOT EXISTS idx_submissions_graded_by ON submissions(graded_by);
CREATE INDEX IF NOT EXISTS idx_assignments_category ON assignments(category);
CREATE INDEX IF NOT EXISTS idx_assignments_grading_method ON assignments(grading_method);
CREATE INDEX IF NOT EXISTS idx_courses_department ON courses(department);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);

-- Update existing views to include new columns
DROP VIEW IF EXISTS teacher_course_overview;
CREATE VIEW teacher_course_overview AS
SELECT 
    c.id as course_id,
    c.code,
    c.title,
    c.start_date,
    c.end_date,
    c.semester,
    c.academic_year,
    c.is_active,
    c.teacher_id,
    c.max_enrollment,
    c.department,
    c.level,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    COUNT(DISTINCT a.id) as total_assignments,
    COUNT(DISTINCT s.id) as total_submissions,
    COUNT(DISTINCT CASE WHEN s.grade IS NULL AND s.status = 'submitted' THEN s.id END) as pending_grading,
    AVG(s.normalized_grade) as class_average,
    COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
    ROUND((COUNT(DISTINCT e.student_id) * 100.0 / COALESCE(c.max_enrollment, COUNT(DISTINCT e.student_id))), 2) as enrollment_rate
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
LEFT JOIN submissions s ON a.id = s.assignment_id
GROUP BY c.id;

DROP VIEW IF EXISTS assignment_status_summary;
CREATE VIEW assignment_status_summary AS
SELECT 
    a.id as assignment_id,
    a.title,
    a.deadline,
    a.total_points,
    a.category,
    a.grading_method,
    a.submission_format,
    c.id as course_id,
    c.title as course_title,
    c.teacher_id,
    COUNT(e.student_id) as expected_submissions,
    COUNT(s.id) as actual_submissions,
    COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
    COUNT(CASE WHEN s.grade IS NULL AND s.status = 'submitted' THEN 1 END) as pending_grading,
    AVG(s.normalized_grade) as average_grade,
    COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
    ROUND((COUNT(s.id) * 100.0 / COUNT(e.student_id)), 2) as submission_rate,
    ROUND((COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) * 100.0 / COUNT(s.id)), 2) as grading_progress
FROM assignments a
JOIN courses c ON a.course_id = c.id
LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
WHERE a.is_active = true
GROUP BY a.id;

-- Insert sample grading criteria for common assignment types
INSERT IGNORE INTO grading_criteria (assignment_id, criteria_name, description, max_points, weight) 
SELECT 
    a.id,
    'Content Quality',
    'Accuracy and completeness of content',
    ROUND(a.total_points * 0.4, 2),
    0.4
FROM assignments a 
WHERE a.grading_method IN ('manual', 'hybrid')
AND NOT EXISTS (SELECT 1 FROM grading_criteria gc WHERE gc.assignment_id = a.id)
LIMIT 100;

INSERT IGNORE INTO grading_criteria (assignment_id, criteria_name, description, max_points, weight)
SELECT 
    a.id,
    'Organization & Clarity',
    'Logical structure and clear presentation',
    ROUND(a.total_points * 0.3, 2),
    0.3
FROM assignments a 
WHERE a.grading_method IN ('manual', 'hybrid')
AND EXISTS (SELECT 1 FROM grading_criteria gc WHERE gc.assignment_id = a.id AND gc.criteria_name = 'Content Quality')
LIMIT 100;

INSERT IGNORE INTO grading_criteria (assignment_id, criteria_name, description, max_points, weight)
SELECT 
    a.id,
    'Technical Execution',
    'Technical accuracy and implementation quality',
    ROUND(a.total_points * 0.3, 2),
    0.3
FROM assignments a 
WHERE a.grading_method IN ('manual', 'hybrid')
AND EXISTS (SELECT 1 FROM grading_criteria gc WHERE gc.assignment_id = a.id AND gc.criteria_name = 'Organization & Clarity')
LIMIT 100;

-- Add default gradebook settings for existing courses
INSERT IGNORE INTO gradebook_settings (course_id, grading_scale, weight_assignments, drop_lowest_scores)
SELECT 
    id,
    '{"A": 90, "B": 80, "C": 70, "D": 60, "F": 0}',
    TRUE,
    0
FROM courses 
WHERE is_active = TRUE;

-- Add sample assignment categories
INSERT IGNORE INTO assignment_templates (created_by, name, description, category, submission_format, grading_method, template_data, is_public)
SELECT 
    1, -- Assuming admin user ID is 1
    'Programming Lab',
    'Template for programming laboratory assignments',
    'Programming',
    'code',
    'auto',
    '{"instructions": "Complete the programming assignment", "gradingCriteria": ["correctness", "efficiency", "style"], "totalPoints": 100}',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM assignment_templates WHERE name = 'Programming Lab');

INSERT IGNORE INTO assignment_templates (created_by, name, description, category, submission_format, grading_method, template_data, is_public)
SELECT 
    1,
    'Research Paper',
    'Template for research paper assignments',
    'Writing',
    'pdf',
    'manual',
    '{"instructions": "Write a research paper on the given topic", "gradingCriteria": ["content", "organization", "citations", "grammar"], "totalPoints": 100}',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM assignment_templates WHERE name = 'Research Paper');

INSERT IGNORE INTO assignment_templates (created_by, name, description, category, submission_format, grading_method, template_data, is_public)
SELECT 
    1,
    'Quiz Assignment',
    'Template for quiz-style assignments',
    'Assessment',
    'pdf',
    'auto',
    '{"instructions": "Answer all questions", "gradingCriteria": ["accuracy"], "totalPoints": 50}',
    TRUE
WHERE NOT EXISTS (SELECT 1 FROM assignment_templates WHERE name = 'Quiz Assignment');

-- Update existing submissions to set normalized grades
UPDATE submissions s
JOIN assignments a ON s.assignment_id = a.id
SET s.normalized_grade = CASE 
    WHEN s.grade IS NOT NULL AND a.total_points > 0 
    THEN (s.grade / a.total_points) * 100 
    ELSE NULL 
END,
s.points_earned = s.grade,
s.is_late = CASE 
    WHEN s.submission_time > a.deadline THEN TRUE 
    ELSE FALSE 
END
WHERE s.normalized_grade IS NULL AND s.grade IS NOT NULL;

-- Create trigger to automatically calculate normalized grade
DELIMITER //

CREATE TRIGGER IF NOT EXISTS calculate_normalized_grade_insert
BEFORE INSERT ON submissions
FOR EACH ROW
BEGIN
    DECLARE assignment_points DECIMAL(8,2);
    
    SELECT total_points INTO assignment_points 
    FROM assignments 
    WHERE id = NEW.assignment_id;
    
    IF NEW.grade IS NOT NULL AND assignment_points > 0 THEN
        SET NEW.normalized_grade = (NEW.grade / assignment_points) * 100;
        SET NEW.points_earned = NEW.grade;
    END IF;
    
    -- Check if submission is late
    IF NEW.submission_time > (SELECT deadline FROM assignments WHERE id = NEW.assignment_id) THEN
        SET NEW.is_late = TRUE;
    ELSE
        SET NEW.is_late = FALSE;
    END IF;
END //

CREATE TRIGGER IF NOT EXISTS calculate_normalized_grade_update
BEFORE UPDATE ON submissions
FOR EACH ROW
BEGIN
    DECLARE assignment_points DECIMAL(8,2);
    
    SELECT total_points INTO assignment_points 
    FROM assignments 
    WHERE id = NEW.assignment_id;
    
    IF NEW.grade IS NOT NULL AND assignment_points > 0 THEN
        SET NEW.normalized_grade = (NEW.grade / assignment_points) * 100;
        SET NEW.points_earned = NEW.grade;
    END IF;
END //

DELIMITER ;

-- Create some useful stored procedures for teacher operations

DELIMITER //

-- Procedure to get teacher dashboard summary
CREATE PROCEDURE IF NOT EXISTS GetTeacherDashboardSummary(IN teacher_id INT)
BEGIN
    SELECT 
        'courses' as metric,
        COUNT(*) as count
    FROM courses 
    WHERE teacher_id = teacher_id AND is_active = TRUE
    
    UNION ALL
    
    SELECT 
        'assignments' as metric,
        COUNT(*) as count
    FROM assignments a
    JOIN courses c ON a.course_id = c.id
    WHERE c.teacher_id = teacher_id AND a.is_active = TRUE
    
    UNION ALL
    
    SELECT 
        'students' as metric,
        COUNT(DISTINCT e.student_id) as count
    FROM enrollments e
    JOIN courses c ON e.course_id = c.id
    WHERE c.teacher_id = teacher_id AND e.status = 'active'
    
    UNION ALL
    
    SELECT 
        'pending_grading' as metric,
        COUNT(*) as count
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN courses c ON a.course_id = c.id
    WHERE c.teacher_id = teacher_id 
    AND s.status = 'submitted' 
    AND s.grade IS NULL;
END //

-- Procedure to calculate class performance metrics
CREATE PROCEDURE IF NOT EXISTS CalculateClassPerformance(IN course_id INT)
BEGIN
    SELECT 
        'average_grade' as metric,
        ROUND(AVG(s.normalized_grade), 2) as value
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE a.course_id = course_id AND s.grade IS NOT NULL
    
    UNION ALL
    
    SELECT 
        'completion_rate' as metric,
        ROUND((COUNT(DISTINCT s.id) * 100.0 / (
            (SELECT COUNT(*) FROM enrollments WHERE course_id = course_id AND status = 'active') *
            (SELECT COUNT(*) FROM assignments WHERE course_id = course_id AND is_active = TRUE)
        )), 2) as value
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE a.course_id = course_id
    
    UNION ALL
    
    SELECT 
        'on_time_rate' as metric,
        ROUND((COUNT(CASE WHEN s.is_late = FALSE THEN 1 END) * 100.0 / COUNT(*)), 2) as value
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    WHERE a.course_id = course_id AND s.grade IS NOT NULL;
END //

DELIMITER ;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_submissions_course_status ON submissions(assignment_id, status, grade);
CREATE INDEX IF NOT EXISTS idx_submissions_grading_stats ON submissions(assignment_id, grade, normalized_grade, is_late);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_status ON enrollments(course_id, status, enrollment_date);
CREATE INDEX IF NOT EXISTS idx_assignments_course_active ON assignments(course_id, is_active, deadline);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_type ON notifications(recipient_id, type, status, created_at);
CREATE INDEX IF NOT EXISTS idx_announcements_course_published ON announcements(course_id, is_published, is_pinned, created_at);

-- Update course statistics for existing courses
UPDATE course_statistics cs
JOIN (
    SELECT 
        c.id as course_id,
        COUNT(DISTINCT e.student_id) as total_students,
        COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) as active_students,
        COUNT(DISTINCT a.id) as total_assignments,
        COUNT(DISTINCT s.id) as total_submissions,
        AVG(s.normalized_grade) as average_grade,
        ROUND((COUNT(DISTINCT s.id) * 100.0 / NULLIF(
            COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) * 
            COUNT(DISTINCT CASE WHEN a.is_active = TRUE THEN a.id END), 0
        )), 2) as completion_rate,
        ROUND((COUNT(CASE WHEN s.is_late = TRUE THEN 1 END) * 100.0 / NULLIF(COUNT(s.id), 0)), 2) as late_submission_rate
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN assignments a ON c.id = a.course_id
    LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
    WHERE c.is_active = TRUE
    GROUP BY c.id
) stats ON cs.course_id = stats.course_id
SET 
    cs.total_students = COALESCE(stats.total_students, 0),
    cs.active_students = COALESCE(stats.active_students, 0),
    cs.total_assignments = COALESCE(stats.total_assignments, 0),
    cs.total_submissions = COALESCE(stats.total_submissions, 0),
    cs.average_grade = stats.average_grade,
    cs.completion_rate = stats.completion_rate,
    cs.late_submission_rate = stats.late_submission_rate,
    cs.last_updated = NOW();

-- Insert course statistics for courses that don't have them
INSERT IGNORE INTO course_statistics (course_id, total_students, active_students, total_assignments, total_submissions, average_grade, completion_rate, late_submission_rate)
SELECT 
    c.id,
    COUNT(DISTINCT e.student_id) as total_students,
    COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) as active_students,
    COUNT(DISTINCT a.id) as total_assignments,
    COUNT(DISTINCT s.id) as total_submissions,
    AVG(s.normalized_grade) as average_grade,
    ROUND((COUNT(DISTINCT s.id) * 100.0 / NULLIF(
        COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.student_id END) * 
        COUNT(DISTINCT CASE WHEN a.is_active = TRUE THEN a.id END), 0
    )), 2) as completion_rate,
    ROUND((COUNT(CASE WHEN s.is_late = TRUE THEN 1 END) * 100.0 / NULLIF(COUNT(s.id), 0)), 2) as late_submission_rate
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = TRUE
LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
WHERE c.is_active = TRUE
AND NOT EXISTS (SELECT 1 FROM course_statistics WHERE course_id = c.id)
GROUP BY c.id;
