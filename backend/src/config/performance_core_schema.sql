-- Core performance schema required by runtime code

-- API usage tracking for rate limiting and analytics
CREATE TABLE IF NOT EXISTS api_usage_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    ip_address VARCHAR(45),
    response_status INT,
    response_time_ms INT,
    request_size BIGINT NULL,
    response_size BIGINT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_api_user_id (user_id),
    INDEX idx_api_endpoint (endpoint),
    INDEX idx_api_timestamp (timestamp),
    INDEX idx_api_response_time (response_time_ms),
    INDEX idx_api_user_endpoint_time (user_id, endpoint, timestamp)
);

-- Performance metrics storage (subset needed by dashboard)
CREATE TABLE IF NOT EXISTS performance_metrics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    metric_type VARCHAR(50) NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(12,4) NULL,
    additional_data JSON NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_metrics_name_date (metric_name, recorded_at),
    INDEX idx_metrics_recorded_at (recorded_at)
);
