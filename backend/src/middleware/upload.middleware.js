const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { logger } = require('../utils/logger');

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let uploadPath;
    
    // Determine upload directory based on file type
    if (file.fieldname === 'questionPdf') {
      uploadPath = path.join(__dirname, '../../storage/question_pdfs');
    } else if (file.fieldname === 'submissionPdf') {
      uploadPath = path.join(__dirname, '../../storage/submission_pdfs');
    } else {
      uploadPath = path.join(__dirname, '../../storage/uploads');
    }
    
    // Create directory if it doesn't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  // Accept only PDF files
  if (file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'), false);
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  }
});

// Error handling middleware for multer
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    logger.error('Multer error:', err);
    return res.status(400).json({
      error: true,
      message: `File upload error: ${err.message}`
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

module.exports = {
  upload,
  handleMulterError,
  single: (fieldName) => [upload.single(fieldName), handleMulterError]
};
