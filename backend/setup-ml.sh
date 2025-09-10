#!/bin/bash

# Setup script for ML components of Auto-grade system
# This script installs all required Python packages for ML grading

echo "Setting up ML environment for Auto-grade system..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required but not installed. Please install Python 3 and try again."
    exit 1
fi

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "pip3 is required but not installed. Please install pip3 and try again."
    exit 1
fi

# Install Python dependencies
echo "Installing Python dependencies..."
pip3 install -r ml/requirements.txt

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p ml/models
mkdir -p storage/processed_files
mkdir -p storage/nbgrader_feedback

# Set up database tables
echo "Setting up ML database tables..."
# Load the MySQL credentials from config.js
DB_USER=$(grep -o 'user: ['"'"'"][^'"'"'"]*['"'"'"]' src/config/config.js | sed 's/user: ['"'"'"]\([^'"'"'"]*\)['"'"'"]/\1/')
DB_PASS=$(grep -o 'password: ['"'"'"][^'"'"'"]*['"'"'"]' src/config/config.js | sed 's/password: ['"'"'"]\([^'"'"'"]*\)['"'"'"]/\1/')
DB_NAME=$(grep -o 'database: ['"'"'"][^'"'"'"]*['"'"'"]' src/config/config.js | sed 's/database: ['"'"'"]\([^'"'"'"]*\)['"'"'"]/\1/')
DB_HOST=$(grep -o 'host: ['"'"'"][^'"'"'"]*['"'"'"]' src/config/config.js | sed 's/host: ['"'"'"]\([^'"'"'"]*\)['"'"'"]/\1/')

# Run the SQL script to create tables
mysql -u "$DB_USER" -p"$DB_PASS" -h "$DB_HOST" "$DB_NAME" < src/config/ml_models_schema.sql

echo "ML environment setup complete!"
echo "You can now use the ML grading system."
