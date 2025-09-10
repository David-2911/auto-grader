const path = require('path');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const sharp = require('sharp');
const { logger } = require('../utils/logger');
const { createError } = require('../utils/error.util');

// Cache for processed results
const processedCache = new Map();

/**
 * Service for processing uploaded files and converting them to text using OCR
 */
class FileProcessingService {
  /**
   * Supported file types for processing
   */
  static SUPPORTED_FILE_TYPES = {
    PDF: ['application/pdf'],
    IMAGE: ['image/jpeg', 'image/png', 'image/tiff', 'image/bmp'],
    DOCUMENT: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  };

  /**
   * Check if file type is supported
   * @param {string} mimeType - MIME type of the file
   * @returns {boolean} - Whether the file type is supported
   */
  static isFileTypeSupported(mimeType) {
    return Object.values(FileProcessingService.SUPPORTED_FILE_TYPES)
      .flat()
      .includes(mimeType);
  }

  /**
   * Get the category of a file based on its MIME type
   * @param {string} mimeType - MIME type of the file
   * @returns {string|null} - Category of the file or null if not supported
   */
  static getFileCategory(mimeType) {
    for (const [category, types] of Object.entries(FileProcessingService.SUPPORTED_FILE_TYPES)) {
      if (types.includes(mimeType)) {
        return category;
      }
    }
    return null;
  }

  /**
   * Process a file and extract text using OCR
   * @param {string} filePath - Path to the file
   * @param {string} mimeType - MIME type of the file
   * @param {Object} options - Processing options
   * @param {boolean} options.useCache - Whether to use cache (default: true)
   * @param {string[]} options.preferredEngines - Preferred OCR engines in order of preference
   * @returns {Promise<string>} - Extracted text
   */
  static async processFile(filePath, mimeType, options = {}) {
    const { useCache = true, preferredEngines = ['tesseract', 'gvision', 'textract'] } = options;
    
    // Generate cache key based on file path and last modification time
    const cacheKey = await FileProcessingService._generateCacheKey(filePath);
    
    // Check cache if enabled
    if (useCache && processedCache.has(cacheKey)) {
      logger.info(`Using cached result for file: ${filePath}`);
      return processedCache.get(cacheKey);
    }
    
    // Start processing timer
    const startTime = Date.now();
    
    try {
      // Get file category
      const fileCategory = FileProcessingService.getFileCategory(mimeType);
      
      if (!fileCategory) {
        throw createError(400, `Unsupported file type: ${mimeType}`);
      }
      
      let extractedText = '';
      let error = null;
      
      // Try each OCR engine in order of preference
      for (const engine of preferredEngines) {
        try {
          switch (fileCategory) {
            case 'PDF':
              extractedText = await FileProcessingService._processPDF(filePath, engine);
              break;
            case 'IMAGE':
              // Preprocess image before OCR
              const optimizedImagePath = await FileProcessingService._preprocessImage(filePath);
              extractedText = await FileProcessingService._processImage(optimizedImagePath, engine);
              break;
            case 'DOCUMENT':
              extractedText = await FileProcessingService._processDocument(filePath, engine);
              break;
          }
          
          // If we got text, break the loop
          if (extractedText && extractedText.trim().length > 0) {
            break;
          }
        } catch (err) {
          // Log error and continue with next engine
          logger.warn(`OCR engine ${engine} failed: ${err.message}`);
          error = err;
        }
      }
      
      // If all engines failed, throw the last error
      if (!extractedText && error) {
        throw error;
      }
      
      // Post-process extracted text
      const processedText = await FileProcessingService._postProcessText(extractedText);
      
      // Store in cache if enabled
      if (useCache) {
        processedCache.set(cacheKey, processedText);
      }
      
      // Log processing time
      const processingTime = Date.now() - startTime;
      logger.info(`Processed file ${filePath} in ${processingTime}ms`);
      
      return processedText;
    } catch (error) {
      logger.error(`File processing error for ${filePath}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process multiple files in batch
   * @param {Array<{filePath: string, mimeType: string}>} files - Array of file objects
   * @param {Object} options - Processing options
   * @returns {Promise<Array<{filePath: string, text: string, error: Error|null}>>} - Processing results
   */
  static async processBatch(files, options = {}) {
    const results = [];
    const totalFiles = files.length;
    
    logger.info(`Starting batch processing of ${totalFiles} files`);
    
    for (let i = 0; i < totalFiles; i++) {
      const { filePath, mimeType } = files[i];
      
      try {
        const text = await FileProcessingService.processFile(filePath, mimeType, options);
        results.push({ filePath, text, error: null });
        
        // Log progress
        logger.info(`Batch processing progress: ${i + 1}/${totalFiles}`);
      } catch (error) {
        results.push({ filePath, text: null, error });
        
        // Log error but continue processing
        logger.error(`Batch processing error for file ${filePath}: ${error.message}`);
      }
    }
    
    return results;
  }

  /**
   * Generate a cache key for a file
   * @param {string} filePath - Path to the file
   * @returns {Promise<string>} - Cache key
   * @private
   */
  static async _generateCacheKey(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return `${filePath}:${stats.mtimeMs}`;
    } catch (error) {
      return filePath;
    }
  }

  /**
   * Preprocess an image before OCR
   * @param {string} imagePath - Path to the image
   * @returns {Promise<string>} - Path to the optimized image
   * @private
   */
  static async _preprocessImage(imagePath) {
    const outputPath = path.join(
      path.dirname(imagePath),
      `optimized_${path.basename(imagePath)}`
    );
    
    try {
      // Use sharp for image preprocessing
      await sharp(imagePath)
        // Convert to grayscale
        .grayscale()
        // Increase contrast
        .normalise()
        // Remove noise with mild blur
        .blur(0.5)
        // Ensure proper orientation based on EXIF data
        .rotate()
        // Save as PNG for better OCR results
        .png({ quality: 100 })
        .toFile(outputPath);
      
      return outputPath;
    } catch (error) {
      logger.error(`Image preprocessing error: ${error.message}`);
      // If preprocessing fails, return original image
      return imagePath;
    }
  }

  /**
   * Process a PDF file with OCR
   * @param {string} pdfPath - Path to the PDF file
   * @param {string} engine - OCR engine to use
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processPDF(pdfPath, engine) {
    switch (engine) {
      case 'tesseract':
        return FileProcessingService._processPdfWithTesseract(pdfPath);
      case 'gvision':
        return FileProcessingService._processPdfWithGoogleVision(pdfPath);
      case 'textract':
        return FileProcessingService._processPdfWithAWSTextract(pdfPath);
      default:
        return FileProcessingService._processPdfWithTesseract(pdfPath);
    }
  }

  /**
   * Process an image file with OCR
   * @param {string} imagePath - Path to the image file
   * @param {string} engine - OCR engine to use
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processImage(imagePath, engine) {
    switch (engine) {
      case 'tesseract':
        return FileProcessingService._processImageWithTesseract(imagePath);
      case 'gvision':
        return FileProcessingService._processImageWithGoogleVision(imagePath);
      case 'textract':
        return FileProcessingService._processImageWithAWSTextract(imagePath);
      default:
        return FileProcessingService._processImageWithTesseract(imagePath);
    }
  }

  /**
   * Process a document file with OCR
   * @param {string} docPath - Path to the document file
   * @param {string} engine - OCR engine to use
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processDocument(docPath, engine) {
    // For documents, convert to PDF first
    const pdfPath = await FileProcessingService._convertDocToPdf(docPath);
    
    // Then process as PDF
    return FileProcessingService._processPDF(pdfPath, engine);
  }

  /**
   * Process a PDF file with Tesseract OCR
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processPdfWithTesseract(pdfPath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, pdfPath, '--engine', 'tesseract']);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Tesseract OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }

  /**
   * Process a PDF file with Google Vision API
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processPdfWithGoogleVision(pdfPath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, pdfPath, '--engine', 'gvision']);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Google Vision OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }

  /**
   * Process a PDF file with AWS Textract
   * @param {string} pdfPath - Path to the PDF file
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processPdfWithAWSTextract(pdfPath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, pdfPath, '--engine', 'textract']);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`AWS Textract OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }

  /**
   * Process an image with Tesseract OCR
   * @param {string} imagePath - Path to the image
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processImageWithTesseract(imagePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, imagePath, '--engine', 'tesseract']);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Tesseract OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }

  /**
   * Process an image with Google Vision API
   * @param {string} imagePath - Path to the image
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processImageWithGoogleVision(imagePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, imagePath, '--engine', 'gvision']);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Google Vision OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }

  /**
   * Process an image with AWS Textract
   * @param {string} imagePath - Path to the image
   * @returns {Promise<string>} - Extracted text
   * @private
   */
  static async _processImageWithAWSTextract(imagePath) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, '../../ml/utils/extract_text.py');
      
      const process = spawn('python3', [pythonScript, imagePath, '--engine', 'textract']);
      
      let result = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        result += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`AWS Textract OCR process failed: ${error}`));
        } else {
          resolve(result.trim());
        }
      });
    });
  }

  /**
   * Convert a document file to PDF
   * @param {string} docPath - Path to the document file
   * @returns {Promise<string>} - Path to the converted PDF
   * @private
   */
  static async _convertDocToPdf(docPath) {
    const outputPath = path.join(
      path.dirname(docPath),
      `${path.basename(docPath, path.extname(docPath))}.pdf`
    );
    
    return new Promise((resolve, reject) => {
      const process = spawn('libreoffice', ['--headless', '--convert-to', 'pdf', '--outdir', path.dirname(docPath), docPath]);
      
      let error = '';
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Document conversion failed: ${error}`));
        } else {
          resolve(outputPath);
        }
      });
    });
  }

  /**
   * Post-process extracted text to improve quality
   * @param {string} text - Extracted text
   * @returns {Promise<string>} - Processed text
   * @private
   */
  static async _postProcessText(text) {
    // Remove excessive whitespace
    let processedText = text.replace(/\s+/g, ' ').trim();
    
    // Fix common OCR errors
    processedText = FileProcessingService._fixCommonOCRErrors(processedText);
    
    // Detect and structure sections
    processedText = FileProcessingService._structureSections(processedText);
    
    return processedText;
  }

  /**
   * Fix common OCR errors in text
   * @param {string} text - Text with OCR errors
   * @returns {string} - Corrected text
   * @private
   */
  static _fixCommonOCRErrors(text) {
    // Replace common OCR errors
    let correctedText = text;
    
    // Fix 0 vs O confusion
    correctedText = correctedText.replace(/0(?=[A-Za-z])/g, 'O');
    
    // Fix 1 vs I confusion
    correctedText = correctedText.replace(/(?<=[A-Za-z])1(?=[A-Za-z])/g, 'I');
    
    // Fix 5 vs S confusion
    correctedText = correctedText.replace(/(?<=[A-Za-z])5(?=[A-Za-z])/g, 'S');
    
    // Fix garbled punctuation
    correctedText = correctedText.replace(/\,\./g, '.');
    correctedText = correctedText.replace(/\;\./g, ';');
    
    return correctedText;
  }

  /**
   * Detect and structure sections in text
   * @param {string} text - Raw text
   * @returns {string} - Structured text
   * @private
   */
  static _structureSections(text) {
    // Simple section detection for assignments
    const sectionPatterns = [
      { pattern: /question\s*\d+/gi, replacement: '\n\n$&\n' },
      { pattern: /problem\s*\d+/gi, replacement: '\n\n$&\n' },
      { pattern: /exercise\s*\d+/gi, replacement: '\n\n$&\n' },
      { pattern: /part\s*[a-z]/gi, replacement: '\n$&\n' },
      { pattern: /section\s*\d+/gi, replacement: '\n\n$&\n' },
      { pattern: /figure\s*\d+/gi, replacement: '\n$&\n' },
      { pattern: /table\s*\d+/gi, replacement: '\n$&\n' }
    ];
    
    let structuredText = text;
    
    // Apply section patterns
    for (const { pattern, replacement } of sectionPatterns) {
      structuredText = structuredText.replace(pattern, replacement);
    }
    
    // Remove redundant newlines
    structuredText = structuredText.replace(/\n{3,}/g, '\n\n');
    
    return structuredText;
  }

  /**
   * Clear the processing cache
   */
  static clearCache() {
    processedCache.clear();
    logger.info('File processing cache cleared');
  }
}

module.exports = FileProcessingService;
