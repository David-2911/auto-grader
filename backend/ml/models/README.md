# Machine Learning Models

This directory contains the trained machine learning models used for the Auto-Grade system.

## Model Types

The system uses various types of models for different aspects of the grading process:

1. **OCR Models**: For extracting text from submission PDFs
2. **Text Classification Models**: For identifying different parts of submissions
3. **Answer Evaluation Models**: For comparing student answers with expected solutions
4. **Code Analysis Models**: For evaluating programming assignments

## Model Files

- `ocr_model.h5`: Pre-trained OCR model for text extraction
- `text_classifier.pkl`: Text classification model
- `code_analyzer.joblib`: Model for code quality analysis
- `grading_model.bin`: Final grading model

## Training Process

The models are trained using the following steps:

1. Data collection from nbgrader_assignments
2. Data preprocessing and feature extraction
3. Model training and hyperparameter tuning
4. Model evaluation and validation
5. Model export and deployment

## Usage

Models are loaded and used by the API endpoints in the application. See the `ml/utils` directory for utility functions that handle model loading and inference.
