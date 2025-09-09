#!/usr/bin/env python3
"""
Grade submissions using ML models.
"""
import sys
import argparse
import json
from difflib import SequenceMatcher

def calculate_similarity(text1, text2):
    """
    Calculate the similarity between two texts.
    
    Args:
        text1 (str): First text
        text2 (str): Second text
        
    Returns:
        float: Similarity score between 0 and 1
    """
    # Use SequenceMatcher to calculate similarity
    matcher = SequenceMatcher(None, text1, text2)
    return matcher.ratio()

def grade_submission(submission_text, expected_answer):
    """
    Grade a submission by comparing it with the expected answer.
    
    Args:
        submission_text (str): The student's submission
        expected_answer (str): The expected answer
        
    Returns:
        dict: Grading results including score and feedback
    """
    try:
        # Calculate similarity score
        similarity = calculate_similarity(submission_text, expected_answer)
        
        # Convert similarity to a score out of 100
        score = round(similarity * 100, 2)
        
        # Generate feedback based on the score
        if score >= 90:
            feedback = "Excellent work! Your answer matches the expected solution very closely."
        elif score >= 80:
            feedback = "Good work! Your answer is very similar to the expected solution."
        elif score >= 70:
            feedback = "Satisfactory work. Your answer captures many key points but could be improved."
        elif score >= 60:
            feedback = "Your answer has some similarities to the expected solution but needs improvement."
        else:
            feedback = "Your answer differs significantly from the expected solution. Please review the material."
        
        # Return the results
        return {
            "score": score,
            "similarity": similarity,
            "feedback": feedback
        }
    except Exception as e:
        print(f"Error grading submission: {str(e)}", file=sys.stderr)
        sys.exit(1)

def main():
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Grade submission')
    parser.add_argument('--submission', required=True, help='Submission text')
    parser.add_argument('--expected', required=True, help='Expected answer text')
    
    args = parser.parse_args()
    
    # Grade the submission
    result = grade_submission(args.submission, args.expected)
    
    # Print the result as JSON
    print(json.dumps(result))

if __name__ == '__main__':
    main()
