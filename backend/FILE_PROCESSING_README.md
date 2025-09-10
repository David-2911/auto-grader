# File Processing System for Auto-Grade

This component handles the processing of student assignment submissions through OCR technology and converts them to machine-readable text for grading.

## Features

- **Multiple File Format Support**: Process PDFs, images (JPEG, PNG, TIFF, BMP), and documents (DOC, DOCX)
- **Multi-Engine OCR**: Uses multiple OCR engines (Tesseract, Google Vision, AWS Textract) with fallback mechanisms
- **Image Preprocessing**: Enhances image quality before OCR processing for better results
- **Text Post-Processing**: Cleans and structures extracted text, fixing common OCR errors
- **Section Detection**: Identifies and separates different sections of assignments
- **Caching System**: Avoids reprocessing the same documents with a smart caching mechanism
- **Batch Processing**: Handles multiple files at once with progress tracking
- **PDF to Notebook Conversion**: Converts PDF assignments to Jupyter notebooks for easier grading
- **Monitoring & Analytics**: Tracks processing times, error rates, and quality metrics

## Directory Structure

```
├── ml/
│   ├── utils/
│   │   ├── extract_text.py     # OCR text extraction with multiple engines
│   │   ├── pdf_to_notebook.py  # Convert PDFs to Jupyter notebooks
│   │   └── analyze_code.py     # Analyze submitted code
│   └── requirements.txt        # Python dependencies
├── src/
│   ├── controllers/
│   │   └── file.controller.js  # API controller for file operations
│   ├── middleware/
│   │   └── upload.middleware.js # File upload handling middleware
│   ├── models/
│   │   └── ml.model.js         # Database model for ML operations
│   ├── routes/
│   │   └── file.routes.js      # API routes for file operations
│   └── services/
│       └── file-processing.service.js # Core file processing logic
└── storage/
    ├── question_pdfs/          # Uploaded question PDFs
    ├── submission_pdfs/        # Uploaded submission PDFs
    ├── submission_images/      # Uploaded submission images
    ├── submission_documents/   # Uploaded submission documents
    └── processed_files/        # Temporary processing files
```

## API Endpoints

- `POST /api/files/upload` - Upload and process a file
- `POST /api/files/upload-pdf` - Upload a PDF file
- `POST /api/files/upload-image` - Upload an image file
- `POST /api/files/upload-document` - Upload a document file
- `POST /api/files/convert-to-notebook` - Convert a PDF to a Jupyter notebook
- `POST /api/files/batch-upload` - Upload and process multiple files
- `GET /api/files/processing-status` - Get processing status
- `POST /api/files/clear-cache` - Clear processing cache

## Setup

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Install Python dependencies:
   ```bash
   npm run setup-ocr
   ```

3. Configure OCR engines:
   - **Tesseract**: Install Tesseract OCR on your system
     ```bash
     sudo apt-get install tesseract-ocr
     ```
   
   - **Google Vision API** (optional):
     - Set up a Google Cloud project
     - Enable the Vision API
     - Set the GOOGLE_APPLICATION_CREDENTIALS environment variable
   
   - **AWS Textract** (optional):
     - Configure AWS credentials
     - Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables

4. Update the database schema:
   ```bash
   mysql -u username -p database_name < src/config/file_processing_schema.sql
   ```

## Usage

### Basic File Upload and Processing

```javascript
// Example client-side code
const formData = new FormData();
formData.append('submission', file);

fetch('/api/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Extracted text:', data.data.extractedText);
});
```

### Converting PDF to Notebook

```javascript
const formData = new FormData();
formData.append('submissionPdf', pdfFile);

fetch('/api/files/convert-to-notebook?ocrEngine=tesseract', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Notebook created:', data.data.notebookPath);
});
```

### Batch Processing

```javascript
const formData = new FormData();
files.forEach(file => {
  formData.append('submissions', file);
});

fetch('/api/files/batch-upload', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
.then(response => response.json())
.then(data => {
  console.log('Batch processing results:', data.data.results);
});
```

## Performance Optimization

- **Caching**: Processed results are cached to avoid redundant processing
- **Image Preprocessing**: Images are enhanced before OCR to improve accuracy
- **Multi-Engine Approach**: Falls back to alternative OCR engines if primary fails
- **Batch Processing**: Efficiently processes multiple files with resource management

## Error Handling

The system implements comprehensive error handling with:
- Detailed error logging
- Fallback mechanisms for OCR engines
- Graceful degradation when services are unavailable
- Informative user feedback for failed operations

## Monitoring

Processing statistics are stored in the database for monitoring:
- Success/failure rates by OCR engine and file type
- Average processing times
- Text extraction quality metrics

## Future Improvements

- Integration with more OCR engines
- Machine learning-based post-processing for better text cleaning
- Distributed processing for large batches
- Real-time progress updates using WebSockets
