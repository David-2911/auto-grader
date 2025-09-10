#!/bin/bash

# Setup script for the file processing system
# This script installs required dependencies and sets up the file processing system

echo "Setting up file processing system for Auto-Grade..."

# Create required directories
echo "Creating storage directories..."
mkdir -p storage/question_pdfs
mkdir -p storage/submission_pdfs
mkdir -p storage/submission_images
mkdir -p storage/submission_documents
mkdir -p storage/processed_files
mkdir -p storage/nbgrader_assignments
mkdir -p storage/nbgrader_feedback
mkdir -p storage/nbgrader_submissions

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Install Python dependencies
echo "Installing Python dependencies..."
cd ml && pip install -r requirements.txt
cd ..

# Check for Tesseract installation
echo "Checking for Tesseract OCR..."
if ! command -v tesseract &> /dev/null; then
    echo "Tesseract OCR not found. Please install it manually:"
    echo "For Ubuntu: sudo apt-get install tesseract-ocr"
    echo "For macOS: brew install tesseract"
else
    echo "Tesseract OCR found."
fi

# Setup database tables
echo "Would you like to set up the database tables for file processing? (y/n)"
read setup_db

if [[ $setup_db == "y" || $setup_db == "Y" ]]; then
    echo "Enter your MySQL username:"
    read mysql_user
    
    echo "Enter your MySQL password:"
    read -s mysql_pass
    
    echo "Enter your database name:"
    read db_name
    
    echo "Setting up database tables..."
    mysql -u "$mysql_user" -p"$mysql_pass" "$db_name" < src/config/file_processing_schema.sql
    
    if [ $? -eq 0 ]; then
        echo "Database tables created successfully."
    else
        echo "Error creating database tables."
    fi
else
    echo "Skipping database setup."
fi

echo "Setup complete!"
echo "For more information, see FILE_PROCESSING_README.md"
