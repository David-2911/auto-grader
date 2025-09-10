const { pool } = require('../config/database');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

/**
 * System Service - Handles system-level operations and monitoring
 */
class SystemService {
  /**
   * Get overall system status
   * @returns {Promise<Object>} System status information
   */
  async getSystemStatus() {
    try {
      // Get system metrics
      const cpuUsage = os.loadavg()[0];
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;
      const uptime = os.uptime();

      // Get application metrics
      const [appMetrics] = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM performance_metrics WHERE metric_type = 'error' 
           AND recorded_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as recent_errors,
          (SELECT COUNT(*) FROM activity_logs 
           WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as recent_activities,
          (SELECT COUNT(*) FROM security_logs WHERE success = 0 
           AND created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)) as security_alerts
      `);

      // Get database metrics
      const [dbStatus] = await pool.query('SHOW STATUS');
      const dbMetrics = {};
      for (const row of dbStatus) {
        if (['Threads_connected', 'Queries', 'Slow_queries'].includes(row.Variable_name)) {
          dbMetrics[row.Variable_name] = row.Value;
        }
      }

      // Get storage metrics
      const storageInfo = await this.getStorageMetrics();

      return {
        system: {
          cpuUsage,
          memoryUsage,
          uptime,
          platform: os.platform(),
          arch: os.arch(),
          nodeVersion: process.version
        },
        application: {
          status: 'running',
          version: process.env.APP_VERSION || '1.0.0',
          ...appMetrics[0]
        },
        database: {
          status: 'connected',
          ...dbMetrics
        },
        storage: storageInfo
      };
    } catch (error) {
      logger.error('Error getting system status:', error);
      throw error;
    }
  }

  /**
   * Get system logs with filtering
   * @param {Object} options Query options
   * @returns {Promise<Array>} Filtered logs
   */
  async getSystemLogs({ logType = 'all', startDate, endDate, severity = 'all', limit = 100, page = 1 }) {
    try {
      let query = 'SELECT * FROM ';
      const queryParams = [];
      const whereConditions = [];

      // Determine which log table to query
      switch (logType) {
        case 'error':
          query += 'error_logs';
          break;
        case 'activity':
          query += 'activity_logs';
          break;
        case 'security':
          query += 'security_logs';
          break;
        case 'performance':
          query += 'performance_metrics';
          break;
        default:
          // Union all log types
          query = `
            SELECT 'error' as log_type, message, stack_trace as details, created_at, NULL as user_id FROM error_logs
            UNION ALL
            SELECT 'activity' as log_type, action as message, details, created_at, user_id FROM activity_logs
            UNION ALL
            SELECT 'security' as log_type, event_type as message, details, created_at, user_id FROM security_logs
            UNION ALL
            SELECT 'performance' as log_type, metric_name as message, additional_data as details, recorded_at as created_at, NULL as user_id FROM performance_metrics
          `;
      }

      // Add date filters
      if (startDate) {
        whereConditions.push('created_at >= ?');
        queryParams.push(startDate);
      }
      if (endDate) {
        whereConditions.push('created_at <= ?');
        queryParams.push(endDate);
      }

      // Add severity filter for error logs
      if (severity !== 'all' && logType === 'error') {
        whereConditions.push('severity = ?');
        queryParams.push(severity);
      }

      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }

      // Add pagination
      query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
      queryParams.push(Number(limit), (Number(page) - 1) * Number(limit));

      const [logs] = await pool.query(query, queryParams);

      return logs;
    } catch (error) {
      logger.error('Error getting system logs:', error);
      throw error;
    }
  }

  /**
   * Get system performance metrics
   * @param {string} period Time period for metrics
   * @returns {Promise<Object>} Performance metrics
   */
  async getSystemPerformance(period = 'day') {
    try {
      let timeFrame;
      switch (period) {
        case 'hour':
          timeFrame = 'INTERVAL 1 HOUR';
          break;
        case 'day':
          timeFrame = 'INTERVAL 24 HOUR';
          break;
        case 'week':
          timeFrame = 'INTERVAL 7 DAY';
          break;
        case 'month':
          timeFrame = 'INTERVAL 30 DAY';
          break;
        default:
          timeFrame = 'INTERVAL 24 HOUR';
      }

      // Get response time metrics
      const [responseTimeMetrics] = await pool.query(`
        SELECT 
          DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as time_bucket,
          AVG(metric_value) as avg_value,
          MAX(metric_value) as max_value,
          MIN(metric_value) as min_value
        FROM performance_metrics
        WHERE metric_type = 'response_time'
        AND recorded_at >= DATE_SUB(NOW(), ${timeFrame})
        GROUP BY time_bucket
        ORDER BY time_bucket
      `);

      // Get error rate metrics
      const [errorMetrics] = await pool.query(`
        SELECT 
          DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as time_bucket,
          COUNT(*) as error_count
        FROM performance_metrics
        WHERE metric_type = 'error'
        AND recorded_at >= DATE_SUB(NOW(), ${timeFrame})
        GROUP BY time_bucket
        ORDER BY time_bucket
      `);

      // Get memory usage metrics
      const [memoryMetrics] = await pool.query(`
        SELECT 
          DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as time_bucket,
          AVG(metric_value) as avg_value
        FROM performance_metrics
        WHERE metric_type = 'memory_usage'
        AND recorded_at >= DATE_SUB(NOW(), ${timeFrame})
        GROUP BY time_bucket
        ORDER BY time_bucket
      `);

      // Get CPU usage metrics
      const [cpuMetrics] = await pool.query(`
        SELECT 
          DATE_FORMAT(recorded_at, '%Y-%m-%d %H:00:00') as time_bucket,
          AVG(metric_value) as avg_value
        FROM performance_metrics
        WHERE metric_type = 'cpu_usage'
        AND recorded_at >= DATE_SUB(NOW(), ${timeFrame})
        GROUP BY time_bucket
        ORDER BY time_bucket
      `);

      return {
        responseTime: responseTimeMetrics,
        errors: errorMetrics,
        memory: memoryMetrics,
        cpu: cpuMetrics
      };
    } catch (error) {
      logger.error('Error getting system performance:', error);
      throw error;
    }
  }

  /**
   * Get database statistics and health metrics
   * @returns {Promise<Object>} Database statistics
   */
  async getDatabaseStats() {
    try {
      // Get table sizes
      const [tableSizes] = await pool.query(`
        SELECT 
          table_name,
          table_rows,
          data_length + index_length as total_size,
          data_length,
          index_length,
          UPDATE_TIME
        FROM information_schema.TABLES
        WHERE table_schema = DATABASE()
      `);

      // Get database variables
      const [variables] = await pool.query('SHOW VARIABLES');
      const dbVariables = {};
      variables.forEach(row => {
        if ([
          'max_connections',
          'innodb_buffer_pool_size',
          'key_buffer_size',
          'max_allowed_packet'
        ].includes(row.Variable_name)) {
          dbVariables[row.Variable_name] = row.Value;
        }
      });

      // Get process list
      const [processes] = await pool.query(`
        SELECT 
          id,
          user,
          host,
          db,
          command,
          time,
          state,
          info
        FROM information_schema.PROCESSLIST
      `);

      // Get InnoDB status
      const [innodbStatus] = await pool.query('SHOW ENGINE INNODB STATUS');

      return {
        tableSizes,
        variables: dbVariables,
        processes,
        innodbStatus: innodbStatus[0]
      };
    } catch (error) {
      logger.error('Error getting database stats:', error);
      throw error;
    }
  }

  /**
   * Get storage metrics
   * @returns {Promise<Object>} Storage metrics
   */
  async getStorageMetrics() {
    try {
      const storagePath = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');
      
      // Get storage directory stats
      const stats = await fs.stat(storagePath);
      
      // Get disk usage using df command
      const { stdout } = await execPromise(`df -h ${storagePath}`);
      const dfLines = stdout.split('\n');
      const diskInfo = dfLines[1].split(/\s+/);

      // Get size of different storage directories
      const directories = [
        'nbgrader_assignments',
        'nbgrader_submissions',
        'submission_pdfs',
        'processed_files'
      ];

      const dirSizes = {};
      for (const dir of directories) {
        const dirPath = path.join(storagePath, dir);
        try {
          const size = await this.getDirectorySize(dirPath);
          dirSizes[dir] = size;
        } catch (error) {
          logger.warn(`Error getting size for directory ${dir}:`, error);
          dirSizes[dir] = 0;
        }
      }

      return {
        totalSpace: diskInfo[1],
        usedSpace: diskInfo[2],
        availableSpace: diskInfo[3],
        usagePercentage: diskInfo[4],
        directoryStats: dirSizes
      };
    } catch (error) {
      logger.error('Error getting storage metrics:', error);
      throw error;
    }
  }

  /**
   * Get directory size recursively
   * @param {string} dirPath Directory path
   * @returns {Promise<number>} Size in bytes
   */
  async getDirectorySize(dirPath) {
    const files = await fs.readdir(dirPath);
    const stats = await Promise.all(
      files.map(async file => {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        
        if (stat.isDirectory()) {
          return this.getDirectorySize(filePath);
        }
        
        return stat.size;
      })
    );
    
    return stats.reduce((acc, size) => acc + size, 0);
  }

  /**
   * Create system backup
   * @param {string} description Backup description
   * @returns {Promise<Object>} Backup details
   */
  async createBackup(description) {
    const backupPath = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `backup_${timestamp}.sql`;
    
    try {
      // Create backups directory if it doesn't exist
      await fs.mkdir(backupPath, { recursive: true });
      
      // Get database credentials from environment
      const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;
      
      // Create backup using mysqldump
      const backupCommand = `mysqldump -h ${DB_HOST} -u ${DB_USER} -p${DB_PASS} ${DB_NAME} > ${path.join(backupPath, backupFile)}`;
      await execPromise(backupCommand);
      
      // Record backup in database
      const [result] = await pool.query(
        `INSERT INTO system_backups (
          file_path, description, size, status, created_at
        ) VALUES (?, ?, ?, ?, NOW())`,
        [backupFile, description, await fs.stat(path.join(backupPath, backupFile)).size, 'completed']
      );
      
      return {
        id: result.insertId,
        fileName: backupFile,
        description,
        createdAt: new Date()
      };
    } catch (error) {
      logger.error('Error creating system backup:', error);
      throw error;
    }
  }

  /**
   * Get backup status and history
   * @returns {Promise<Object>} Backup status and history
   */
  async getBackupStatus() {
    try {
      // Get all backups
      const [backups] = await pool.query(
        'SELECT * FROM system_backups ORDER BY created_at DESC'
      );
      
      // Get latest successful backup
      const [latestBackup] = await pool.query(
        'SELECT * FROM system_backups WHERE status = ? ORDER BY created_at DESC LIMIT 1',
        ['completed']
      );
      
      // Get backup statistics
      const [stats] = await pool.query(`
        SELECT 
          COUNT(*) as total_backups,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_backups,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_backups,
          MAX(created_at) as last_backup_date,
          AVG(size) as average_size
        FROM system_backups
      `);

      return {
        backups,
        latestBackup: latestBackup[0],
        statistics: stats[0]
      };
    } catch (error) {
      logger.error('Error getting backup status:', error);
      throw error;
    }
  }

  /**
   * Restore system from backup
   * @param {string} backupId Backup ID
   * @returns {Promise<boolean>} Success status
   */
  async restoreBackup(backupId) {
    const backupPath = process.env.BACKUP_PATH || path.join(__dirname, '../../backups');
    
    try {
      // Get backup details
      const [backups] = await pool.query(
        'SELECT * FROM system_backups WHERE id = ?',
        [backupId]
      );
      
      if (!backups.length) {
        throw createError(404, 'Backup not found');
      }
      
      const backup = backups[0];
      const backupFile = path.join(backupPath, backup.file_path);
      
      // Verify backup file exists
      if (!await fs.access(backupFile).then(() => true).catch(() => false)) {
        throw createError(404, 'Backup file not found');
      }
      
      // Get database credentials from environment
      const { DB_HOST, DB_USER, DB_PASS, DB_NAME } = process.env;
      
      // Restore database from backup
      const restoreCommand = `mysql -h ${DB_HOST} -u ${DB_USER} -p${DB_PASS} ${DB_NAME} < ${backupFile}`;
      await execPromise(restoreCommand);
      
      // Record restore operation
      await pool.query(
        `INSERT INTO system_restores (
          backup_id, status, started_at, completed_at
        ) VALUES (?, ?, NOW(), NOW())`,
        [backupId, 'completed']
      );
      
      return true;
    } catch (error) {
      logger.error('Error restoring from backup:', error);
      
      // Record failed restore attempt
      if (backupId) {
        await pool.query(
          `INSERT INTO system_restores (
            backup_id, status, started_at, completed_at, error_message
          ) VALUES (?, ?, NOW(), NOW(), ?)`,
          [backupId, 'failed', error.message]
        ).catch(err => logger.error('Error recording failed restore:', err));
      }
      
      throw error;
    }
  }
}

module.exports = SystemService;
