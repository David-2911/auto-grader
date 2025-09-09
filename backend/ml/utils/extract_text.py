#!/usr/bin/env python3
"""
Extract text from PDF files using OCR.
"""
import sys
import os
import argparse
import json
import PyPDF2

def extract_text_from_pdf(pdf_path):
    """
    Extract text from a PDF file.
    
    Args:
        pdf_path (str): Path to the PDF file
        
    Returns:
        str: Extracted text
    """
    try:
        # Open the PDF file
        with open(pdf_path, 'rb') as file:
            # Create a PDF reader object
            reader = PyPDF2.PdfReader(file)
            
            # Get the number of pages
            num_pages = len(reader.pages)
            
            # Extract text from each page
            text = ""
            for page_num in range(num_pages):
                page = reader.pages[page_num]
                text += page.extract_text()
                
            return text
    except Exception as e:
        print(f"Error extracting text from PDF: {str(e)}", file=sys.stderr)
        sys.exit(1)

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Extract text from PDF')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    
    args = parser.parse_args()
    
    # Check if the PDF file exists
    if not os.path.isfile(args.pdf_path):
        print(f"Error: PDF file '{args.pdf_path}' does not exist", file=sys.stderr)
        sys.exit(1)
    
    # Extract text from the PDF
    extracted_text = extract_text_from_pdf(args.pdf_path)
    
    # Print the extracted text
    print(extracted_text)

if __name__ == '__main__':
    main()
