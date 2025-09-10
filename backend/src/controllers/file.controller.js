const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');
const FileProcessingService = require('../services/file-processing.service');
const mlModel = require('../models/ml.model');

/**
 * Controller for handling file uploads and OCR processing
 */
class FileController {
  /**
   * Upload and process a file
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async uploadAndProcess(req, res, next) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return next(createError(400, 'No file uploaded'));
      }
      
      // Get the uploaded file
      const file = req.file;
      
      // Check if the file was processed by the middleware
      if (req.extractedText) {
        logger.info(`File processed successfully: ${file.path}`);
        
        return res.success({
          fileId: path.basename(file.path),
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          extractedText: req.extractedText
        }, 'File uploaded and processed successfully');
      }
      
      // If not processed by middleware, process it now
      const extractedText = await FileProcessingService.processFile(
        file.path, 
        file.mimetype,
        { 
          preferredEngines: req.query.ocrEngine 
            ? [req.query.ocrEngine, 'tesseract', 'gvision', 'textract']
            : ['tesseract', 'gvision', 'textract'],
          useCache: req.query.noCache !== 'true'
        }
      );
      
      // Save the extracted text for debugging
      const textOutputPath = `${file.path}.txt`;
      await fs.writeFile(textOutputPath, extractedText);
      
      // Return success response
      return res.success({
        fileId: path.basename(file.path),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        extractedText
      }, 'File uploaded and processed successfully');
    } catch (error) {
      logger.error('Error in uploadAndProcess:', error.message);
      next(error);
    }
  }

  /**
   * Upload and convert PDF to Jupyter notebook
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async uploadAndConvertToNotebook(req, res, next) {
    try {
      // Check if file was uploaded
      if (!req.file) {
        return next(createError(400, 'No file uploaded'));
      }
      
      // Get the uploaded file
      const file = req.file;
      
      // Only accept PDFs for conversion
      if (file.mimetype !== 'application/pdf') {
        return next(createError(400, 'Only PDF files can be converted to notebooks'));
      }
      
      // Generate output path
      const outputDir = path.join(__dirname, '../../storage/nbgrader_assignments');
      await fs.mkdir(outputDir, { recursive: true });
      
      const outputFilename = `${path.basename(file.path, '.pdf')}.ipynb`;
      const outputPath = path.join(outputDir, outputFilename);
      
      // Convert PDF to notebook
      await FileController._convertPdfToNotebook(file.path, outputPath, req.query.ocrEngine || 'tesseract');
      
      // Return success response
      return res.success({
        fileId: path.basename(file.path),
        originalName: file.originalname,
        notebookPath: outputPath,
        notebookFilename: outputFilename
      }, 'File uploaded and converted to notebook successfully');
    } catch (error) {
      logger.error('Error in uploadAndConvertToNotebook:', error.message);
      next(error);
    }
  }

  /**
   * Process a batch of files
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async processBatch(req, res, next) {
    try {
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return next(createError(400, 'No files uploaded'));
      }
      
      // Get the uploaded files
      const files = req.files;
      
      // Check if batch was processed by middleware
      if (req.batchResults) {
        logger.info(`Batch processed successfully: ${files.length} files`);
        
        return res.success({
          totalFiles: files.length,
          results: req.batchResults
        }, 'Batch processed successfully');
      }
      
      // If not processed by middleware, process it now
      const filesToProcess = files.map(file => ({
        filePath: file.path,
        mimeType: file.mimetype
      }));
      
      const results = await FileProcessingService.processBatch(filesToProcess, {
        preferredEngines: req.query.ocrEngine 
          ? [req.query.ocrEngine, 'tesseract', 'gvision', 'textract']
          : ['tesseract', 'gvision', 'textract'],
        useCache: req.query.noCache !== 'true'
      });
      
      // Save results in database
      for (const result of results) {
        if (result.text) {
          await mlModel.saveProcessedText({
            filePath: result.filePath,
            text: result.text,
            userId: req.user ? req.user.id : null,
            processedAt: new Date()
          });
        }
      }
      
      // Return success response
      return res.success({
        totalFiles: files.length,
        results: results.map(result => ({
          fileId: path.basename(result.filePath),
          extractedText: result.text,
          error: result.error ? result.error.message : null
        }))
      }, 'Batch processed successfully');
    } catch (error) {
      logger.error('Error in processBatch:', error.message);
      next(error);
    }
  }

  /**
   * Get processing status
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async getProcessingStatus(req, res, next) {
    try {
      // Get all processing jobs
      const jobs = await mlModel.getProcessingJobs(req.user.id);
      
      return res.success({
        jobs
      }, 'Processing jobs retrieved successfully');
    } catch (error) {
      logger.error('Error in getProcessingStatus:', error.message);
      next(error);
    }
  }

  /**
   * Clear processing cache
   * @param {Object} req - Express request object
   * @param {Object} res - Express response object
   * @param {Function} next - Express next function
   */
  static async clearProcessingCache(req, res, next) {
    try {
      // Clear cache
      FileProcessingService.clearCache();
      
      return res.success({}, 'Processing cache cleared successfully');
    } catch (error) {
      logger.error('Error in clearProcessingCache:', error.message);
      next(error);
    }
  }

  /**
   * Convert PDF to Jupyter notebook
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} outputPath - Path to save the notebook
   * @param {string} engine - OCR engine to use
   * @returns {Promise<void>}
   * @private
   */
  static async _convertPdfToNotebook(pdfPath, outputPath, engine = 'tesseract') {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/pdf_to_notebook.py');
      
      const process = spawn('python3', [
        pythonScript,
        pdfPath,
        '--output', outputPath,
        '--engine', engine
      ]);
      
      let error = '';
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`PDF to notebook conversion failed: ${error}`));
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = FileController;
