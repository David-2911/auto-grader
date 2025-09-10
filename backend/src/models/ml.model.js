const { pool } = require('../config/database');
const { logger } = require('../utils/logger');

/**
 * MLModel class for managing machine learning models in the database
 */
class MLModel {
  /**
   * Create a new ML model
   * @param {Object} modelData - Model data
   * @returns {Promise<Object>} - Created model data
   */
  static async create(modelData) {
    try {
      const { 
        name, 
        description, 
        version, 
        modelPath, 
        modelType, 
        accuracyMetrics 
      } = modelData;
      
      const [result] = await pool.query(
        `INSERT INTO ml_models 
         (name, description, version, model_path, model_type, accuracy_metrics, is_active) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [name, description, version, modelPath, modelType, accuracyMetrics, true]
      );
      
      return {
        id: result.insertId,
        name,
        description,
        version,
        modelPath,
        modelType,
        accuracyMetrics,
        isActive: true
      };
    } catch (error) {
      logger.error('Error creating ML model:', error);
      throw error;
    }
  }
  
  /**
   * Find a model by ID
   * @param {number} id - Model ID
   * @returns {Promise<Object|null>} - Model data or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM ml_models WHERE id = ?',
        [id]
      );
      
      if (!rows.length) return null;
      
      // Get usage statistics
      const [usageStats] = await pool.query(
        `SELECT 
          COUNT(*) AS total_usage,
          AVG(processing_time_ms) AS avg_processing_time,
          AVG(result_confidence) AS avg_confidence,
          COUNT(CASE WHEN status = 'success' THEN 1 END) AS success_count,
          COUNT(CASE WHEN status = 'error' THEN 1 END) AS error_count
         FROM model_usage
         WHERE model_id = ?`,
        [id]
      );
      
      return {
        ...rows[0],
        usageStats: usageStats[0]
      };
    } catch (error) {
      logger.error('Error finding ML model by ID:', error);
      throw error;
    }
  }
  
  /**
   * Get all ML models
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of models
   */
  static async getAll({ modelType, isActive } = {}) {
    try {
      let query = 'SELECT * FROM ml_models';
      const queryParams = [];
      const whereConditions = [];
      
      if (modelType) {
        whereConditions.push('model_type = ?');
        queryParams.push(modelType);
      }
      
      if (isActive !== undefined) {
        whereConditions.push('is_active = ?');
        queryParams.push(isActive);
      }
      
      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' ORDER BY name, version';
      
      const [rows] = await pool.query(query, queryParams);
      
      return rows;
    } catch (error) {
      logger.error('Error getting all ML models:', error);
      throw error;
    }
  }
  
  /**
   * Get active model by type
   * @param {string} modelType - Type of model
   * @returns {Promise<Object|null>} - Active model of specified type or null
   */
  static async getActiveByType(modelType) {
    try {
      const [rows] = await pool.query(
        'SELECT * FROM ml_models WHERE model_type = ? AND is_active = true ORDER BY created_at DESC LIMIT 1',
        [modelType]
      );
      
      return rows.length ? rows[0] : null;
    } catch (error) {
      logger.error('Error getting active model by type:', error);
      throw error;
    }
  }
  
  /**
   * Update a model
   * @param {number} id - Model ID
   * @param {Object} modelData - Updated model data
   * @returns {Promise<boolean>} - Success status
   */
  static async update(id, modelData) {
    try {
      const { 
        name, 
        description, 
        version, 
        modelPath, 
        accuracyMetrics, 
        isActive 
      } = modelData;
      
      const [result] = await pool.query(
        `UPDATE ml_models 
         SET name = ?, 
             description = ?, 
             version = ?, 
             model_path = ?, 
             accuracy_metrics = ?,
             is_active = ?
         WHERE id = ?`,
        [name, description, version, modelPath, accuracyMetrics, isActive, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating ML model:', error);
      throw error;
    }
  }
  
  /**
   * Update model status (active/inactive)
   * @param {number} id - Model ID
   * @param {boolean} isActive - Active status
   * @returns {Promise<boolean>} - Success status
   */
  static async updateStatus(id, isActive) {
    try {
      const [result] = await pool.query(
        'UPDATE ml_models SET is_active = ? WHERE id = ?',
        [isActive, id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error updating ML model status:', error);
      throw error;
    }
  }
  
  /**
   * Get model usage history
   * @param {number} id - Model ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Usage history
   */
  static async getUsageHistory(id, { limit = 100, page = 1 } = {}) {
    try {
      const [rows] = await pool.query(
        `SELECT mu.*, s.assignment_id, a.title AS assignment_title
         FROM model_usage mu
         JOIN submissions s ON mu.submission_id = s.id
         JOIN assignments a ON s.assignment_id = a.id
         WHERE mu.model_id = ?
         ORDER BY mu.used_at DESC
         LIMIT ? OFFSET ?`,
        [id, Number(limit), (Number(page) - 1) * Number(limit)]
      );
      
      return rows;
    } catch (error) {
      logger.error('Error getting model usage history:', error);
      throw error;
    }
  }
  
  /**
   * Record performance metric
   * @param {Object} metricData - Performance metric data
   * @returns {Promise<Object>} - Created metric
   */
  static async recordPerformanceMetric(metricData) {
    try {
      const { 
        metricType, 
        metricName, 
        metricValue, 
        additionalData 
      } = metricData;
      
      const [result] = await pool.query(
        `INSERT INTO performance_metrics 
         (metric_type, metric_name, metric_value, additional_data) 
         VALUES (?, ?, ?, ?)`,
        [metricType, metricName, metricValue, additionalData]
      );
      
      return {
        id: result.insertId,
        metricType,
        metricName,
        metricValue,
        additionalData,
        recordedAt: new Date()
      };
    } catch (error) {
      logger.error('Error recording performance metric:', error);
      throw error;
    }
  }
  
  /**
   * Get performance metrics
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Performance metrics
   */
  static async getPerformanceMetrics({ metricType, metricName, startDate, endDate, limit = 100 } = {}) {
    try {
      let query = 'SELECT * FROM performance_metrics';
      const queryParams = [];
      const whereConditions = [];
      
      if (metricType) {
        whereConditions.push('metric_type = ?');
        queryParams.push(metricType);
      }
      
      if (metricName) {
        whereConditions.push('metric_name = ?');
        queryParams.push(metricName);
      }
      
      if (startDate) {
        whereConditions.push('recorded_at >= ?');
        queryParams.push(startDate);
      }
      
      if (endDate) {
        whereConditions.push('recorded_at <= ?');
        queryParams.push(endDate);
      }
      
      if (whereConditions.length) {
        query += ' WHERE ' + whereConditions.join(' AND ');
      }
      
      query += ' ORDER BY recorded_at DESC LIMIT ?';
      queryParams.push(Number(limit));
      
      const [rows] = await pool.query(query, queryParams);
      
      return rows;
    } catch (error) {
      logger.error('Error getting performance metrics:', error);
      throw error;
    }
  }
  
  /**
   * Delete a model
   * @param {number} id - Model ID
   * @returns {Promise<boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM ml_models WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error('Error deleting ML model:', error);
      throw error;
    }
  }
}

module.exports = MLModel;
