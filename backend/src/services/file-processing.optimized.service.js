const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { Worker } = require('worker_threads');
const Queue = require('bull');
const { logger } = require('../utils/logger');
const cacheManager = require('./cache.service');
const { executeQuery } = require('../config/database.optimized');

class FileProcessingService {
  constructor() {
    this.processingQueue = new Queue('file processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      },
      settings: {
        stalledInterval: 30 * 1000,
        maxStalledCount: 1,
      },
      defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 10,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      }
    });

    this.batchQueue = new Queue('batch processing', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD
      }
    });

    this.workerPool = [];
    this.maxWorkers = parseInt(process.env.MAX_FILE_WORKERS) || 4;
    this.activeJobs = new Map();
    
    this.initializeQueues();
  }

  initializeQueues() {
    // Single file processing
    this.processingQueue.process('ocr', this.maxWorkers, async (job) => {
      return this.processFileJob(job.data);
    });

    // Batch processing
    this.batchQueue.process('batch-ocr', 2, async (job) => {
      return this.processBatchJob(job.data);
    });

    // Queue event handlers
    this.processingQueue.on('completed', (job, result) => {
      logger.info(`File processing job ${job.id} completed`, {
        jobId: job.id,
        processingTime: result.processingTime,
        fileSize: result.fileSize
      });
    });

    this.processingQueue.on('failed', (job, err) => {
      logger.error(`File processing job ${job.id} failed`, {
        jobId: job.id,
        error: err.message,
        filePath: job.data.filePath
      });
    });

    this.batchQueue.on('completed', (job, result) => {
      logger.info(`Batch processing job ${job.id} completed`, {
        jobId: job.id,
        filesProcessed: result.filesProcessed,
        totalTime: result.totalTime
      });
    });
  }

  // Generate file hash for caching
  async generateFileHash(filePath) {
    try {
      const fileBuffer = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      logger.error('Error generating file hash:', error);
      return null;
    }
  }

  // Check if file is already processed and cached
  async getCachedResult(fileHash) {
    try {
      // Check Redis cache first
      const cached = await cacheManager.getOCRResult(fileHash);
      if (cached) {
        logger.debug('OCR result found in Redis cache', { fileHash });
        return cached;
      }

      // Check database cache
      const [rows] = await executeQuery(
        'SELECT * FROM file_processing_cache WHERE file_hash = ?',
        [fileHash]
      );

      if (rows.length > 0) {
        const result = rows[0];
        // Update access stats
        await executeQuery(
          'UPDATE file_processing_cache SET last_accessed = NOW(), access_count = access_count + 1 WHERE file_hash = ?',
          [fileHash]
        );

        // Cache in Redis for faster future access
        await cacheManager.cacheOCRResult(fileHash, {
          text: result.ocr_result,
          confidence: result.confidence_score,
          engine: result.ocr_engine,
          processingTime: result.processing_time_ms
        });

        logger.debug('OCR result found in database cache', { fileHash });
        return {
          text: result.ocr_result,
          confidence: result.confidence_score,
          engine: result.ocr_engine,
          processingTime: result.processing_time_ms
        };
      }

      return null;
    } catch (error) {
      logger.error('Error checking cached result:', error);
      return null;
    }
  }

  // Store processing result in cache
  async storeResult(fileHash, filePath, result, stats) {
    try {
      // Store in Redis
      await cacheManager.cacheOCRResult(fileHash, result);

      // Store in database
      const fileInfo = await fs.stat(filePath);
      await executeQuery(`
        INSERT INTO file_processing_cache 
        (file_hash, file_path, file_size, mime_type, ocr_result, processing_time_ms, ocr_engine, confidence_score)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        last_accessed = NOW(),
        access_count = access_count + 1
      `, [
        fileHash,
        filePath,
        fileInfo.size,
        stats.mimeType || 'unknown',
        result.text,
        result.processingTime,
        result.engine,
        result.confidence || 0
      ]);

      logger.debug('OCR result stored in cache', { fileHash, engine: result.engine });
    } catch (error) {
      logger.error('Error storing result in cache:', error);
    }
  }

  // Process single file
  async processFile(filePath, mimeType, options = {}) {
    const startTime = Date.now();
    
    try {
      // Generate file hash for caching
      const fileHash = await this.generateFileHash(filePath);
      if (!fileHash) {
        throw new Error('Failed to generate file hash');
      }

      // Check cache first
      if (!options.skipCache) {
        const cached = await this.getCachedResult(fileHash);
        if (cached) {
          logger.info('File processing result served from cache', {
            filePath,
            fileHash,
            engine: cached.engine
          });
          return cached;
        }
      }

      // Add to processing queue
      const job = await this.processingQueue.add('ocr', {
        filePath,
        fileHash,
        mimeType,
        options
      }, {
        priority: options.priority || 0,
        delay: options.delay || 0
      });

      // Store job reference
      this.activeJobs.set(job.id, job);

      // Wait for job completion
      const result = await job.finished();
      
      // Remove from active jobs
      this.activeJobs.delete(job.id);

      // Store result in cache
      await this.storeResult(fileHash, filePath, result, { mimeType });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('File processing failed', {
        filePath,
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // Process file job (worker function)
  async processFileJob(data) {
    const { filePath, fileHash, mimeType, options } = data;
    const startTime = Date.now();

    try {
      // Determine processing strategy based on file type
      let result;
      
      if (mimeType === 'application/pdf') {
        result = await this.processPDF(filePath, options);
      } else if (mimeType.startsWith('image/')) {
        result = await this.processImage(filePath, options);
      } else {
        throw new Error(`Unsupported file type: ${mimeType}`);
      }

      const processingTime = Date.now() - startTime;
      
      return {
        text: result.text,
        confidence: result.confidence,
        engine: result.engine,
        processingTime,
        fileSize: result.fileSize
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('File processing job failed', {
        filePath,
        fileHash,
        error: error.message,
        processingTime
      });
      throw error;
    }
  }

  // Process PDF files
  async processPDF(filePath, options = {}) {
    const { preferredEngines = ['tesseract'] } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '../workers/pdf-processor.js'), {
        workerData: { filePath, preferredEngines }
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('PDF processing timeout'));
      }, 60000); // 1 minute timeout

      worker.on('message', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`PDF worker stopped with exit code ${code}`));
        }
      });
    });
  }

  // Process image files
  async processImage(filePath, options = {}) {
    const { preferredEngines = ['tesseract'] } = options;
    
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.join(__dirname, '../workers/image-processor.js'), {
        workerData: { filePath, preferredEngines }
      });

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error('Image processing timeout'));
      }, 30000); // 30 second timeout

      worker.on('message', (result) => {
        clearTimeout(timeout);
        resolve(result);
      });

      worker.on('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      worker.on('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`Image worker stopped with exit code ${code}`));
        }
      });
    });
  }

  // Batch processing
  async processBatch(files, options = {}) {
    try {
      const job = await this.batchQueue.add('batch-ocr', {
        files,
        options
      }, {
        priority: options.priority || 0
      });

      return await job.finished();
    } catch (error) {
      logger.error('Batch processing failed', { error: error.message });
      throw error;
    }
  }

  // Batch processing job
  async processBatchJob(data) {
    const { files, options } = data;
    const startTime = Date.now();
    const results = [];
    const errors = [];

    logger.info('Starting batch processing', { fileCount: files.length });

    // Process files in parallel batches
    const batchSize = options.batchSize || 5;
    
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (file) => {
        try {
          const result = await this.processFile(file.filePath, file.mimeType, {
            ...options,
            skipCache: false
          });
          return { file: file.filePath, result, success: true };
        } catch (error) {
          logger.error('Batch file processing failed', {
            file: file.filePath,
            error: error.message
          });
          return { file: file.filePath, error: error.message, success: false };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          if (outcome.value.success) {
            results.push(outcome.value);
          } else {
            errors.push(outcome.value);
          }
        } else {
          errors.push({
            file: batch[index].filePath,
            error: outcome.reason.message,
            success: false
          });
        }
      });

      // Add delay between batches to prevent overwhelming the system
      if (i + batchSize < files.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const totalTime = Date.now() - startTime;
    
    logger.info('Batch processing completed', {
      filesProcessed: results.length,
      errors: errors.length,
      totalTime
    });

    return {
      results,
      errors,
      filesProcessed: results.length,
      totalTime,
      successRate: ((results.length / files.length) * 100).toFixed(2) + '%'
    };
  }

  // Get processing statistics
  async getStats() {
    try {
      const waiting = await this.processingQueue.waiting();
      const active = await this.processingQueue.active();
      const completed = await this.processingQueue.completed();
      const failed = await this.processingQueue.failed();

      const batchWaiting = await this.batchQueue.waiting();
      const batchActive = await this.batchQueue.active();

      return {
        processing: {
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length
        },
        batch: {
          waiting: batchWaiting.length,
          active: batchActive.length
        },
        cache: await cacheManager.getStats()
      };
    } catch (error) {
      logger.error('Error getting processing stats:', error);
      return null;
    }
  }

  // Cleanup and shutdown
  async shutdown() {
    try {
      await this.processingQueue.close();
      await this.batchQueue.close();
      logger.info('File processing service shut down gracefully');
    } catch (error) {
      logger.error('Error shutting down file processing service:', error);
    }
  }
}

module.exports = new FileProcessingService();
