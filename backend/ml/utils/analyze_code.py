#!/usr/bin/env python3
"""
Analyze code submissions for style, efficiency, and correctness.
"""
import sys
import argparse
import json
import re

def analyze_python_code(code):
    """
    Analyze Python code for style and potential issues.
    
    Args:
        code (str): Python code to analyze
        
    Returns:
        dict: Analysis results
    """
    results = {
        "style_issues": [],
        "potential_bugs": [],
        "efficiency_issues": [],
        "complexity": "low"
    }
    
    # Check for PEP 8 style issues (simplified)
    if len([line for line in code.split('\n') if len(line) > 79]):
        results["style_issues"].append("Some lines exceed 79 characters (PEP 8 recommends shorter lines)")
    
    # Check for consistent indentation
    indents = set(len(line) - len(line.lstrip()) for line in code.split('\n') if line.strip())
    if len(indents) > 1 and 0 in indents:
        indents.remove(0)  # Remove zero indentation
    if len(indents) > 1:
        results["style_issues"].append("Inconsistent indentation detected")
    
    # Check for unused imports
    imports = re.findall(r'import (\w+)', code)
    for imp in imports:
        if imp not in code.replace(f"import {imp}", ""):
            results["potential_bugs"].append(f"Potential unused import: {imp}")
    
    # Check for inefficient list comprehensions vs loops
    if code.count('for') > 3 and code.count('[') < 2:
        results["efficiency_issues"].append("Consider using list comprehensions for more concise code")
    
    # Estimate complexity
    complexity = "low"
    if code.count('for') + code.count('while') > 5:
        complexity = "medium"
    if code.count('for') + code.count('while') > 10:
        complexity = "high"
    results["complexity"] = complexity
    
    return results

def analyze_javascript_code(code):
    """
    Analyze JavaScript code for style and potential issues.
    
    Args:
        code (str): JavaScript code to analyze
        
    Returns:
        dict: Analysis results
    """
    results = {
        "style_issues": [],
        "potential_bugs": [],
        "efficiency_issues": [],
        "complexity": "low"
    }
    
    # Check for semicolons
    if code.count(';') < code.count('\n') / 2:
        results["style_issues"].append("Missing semicolons in many statements")
    
    # Check for console.log statements
    if code.count('console.log') > 0:
        results["style_issues"].append(f"Found {code.count('console.log')} console.log statements that should be removed in production code")
    
    # Check for var instead of let/const
    if code.count('var ') > 0:
        results["style_issues"].append("Using 'var' instead of modern 'let' or 'const'")
    
    # Check for unused variables (simplified)
    var_declarations = re.findall(r'(let|const|var)\s+(\w+)', code)
    for _, var_name in var_declarations:
        # Count occurrences of the variable name
        count = len(re.findall(r'\b' + var_name + r'\b', code))
        if count <= 1:  # Only appears in declaration
            results["potential_bugs"].append(f"Potential unused variable: {var_name}")
    
    # Estimate complexity
    complexity = "low"
    if code.count('for') + code.count('while') + code.count('forEach') > 5:
        complexity = "medium"
    if code.count('for') + code.count('while') + code.count('forEach') > 10:
        complexity = "high"
    results["complexity"] = complexity
    
    return results

def analyze_code(code, language):
    """
    Analyze code in different languages.
    
    Args:
        code (str): Code to analyze
        language (str): Programming language
        
    Returns:
        dict: Analysis results
    """
    try:
        if language.lower() == 'python':
            return analyze_python_code(code)
        elif language.lower() in ['javascript', 'js']:
            return analyze_javascript_code(code)
        else:
            return {
                "error": f"Language '{language}' is not supported for analysis",
                "style_issues": [],
                "potential_bugs": [],
                "efficiency_issues": [],
                "complexity": "unknown"
            }
    except Exception as e:
        print(f"Error analyzing code: {str(e)}", file=sys.stderr)
        sys.exit(1)

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Analyze code submission')
    parser.add_argument('--code', required=True, help='Code to analyze')
    parser.add_argument('--language', required=True, help='Programming language')
    
    args = parser.parse_args()
    
    # Analyze the code
    result = analyze_code(args.code, args.language)
    
    # Print the result as JSON
    print(json.dumps(result))

if __name__ == '__main__':
    main()
