const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');
const FileProcessingService = require('../services/file-processing.service');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // Determine upload directory based on file type
    if (file.fieldname === 'questionPdf') {
      uploadPath = path.join(__dirname, '../../storage/question_pdfs');
    } else if (file.fieldname === 'submissionPdf' || file.fieldname === 'submission') {
      uploadPath = path.join(__dirname, '../../storage/submission_pdfs');
    } else if (file.fieldname === 'submissionImage') {
      uploadPath = path.join(__dirname, '../../storage/submission_images');
    } else if (file.fieldname === 'submissionDocument') {
      uploadPath = path.join(__dirname, '../../storage/submission_documents');
    } else {
      uploadPath = path.join(__dirname, '../../storage/uploads');
    }
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Extract user info for better organization
    const userId = req.user ? req.user.id : 'anonymous';
    
    // Generate unique filename with user ID and timestamp for better traceability
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const originalName = path.basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30); // Limit name length
    
    const extension = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}_${userId}_${timestamp}_${originalName}${extension}`);
  }
});

// File filter for various supported formats
const fileFilter = (req, file, cb) => {
  // Get accepted file types based on field name
  let acceptedTypes;
  
  switch (file.fieldname) {
    case 'questionPdf':
      // Only accept PDFs for questions
      acceptedTypes = FileProcessingService.SUPPORTED_FILE_TYPES.PDF;
      break;
    
    case 'submissionPdf':
      // Only accept PDFs for PDF submissions
      acceptedTypes = FileProcessingService.SUPPORTED_FILE_TYPES.PDF;
      break;
    
    case 'submissionImage':
      // Only accept images for image submissions
      acceptedTypes = FileProcessingService.SUPPORTED_FILE_TYPES.IMAGE;
      break;
    
    case 'submissionDocument':
      // Only accept documents for document submissions
      acceptedTypes = FileProcessingService.SUPPORTED_FILE_TYPES.DOCUMENT;
      break;
    
    case 'submission':
      // Accept all supported types for general submissions
      acceptedTypes = [
        ...FileProcessingService.SUPPORTED_FILE_TYPES.PDF,
        ...FileProcessingService.SUPPORTED_FILE_TYPES.IMAGE,
        ...FileProcessingService.SUPPORTED_FILE_TYPES.DOCUMENT
      ];
      break;
    
    default:
      // Default to accepting PDFs only
      acceptedTypes = FileProcessingService.SUPPORTED_FILE_TYPES.PDF;
  }
  
  if (acceptedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    // Create a descriptive error message
    const acceptedTypesDisplay = acceptedTypes.map(type => {
      switch (type) {
        case 'application/pdf': return 'PDF';
        case 'image/jpeg': return 'JPEG';
        case 'image/png': return 'PNG';
        case 'image/tiff': return 'TIFF';
        case 'image/bmp': return 'BMP';
        case 'application/msword': return 'DOC';
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': return 'DOCX';
        default: return type;
      }
    }).join(', ');
    
    cb(new Error(`File type not supported. Allowed types: ${acceptedTypesDisplay}`), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024 // 20MB max file size (increased from 10MB)
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', err);
    
    let errorMessage = 'File upload error';
    
    // Provide more specific error messages
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        errorMessage = 'File too large. Maximum file size is 20MB.';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        errorMessage = 'Unexpected file field. Please check your form field names.';
        break;
      default:
        errorMessage = `File upload error: ${err.message}`;
    }
    
    return res.status(400).json({
      error: true,
      message: errorMessage
    });
  }
  
  if (err) {
    logger.error('File upload error:', err);
    return res.status(400).json({
      error: true,
      message: err.message
    });
  }
  
  next();
};

// Process uploaded file with OCR and attach text to request
const processUploadedFile = (fieldName) => {
  return async (req, res, next) => {
    try {
      // Skip if no file was uploaded
      if (!req.file) {
        return next();
      }
      
      // Get file path and MIME type
      const filePath = req.file.path;
      const mimeType = req.file.mimetype;
      
      // Log processing start
      logger.info(`Processing uploaded file: ${filePath} (${mimeType})`);
      
      // Set OCR engine preferences based on query parameters
      const preferredEngines = req.query.ocrEngine 
        ? [req.query.ocrEngine, 'tesseract', 'gvision', 'textract']
        : ['tesseract', 'gvision', 'textract'];
      
      // Process the file
      const extractedText = await FileProcessingService.processFile(
        filePath, 
        mimeType,
        { 
          preferredEngines,
          useCache: req.query.noCache !== 'true'
        }
      );
      
      // Attach extracted text to the request
      req.extractedText = extractedText;
      
      // Save path to extracted text for debugging
      const textOutputPath = `${filePath}.txt`;
      await fs.promises.writeFile(textOutputPath, extractedText);
      
      logger.info(`Successfully processed file: ${filePath}`);
      
      next();
    } catch (error) {
      logger.error(`Error processing uploaded file: ${error.message}`);
      
      // Don't fail the request, just log the error and continue
      req.extractedText = null;
      req.extractionError = error.message;
      
      next();
    }
  };
};

// Batch processing middleware
const processBatch = (fieldName) => {
  return async (req, res, next) => {
    try {
      // Skip if no files were uploaded
      if (!req.files || req.files.length === 0) {
        return next();
      }
      
      const files = req.files.map(file => ({
        filePath: file.path,
        mimeType: file.mimetype
      }));
      
      // Process files in batch
      const results = await FileProcessingService.processBatch(files);
      
      // Attach results to request
      req.batchResults = results;
      
      next();
    } catch (error) {
      logger.error(`Error processing batch: ${error.message}`);
      
      req.batchResults = null;
      req.batchError = error.message;
      
      next();
    }
  };
};

module.exports = {
  upload,
  handleMulterError,
  
  // Single file upload with processing
  single: (fieldName, processFile = false) => {
    if (processFile) {
      return [
        upload.single(fieldName), 
        handleMulterError,
        processUploadedFile(fieldName)
      ];
    } else {
      return [
        upload.single(fieldName), 
        handleMulterError
      ];
    }
  },
  
  // Multiple file upload with batch processing
  multiple: (fieldName, maxCount = 10, processBatchFiles = false) => {
    if (processBatchFiles) {
      return [
        upload.array(fieldName, maxCount),
        handleMulterError,
        processBatch(fieldName)
      ];
    } else {
      return [
        upload.array(fieldName, maxCount),
        handleMulterError
      ];
    }
  },
  
  // Fields for mixed uploads
  fields: (fields, processBatchFiles = false) => {
    if (processBatchFiles) {
      return [
        upload.fields(fields),
        handleMulterError,
        processBatch()
      ];
    } else {
      return [
        upload.fields(fields),
        handleMulterError
      ];
    }
  }
};
