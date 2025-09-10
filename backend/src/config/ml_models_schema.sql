-- ML Models Schema Update
-- This schema adds ML model management tables to the database

-- Table for storing ML models metadata
CREATE TABLE IF NOT EXISTS ml_models (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) NOT NULL,
  model_path VARCHAR(255) NOT NULL,
  model_type ENUM('similarity', 'transformer', 'ensemble', 'classifier', 'regression') NOT NULL,
  feature_set VARCHAR(100) DEFAULT 'default',
  training_accuracy DECIMAL(5,4),
  validation_accuracy DECIMAL(5,4),
  accuracy_metrics JSON,
  hyperparameters JSON,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_model_version (name, version)
);

-- Table for tracking model usage
CREATE TABLE IF NOT EXISTS model_usage (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_id INT NOT NULL,
  submission_id INT NOT NULL,
  processing_time_ms INT NOT NULL,
  result_confidence DECIMAL(5,4),
  prediction_score DECIMAL(5,2),
  feedback_quality_rating INT,
  status ENUM('success', 'error') NOT NULL,
  error_message VARCHAR(255),
  used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE CASCADE,
  FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
);

-- Table for tracking performance metrics
CREATE TABLE IF NOT EXISTS performance_metrics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  model_id INT,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value TEXT NOT NULL,
  additional_data JSON,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (model_id) REFERENCES ml_models(id) ON DELETE SET NULL
);

-- Table for A/B testing
CREATE TABLE IF NOT EXISTS ab_tests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_name VARCHAR(255) NOT NULL,
  description TEXT,
  model_a_id INT NOT NULL,
  model_b_id INT NOT NULL,
  winner_id INT,
  status ENUM('running', 'completed', 'terminated') DEFAULT 'running',
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMP NULL,
  
  FOREIGN KEY (model_a_id) REFERENCES ml_models(id) ON DELETE CASCADE,
  FOREIGN KEY (model_b_id) REFERENCES ml_models(id) ON DELETE CASCADE,
  FOREIGN KEY (winner_id) REFERENCES ml_models(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_model_usage_model_id ON model_usage(model_id);
CREATE INDEX idx_model_usage_submission_id ON model_usage(submission_id);
CREATE INDEX idx_model_usage_used_at ON model_usage(used_at);
CREATE INDEX idx_performance_metrics_model_id ON performance_metrics(model_id);
CREATE INDEX idx_performance_metrics_metric_type ON performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_recorded_at ON performance_metrics(recorded_at);
