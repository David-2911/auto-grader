#!/usr/bin/env node

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { logger } = require('../src/utils/logger');
require('dotenv').config();

async function migrateSafe() {
  let connection;
  try {
    const dbConfig = {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'auto_grade',
      multipleStatements: true
    };
    logger.info('Connecting for safe migration (no DROP DATABASE)');
    connection = await mysql.createConnection(dbConfig);

    // Ensure refresh_tokens table exists
    await connection.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        revoked BOOLEAN DEFAULT FALSE,
        revoked_at DATETIME NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Helper to ensure an index exists
    async function ensureIndex(table, indexName, indexDef) {
      const [rows] = await connection.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.statistics 
         WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
        [table, indexName]
      );
      if ((rows[0]?.cnt || 0) === 0) {
        await connection.query(`CREATE INDEX ${indexName} ON ${table} (${indexDef})`);
        logger.info(`Created index ${indexName} on ${table}`);
      }
    }

    await ensureIndex('refresh_tokens', 'idx_refresh_tokens_user_id', 'user_id');
    await ensureIndex('refresh_tokens', 'idx_refresh_tokens_token', 'token');
    await ensureIndex('refresh_tokens', 'idx_refresh_tokens_expires_at', 'expires_at');

    // Ensure refresh token column can hold full JWTs
    const [tokenCol] = await connection.query(
      `SELECT DATA_TYPE AS dataType, CHARACTER_MAXIMUM_LENGTH AS len
       FROM information_schema.columns
       WHERE table_schema = DATABASE() AND table_name = 'refresh_tokens' AND column_name = 'token'`
    );
    const colInfo = tokenCol[0];
    if (colInfo && colInfo.dataType === 'varchar' && (colInfo.len || 0) < 512) {
      await connection.query(`ALTER TABLE refresh_tokens MODIFY token VARCHAR(512) NOT NULL`);
      logger.info('Altered refresh_tokens.token to VARCHAR(512)');
    }

    // Ensure auth/security tables exist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        user_id INT NULL,
        email VARCHAR(255) NULL,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT NULL,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await ensureIndex('auth_logs', 'idx_auth_logs_user_id', 'user_id');
    await ensureIndex('auth_logs', 'idx_auth_logs_event_type', 'event_type');
    await ensureIndex('auth_logs', 'idx_auth_logs_created_at', 'created_at');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS permission_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        performed_by INT NOT NULL,
        target_user_id INT NOT NULL,
        previous_role VARCHAR(50) NULL,
        new_role VARCHAR(50) NULL,
        ip_address VARCHAR(45) NOT NULL,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        reason VARCHAR(255) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (performed_by) REFERENCES users(id),
        FOREIGN KEY (target_user_id) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS security_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_type VARCHAR(50) NOT NULL,
        user_id INT NULL,
        target_id INT NULL,
        action VARCHAR(50) NOT NULL,
        resource VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45) NOT NULL,
        user_agent TEXT NULL,
        success BOOLEAN NOT NULL DEFAULT TRUE,
        details JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await ensureIndex('security_logs', 'idx_security_logs_user_id', 'user_id');
    await ensureIndex('security_logs', 'idx_security_logs_event_type', 'event_type');
    await ensureIndex('security_logs', 'idx_security_logs_created_at', 'created_at');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_security_settings (
        user_id INT PRIMARY KEY,
        two_factor_enabled BOOLEAN DEFAULT FALSE,
        two_factor_method ENUM('app','email','sms') NULL,
        two_factor_secret VARCHAR(255) NULL,
        notification_on_login BOOLEAN DEFAULT FALSE,
        allowed_ips TEXT NULL,
        session_timeout_minutes INT DEFAULT 60,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Helper to ensure a column exists on a table
    async function ensureColumn(table, column, definition) {
      const [cols] = await connection.query(
        `SELECT COUNT(*) AS cnt FROM information_schema.columns 
         WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
        [table, column]
      );
      if ((cols[0]?.cnt || 0) === 0) {
        await connection.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
        logger.info(`Added column ${column} to ${table}`);
      }
    }

    // Add expected auth/security columns to users if missing
    await ensureColumn('users', 'account_status', "ENUM('active','suspended','locked','unverified') DEFAULT 'active'");
    await ensureColumn('users', 'email_verified', 'BOOLEAN DEFAULT FALSE');
    await ensureColumn('users', 'failed_login_attempts', 'INT DEFAULT 0');
    await ensureColumn('users', 'last_failed_login', 'DATETIME NULL');
    await ensureColumn('users', 'password_changed_at', 'DATETIME NULL');
    await ensureColumn('users', 'require_password_change', 'BOOLEAN DEFAULT FALSE');

    await connection.query(`
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    await ensureIndex('user_sessions', 'idx_user_sessions_user_id', 'user_id');
    await ensureIndex('user_sessions', 'idx_user_sessions_session_token', 'session_token');
    await ensureIndex('user_sessions', 'idx_user_sessions_expires_at', 'expires_at');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_verification (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        verification_token VARCHAR(255) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Apply core performance schema (contains CREATE TABLE with inline indexes)
    const perfCoreSql = fs.readFileSync(path.join(__dirname, '../src/config/performance_core_schema.sql'), 'utf8');
    await connection.query(perfCoreSql);

    logger.info('Safe migration completed successfully');
    process.exit(0);
  } catch (err) {
    logger.error('Safe migration failed:', err);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

if (require.main === module) {
  migrateSafe();
}

module.exports = { migrateSafe };
