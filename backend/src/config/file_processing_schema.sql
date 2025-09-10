-- File processing tables

-- Table for storing processed files information
CREATE TABLE IF NOT EXISTS processed_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  file_path VARCHAR(255) NOT NULL,
  user_id INT,
  extracted_text LONGTEXT,
  processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  status ENUM('processing', 'completed', 'failed') NOT NULL DEFAULT 'processing',
  error_message TEXT,
  processing_time_ms INT,
  ocr_engine VARCHAR(50),
  file_size INT,
  file_type VARCHAR(100),
  md5_hash VARCHAR(32),
  page_count INT,
  image_quality_score FLOAT,
  metadata JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_file_path (file_path),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_processed_at (processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for processing jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_type ENUM('single', 'batch') NOT NULL,
  status ENUM('queued', 'processing', 'completed', 'failed') NOT NULL DEFAULT 'queued',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  user_id INT,
  total_files INT DEFAULT 1,
  processed_files INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  priority INT DEFAULT 5,
  callback_url VARCHAR(255),
  notification_sent BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_status (status),
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for job-file relationships
CREATE TABLE IF NOT EXISTS job_files (
  id INT AUTO_INCREMENT PRIMARY KEY,
  job_id INT NOT NULL,
  processed_file_id INT NOT NULL,
  order_index INT NOT NULL,
  FOREIGN KEY (job_id) REFERENCES processing_jobs(id) ON DELETE CASCADE,
  FOREIGN KEY (processed_file_id) REFERENCES processed_files(id) ON DELETE CASCADE,
  UNIQUE KEY job_file_unique (job_id, processed_file_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create OCR statistics table for monitoring
CREATE TABLE IF NOT EXISTS ocr_statistics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  date DATE NOT NULL,
  ocr_engine VARCHAR(50) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  total_files INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  avg_processing_time_ms FLOAT,
  avg_file_size INT,
  avg_text_length INT,
  UNIQUE KEY date_engine_type_unique (date, ocr_engine, file_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create triggers to update statistics
DELIMITER //

CREATE TRIGGER after_processed_file_insert
AFTER INSERT ON processed_files
FOR EACH ROW
BEGIN
  DECLARE v_ocr_engine VARCHAR(50);
  DECLARE v_file_type VARCHAR(50);
  
  -- Default values if NULL
  SET v_ocr_engine = COALESCE(NEW.ocr_engine, 'unknown');
  SET v_file_type = COALESCE(NEW.file_type, 'unknown');
  
  -- Insert or update statistics
  INSERT INTO ocr_statistics (
    date, ocr_engine, file_type, total_files, 
    success_count, error_count, avg_processing_time_ms, 
    avg_file_size, avg_text_length
  ) 
  VALUES (
    CURRENT_DATE(), v_ocr_engine, v_file_type, 1,
    IF(NEW.status = 'completed', 1, 0),
    IF(NEW.status = 'failed', 1, 0),
    NEW.processing_time_ms,
    NEW.file_size,
    IF(NEW.extracted_text IS NULL, 0, LENGTH(NEW.extracted_text))
  )
  ON DUPLICATE KEY UPDATE
    total_files = total_files + 1,
    success_count = success_count + IF(NEW.status = 'completed', 1, 0),
    error_count = error_count + IF(NEW.status = 'failed', 1, 0),
    avg_processing_time_ms = (avg_processing_time_ms * total_files + COALESCE(NEW.processing_time_ms, 0)) / (total_files + 1),
    avg_file_size = (avg_file_size * total_files + COALESCE(NEW.file_size, 0)) / (total_files + 1),
    avg_text_length = (avg_text_length * total_files + IF(NEW.extracted_text IS NULL, 0, LENGTH(NEW.extracted_text))) / (total_files + 1);
END //

DELIMITER ;
