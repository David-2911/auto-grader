#!/usr/bin/env python3
"""
Feedback generation and scoring system for Auto-Grade.
This module generates detailed, actionable feedback for student submissions.
"""
import sys
import os
import json
import argparse
import re
from pathlib import Path
import logging
from typing import Dict, List, Tuple, Any, Optional, Union
import numpy as np
from difflib import SequenceMatcher

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("feedback_generator.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("feedback_generator")

# Try to import spaCy for better text processing
try:
    import spacy
    nlp = spacy.load('en_core_web_md')
    SPACY_AVAILABLE = True
except Exception:
    logger.warning("spaCy model not available. Some feedback features will be limited.")
    SPACY_AVAILABLE = False

# Try to import NLTK for fallback text processing
try:
    import nltk
    from nltk.tokenize import word_tokenize, sent_tokenize
    from nltk.corpus import stopwords
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    NLTK_STOP_WORDS = set(stopwords.words('english'))
    NLTK_AVAILABLE = True
except Exception:
    logger.warning("NLTK not available. Some feedback features will be limited.")
    NLTK_AVAILABLE = False


class FeedbackGenerator:
    """Generates detailed feedback for student submissions"""
    
    def __init__(self, feedback_templates_path: str = None):
        """
        Initialize the feedback generator
        
        Args:
            feedback_templates_path: Path to feedback templates file
        """
        self.templates = self._load_templates(feedback_templates_path)
    
    def _load_templates(self, templates_path: str = None) -> Dict:
        """
        Load feedback templates from file
        
        Args:
            templates_path: Path to templates file
            
        Returns:
            Dictionary of templates
        """
        default_templates = {
            'excellent': [
                "Excellent work! Your answer demonstrates a thorough understanding of the topic.",
                "Your response is comprehensive and well-articulated.",
                "Outstanding job! You've covered all the key points and demonstrated deep understanding."
            ],
            'good': [
                "Good work! Your answer covers most of the key points.",
                "You've demonstrated a solid understanding of the material.",
                "Your response is mostly accurate and well-structured."
            ],
            'satisfactory': [
                "Your answer demonstrates basic understanding but could be more comprehensive.",
                "You've covered some key points, but there's room for improvement.",
                "Your response is generally on the right track but needs more detail."
            ],
            'needs_improvement': [
                "Your answer needs improvement. Consider reviewing the key concepts.",
                "There are some misunderstandings in your response.",
                "Your answer is incomplete and missing important elements."
            ],
            'poor': [
                "Your answer indicates significant gaps in understanding.",
                "Please review the course materials as your answer misses key concepts.",
                "Your response shows limited understanding of the topic."
            ],
            'missing_concepts': [
                "Your answer is missing discussion of: {concept}",
                "You should include information about: {concept}",
                "Your response would be stronger if you addressed: {concept}"
            ],
            'keyword_missing': [
                "Consider including these key terms in your answer: {keywords}",
                "Your answer should include these important terms: {keywords}",
                "To improve your answer, incorporate these key terms: {keywords}"
            ],
            'structure_feedback': [
                "Your answer could be better organized to improve clarity.",
                "Consider structuring your response with clear introduction and conclusion.",
                "Breaking your answer into more distinct sections would improve readability."
            ],
            'code_feedback': {
                'style': [
                    "Your code could benefit from better styling and formatting.",
                    "Consider following standard coding conventions for better readability.",
                    "Proper indentation and consistent naming would improve your code."
                ],
                'efficiency': [
                    "Your solution works but could be more efficient.",
                    "Consider optimizing your algorithm to reduce computational complexity.",
                    "Your code could be more concise while maintaining functionality."
                ],
                'correctness': [
                    "Your code has some logical errors that need to be addressed.",
                    "Your solution doesn't handle all edge cases correctly.",
                    "There are bugs in your implementation that need fixing."
                ]
            }
        }
        
        # If templates path is provided, load custom templates
        if templates_path:
            try:
                with open(templates_path, 'r') as f:
                    custom_templates = json.load(f)
                
                # Merge with default templates
                for category, templates in custom_templates.items():
                    if category in default_templates and isinstance(default_templates[category], list):
                        default_templates[category].extend(templates)
                    else:
                        default_templates[category] = templates
                
                logger.info(f"Loaded custom feedback templates from {templates_path}")
                
            except Exception as e:
                logger.error(f"Error loading feedback templates: {str(e)}")
        
        return default_templates
    
    def generate_feedback(self, 
                        student_answer: str, 
                        expected_answer: str,
                        score: float,
                        max_score: float,
                        missing_concepts: List[str] = None,
                        missing_keywords: List[str] = None,
                        is_code: bool = False,
                        code_analysis: Dict = None) -> List[str]:
        """
        Generate feedback for a student submission
        
        Args:
            student_answer: Student's submitted answer
            expected_answer: Expected answer
            score: Score assigned to the submission
            max_score: Maximum possible score
            missing_concepts: List of missing concepts
            missing_keywords: List of missing keywords
            is_code: Whether the submission is code
            code_analysis: Code analysis results
            
        Returns:
            List of feedback statements
        """
        feedback = []
        
        # Calculate score percentage
        score_percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        # Add general feedback based on score
        if score_percentage >= 90:
            feedback.append(np.random.choice(self.templates['excellent']))
        elif score_percentage >= 80:
            feedback.append(np.random.choice(self.templates['good']))
        elif score_percentage >= 70:
            feedback.append(np.random.choice(self.templates['satisfactory']))
        elif score_percentage >= 50:
            feedback.append(np.random.choice(self.templates['needs_improvement']))
        else:
            feedback.append(np.random.choice(self.templates['poor']))
        
        # Add specific feedback on missing concepts
        if missing_concepts:
            for concept in missing_concepts[:3]:  # Limit to top 3
                template = np.random.choice(self.templates['missing_concepts'])
                feedback.append(template.format(concept=concept))
        
        # Add specific feedback on missing keywords
        if missing_keywords and len(missing_keywords) > 0:
            keywords_str = ", ".join(missing_keywords[:5])  # Limit to top 5
            template = np.random.choice(self.templates['keyword_missing'])
            feedback.append(template.format(keywords=keywords_str))
        
        # Check answer structure and provide feedback
        structure_feedback = self._analyze_structure(student_answer)
        if structure_feedback:
            feedback.append(structure_feedback)
        
        # If submission is code, provide code-specific feedback
        if is_code and code_analysis:
            code_feedback = self._generate_code_feedback(code_analysis)
            feedback.extend(code_feedback)
        
        # Identify strengths in the student's answer
        strengths = self._identify_strengths(student_answer, expected_answer)
        if strengths:
            feedback.append("Strengths in your answer:")
            feedback.extend([f"- {strength}" for strength in strengths[:2]])  # Limit to top 2
        
        return feedback
    
    def _analyze_structure(self, text: str) -> Optional[str]:
        """
        Analyze the structure of an answer
        
        Args:
            text: Answer text
            
        Returns:
            Structure feedback or None
        """
        # Check if text is too short
        if len(text) < 100:
            return "Your answer is too brief. Consider expanding your response with more details."
        
        # Check for paragraphs
        paragraphs = text.split('\n\n')
        if len(paragraphs) == 1 and len(text) > 300:
            return "Consider organizing your answer into paragraphs for better readability."
        
        # Check for sentence variety
        if NLTK_AVAILABLE:
            sentences = sent_tokenize(text)
            if len(sentences) >= 3:
                sentence_lengths = [len(s) for s in sentences]
                std_dev = np.std(sentence_lengths)
                
                if std_dev < 10 and np.mean(sentence_lengths) > 20:
                    return "Try varying your sentence length for better readability."
        
        # Return general structure feedback if no specific issues found
        if len(text) > 500 and len(paragraphs) < 3:
            return np.random.choice(self.templates['structure_feedback'])
        
        return None
    
    def _identify_strengths(self, student_answer: str, expected_answer: str) -> List[str]:
        """
        Identify strengths in the student's answer
        
        Args:
            student_answer: Student's submitted answer
            expected_answer: Expected answer
            
        Returns:
            List of strengths
        """
        strengths = []
        
        # Use spaCy if available for better analysis
        if SPACY_AVAILABLE:
            student_doc = nlp(student_answer)
            expected_doc = nlp(expected_answer)
            
            # Check for key entities mentioned in both
            student_entities = set([e.text.lower() for e in student_doc.ents])
            expected_entities = set([e.text.lower() for e in expected_doc.ents])
            
            common_entities = student_entities.intersection(expected_entities)
            if len(common_entities) >= 3:
                strengths.append("You've correctly identified key concepts in your answer.")
            
            # Check for similar sentence structures
            matched_sentences = 0
            for student_sent in student_doc.sents:
                best_similarity = 0
                for expected_sent in expected_doc.sents:
                    similarity = student_sent.similarity(expected_sent)
                    best_similarity = max(best_similarity, similarity)
                
                if best_similarity > 0.7:
                    matched_sentences += 1
            
            if matched_sentences >= 2:
                strengths.append("Your explanation aligns well with the expected approach.")
            
        else:
            # Fallback to simpler text matching
            # Check for keyword coverage
            if NLTK_AVAILABLE:
                student_words = set(word_tokenize(student_answer.lower()))
                student_words = {w for w in student_words if w not in NLTK_STOP_WORDS and len(w) > 3}
                
                expected_words = set(word_tokenize(expected_answer.lower()))
                expected_words = {w for w in expected_words if w not in NLTK_STOP_WORDS and len(w) > 3}
                
                common_words = student_words.intersection(expected_words)
                coverage = len(common_words) / len(expected_words) if expected_words else 0
                
                if coverage > 0.7:
                    strengths.append("You've used most of the key terminology correctly.")
            
            # Check for sequence similarity
            matcher = SequenceMatcher(None, student_answer.lower(), expected_answer.lower())
            similarity = matcher.ratio()
            
            if similarity > 0.5:
                strengths.append("Your answer covers significant portions of the expected content.")
        
        # Add general strengths if none found
        if not strengths:
            if len(student_answer) > 200:
                strengths.append("You've provided a detailed response to the question.")
            
            if "because" in student_answer.lower() or "therefore" in student_answer.lower():
                strengths.append("You've included logical reasoning in your answer.")
        
        return strengths
    
    def _generate_code_feedback(self, code_analysis: Dict) -> List[str]:
        """
        Generate feedback for code submissions
        
        Args:
            code_analysis: Code analysis results
            
        Returns:
            List of feedback statements
        """
        feedback = []
        
        # Check for style issues
        if 'style_issues' in code_analysis and code_analysis['style_issues']:
            feedback.append(np.random.choice(self.templates['code_feedback']['style']))
            for issue in code_analysis['style_issues'][:2]:  # Limit to top 2
                feedback.append(f"- {issue}")
        
        # Check for efficiency issues
        if 'efficiency_issues' in code_analysis and code_analysis['efficiency_issues']:
            feedback.append(np.random.choice(self.templates['code_feedback']['efficiency']))
            for issue in code_analysis['efficiency_issues'][:2]:  # Limit to top 2
                feedback.append(f"- {issue}")
        
        # Check for correctness issues
        if 'potential_bugs' in code_analysis and code_analysis['potential_bugs']:
            feedback.append(np.random.choice(self.templates['code_feedback']['correctness']))
            for issue in code_analysis['potential_bugs'][:2]:  # Limit to top 2
                feedback.append(f"- {issue}")
        
        return feedback


class ScoreNormalizer:
    """Normalizes scores and applies grading curves"""
    
    def __init__(self, 
               min_score: float = 0.0, 
               max_score: float = 10.0,
               passing_threshold: float = 6.0):
        """
        Initialize the score normalizer
        
        Args:
            min_score: Minimum possible score
            max_score: Maximum possible score
            passing_threshold: Threshold for passing grade
        """
        self.min_score = min_score
        self.max_score = max_score
        self.passing_threshold = passing_threshold
        self.score_statistics = {
            'count': 0,
            'sum': 0,
            'sum_squared': 0,
            'min': float('inf'),
            'max': float('-inf')
        }
    
    def add_score(self, score: float):
        """
        Add a score to the statistics
        
        Args:
            score: Score value
        """
        self.score_statistics['count'] += 1
        self.score_statistics['sum'] += score
        self.score_statistics['sum_squared'] += score * score
        self.score_statistics['min'] = min(self.score_statistics['min'], score)
        self.score_statistics['max'] = max(self.score_statistics['max'], score)
    
    def get_statistics(self) -> Dict:
        """
        Get score statistics
        
        Returns:
            Dictionary of statistics
        """
        stats = self.score_statistics.copy()
        
        if stats['count'] > 0:
            stats['mean'] = stats['sum'] / stats['count']
            variance = (stats['sum_squared'] / stats['count']) - (stats['mean'] ** 2)
            stats['std_dev'] = np.sqrt(max(0, variance))
        else:
            stats['mean'] = 0
            stats['std_dev'] = 0
        
        return stats
    
    def normalize_scores(self, scores: List[float]) -> List[float]:
        """
        Normalize scores to fit within min and max range
        
        Args:
            scores: List of scores
            
        Returns:
            Normalized scores
        """
        if not scores:
            return []
        
        # Calculate statistics
        min_val = min(scores)
        max_val = max(scores)
        
        # If all scores are the same, return max_score
        if min_val == max_val:
            return [self.max_score] * len(scores)
        
        # Normalize to range [min_score, max_score]
        normalized = []
        for score in scores:
            normalized_score = ((score - min_val) / (max_val - min_val)) * (self.max_score - self.min_score) + self.min_score
            normalized.append(normalized_score)
        
        return normalized
    
    def apply_curve(self, scores: List[float], target_mean: float = None) -> List[float]:
        """
        Apply a grading curve to scores
        
        Args:
            scores: List of scores
            target_mean: Target mean score (if None, will use passing_threshold + 1)
            
        Returns:
            Curved scores
        """
        if not scores:
            return []
        
        # Calculate statistics
        mean = sum(scores) / len(scores)
        
        # If target mean not specified, use passing_threshold + 1
        if target_mean is None:
            target_mean = self.passing_threshold + 1
        
        # Apply curve
        shift = target_mean - mean
        curved = [min(self.max_score, max(self.min_score, score + shift)) for score in scores]
        
        return curved
    
    def apply_percentile_based_grading(self, 
                                    scores: List[float], 
                                    percentiles: Dict[str, float] = None) -> List[Tuple[float, str]]:
        """
        Apply percentile-based grading
        
        Args:
            scores: List of scores
            percentiles: Dictionary mapping grades to minimum percentiles
                        e.g., {'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 0}
            
        Returns:
            List of (score, letter_grade) tuples
        """
        if not scores:
            return []
        
        # Default percentiles if not provided
        if percentiles is None:
            percentiles = {
                'A': 90,
                'B': 80,
                'C': 70,
                'D': 60,
                'F': 0
            }
        
        # Calculate percentile for each score
        sorted_scores = sorted(scores)
        result = []
        
        for score in scores:
            # Calculate percentile
            rank = sorted_scores.index(score)
            percentile = (rank / (len(sorted_scores) - 1)) * 100 if len(sorted_scores) > 1 else 100
            
            # Determine letter grade
            letter_grade = 'F'
            for grade, min_percentile in sorted(percentiles.items(), key=lambda x: x[1], reverse=True):
                if percentile >= min_percentile:
                    letter_grade = grade
                    break
            
            result.append((score, letter_grade))
        
        return result


class FeedbackFormatter:
    """Formats feedback for different output formats"""
    
    @staticmethod
    def format_as_html(feedback: List[str], score: float, max_score: float) -> str:
        """
        Format feedback as HTML
        
        Args:
            feedback: List of feedback statements
            score: Score value
            max_score: Maximum possible score
            
        Returns:
            HTML-formatted feedback
        """
        # Calculate percentage
        percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        # Determine color based on score
        if percentage >= 80:
            color = "green"
        elif percentage >= 60:
            color = "orange"
        else:
            color = "red"
        
        # Build HTML
        html = f"""
        <div class="feedback-container">
            <div class="score-section">
                <h3>Score: <span style="color: {color}">{score:.1f} / {max_score:.1f}</span></h3>
                <div class="score-bar">
                    <div class="score-fill" style="width: {percentage}%; background-color: {color}"></div>
                </div>
            </div>
            <div class="feedback-section">
                <h3>Feedback:</h3>
                <ul>
        """
        
        for item in feedback:
            if item.startswith("-"):
                html += f"        <li class='subitem'>{item[1:].strip()}</li>\n"
            else:
                html += f"        <li>{item}</li>\n"
        
        html += """
                </ul>
            </div>
        </div>
        <style>
            .feedback-container {
                font-family: Arial, sans-serif;
                border: 1px solid #ddd;
                border-radius: 5px;
                padding: 15px;
                margin: 10px 0;
            }
            .score-section {
                margin-bottom: 15px;
            }
            .score-bar {
                height: 20px;
                background-color: #eee;
                border-radius: 10px;
                overflow: hidden;
            }
            .score-fill {
                height: 100%;
                border-radius: 10px;
            }
            .feedback-section ul {
                padding-left: 20px;
            }
            .feedback-section li {
                margin-bottom: 8px;
            }
            .subitem {
                color: #555;
                list-style-type: circle;
            }
        </style>
        """
        
        return html
    
    @staticmethod
    def format_as_markdown(feedback: List[str], score: float, max_score: float) -> str:
        """
        Format feedback as Markdown
        
        Args:
            feedback: List of feedback statements
            score: Score value
            max_score: Maximum possible score
            
        Returns:
            Markdown-formatted feedback
        """
        # Calculate percentage
        percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        # Build Markdown
        md = f"## Score: {score:.1f} / {max_score:.1f} ({percentage:.1f}%)\n\n"
        md += "### Feedback:\n\n"
        
        for item in feedback:
            if item.startswith("-"):
                md += f"  {item}\n"
            else:
                md += f"* {item}\n"
        
        return md
    
    @staticmethod
    def format_as_json(feedback: List[str], score: float, max_score: float) -> Dict:
        """
        Format feedback as JSON
        
        Args:
            feedback: List of feedback statements
            score: Score value
            max_score: Maximum possible score
            
        Returns:
            JSON-formatted feedback
        """
        return {
            "score": float(score),
            "max_score": float(max_score),
            "percentage": float((score / max_score) * 100 if max_score > 0 else 0),
            "feedback": feedback
        }
    
    @staticmethod
    def format_as_plain_text(feedback: List[str], score: float, max_score: float) -> str:
        """
        Format feedback as plain text
        
        Args:
            feedback: List of feedback statements
            score: Score value
            max_score: Maximum possible score
            
        Returns:
            Plain text formatted feedback
        """
        # Calculate percentage
        percentage = (score / max_score) * 100 if max_score > 0 else 0
        
        # Build text
        text = f"Score: {score:.1f} / {max_score:.1f} ({percentage:.1f}%)\n\n"
        text += "Feedback:\n\n"
        
        for item in feedback:
            text += f"* {item}\n"
        
        return text


def main():
    """Main function for the feedback generation system"""
    parser = argparse.ArgumentParser(description='Generate feedback for student submissions')
    parser.add_argument('--student-answer', type=str, required=True,
                        help='Path to file containing student answer')
    parser.add_argument('--expected-answer', type=str, required=True,
                        help='Path to file containing expected answer')
    parser.add_argument('--score', type=float, required=True,
                        help='Score assigned to the submission')
    parser.add_argument('--max-score', type=float, default=10.0,
                        help='Maximum possible score')
    parser.add_argument('--missing-concepts', type=str,
                        help='Path to file containing missing concepts')
    parser.add_argument('--missing-keywords', type=str,
                        help='Path to file containing missing keywords')
    parser.add_argument('--is-code', action='store_true',
                        help='Whether the submission is code')
    parser.add_argument('--code-analysis', type=str,
                        help='Path to file containing code analysis results')
    parser.add_argument('--templates', type=str,
                        help='Path to feedback templates file')
    parser.add_argument('--format', type=str, choices=['html', 'markdown', 'json', 'text'],
                        default='text', help='Output format')
    parser.add_argument('--output', type=str,
                        help='Path to output file')
    args = parser.parse_args()
    
    # Read student answer
    with open(args.student_answer, 'r') as f:
        student_answer = f.read()
    
    # Read expected answer
    with open(args.expected_answer, 'r') as f:
        expected_answer = f.read()
    
    # Read missing concepts if provided
    missing_concepts = []
    if args.missing_concepts:
        try:
            with open(args.missing_concepts, 'r') as f:
                missing_concepts = json.load(f)
        except Exception as e:
            logger.error(f"Error reading missing concepts: {str(e)}")
    
    # Read missing keywords if provided
    missing_keywords = []
    if args.missing_keywords:
        try:
            with open(args.missing_keywords, 'r') as f:
                missing_keywords = json.load(f)
        except Exception as e:
            logger.error(f"Error reading missing keywords: {str(e)}")
    
    # Read code analysis if provided
    code_analysis = None
    if args.is_code and args.code_analysis:
        try:
            with open(args.code_analysis, 'r') as f:
                code_analysis = json.load(f)
        except Exception as e:
            logger.error(f"Error reading code analysis: {str(e)}")
    
    # Generate feedback
    feedback_generator = FeedbackGenerator(args.templates)
    feedback = feedback_generator.generate_feedback(
        student_answer=student_answer,
        expected_answer=expected_answer,
        score=args.score,
        max_score=args.max_score,
        missing_concepts=missing_concepts,
        missing_keywords=missing_keywords,
        is_code=args.is_code,
        code_analysis=code_analysis
    )
    
    # Format feedback
    if args.format == 'html':
        formatted_feedback = FeedbackFormatter.format_as_html(feedback, args.score, args.max_score)
    elif args.format == 'markdown':
        formatted_feedback = FeedbackFormatter.format_as_markdown(feedback, args.score, args.max_score)
    elif args.format == 'json':
        formatted_feedback = FeedbackFormatter.format_as_json(feedback, args.score, args.max_score)
        formatted_feedback = json.dumps(formatted_feedback, indent=2)
    else:  # text
        formatted_feedback = FeedbackFormatter.format_as_plain_text(feedback, args.score, args.max_score)
    
    # Output feedback
    if args.output:
        with open(args.output, 'w') as f:
            f.write(formatted_feedback)
        logger.info(f"Feedback saved to {args.output}")
    else:
        print(formatted_feedback)


if __name__ == '__main__':
    main()
