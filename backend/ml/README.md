# Auto-Grade Machine Learning System

This directory contains the machine learning components that form the core intelligence of the Auto-Grader system. These components work together to analyze extracted text from student assignments, compare responses against expected answers, and provide accurate grading with detailed feedback.

## Architecture Overview

The ML system is organized into several key components:

1. **Text Extraction (OCR)** - Extracts text from PDF submissions
2. **Training Pipeline** - Processes sample assignments to train grading models
3. **Grading Engine** - Evaluates student submissions against expected answers
4. **Feedback Generation** - Provides detailed, actionable feedback on submissions
5. **Model Management** - Handles versioning, A/B testing, and performance tracking

## Directory Structure

- `/ml/models/` - Trained model files
- `/ml/notebooks/` - Jupyter notebooks for development and demonstrations
- `/ml/services/` - JavaScript services for interfacing with ML components
- `/ml/utils/` - Python utility scripts for ML processing

## Core Components

### Training Pipeline (`train_models.py`)

The training pipeline processes sample assignments and trains models to recognize correct answers. It supports:

- Similarity-based models (TF-IDF, cosine similarity)
- Transformer-based models (BERT, RoBERTa)
- Ensemble approaches combining multiple methods
- Automatic feature extraction and selection

### Grading Engine (`grade_engine.py`)

The grading engine evaluates student submissions by:

- Comparing submissions against expected answers
- Calculating confidence scores for predictions
- Supporting multiple grading methods (similarity, transformers, keywords)
- Providing performance metrics and explanation

### Model Manager (`model_manager.py`)

Handles model lifecycle:

- Version tracking with metadata
- A/B testing between model versions
- Performance monitoring and metrics collection
- Automatic model promotion based on performance

### Feedback Generator (`feedback_generator.py`)

Creates detailed feedback for students:

- Identifies strengths and areas for improvement
- Provides specific, actionable suggestions
- Supports multiple output formats (HTML, Markdown, plain text)
- Integrates with the grading engine results

## Setup and Usage

1. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

2. Set up the database schema:
   ```
   ./setup-ml.sh
   ```

3. Train initial models:
   ```
   python ml/utils/train_models.py --model-type ensemble
   ```

4. Test the grading system with the demo notebook:
   ```
   jupyter notebook ml/notebooks/ml_grading_demo.ipynb
   ```

## Integration with Backend

The ML components integrate with the main application through:

- The ML service (`ml.service.js`) - JS interface to Python ML code
- The ML model (`ml.model.js`) - Database operations for ML models
- Processing jobs that handle OCR and grading tasks

## Performance and Monitoring

The system includes:

- Detailed logging of all ML operations
- Performance metrics tracking in the database
- A/B testing framework for comparing model versions
- Confidence scores for all predictions

## Contributing

When extending the ML system:

1. Add new models to the appropriate directories
2. Update the database schema if adding new entity types
3. Add tests for new functionality
4. Document your changes

## License

See the main project license file.
