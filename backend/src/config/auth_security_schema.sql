-- Authentication and Security Schema Updates
-- Adds tables for audit logging, security events, and session management

-- =========================================
-- Security Logging Tables
-- =========================================

-- Authentication event logs
CREATE TABLE IF NOT EXISTS auth_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL COMMENT 'login, logout, register, password_reset, etc.',
    user_id INT NULL COMMENT 'NULL for anonymous attempts',
    email VARCHAR(255) NULL COMMENT 'Email used in the attempt',
    success BOOLEAN NOT NULL DEFAULT FALSE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    reason VARCHAR(255) NULL COMMENT 'Reason for failure if applicable',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Permission change logs
CREATE TABLE IF NOT EXISTS permission_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    performed_by INT NOT NULL COMMENT 'User ID who changed the permission',
    target_user_id INT NOT NULL COMMENT 'User ID whose permissions were changed',
    previous_role VARCHAR(50) NULL,
    new_role VARCHAR(50) NULL,
    ip_address VARCHAR(45) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    reason VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
);

-- General security event logs
CREATE TABLE IF NOT EXISTS security_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL COMMENT 'permission_check, resource_access, etc.',
    user_id INT NULL COMMENT 'User ID who triggered the event',
    target_id INT NULL COMMENT 'Target resource ID if applicable',
    action VARCHAR(50) NOT NULL COMMENT 'create, read, update, delete, etc.',
    resource VARCHAR(255) NOT NULL COMMENT 'Path or resource identifier',
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    details JSON NULL COMMENT 'Additional details about the event',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- =========================================
-- User Status and Security Enhancements
-- =========================================

-- Add account status tracking to users table if not exists
ALTER TABLE users
ADD COLUMN IF NOT EXISTS account_status ENUM('active', 'suspended', 'locked', 'unverified') DEFAULT 'active' AFTER is_active,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE AFTER account_status,
ADD COLUMN IF NOT EXISTS failed_login_attempts INT DEFAULT 0 AFTER email_verified,
ADD COLUMN IF NOT EXISTS last_failed_login DATETIME NULL AFTER failed_login_attempts,
ADD COLUMN IF NOT EXISTS password_changed_at DATETIME NULL AFTER last_failed_login,
ADD COLUMN IF NOT EXISTS require_password_change BOOLEAN DEFAULT FALSE AFTER password_changed_at;

-- User security preferences
CREATE TABLE IF NOT EXISTS user_security_settings (
    user_id INT PRIMARY KEY,
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    two_factor_method ENUM('app', 'email', 'sms') NULL,
    two_factor_secret VARCHAR(255) NULL,
    notification_on_login BOOLEAN DEFAULT FALSE,
    allowed_ips TEXT NULL COMMENT 'Comma-separated list of allowed IP addresses',
    session_timeout_minutes INT DEFAULT 60,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User sessions (for tracking active sessions)
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NOT NULL,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Email verification tokens
CREATE TABLE IF NOT EXISTS email_verification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    verification_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_security_logs_user_id ON security_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_logs_event_type ON security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_logs_created_at ON security_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
