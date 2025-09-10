#!/bin/bash

# ML Service Startup Script
# This script starts both the ML API service and Jupyter notebook server

set -euo pipefail

# Configuration
ML_API_PORT=${ML_API_PORT:-5001}
JUPYTER_PORT=${JUPYTER_PORT:-8888}
JUPYTER_TOKEN=${JUPYTER_TOKEN:-autograder-jupyter-token}
PYTHONPATH=${PYTHONPATH:-/app}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $*" >&2
}

# Create necessary directories
setup_directories() {
    log "Setting up directories..."
    mkdir -p /app/{models,notebooks,logs,temp}
    chmod 755 /app/{models,notebooks,logs,temp}
}

# Install additional requirements if needed
install_requirements() {
    if [ -f "/app/requirements-additional.txt" ]; then
        log "Installing additional requirements..."
        pip install -r /app/requirements-additional.txt
    fi
}

# Download models if they don't exist
download_models() {
    log "Checking for ML models..."
    
    # Create a simple model downloading script
    python3 << 'EOF'
import os
import pickle
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline

models_dir = "/app/models"
os.makedirs(models_dir, exist_ok=True)

# Create a simple text classification model for demonstration
if not os.path.exists(f"{models_dir}/text_classifier.pkl"):
    print("Creating default text classification model...")
    
    # Sample training data
    texts = [
        "This is a good solution with correct logic",
        "The implementation is well structured",
        "Missing error handling in the code",
        "Incorrect algorithm implementation",
        "Excellent documentation and comments",
        "Poor code quality and style"
    ]
    
    labels = [1, 1, 0, 0, 1, 0]  # 1 = good, 0 = needs improvement
    
    # Create and train model
    model = Pipeline([
        ('tfidf', TfidfVectorizer(max_features=1000)),
        ('classifier', MultinomialNB())
    ])
    
    model.fit(texts, labels)
    
    # Save model
    with open(f"{models_dir}/text_classifier.pkl", 'wb') as f:
        pickle.dump(model, f)
    
    print("Default model created successfully")

print("Model setup completed")
EOF
}

# Start ML API service
start_ml_api() {
    log "Starting ML API service on port $ML_API_PORT..."
    
    # Create ML API server
    cat > /app/ml_api_server.py << 'EOF'
#!/usr/bin/env python3

import os
import sys
import json
import pickle
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import numpy as np

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# Global model storage
models = {}

def load_models():
    """Load all available models"""
    models_dir = "/app/models"
    
    try:
        # Load text classifier
        classifier_path = os.path.join(models_dir, "text_classifier.pkl")
        if os.path.exists(classifier_path):
            with open(classifier_path, 'rb') as f:
                models['text_classifier'] = pickle.load(f)
            logger.info("Text classifier model loaded")
        
        logger.info(f"Loaded {len(models)} models")
    except Exception as e:
        logger.error(f"Error loading models: {e}")

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ml-api',
        'models_loaded': len(models),
        'available_models': list(models.keys())
    })

@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    return jsonify({
        'models': list(models.keys()),
        'count': len(models)
    })

@app.route('/predict/text-quality', methods=['POST'])
def predict_text_quality():
    """Predict text quality using the text classifier"""
    try:
        data = request.get_json()
        
        if not data or 'text' not in data:
            return jsonify({'error': 'Text field is required'}), 400
        
        text = data['text']
        
        if 'text_classifier' not in models:
            return jsonify({'error': 'Text classifier model not available'}), 503
        
        # Make prediction
        model = models['text_classifier']
        prediction = model.predict([text])[0]
        probability = model.predict_proba([text])[0]
        
        return jsonify({
            'prediction': int(prediction),
            'confidence': float(max(probability)),
            'probabilities': {
                'poor': float(probability[0]),
                'good': float(probability[1])
            },
            'text_length': len(text)
        })
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/process/document', methods=['POST'])
def process_document():
    """Process uploaded document"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # For now, return a mock response
        return jsonify({
            'status': 'processed',
            'filename': file.filename,
            'size': len(file.read()),
            'type': file.content_type,
            'analysis': {
                'pages': 1,
                'text_extracted': True,
                'quality_score': 0.85
            }
        })
        
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    # Basic metrics for monitoring
    return '''# HELP ml_models_loaded Number of ML models loaded
# TYPE ml_models_loaded gauge
ml_models_loaded {count}

# HELP ml_requests_total Total number of ML requests
# TYPE ml_requests_total counter
ml_requests_total 0
'''.format(count=len(models)), 200, {'Content-Type': 'text/plain'}

if __name__ == '__main__':
    # Load models on startup
    load_models()
    
    # Start server
    port = int(os.environ.get('ML_API_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
EOF

    # Start ML API in background
    cd /app
    python3 ml_api_server.py &
    ML_API_PID=$!
    
    log "ML API service started with PID $ML_API_PID"
    echo $ML_API_PID > /tmp/ml_api.pid
}

# Start Jupyter notebook server
start_jupyter() {
    log "Starting Jupyter notebook server on port $JUPYTER_PORT..."
    
    # Create Jupyter config
    mkdir -p ~/.jupyter
    cat > ~/.jupyter/jupyter_notebook_config.py << EOF
c.NotebookApp.ip = '0.0.0.0'
c.NotebookApp.port = $JUPYTER_PORT
c.NotebookApp.token = '$JUPYTER_TOKEN'
c.NotebookApp.password = ''
c.NotebookApp.open_browser = False
c.NotebookApp.allow_root = True
c.NotebookApp.allow_origin = '*'
c.NotebookApp.disable_check_xsrf = True
c.NotebookApp.notebook_dir = '/app/notebooks'
EOF

    # Start Jupyter in background
    cd /app/notebooks
    jupyter notebook --config ~/.jupyter/jupyter_notebook_config.py &
    JUPYTER_PID=$!
    
    log "Jupyter notebook server started with PID $JUPYTER_PID"
    echo $JUPYTER_PID > /tmp/jupyter.pid
}

# Monitor services
monitor_services() {
    log "Monitoring ML services..."
    
    while true; do
        # Check ML API
        if [ -f /tmp/ml_api.pid ]; then
            ML_API_PID=$(cat /tmp/ml_api.pid)
            if ! kill -0 $ML_API_PID 2>/dev/null; then
                error "ML API service died, restarting..."
                start_ml_api
            fi
        fi
        
        # Check Jupyter
        if [ -f /tmp/jupyter.pid ]; then
            JUPYTER_PID=$(cat /tmp/jupyter.pid)
            if ! kill -0 $JUPYTER_PID 2>/dev/null; then
                error "Jupyter service died, restarting..."
                start_jupyter
            fi
        fi
        
        sleep 30
    done
}

# Cleanup function
cleanup() {
    log "Shutting down ML services..."
    
    if [ -f /tmp/ml_api.pid ]; then
        ML_API_PID=$(cat /tmp/ml_api.pid)
        kill $ML_API_PID 2>/dev/null || true
        rm -f /tmp/ml_api.pid
    fi
    
    if [ -f /tmp/jupyter.pid ]; then
        JUPYTER_PID=$(cat /tmp/jupyter.pid)
        kill $JUPYTER_PID 2>/dev/null || true
        rm -f /tmp/jupyter.pid
    fi
    
    exit 0
}

# Handle signals
trap cleanup SIGTERM SIGINT

# Main function
main() {
    log "Starting ML service initialization..."
    
    # Setup
    setup_directories
    install_requirements
    download_models
    
    # Start services
    start_ml_api
    sleep 5  # Give ML API time to start
    start_jupyter
    
    # Wait for services to be ready
    log "Waiting for services to be ready..."
    timeout=60
    elapsed=0
    
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "http://localhost:$ML_API_PORT/health" > /dev/null; then
            log "ML API is ready"
            break
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done
    
    if [ $elapsed -ge $timeout ]; then
        error "ML API failed to start within timeout"
        exit 1
    fi
    
    log "ML services started successfully"
    log "ML API: http://localhost:$ML_API_PORT"
    log "Jupyter: http://localhost:$JUPYTER_PORT (token: $JUPYTER_TOKEN)"
    
    # Monitor services
    monitor_services
}

# Run main function
main "$@"
