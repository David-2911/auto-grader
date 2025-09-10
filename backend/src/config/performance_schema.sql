-- Performance Optimization Schema Additions and Indexes
-- This file contains optimized database schema modifications for the Auto-Grader system

-- Add performance-related columns to existing tables
ALTER TABLE users 
ADD COLUMN last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
ADD COLUMN login_count INT DEFAULT 0,
ADD INDEX idx_users_email (email),
ADD INDEX idx_users_role (role),
ADD INDEX idx_users_last_activity (last_activity),
ADD INDEX idx_users_active_status (is_active),
ADD INDEX idx_users_created_at (created_at);

-- Optimize assignments table with compound indexes
ALTER TABLE assignments
ADD INDEX idx_assignments_teacher_course (teacher_id, course_id),
ADD INDEX idx_assignments_deadline (deadline),
ADD INDEX idx_assignments_active_deadline (is_active, deadline),
ADD INDEX idx_assignments_created_at (created_at),
ADD INDEX idx_assignments_status_date (is_active, created_at);

-- Optimize submissions table for performance
ALTER TABLE submissions 
ADD COLUMN file_hash VARCHAR(64),
ADD COLUMN processing_status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
ADD COLUMN processing_time_ms INT,
ADD INDEX idx_submissions_assignment (assignment_id),
ADD INDEX idx_submissions_student (student_id),
ADD INDEX idx_submissions_status (processing_status),
ADD INDEX idx_submissions_hash (file_hash),
ADD INDEX idx_submissions_compound (assignment_id, student_id, submission_number),
ADD INDEX idx_submissions_grading (assignment_id, is_graded),
ADD INDEX idx_submissions_date_range (submitted_at);

-- Create performance monitoring table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(10,4),
    metric_unit VARCHAR(20),
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSON,
    INDEX idx_metrics_name_date (metric_name, recorded_at),
    INDEX idx_metrics_recorded_at (recorded_at)
);

-- Create query performance log table
CREATE TABLE IF NOT EXISTS slow_query_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL,
    query_type VARCHAR(50),
    execution_time_ms INT,
    query_text TEXT,
    parameters JSON,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    user_id INT,
    INDEX idx_slow_queries_hash (query_hash),
    INDEX idx_slow_queries_time (execution_time_ms),
    INDEX idx_slow_queries_date (executed_at),
    INDEX idx_slow_queries_user (user_id)
);

-- Create cache invalidation tracking table
CREATE TABLE IF NOT EXISTS cache_invalidation_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) NOT NULL,
    invalidation_reason VARCHAR(100),
    invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    triggered_by_user_id INT,
    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_invalidated_at (invalidated_at)
);

-- File processing optimization table
CREATE TABLE IF NOT EXISTS file_processing_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    file_hash VARCHAR(64) UNIQUE NOT NULL,
    file_path VARCHAR(500),
    file_size BIGINT,
    mime_type VARCHAR(100),
    ocr_result TEXT,
    processing_time_ms INT,
    ocr_engine VARCHAR(50),
    confidence_score DECIMAL(5,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    access_count INT DEFAULT 1,
    INDEX idx_file_hash (file_hash),
    INDEX idx_file_mime_type (mime_type),
    INDEX idx_file_created_at (created_at),
    INDEX idx_file_last_accessed (last_accessed),
    INDEX idx_file_size (file_size)
);

-- ML model predictions cache
CREATE TABLE IF NOT EXISTS ml_predictions_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    input_hash VARCHAR(64) UNIQUE NOT NULL,
    model_name VARCHAR(100),
    model_version VARCHAR(50),
    input_text TEXT,
    prediction_result JSON,
    confidence_score DECIMAL(5,4),
    processing_time_ms INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    access_count INT DEFAULT 1,
    INDEX idx_ml_input_hash (input_hash),
    INDEX idx_ml_model (model_name, model_version),
    INDEX idx_ml_created_at (created_at),
    INDEX idx_ml_confidence (confidence_score)
);

-- Session management optimization
CREATE TABLE IF NOT EXISTS user_sessions_optimized (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    session_data JSON,
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_expires (expires_at),
    INDEX idx_sessions_active (is_active, expires_at),
    INDEX idx_sessions_last_activity (last_activity),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- API usage tracking for rate limiting and analytics
CREATE TABLE IF NOT EXISTS api_usage_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address VARCHAR(45),
    response_status INT,
    response_time_ms INT,
    request_size BIGINT,
    response_size BIGINT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_user_id (user_id),
    INDEX idx_api_endpoint (endpoint),
    INDEX idx_api_timestamp (timestamp),
    INDEX idx_api_response_time (response_time_ms),
    INDEX idx_api_user_endpoint_time (user_id, endpoint, timestamp)
);

-- Grade calculation optimization table
CREATE TABLE IF NOT EXISTS grade_calculations_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    assignment_id INT NOT NULL,
    student_id INT NOT NULL,
    calculation_hash VARCHAR(64),
    grade_breakdown JSON,
    final_grade DECIMAL(5,2),
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_valid BOOLEAN DEFAULT TRUE,
    INDEX idx_grade_assignment_student (assignment_id, student_id),
    INDEX idx_grade_hash (calculation_hash),
    INDEX idx_grade_calculated_at (calculated_at),
    UNIQUE KEY unique_assignment_student (assignment_id, student_id),
    FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create materialized view for dashboard statistics (MySQL 8.0+)
-- Note: This requires MySQL 8.0+ for CTE support
CREATE OR REPLACE VIEW dashboard_stats_optimized AS
WITH user_stats AS (
    SELECT 
        role,
        COUNT(*) as user_count,
        COUNT(CASE WHEN last_login > DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 END) as active_last_week
    FROM users 
    WHERE is_active = 1
    GROUP BY role
),
assignment_stats AS (
    SELECT
        COUNT(*) as total_assignments,
        COUNT(CASE WHEN deadline > NOW() THEN 1 END) as active_assignments,
        COUNT(CASE WHEN deadline < NOW() THEN 1 END) as past_assignments
    FROM assignments
    WHERE is_active = 1
),
submission_stats AS (
    SELECT
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN is_graded = 1 THEN 1 END) as graded_submissions,
        AVG(processing_time_ms) as avg_processing_time
    FROM submissions
    WHERE submitted_at > DATE_SUB(NOW(), INTERVAL 30 DAY)
)
SELECT 
    (SELECT JSON_OBJECT('total', SUM(user_count), 'active_week', SUM(active_last_week)) FROM user_stats) as user_metrics,
    (SELECT JSON_OBJECT('total', total_assignments, 'active', active_assignments, 'past', past_assignments) FROM assignment_stats) as assignment_metrics,
    (SELECT JSON_OBJECT('total', total_submissions, 'graded', graded_submissions, 'avg_processing_ms', avg_processing_time) FROM submission_stats) as submission_metrics;

-- Triggers for cache invalidation
DELIMITER //

CREATE TRIGGER user_cache_invalidation 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    IF OLD.email != NEW.email OR OLD.role != NEW.role OR OLD.is_active != NEW.is_active THEN
        INSERT INTO cache_invalidation_log (cache_key, invalidation_reason, triggered_by_user_id)
        VALUES (CONCAT('user:', NEW.id), 'user_data_updated', NEW.id);
    END IF;
END//

CREATE TRIGGER assignment_cache_invalidation
AFTER UPDATE ON assignments
FOR EACH ROW
BEGIN
    INSERT INTO cache_invalidation_log (cache_key, invalidation_reason)
    VALUES (CONCAT('assignment:', NEW.id), 'assignment_updated');
    
    -- Invalidate related submissions cache
    INSERT INTO cache_invalidation_log (cache_key, invalidation_reason)
    VALUES (CONCAT('assignment:', NEW.id, ':submissions'), 'assignment_updated');
END//

CREATE TRIGGER submission_cache_invalidation
AFTER INSERT ON submissions
FOR EACH ROW
BEGIN
    INSERT INTO cache_invalidation_log (cache_key, invalidation_reason)
    VALUES (CONCAT('assignment:', NEW.assignment_id, ':submissions'), 'new_submission');
    
    INSERT INTO cache_invalidation_log (cache_key, invalidation_reason)
    VALUES (CONCAT('student:', NEW.student_id, ':submissions'), 'new_submission');
END//

DELIMITER ;

-- Procedures for maintenance and optimization

DELIMITER //

-- Procedure to update performance metrics
CREATE PROCEDURE UpdatePerformanceMetrics()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;
    
    -- Database size metrics
    INSERT INTO performance_metrics (metric_name, metric_value, metric_unit, metadata)
    SELECT 
        'db_size_mb',
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2),
        'MB',
        JSON_OBJECT('database', DATABASE())
    FROM information_schema.tables 
    WHERE table_schema = DATABASE();
    
    -- Active connections
    INSERT INTO performance_metrics (metric_name, metric_value, metric_unit)
    SELECT 
        'active_connections',
        COUNT(*),
        'count'
    FROM information_schema.processlist;
    
    -- Cache hit rate (if available)
    INSERT INTO performance_metrics (metric_name, metric_value, metric_unit)
    VALUES ('query_cache_hit_rate', 
           (SELECT ROUND(Qcache_hits / (Qcache_hits + Qcache_inserts) * 100, 2)
            FROM information_schema.GLOBAL_STATUS 
            WHERE VARIABLE_NAME IN ('Qcache_hits', 'Qcache_inserts')), 
           'percentage');
    
    COMMIT;
END//

-- Procedure to clean old cache entries
CREATE PROCEDURE CleanExpiredCache()
BEGIN
    -- Clean old file processing cache (older than 30 days, not accessed in 7 days)
    DELETE FROM file_processing_cache 
    WHERE last_accessed < DATE_SUB(NOW(), INTERVAL 7 DAY)
    AND created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Clean old ML predictions cache (older than 7 days, not accessed in 24 hours)
    DELETE FROM ml_predictions_cache 
    WHERE last_accessed < DATE_SUB(NOW(), INTERVAL 1 DAY)
    AND created_at < DATE_SUB(NOW(), INTERVAL 7 DAY);
    
    -- Clean old performance metrics (older than 90 days)
    DELETE FROM performance_metrics 
    WHERE recorded_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
    
    -- Clean old slow query logs (older than 30 days)
    DELETE FROM slow_query_log 
    WHERE executed_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
    
    -- Clean old API usage tracking (older than 60 days)
    DELETE FROM api_usage_tracking 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL 60 DAY);
END//

DELIMITER ;

-- Schedule the maintenance procedures (requires EVENT scheduler)
SET GLOBAL event_scheduler = ON;

CREATE EVENT IF NOT EXISTS perf_metrics_update
ON SCHEDULE EVERY 5 MINUTE
DO CALL UpdatePerformanceMetrics();

CREATE EVENT IF NOT EXISTS cache_cleanup
ON SCHEDULE EVERY 1 DAY
STARTS TIMESTAMP(CURDATE() + INTERVAL 1 DAY + INTERVAL 2 HOUR)
DO CALL CleanExpiredCache();
