-- Additional tables for Teacher Portal functionality
-- Run this after the existing comprehensive_schema.sql

-- Notifications table for teacher-student communication
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipient_id INT NOT NULL,
    sender_id INT NULL,
    type ENUM('announcement', 'feedback', 'grade', 'reminder', 'system') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    submission_id INT NULL,
    assignment_id INT NULL,
    course_id INT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    status ENUM('draft', 'sent', 'delivered', 'read') DEFAULT 'sent',
    read_at TIMESTAMP NULL,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_notifications_recipient (recipient_id),
    INDEX idx_notifications_created (created_at),
    INDEX idx_notifications_status (status)
);

-- Grade history for tracking grade changes
CREATE TABLE IF NOT EXISTS grade_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    previous_grade DECIMAL(8,2) NOT NULL,
    new_grade DECIMAL(8,2) NOT NULL,
    previous_feedback TEXT NULL,
    new_feedback TEXT NULL,
    changed_by INT NOT NULL,
    change_reason TEXT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_grade_history_submission (submission_id),
    INDEX idx_grade_history_changed (changed_at)
);

-- Announcements table for course-wide announcements
CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    author_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority ENUM('low', 'normal', 'high', 'urgent') DEFAULT 'normal',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT TRUE,
    published_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id),
    INDEX idx_announcements_course (course_id),
    INDEX idx_announcements_published (published_at),
    INDEX idx_announcements_priority (priority)
);

-- Assignment templates for reusable assignment structures
CREATE TABLE IF NOT EXISTS assignment_templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    created_by INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    category VARCHAR(100) NULL,
    submission_format ENUM('pdf', 'code', 'notebook', 'text') DEFAULT 'pdf',
    grading_method ENUM('auto', 'manual', 'hybrid') DEFAULT 'auto',
    template_data JSON NOT NULL COMMENT 'Stores the template structure as JSON',
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_templates_creator (created_by),
    INDEX idx_templates_category (category),
    INDEX idx_templates_public (is_public)
);

-- Course statistics cache for performance optimization
CREATE TABLE IF NOT EXISTS course_statistics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL UNIQUE,
    total_students INT DEFAULT 0,
    active_students INT DEFAULT 0,
    total_assignments INT DEFAULT 0,
    total_submissions INT DEFAULT 0,
    average_grade DECIMAL(5,2) NULL,
    completion_rate DECIMAL(5,2) NULL,
    late_submission_rate DECIMAL(5,2) NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_course_stats_updated (last_updated)
);

-- Student notes for teachers to track individual student progress
CREATE TABLE IF NOT EXISTS student_notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    course_id INT NULL,
    note_type ENUM('academic', 'behavioral', 'attendance', 'general') DEFAULT 'general',
    title VARCHAR(255) NULL,
    content TEXT NOT NULL,
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    INDEX idx_student_notes_student (student_id),
    INDEX idx_student_notes_teacher (teacher_id),
    INDEX idx_student_notes_course (course_id)
);

-- Attendance tracking
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    student_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused') NOT NULL,
    notes TEXT NULL,
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    UNIQUE KEY unique_attendance (course_id, student_id, attendance_date),
    INDEX idx_attendance_course_date (course_id, attendance_date),
    INDEX idx_attendance_student (student_id)
);

-- Grade appeals/disputes
CREATE TABLE IF NOT EXISTS grade_appeals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    submission_id INT NOT NULL,
    student_id INT NOT NULL,
    teacher_id INT NOT NULL,
    current_grade DECIMAL(8,2) NOT NULL,
    requested_grade DECIMAL(8,2) NULL,
    reason TEXT NOT NULL,
    status ENUM('pending', 'under_review', 'approved', 'denied', 'withdrawn') DEFAULT 'pending',
    teacher_response TEXT NULL,
    final_grade DECIMAL(8,2) NULL,
    resolved_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (resolved_by) REFERENCES users(id),
    INDEX idx_grade_appeals_status (status),
    INDEX idx_grade_appeals_teacher (teacher_id),
    INDEX idx_grade_appeals_created (created_at)
);

-- Course gradebook settings
CREATE TABLE IF NOT EXISTS gradebook_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL UNIQUE,
    grading_scale JSON NULL COMMENT 'Custom grading scale configuration',
    weight_assignments BOOLEAN DEFAULT TRUE,
    drop_lowest_scores INT DEFAULT 0,
    late_penalty_type ENUM('percentage', 'points', 'letter_grade') DEFAULT 'percentage',
    late_penalty_value DECIMAL(5,2) DEFAULT 0,
    grace_period_hours INT DEFAULT 0,
    auto_publish_grades BOOLEAN DEFAULT FALSE,
    show_statistics_to_students BOOLEAN DEFAULT TRUE,
    rounding_method ENUM('none', 'round_up', 'round_down', 'round_nearest') DEFAULT 'round_nearest',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

-- Learning analytics and insights
CREATE TABLE IF NOT EXISTS learning_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    metric_type ENUM('engagement', 'performance', 'time_on_task', 'improvement', 'prediction') NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    calculation_date DATE NOT NULL,
    data_points JSON NULL COMMENT 'Supporting data for the metric',
    confidence_score DECIMAL(3,2) NULL COMMENT 'Confidence in the metric (0-1)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE KEY unique_analytics (student_id, course_id, metric_type, calculation_date),
    INDEX idx_analytics_course_date (course_id, calculation_date),
    INDEX idx_analytics_metric (metric_type, calculation_date)
);

-- Course resources and materials
CREATE TABLE IF NOT EXISTS course_resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    course_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    resource_type ENUM('document', 'video', 'link', 'image', 'archive') NOT NULL,
    file_path VARCHAR(500) NULL,
    external_url VARCHAR(500) NULL,
    file_size BIGINT NULL,
    mime_type VARCHAR(100) NULL,
    is_public BOOLEAN DEFAULT FALSE,
    sort_order INT DEFAULT 0,
    uploaded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_course_resources_course (course_id),
    INDEX idx_course_resources_type (resource_type),
    INDEX idx_course_resources_order (sort_order)
);

-- Bulk operations log for tracking batch operations
CREATE TABLE IF NOT EXISTS bulk_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    operation_type ENUM('enroll_students', 'grade_assignments', 'send_notifications', 'import_grades') NOT NULL,
    initiated_by INT NOT NULL,
    course_id INT NULL,
    assignment_id INT NULL,
    total_items INT NOT NULL,
    processed_items INT DEFAULT 0,
    successful_items INT DEFAULT 0,
    failed_items INT DEFAULT 0,
    status ENUM('pending', 'in_progress', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    operation_data JSON NULL COMMENT 'Stores operation parameters and results',
    error_log TEXT NULL,
    started_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (initiated_by) REFERENCES users(id),
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    INDEX idx_bulk_operations_status (status),
    INDEX idx_bulk_operations_user (initiated_by),
    INDEX idx_bulk_operations_created (created_at)
);

-- Create some useful views for teacher dashboard

-- View for course overview with key statistics
CREATE VIEW teacher_course_overview AS
SELECT 
    c.id as course_id,
    c.code,
    c.title,
    c.start_date,
    c.end_date,
    c.is_active,
    c.teacher_id,
    COUNT(DISTINCT e.student_id) as enrolled_students,
    COUNT(DISTINCT a.id) as total_assignments,
    COUNT(DISTINCT s.id) as total_submissions,
    COUNT(DISTINCT CASE WHEN s.grade IS NULL AND s.status = 'submitted' THEN s.id END) as pending_grading,
    AVG(s.normalized_grade) as class_average,
    COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
LEFT JOIN submissions s ON a.id = s.assignment_id
GROUP BY c.id;

-- View for assignment status summary
CREATE VIEW assignment_status_summary AS
SELECT 
    a.id as assignment_id,
    a.title,
    a.deadline,
    a.total_points,
    c.id as course_id,
    c.title as course_title,
    c.teacher_id,
    COUNT(e.student_id) as expected_submissions,
    COUNT(s.id) as actual_submissions,
    COUNT(CASE WHEN s.grade IS NOT NULL THEN 1 END) as graded_submissions,
    COUNT(CASE WHEN s.grade IS NULL AND s.status = 'submitted' THEN 1 END) as pending_grading,
    AVG(s.normalized_grade) as average_grade,
    COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
    ROUND((COUNT(s.id) * 100.0 / COUNT(e.student_id)), 2) as submission_rate
FROM assignments a
JOIN courses c ON a.course_id = c.id
LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = e.student_id
WHERE a.is_active = true
GROUP BY a.id;

-- View for student performance overview
CREATE VIEW student_performance_overview AS
SELECT 
    u.id as student_id,
    u.identifier,
    CONCAT(u.first_name, ' ', u.last_name) as student_name,
    u.email,
    c.id as course_id,
    c.title as course_title,
    c.teacher_id,
    COUNT(DISTINCT a.id) as total_assignments,
    COUNT(DISTINCT s.id) as submitted_assignments,
    COUNT(DISTINCT CASE WHEN s.grade IS NOT NULL THEN s.id END) as graded_assignments,
    AVG(s.normalized_grade) as average_grade,
    SUM(s.normalized_grade) as total_points_earned,
    SUM(a.total_points) as total_possible_points,
    COUNT(CASE WHEN s.submission_time > a.deadline THEN 1 END) as late_submissions,
    MAX(s.submission_time) as last_submission_time,
    ROUND((COUNT(DISTINCT s.id) * 100.0 / COUNT(DISTINCT a.id)), 2) as completion_rate
FROM users u
JOIN enrollments e ON u.id = e.student_id AND e.status = 'active'
JOIN courses c ON e.course_id = c.id
LEFT JOIN assignments a ON c.id = a.course_id AND a.is_active = true
LEFT JOIN submissions s ON a.id = s.assignment_id AND s.student_id = u.id
WHERE u.role = 'student'
GROUP BY u.id, c.id;

-- Indexes for performance optimization
CREATE INDEX idx_submissions_student_assignment ON submissions(student_id, assignment_id);
CREATE INDEX idx_submissions_grade_status ON submissions(grade, status);
CREATE INDEX idx_assignments_course_active ON assignments(course_id, is_active);
CREATE INDEX idx_enrollments_course_status ON enrollments(course_id, status);
CREATE INDEX idx_grading_results_submission ON grading_results(submission_id);
CREATE INDEX idx_notifications_recipient_read ON notifications(recipient_id, read_at);

-- Add some useful stored procedures for common teacher operations

DELIMITER //

-- Procedure to calculate course statistics
CREATE PROCEDURE UpdateCourseStatistics(IN course_id INT)
BEGIN
    DECLARE total_students INT DEFAULT 0;
    DECLARE active_students INT DEFAULT 0;
    DECLARE total_assignments INT DEFAULT 0;
    DECLARE total_submissions INT DEFAULT 0;
    DECLARE avg_grade DECIMAL(5,2) DEFAULT NULL;
    DECLARE completion_rate DECIMAL(5,2) DEFAULT NULL;
    DECLARE late_rate DECIMAL(5,2) DEFAULT NULL;
    
    -- Calculate statistics
    SELECT COUNT(*) INTO total_students 
    FROM enrollments WHERE course_id = course_id;
    
    SELECT COUNT(*) INTO active_students 
    FROM enrollments WHERE course_id = course_id AND status = 'active';
    
    SELECT COUNT(*) INTO total_assignments 
    FROM assignments WHERE course_id = course_id AND is_active = true;
    
    SELECT COUNT(*) INTO total_submissions 
    FROM submissions s 
    JOIN assignments a ON s.assignment_id = a.id 
    WHERE a.course_id = course_id;
    
    SELECT AVG(normalized_grade) INTO avg_grade 
    FROM submissions s 
    JOIN assignments a ON s.assignment_id = a.id 
    WHERE a.course_id = course_id AND s.grade IS NOT NULL;
    
    SELECT (COUNT(*) * 100.0 / (total_students * total_assignments)) INTO completion_rate
    FROM submissions s 
    JOIN assignments a ON s.assignment_id = a.id 
    WHERE a.course_id = course_id;
    
    SELECT (COUNT(*) * 100.0 / total_submissions) INTO late_rate
    FROM submissions s 
    JOIN assignments a ON s.assignment_id = a.id 
    WHERE a.course_id = course_id AND s.submission_time > a.deadline;
    
    -- Update or insert statistics
    INSERT INTO course_statistics 
    (course_id, total_students, active_students, total_assignments, total_submissions, 
     average_grade, completion_rate, late_submission_rate)
    VALUES 
    (course_id, total_students, active_students, total_assignments, total_submissions, 
     avg_grade, completion_rate, late_rate)
    ON DUPLICATE KEY UPDATE
    total_students = VALUES(total_students),
    active_students = VALUES(active_students),
    total_assignments = VALUES(total_assignments),
    total_submissions = VALUES(total_submissions),
    average_grade = VALUES(average_grade),
    completion_rate = VALUES(completion_rate),
    late_submission_rate = VALUES(late_submission_rate);
END //

DELIMITER ;

-- Insert some default data
INSERT INTO assignment_templates (created_by, name, description, category, template_data, is_public) VALUES
(1, 'Basic Programming Assignment', 'Template for basic coding assignments', 'Programming', 
 '{"questions": [{"type": "code", "points": 10, "text": "Write a function that..."}], "grading_criteria": ["correctness", "style", "efficiency"]}', 
 true),
(1, 'Essay Assignment', 'Template for essay-based assignments', 'Writing', 
 '{"questions": [{"type": "essay", "points": 100, "text": "Discuss the topic..."}], "grading_criteria": ["content", "organization", "grammar"]}', 
 true),
(1, 'Multiple Choice Quiz', 'Template for multiple choice assessments', 'Assessment', 
 '{"questions": [{"type": "multiple_choice", "points": 5, "options": ["A", "B", "C", "D"]}], "grading_criteria": ["accuracy"]}', 
 true);

-- Create trigger to update course statistics when submissions change
DELIMITER //

CREATE TRIGGER update_course_stats_after_submission
AFTER INSERT ON submissions
FOR EACH ROW
BEGIN
    DECLARE course_id INT;
    SELECT a.course_id INTO course_id FROM assignments a WHERE a.id = NEW.assignment_id;
    CALL UpdateCourseStatistics(course_id);
END //

CREATE TRIGGER update_course_stats_after_submission_update
AFTER UPDATE ON submissions
FOR EACH ROW
BEGIN
    DECLARE course_id INT;
    SELECT a.course_id INTO course_id FROM assignments a WHERE a.id = NEW.assignment_id;
    CALL UpdateCourseStatistics(course_id);
END //

DELIMITER ;
