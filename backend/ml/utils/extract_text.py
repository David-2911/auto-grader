#!/usr/bin/env python3
"""
Extract text from PDF files and images using various OCR engines.
Supports multiple OCR engines with fallback mechanisms.
"""
import sys
import os
import argparse
import json
import traceback
import re
from typing import Optional, Dict, Any, List
import tempfile
import shutil
from pathlib import Path

# Basic PDF text extraction
import PyPDF2

# For Tesseract OCR
try:
    import pytesseract
    from PIL import Image, ImageEnhance, ImageFilter
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False

# For Google Vision OCR
try:
    from google.cloud import vision
    GOOGLE_VISION_AVAILABLE = True
except ImportError:
    GOOGLE_VISION_AVAILABLE = False

# For AWS Textract
try:
    import boto3
    AWS_TEXTRACT_AVAILABLE = True
except ImportError:
    AWS_TEXTRACT_AVAILABLE = False

# For PDF to image conversion
try:
    import pdf2image
    PDF2IMAGE_AVAILABLE = True
except ImportError:
    PDF2IMAGE_AVAILABLE = False


class OCRProcessor:
    """Base class for OCR processing."""
    
    def __init__(self, debug: bool = False):
        """Initialize the OCR processor.
        
        Args:
            debug: Whether to enable debug output
        """
        self.debug = debug
    
    def extract_text(self, file_path: str) -> str:
        """Extract text from a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Extracted text
        """
        # Determine file type based on extension
        file_ext = os.path.splitext(file_path)[1].lower()
        
        if file_ext in ['.pdf']:
            return self._extract_from_pdf(file_path)
        elif file_ext in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.tif']:
            return self._extract_from_image(file_path)
        elif file_ext in ['.doc', '.docx']:
            # Convert to PDF first
            pdf_path = self._convert_doc_to_pdf(file_path)
            result = self._extract_from_pdf(pdf_path)
            # Clean up temporary PDF
            if pdf_path != file_path:
                os.unlink(pdf_path)
            return result
        else:
            raise ValueError(f"Unsupported file type: {file_ext}")
    
    def _extract_from_pdf(self, pdf_path: str) -> str:
        """Extract text from a PDF file.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text
        """
        # Try to extract text directly first
        basic_text = self._extract_pdf_text_basic(pdf_path)
        
        # If we got meaningful text, return it
        if self._is_meaningful_text(basic_text):
            if self.debug:
                print(f"Used basic PDF text extraction for {pdf_path}", file=sys.stderr)
            return basic_text
        
        # If basic extraction didn't work, try OCR
        if self.debug:
            print(f"Basic PDF text extraction yielded poor results, trying OCR for {pdf_path}", file=sys.stderr)
        
        return self._extract_pdf_text_with_ocr(pdf_path)
    
    def _extract_from_image(self, image_path: str) -> str:
        """Extract text from an image file.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text
        """
        # This should be implemented by subclasses
        raise NotImplementedError("Subclasses must implement _extract_from_image")
    
    def _convert_doc_to_pdf(self, doc_path: str) -> str:
        """Convert a document file to PDF.
        
        Args:
            doc_path: Path to the document file
            
        Returns:
            Path to the converted PDF
        """
        # Create a temporary file with .pdf extension
        fd, pdf_path = tempfile.mkstemp(suffix='.pdf')
        os.close(fd)
        
        # Use LibreOffice to convert the document to PDF
        import subprocess
        result = subprocess.run(
            ['libreoffice', '--headless', '--convert-to', 'pdf', '--outdir', 
             os.path.dirname(pdf_path), doc_path],
            capture_output=True,
            text=True
        )
        
        if result.returncode != 0:
            raise RuntimeError(f"Document conversion failed: {result.stderr}")
        
        return pdf_path
    
    def _extract_pdf_text_basic(self, pdf_path: str) -> str:
        """Extract text from a PDF file using PyPDF2.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text
        """
        try:
            # Open the PDF file
            with open(pdf_path, 'rb') as file:
                # Create a PDF reader object
                reader = PyPDF2.PdfReader(file)
                
                # Extract text from each page
                text = ""
                for page in reader.pages:
                    text += page.extract_text() or ""
                
                return text.strip()
        except Exception as e:
            if self.debug:
                print(f"Error in basic PDF extraction: {str(e)}", file=sys.stderr)
            return ""
    
    def _extract_pdf_text_with_ocr(self, pdf_path: str) -> str:
        """Extract text from a PDF file using OCR.
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text
        """
        if not PDF2IMAGE_AVAILABLE:
            raise ImportError("pdf2image library is required for PDF OCR")
        
        # Convert PDF to images
        temp_dir = tempfile.mkdtemp()
        try:
            # Convert PDF pages to images
            images = pdf2image.convert_from_path(pdf_path)
            
            # Process each page
            text = ""
            for i, image in enumerate(images):
                # Save the image to a temporary file
                image_path = os.path.join(temp_dir, f"page_{i+1}.png")
                image.save(image_path, "PNG")
                
                # Extract text from the image
                page_text = self._extract_from_image(image_path)
                text += f"\n\n--- Page {i+1} ---\n\n{page_text}"
            
            return text.strip()
        finally:
            # Clean up temporary directory
            shutil.rmtree(temp_dir)
    
    def _is_meaningful_text(self, text: str) -> bool:
        """Check if the extracted text is meaningful.
        
        Args:
            text: Extracted text
            
        Returns:
            Whether the text is meaningful
        """
        if not text or len(text.strip()) < 50:
            return False
        
        # Check if the text contains enough words (not just numbers or symbols)
        words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
        return len(words) >= 10


class TesseractOCR(OCRProcessor):
    """OCR processing using Tesseract."""
    
    def __init__(self, **kwargs):
        """Initialize the Tesseract OCR processor."""
        super().__init__(**kwargs)
        
        if not TESSERACT_AVAILABLE:
            raise ImportError("pytesseract and PIL libraries are required for Tesseract OCR")
    
    def _extract_from_image(self, image_path: str) -> str:
        """Extract text from an image file using Tesseract.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text
        """
        try:
            # Open and preprocess the image
            image = Image.open(image_path)
            
            # Convert to grayscale
            image = image.convert('L')
            
            # Enhance contrast
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(2.0)
            
            # Apply slight blur to reduce noise
            image = image.filter(ImageFilter.GaussianBlur(radius=0.5))
            
            # Use Tesseract to extract text
            custom_config = r'--oem 3 --psm 6'
            text = pytesseract.image_to_string(image, config=custom_config)
            
            return text.strip()
        except Exception as e:
            if self.debug:
                print(f"Tesseract OCR error: {str(e)}", file=sys.stderr)
            return ""


class GoogleVisionOCR(OCRProcessor):
    """OCR processing using Google Vision API."""
    
    def __init__(self, **kwargs):
        """Initialize the Google Vision OCR processor."""
        super().__init__(**kwargs)
        
        if not GOOGLE_VISION_AVAILABLE:
            raise ImportError("google-cloud-vision library is required for Google Vision OCR")
        
        # Initialize Google Vision client
        self.client = vision.ImageAnnotatorClient()
    
    def _extract_from_image(self, image_path: str) -> str:
        """Extract text from an image file using Google Vision API.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text
        """
        try:
            # Read the image file
            with open(image_path, "rb") as image_file:
                content = image_file.read()
            
            # Create an image object
            image = vision.Image(content=content)
            
            # Perform text detection
            response = self.client.text_detection(image=image)
            
            # Extract text from the response
            if response.error.message:
                raise Exception(f"Google Vision API error: {response.error.message}")
            
            texts = response.text_annotations
            if not texts:
                return ""
            
            # The first annotation contains the entire text
            text = texts[0].description
            
            return text.strip()
        except Exception as e:
            if self.debug:
                print(f"Google Vision OCR error: {str(e)}", file=sys.stderr)
            return ""


class AWSTextractOCR(OCRProcessor):
    """OCR processing using AWS Textract."""
    
    def __init__(self, **kwargs):
        """Initialize the AWS Textract OCR processor."""
        super().__init__(**kwargs)
        
        if not AWS_TEXTRACT_AVAILABLE:
            raise ImportError("boto3 library is required for AWS Textract OCR")
        
        # Initialize AWS Textract client
        self.client = boto3.client('textract')
    
    def _extract_from_image(self, image_path: str) -> str:
        """Extract text from an image file using AWS Textract.
        
        Args:
            image_path: Path to the image file
            
        Returns:
            Extracted text
        """
        try:
            # Read the image file
            with open(image_path, "rb") as image_file:
                bytes_data = image_file.read()
            
            # Call Textract
            response = self.client.detect_document_text(Document={'Bytes': bytes_data})
            
            # Extract text from the response
            text = ""
            for item in response["Blocks"]:
                if item["BlockType"] == "LINE":
                    text += item["Text"] + "\n"
            
            return text.strip()
        except Exception as e:
            if self.debug:
                print(f"AWS Textract OCR error: {str(e)}", file=sys.stderr)
            return ""


class MultiEngineOCR:
    """OCR processing using multiple engines with fallback."""
    
    def __init__(self, engines: List[str] = None, debug: bool = False):
        """Initialize the multi-engine OCR processor.
        
        Args:
            engines: List of OCR engines to use, in order of preference
            debug: Whether to enable debug output
        """
        self.debug = debug
        
        # Default to Tesseract if no engines specified
        if not engines:
            engines = ["tesseract"]
        
        self.engines = []
        
        # Initialize OCR engines
        for engine in engines:
            try:
                if engine == "tesseract" and TESSERACT_AVAILABLE:
                    self.engines.append(TesseractOCR(debug=debug))
                elif engine == "gvision" and GOOGLE_VISION_AVAILABLE:
                    self.engines.append(GoogleVisionOCR(debug=debug))
                elif engine == "textract" and AWS_TEXTRACT_AVAILABLE:
                    self.engines.append(AWSTextractOCR(debug=debug))
            except ImportError:
                if self.debug:
                    print(f"OCR engine {engine} not available", file=sys.stderr)
        
        if not self.engines:
            raise ValueError("No OCR engines available")
    
    def extract_text(self, file_path: str) -> str:
        """Extract text from a file using multiple OCR engines.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Extracted text
        """
        if self.debug:
            print(f"Processing file: {file_path}", file=sys.stderr)
            print(f"Available engines: {[type(e).__name__ for e in self.engines]}", file=sys.stderr)
        
        errors = []
        
        # Try each engine in order
        for engine in self.engines:
            try:
                if self.debug:
                    print(f"Trying OCR engine: {type(engine).__name__}", file=sys.stderr)
                
                text = engine.extract_text(file_path)
                
                # If we got meaningful text, return it
                if text and len(text.strip()) > 0:
                    if self.debug:
                        print(f"Successfully extracted text using {type(engine).__name__}", file=sys.stderr)
                    return text
            except Exception as e:
                if self.debug:
                    print(f"Error in OCR engine {type(engine).__name__}: {str(e)}", file=sys.stderr)
                    traceback.print_exc(file=sys.stderr)
                
                errors.append(f"{type(engine).__name__}: {str(e)}")
        
        # If all engines failed, raise an error
        raise RuntimeError(f"All OCR engines failed: {'; '.join(errors)}")


def extract_text_from_file(file_path: str, engine: str = "tesseract", debug: bool = False) -> str:
    """Extract text from a file.
    
    Args:
        file_path: Path to the file
        engine: OCR engine to use
        debug: Whether to enable debug output
        
    Returns:
        Extracted text
    """
    # Check if the file exists
    if not os.path.isfile(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
    
    # Create OCR processor
    engines = [engine]
    if engine != "tesseract":
        engines.append("tesseract")  # Fallback to Tesseract
    
    ocr = MultiEngineOCR(engines=engines, debug=debug)
    
    # Extract text
    return ocr.extract_text(file_path)


def main():
    """Main function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Extract text from files using OCR')
    parser.add_argument('file_path', help='Path to the file')
    parser.add_argument('--engine', choices=['tesseract', 'gvision', 'textract'], 
                      default='tesseract', help='OCR engine to use')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    parser.add_argument('--json', action='store_true', help='Output in JSON format')
    
    args = parser.parse_args()
    
    try:
        # Extract text from the file
        extracted_text = extract_text_from_file(args.file_path, args.engine, args.debug)
        
        # Output the result
        if args.json:
            result = {
                'success': True,
                'text': extracted_text,
                'engine': args.engine
            }
            print(json.dumps(result))
        else:
            print(extracted_text)
        
        sys.exit(0)
    except Exception as e:
        # Handle errors
        if args.debug:
            traceback.print_exc(file=sys.stderr)
        
        if args.json:
            error_result = {
                'success': False,
                'error': str(e)
            }
            print(json.dumps(error_result))
        else:
            print(f"Error: {str(e)}", file=sys.stderr)
        
        sys.exit(1)


if __name__ == '__main__':
    main()
