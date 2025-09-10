#!/usr/bin/env python3
"""
Convert PDF assignments to Jupyter notebooks.
This script extracts text from PDFs and structures it into a notebook format.
"""
import sys
import os
import argparse
import json
import re
import nbformat as nbf
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple

# Import OCR functionality
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.extract_text import extract_text_from_file


def detect_questions(text: str) -> List[Dict[str, Any]]:
    """Detect questions in the extracted text.
    
    Args:
        text: Extracted text from PDF
        
    Returns:
        List of detected questions with their text
    """
    # Patterns for identifying question sections
    question_patterns = [
        r'(?:^|\n)(?:Question|Q)\.?\s*(\d+)\.?\s*([^\n]+(?:\n(?!\s*(?:Question|Q)\.?\s*\d+)[^\n]+)*)',
        r'(?:^|\n)(\d+)\.?\s*([^\n]+(?:\n(?!\s*\d+\.)[^\n]+)*)',
        r'(?:^|\n)(?:Problem|Exercise)\s*(\d+)\.?\s*([^\n]+(?:\n(?!\s*(?:Problem|Exercise)\s*\d+)[^\n]+)*)'
    ]
    
    all_questions = []
    
    # Try each pattern
    for pattern in question_patterns:
        questions = re.findall(pattern, text, re.IGNORECASE | re.MULTILINE)
        
        if questions:
            for num, content in questions:
                all_questions.append({
                    'number': int(num),
                    'text': content.strip()
                })
            
            # Sort by question number
            all_questions.sort(key=lambda q: q['number'])
            return all_questions
    
    # If no questions detected with patterns, split by lines and try to identify questions
    lines = text.split('\n')
    current_question = None
    current_text = []
    
    for line in lines:
        # Check if line starts a new question
        q_match = re.match(r'^(?:Question|Q)\.?\s*(\d+)|^(\d+)\.\s+', line, re.IGNORECASE)
        
        if q_match:
            # Save previous question if exists
            if current_question is not None:
                all_questions.append({
                    'number': current_question,
                    'text': '\n'.join(current_text).strip()
                })
            
            # Start new question
            current_question = int(q_match.group(1) or q_match.group(2))
            current_text = [line]
        elif current_question is not None:
            current_text.append(line)
    
    # Add the last question
    if current_question is not None:
        all_questions.append({
            'number': current_question,
            'text': '\n'.join(current_text).strip()
        })
    
    # If we found questions, return them
    if all_questions:
        return sorted(all_questions, key=lambda q: q['number'])
    
    # If no questions detected, create a single "question" from the entire text
    return [{
        'number': 1,
        'text': text.strip()
    }]


def detect_code_sections(question_text: str) -> List[Tuple[str, str]]:
    """Detect code sections in question text.
    
    Args:
        question_text: Text of the question
        
    Returns:
        List of tuples (section_type, section_text)
    """
    # Patterns for code sections
    code_patterns = [
        r'```(?:python)?\s*([\s\S]*?)```',  # Markdown code blocks
        r'def\s+\w+\s*\(.*?\):\s*(?:[\s\S]*?)(?=\n\s*\n|\Z)',  # Python function definitions
        r'class\s+\w+(?:\(.*?\))?:\s*(?:[\s\S]*?)(?=\n\s*\n|\Z)',  # Python class definitions
        r'(?:^|\n)(?:    |\t)[\s\S]*?(?=\n[^\s]|\Z)',  # Indented code blocks
        r'for\s+\w+\s+in\s+.*?:(?:[\s\S]*?)(?=\n\s*\n|\Z)',  # For loops
        r'while\s+.*?:(?:[\s\S]*?)(?=\n\s*\n|\Z)',  # While loops
        r'if\s+.*?:(?:[\s\S]*?)(?=\n\s*\n|\Z)',  # If statements
    ]
    
    # Split the text into code and markdown sections
    sections = []
    remaining_text = question_text
    
    # Find all code sections
    all_matches = []
    for pattern in code_patterns:
        matches = re.finditer(pattern, question_text, re.MULTILINE)
        for match in matches:
            all_matches.append((match.start(), match.end(), match.group(0)))
    
    # Sort matches by start position
    all_matches.sort(key=lambda m: m[0])
    
    # Merge overlapping matches
    merged_matches = []
    for match in all_matches:
        if not merged_matches:
            merged_matches.append(match)
            continue
        
        last_match = merged_matches[-1]
        if match[0] <= last_match[1]:
            # Overlap - extend the last match
            merged_matches[-1] = (last_match[0], max(last_match[1], match[1]), 
                                 question_text[last_match[0]:max(last_match[1], match[1])])
        else:
            merged_matches.append(match)
    
    # Extract sections
    last_end = 0
    for start, end, code in merged_matches:
        # Add text before code as markdown
        if start > last_end:
            md_text = question_text[last_end:start].strip()
            if md_text:
                sections.append(('markdown', md_text))
        
        # Add code section
        code_text = code.strip()
        if code_text:
            # Clean up code from markdown formatting
            if code_text.startswith('```') and code_text.endswith('```'):
                code_text = code_text[3:-3].strip()
                if code_text.startswith('python'):
                    code_text = code_text[6:].strip()
            
            sections.append(('code', code_text))
        
        last_end = end
    
    # Add any remaining text as markdown
    if last_end < len(question_text):
        md_text = question_text[last_end:].strip()
        if md_text:
            sections.append(('markdown', md_text))
    
    # If no code sections were found, treat the whole text as markdown
    if not sections:
        sections.append(('markdown', question_text.strip()))
    
    return sections


def create_notebook_from_pdf(pdf_path: str, output_path: str, engine: str = "tesseract", 
                            debug: bool = False) -> None:
    """Create a Jupyter notebook from a PDF file.
    
    Args:
        pdf_path: Path to the PDF file
        output_path: Path to save the notebook
        engine: OCR engine to use
        debug: Whether to enable debug output
    """
    # Extract text from PDF
    if debug:
        print(f"Extracting text from {pdf_path}...", file=sys.stderr)
    
    try:
        extracted_text = extract_text_from_file(pdf_path, engine, debug)
    except Exception as e:
        print(f"Error extracting text: {str(e)}", file=sys.stderr)
        sys.exit(1)
    
    # Detect questions
    if debug:
        print("Detecting questions...", file=sys.stderr)
    
    questions = detect_questions(extracted_text)
    
    if debug:
        print(f"Found {len(questions)} questions", file=sys.stderr)
    
    # Create notebook
    notebook = nbf.v4.new_notebook()
    
    # Add title cell
    notebook.cells.append(nbf.v4.new_markdown_cell("# Assignment Notebook\n\n"
                                                 f"Generated from: {os.path.basename(pdf_path)}"))
    
    # Process each question
    for question in questions:
        # Add question header
        notebook.cells.append(nbf.v4.new_markdown_cell(f"## Question {question['number']}"))
        
        # Detect code sections in the question
        sections = detect_code_sections(question['text'])
        
        # Add cells for each section
        for section_type, section_text in sections:
            if section_type == 'markdown':
                notebook.cells.append(nbf.v4.new_markdown_cell(section_text))
            else:
                notebook.cells.append(nbf.v4.new_code_cell(section_text))
        
        # Add empty code cell for answer
        notebook.cells.append(nbf.v4.new_code_cell("# Your answer here"))
    
    # Write notebook to file
    if debug:
        print(f"Writing notebook to {output_path}...", file=sys.stderr)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        nbf.write(notebook, f)


def main():
    """Main function."""
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Convert PDF to Jupyter Notebook')
    parser.add_argument('pdf_path', help='Path to the PDF file')
    parser.add_argument('--output', '-o', help='Path to save the notebook (default: same name with .ipynb extension)')
    parser.add_argument('--engine', choices=['tesseract', 'gvision', 'textract'], 
                      default='tesseract', help='OCR engine to use')
    parser.add_argument('--debug', action='store_true', help='Enable debug output')
    
    args = parser.parse_args()
    
    # Check if the PDF file exists
    if not os.path.isfile(args.pdf_path):
        print(f"Error: PDF file '{args.pdf_path}' does not exist", file=sys.stderr)
        sys.exit(1)
    
    # Determine output path
    if args.output:
        output_path = args.output
    else:
        pdf_base = os.path.splitext(args.pdf_path)[0]
        output_path = f"{pdf_base}.ipynb"
    
    # Create notebook
    create_notebook_from_pdf(args.pdf_path, output_path, args.engine, args.debug)
    
    print(f"Successfully created notebook: {output_path}")


if __name__ == '__main__':
    main()
