#!/usr/bin/env python3
"""
Grading engine for Auto-Grade system.
This module handles prediction, scoring, and feedback generation for student submissions.
"""
import sys
import os
import json
import argparse
import numpy as np
import pandas as pd
from pathlib import Path
import logging
import re
from typing import Dict, List, Tuple, Any, Optional, Union
import joblib
import pickle
from datetime import datetime

# Import ML libraries
from sklearn.metrics.pairwise import cosine_similarity
import tensorflow as tf
from transformers import AutoTokenizer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ml_grading.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ml_grading")

# Import local utils
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.train_models import ModelManager, DataProcessor

class GradingEngine:
    """Handles grading of student submissions using trained ML models"""
    
    def __init__(self, model_dir: str):
        """
        Initialize the grading engine
        
        Args:
            model_dir: Directory containing trained models
        """
        self.model_dir = Path(model_dir)
        self.model_manager = ModelManager(model_dir)
        self.data_processor = DataProcessor()
        
        # Load model types
        self.similarity_model = self.model_manager.get_model('similarity')
        self.transformer_model = self.model_manager.get_model('transformer')
        
        # Check if models are available
        if not self.similarity_model and not self.transformer_model:
            logger.warning("No models available for grading")
    
    def grade_submission(self, 
                         student_answer: str, 
                         question_text: str, 
                         expected_answer: str,
                         max_score: float = 10.0,
                         rubric: Dict = None,
                         keywords: List[str] = None) -> Dict:
        """
        Grade a student submission
        
        Args:
            student_answer: Student's submitted answer
            question_text: The question text
            expected_answer: The expected answer or solution
            max_score: Maximum possible score
            rubric: Grading rubric with point values
            keywords: Important keywords that should be present
            
        Returns:
            Grading results with score and feedback
        """
        # Preprocess texts
        processed_student = self.data_processor.preprocess_text(student_answer)
        processed_question = self.data_processor.preprocess_text(question_text)
        processed_expected = self.data_processor.preprocess_text(expected_answer)
        
        # Initialize result structure
        result = {
            'score': 0.0,
            'max_score': max_score,
            'confidence': 0.0,
            'feedback': [],
            'methods_used': [],
            'similarity_score': 0.0,
            'keyword_match': 0.0,
            'semantic_similarity': 0.0,
            'detailed_feedback': {}
        }
        
        # Check for empty submission
        if not student_answer.strip():
            result['feedback'].append("No answer provided.")
            result['confidence'] = 1.0
            return result
        
        # Apply different grading methods and combine results
        methods = []
        scores = []
        confidences = []
        
        # 1. Basic text similarity using TF-IDF and cosine similarity
        if self.similarity_model:
            similarity_score, similarity_confidence, similarity_feedback = self._grade_with_similarity(
                processed_student, processed_question, processed_expected
            )
            methods.append("text_similarity")
            scores.append(similarity_score)
            confidences.append(similarity_confidence)
            result['similarity_score'] = similarity_score
            result['detailed_feedback']['text_similarity'] = similarity_feedback
        
        # 2. Keyword matching
        if keywords:
            keyword_score, keyword_confidence, keyword_feedback = self._grade_with_keywords(
                processed_student, keywords
            )
            methods.append("keyword_matching")
            scores.append(keyword_score)
            confidences.append(keyword_confidence)
            result['keyword_match'] = keyword_score
            result['detailed_feedback']['keyword_matching'] = keyword_feedback
        
        # 3. Transformer-based semantic similarity
        if self.transformer_model:
            semantic_score, semantic_confidence, semantic_feedback = self._grade_with_transformer(
                student_answer, question_text, expected_answer
            )
            methods.append("semantic_similarity")
            scores.append(semantic_score)
            confidences.append(semantic_confidence)
            result['semantic_similarity'] = semantic_score
            result['detailed_feedback']['semantic_similarity'] = semantic_feedback
        
        # Combine scores using weighted average based on confidence
        if methods:
            # Calculate weighted average
            total_weight = sum(confidences)
            weighted_score = 0
            
            if total_weight > 0:
                for score, confidence in zip(scores, confidences):
                    weighted_score += score * (confidence / total_weight)
            else:
                # If all confidences are 0, use simple average
                weighted_score = sum(scores) / len(scores)
            
            # Scale to max_score
            final_score = weighted_score * max_score
            
            # Round to nearest 0.5
            final_score = round(final_score * 2) / 2
            
            # Ensure score is within bounds
            final_score = max(0, min(final_score, max_score))
            
            # Set results
            result['score'] = final_score
            result['methods_used'] = methods
            result['confidence'] = sum(confidences) / len(confidences)
        
        # Generate feedback based on score and detailed feedback
        feedback = self._generate_feedback(
            result['score'], max_score, result['detailed_feedback'], rubric
        )
        result['feedback'] = feedback
        
        return result
    
    def _grade_with_similarity(self, 
                             student_answer: str, 
                             question_text: str, 
                             expected_answer: str) -> Tuple[float, float, Dict]:
        """
        Grade using text similarity model
        
        Args:
            student_answer: Preprocessed student answer
            question_text: Preprocessed question text
            expected_answer: Preprocessed expected answer
            
        Returns:
            Tuple of (score, confidence, feedback)
        """
        try:
            vectorizer = self.similarity_model['vectorizer']
            model = self.similarity_model['model']
            
            # Vectorize texts
            student_vec = vectorizer.transform([student_answer]).toarray()
            expected_vec = vectorizer.transform([expected_answer]).toarray()
            question_vec = vectorizer.transform([question_text]).toarray()
            
            # Calculate similarity
            similarity = cosine_similarity(student_vec, expected_vec)[0][0]
            
            # Calculate other features
            student_length = len(student_answer.split())
            expected_length = len(expected_answer.split())
            length_ratio = student_length / max(expected_length, 1)
            
            # Create feature vector
            features = np.array([[similarity, length_ratio, student_length]])
            
            # Predict score (0 to 1)
            score = model.predict(features)[0]
            
            # Calculate confidence
            # Use prediction probability if available, otherwise use similarity as confidence
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(features)
                # Use the probability of the predicted class
                confidence = proba[0][model.classes_.tolist().index(score)]
            else:
                # Fallback to using similarity as confidence
                confidence = (similarity + 0.5) / 1.5  # Scale to 0.33-1 range
            
            # Prepare feedback
            feedback = {
                "similarity": float(similarity),
                "length_ratio": float(length_ratio),
                "missing_content": []
            }
            
            # Identify missing key phrases
            expected_phrases = [p for p in expected_answer.split('.') if len(p) > 10]
            for phrase in expected_phrases:
                phrase = phrase.strip()
                if phrase and phrase not in student_answer:
                    best_similarity = 0
                    for student_phrase in student_answer.split('.'):
                        student_phrase = student_phrase.strip()
                        if student_phrase:
                            phrase_similarity = cosine_similarity(
                                vectorizer.transform([phrase]),
                                vectorizer.transform([student_phrase])
                            )[0][0]
                            best_similarity = max(best_similarity, phrase_similarity)
                    
                    if best_similarity < 0.7:  # Threshold for considering content missing
                        feedback["missing_content"].append(phrase)
            
            return float(score), float(confidence), feedback
            
        except Exception as e:
            logger.error(f"Error grading with similarity model: {str(e)}")
            return 0.5, 0.1, {"error": str(e)}
    
    def _grade_with_keywords(self, 
                           student_answer: str, 
                           keywords: List[str]) -> Tuple[float, float, Dict]:
        """
        Grade based on keyword matching
        
        Args:
            student_answer: Preprocessed student answer
            keywords: List of important keywords
            
        Returns:
            Tuple of (score, confidence, feedback)
        """
        try:
            if not keywords:
                return 0.5, 0.1, {"error": "No keywords provided"}
            
            # Extract keywords from student answer
            student_keywords = self.data_processor.extract_keywords(student_answer)
            
            # Count matching keywords
            matched_keywords = []
            missing_keywords = []
            
            for keyword in keywords:
                if keyword in student_keywords:
                    matched_keywords.append(keyword)
                else:
                    # Check for fuzzy matches
                    best_match = None
                    best_similarity = 0
                    
                    for student_kw in student_keywords:
                        # Simple Jaccard similarity for fuzzy matching
                        a = set(keyword)
                        b = set(student_kw)
                        similarity = len(a.intersection(b)) / len(a.union(b))
                        
                        if similarity > 0.8 and similarity > best_similarity:
                            best_match = student_kw
                            best_similarity = similarity
                    
                    if best_match:
                        matched_keywords.append(keyword)
                    else:
                        missing_keywords.append(keyword)
            
            # Calculate score based on keyword coverage
            if not keywords:
                score = 0.5
                confidence = 0.1
            else:
                score = len(matched_keywords) / len(keywords)
                
                # Confidence depends on number of keywords
                # More keywords = higher confidence in the method
                confidence = min(0.8, 0.4 + 0.05 * len(keywords))
            
            # Prepare feedback
            feedback = {
                "matched_keywords": matched_keywords,
                "missing_keywords": missing_keywords,
                "match_percentage": float(score)
            }
            
            return float(score), float(confidence), feedback
            
        except Exception as e:
            logger.error(f"Error grading with keywords: {str(e)}")
            return 0.5, 0.1, {"error": str(e)}
    
    def _grade_with_transformer(self, 
                              student_answer: str, 
                              question_text: str, 
                              expected_answer: str) -> Tuple[float, float, Dict]:
        """
        Grade using transformer model for semantic understanding
        
        Args:
            student_answer: Original student answer (not preprocessed)
            question_text: Original question text
            expected_answer: Original expected answer
            
        Returns:
            Tuple of (score, confidence, feedback)
        """
        try:
            tokenizer = self.transformer_model['tokenizer']
            model = self.transformer_model['model']
            
            # Tokenize input
            tokens = tokenizer(
                question_text,
                student_answer,
                padding='max_length',
                truncation=True,
                max_length=128,
                return_tensors='tf'
            )
            
            # Prepare input for prediction
            model_input = {
                'input_ids': tokens['input_ids'],
                'attention_mask': tokens['attention_mask']
            }
            
            if 'token_type_ids' in tokens:
                model_input['token_type_ids'] = tokens['token_type_ids']
            else:
                model_input['token_type_ids'] = tf.zeros_like(tokens['input_ids'])
            
            # Get prediction
            prediction = model.predict(model_input)
            
            # Convert to score (0 to 1)
            score = float(prediction[0][0])
            
            # Confidence based on distance from 0.5
            # Predictions close to 0.5 have lower confidence
            confidence = 0.6 + 0.4 * (2 * abs(score - 0.5))
            
            # Prepare feedback
            feedback = {
                "semantic_score": float(score),
                "strengths": [],
                "weaknesses": []
            }
            
            # Identify strengths and weaknesses
            if score > 0.7:
                feedback["strengths"].append("Your answer demonstrates good understanding of the concept.")
            elif score < 0.3:
                feedback["weaknesses"].append("Your answer may be missing key concepts or contains misunderstandings.")
            
            # Compare expected vs student answer sections
            expected_sentences = [s.strip() for s in expected_answer.split('.') if s.strip()]
            student_sentences = [s.strip() for s in student_answer.split('.') if s.strip()]
            
            # Find best matching sentences
            covered_concepts = []
            uncovered_concepts = []
            
            for expected_sentence in expected_sentences:
                best_match = None
                best_score = 0
                
                # Tokenize expected sentence
                expected_tokens = tokenizer(
                    question_text,
                    expected_sentence,
                    padding='max_length',
                    truncation=True,
                    max_length=128,
                    return_tensors='tf'
                )
                
                for student_sentence in student_sentences:
                    # Tokenize student sentence
                    student_tokens = tokenizer(
                        question_text,
                        student_sentence,
                        padding='max_length',
                        truncation=True,
                        max_length=128,
                        return_tensors='tf'
                    )
                    
                    # Calculate similarity
                    e_embeddings = model.get_layer('dense')(model.get_layer('model')(
                        {
                            'input_ids': expected_tokens['input_ids'],
                            'attention_mask': expected_tokens['attention_mask'],
                            'token_type_ids': expected_tokens.get('token_type_ids', tf.zeros_like(expected_tokens['input_ids']))
                        }
                    ).last_hidden_state[:, 0, :])
                    
                    s_embeddings = model.get_layer('dense')(model.get_layer('model')(
                        {
                            'input_ids': student_tokens['input_ids'],
                            'attention_mask': student_tokens['attention_mask'],
                            'token_type_ids': student_tokens.get('token_type_ids', tf.zeros_like(student_tokens['input_ids']))
                        }
                    ).last_hidden_state[:, 0, :])
                    
                    # Calculate cosine similarity
                    similarity = np.sum(e_embeddings.numpy() * s_embeddings.numpy()) / (
                        np.sqrt(np.sum(e_embeddings.numpy() ** 2)) * 
                        np.sqrt(np.sum(s_embeddings.numpy() ** 2))
                    )
                    
                    if similarity > best_score:
                        best_score = similarity
                        best_match = student_sentence
                
                # Determine if concept is covered
                if best_score > 0.7:
                    covered_concepts.append((expected_sentence, best_match, best_score))
                else:
                    uncovered_concepts.append(expected_sentence)
            
            # Add to feedback
            if covered_concepts:
                feedback["strengths"].append(f"Successfully covered {len(covered_concepts)} out of {len(expected_sentences)} key concepts.")
            
            if uncovered_concepts:
                feedback["weaknesses"].append(f"Missing {len(uncovered_concepts)} key concepts that should be addressed.")
                
                # Include some examples of missing concepts (but not all to avoid giving away answers)
                if len(uncovered_concepts) > 2:
                    # Select a couple of examples
                    examples = uncovered_concepts[:2]
                    feedback["missing_concepts"] = [self._sanitize_feedback(concept) for concept in examples]
                else:
                    feedback["missing_concepts"] = [self._sanitize_feedback(concept) for concept in uncovered_concepts]
            
            return float(score), float(confidence), feedback
            
        except Exception as e:
            logger.error(f"Error grading with transformer model: {str(e)}")
            return 0.5, 0.1, {"error": str(e)}
    
    def _sanitize_feedback(self, text):
        """Sanitize feedback to avoid giving away exact answers"""
        # Replace key words with placeholders
        words = text.split()
        if len(words) <= 3:
            return text
        
        # For longer phrases, remove some key terms
        result = []
        for i, word in enumerate(words):
            if len(word) > 4 and i % 3 == 0:
                result.append("___")
            else:
                result.append(word)
        
        return " ".join(result)
    
    def _generate_feedback(self, 
                         score: float, 
                         max_score: float, 
                         detailed_feedback: Dict,
                         rubric: Dict = None) -> List[str]:
        """
        Generate feedback based on score and detailed feedback
        
        Args:
            score: Assigned score
            max_score: Maximum possible score
            detailed_feedback: Detailed feedback from different methods
            rubric: Grading rubric
            
        Returns:
            List of feedback statements
        """
        feedback = []
        
        # Calculate percentage score
        percentage = score / max_score if max_score > 0 else 0
        
        # Add general feedback based on score
        if percentage >= 0.9:
            feedback.append("Excellent work! Your answer demonstrates a thorough understanding of the topic.")
        elif percentage >= 0.8:
            feedback.append("Very good work. Your answer covers most of the key concepts correctly.")
        elif percentage >= 0.7:
            feedback.append("Good work. Your answer demonstrates understanding of the main concepts.")
        elif percentage >= 0.6:
            feedback.append("Satisfactory work. Your answer covers some key points but could be improved.")
        elif percentage >= 0.5:
            feedback.append("Your answer addresses some aspects of the question but needs improvement.")
        else:
            feedback.append("Your answer needs significant improvement. Please review the course materials.")
        
        # Add specific feedback based on detailed results
        
        # Text similarity feedback
        if 'text_similarity' in detailed_feedback:
            sim_feedback = detailed_feedback['text_similarity']
            
            if 'missing_content' in sim_feedback and sim_feedback['missing_content']:
                missing_count = len(sim_feedback['missing_content'])
                if missing_count > 0:
                    feedback.append(f"Your answer is missing {missing_count} important elements that should be included.")
        
        # Keyword matching feedback
        if 'keyword_matching' in detailed_feedback:
            kw_feedback = detailed_feedback['keyword_matching']
            
            if 'missing_keywords' in kw_feedback and kw_feedback['missing_keywords']:
                missing_kw = kw_feedback['missing_keywords']
                if len(missing_kw) > 0:
                    feedback.append(f"Consider including these key terms: {', '.join(missing_kw[:3])}" + 
                                    (f" and {len(missing_kw) - 3} more..." if len(missing_kw) > 3 else ""))
        
        # Semantic similarity feedback
        if 'semantic_similarity' in detailed_feedback:
            sem_feedback = detailed_feedback['semantic_similarity']
            
            # Add strengths
            if 'strengths' in sem_feedback and sem_feedback['strengths']:
                for strength in sem_feedback['strengths'][:2]:  # Limit to top 2 strengths
                    feedback.append(strength)
            
            # Add weaknesses
            if 'weaknesses' in sem_feedback and sem_feedback['weaknesses']:
                for weakness in sem_feedback['weaknesses'][:2]:  # Limit to top 2 weaknesses
                    feedback.append(weakness)
            
            # Add missing concepts
            if 'missing_concepts' in sem_feedback and sem_feedback['missing_concepts']:
                feedback.append("Your answer should address these concepts:")
                for concept in sem_feedback['missing_concepts'][:2]:  # Limit to top 2 concepts
                    feedback.append(f"- {concept}")
        
        # Add rubric-based feedback if available
        if rubric:
            # Find the closest rubric point level
            closest_points = None
            min_difference = float('inf')
            
            for points in rubric:
                difference = abs(float(points) - score)
                if difference < min_difference:
                    min_difference = difference
                    closest_points = points
            
            if closest_points and closest_points in rubric:
                feedback.append(f"Rubric feedback: {rubric[closest_points]}")
        
        return feedback

    def batch_grade_submissions(self, 
                              submissions: List[Dict],
                              questions: Dict) -> List[Dict]:
        """
        Grade a batch of submissions
        
        Args:
            submissions: List of submission objects with student answers
            questions: Dictionary of question data
            
        Returns:
            List of grading results
        """
        results = []
        
        for submission in submissions:
            question_id = submission.get('question_id')
            student_answer = submission.get('answer', '')
            
            if not question_id or question_id not in questions:
                logger.warning(f"Question ID {question_id} not found in questions data")
                continue
            
            question_data = questions[question_id]
            question_text = question_data.get('text', '')
            expected_answer = question_data.get('sample_answer', '')
            max_score = question_data.get('max_score', 10.0)
            rubric = question_data.get('grading_rubric', {})
            keywords = question_data.get('keywords', [])
            
            # Grade the submission
            result = self.grade_submission(
                student_answer=student_answer,
                question_text=question_text,
                expected_answer=expected_answer,
                max_score=max_score,
                rubric=rubric,
                keywords=keywords
            )
            
            # Add submission info to result
            result['submission_id'] = submission.get('id')
            result['question_id'] = question_id
            result['timestamp'] = datetime.now().isoformat()
            
            results.append(result)
        
        return results
    
    def generate_detailed_report(self, results: List[Dict]) -> Dict:
        """
        Generate a detailed report of grading results
        
        Args:
            results: List of grading results
            
        Returns:
            Detailed report
        """
        report = {
            'summary': {
                'total_submissions': len(results),
                'average_score': 0,
                'max_score': 0,
                'score_distribution': {},
                'confidence': {
                    'high': 0,
                    'medium': 0,
                    'low': 0
                }
            },
            'results': results
        }
        
        # Calculate statistics
        total_score = 0
        max_score = 0
        score_distribution = {}
        
        for result in results:
            score = result.get('score', 0)
            max_score_value = result.get('max_score', 10)
            confidence = result.get('confidence', 0)
            
            total_score += score
            max_score = max(max_score, max_score_value)
            
            # Score distribution
            score_percentage = round((score / max_score_value) * 100)
            score_bucket = f"{(score_percentage // 10) * 10}-{(score_percentage // 10) * 10 + 9}"
            
            if score_bucket not in score_distribution:
                score_distribution[score_bucket] = 0
            score_distribution[score_bucket] += 1
            
            # Confidence distribution
            if confidence >= 0.7:
                report['summary']['confidence']['high'] += 1
            elif confidence >= 0.4:
                report['summary']['confidence']['medium'] += 1
            else:
                report['summary']['confidence']['low'] += 1
        
        # Calculate average
        if results:
            report['summary']['average_score'] = total_score / len(results)
        
        report['summary']['max_score'] = max_score
        report['summary']['score_distribution'] = score_distribution
        
        return report


def main():
    """Main function to run the grading engine"""
    parser = argparse.ArgumentParser(description='Grade submissions using ML models')
    parser.add_argument('--model-dir', type=str, default='../ml/models',
                        help='Path to directory containing trained models')
    parser.add_argument('--submission', type=str,
                        help='Path to JSON file containing submission data')
    parser.add_argument('--question', type=str,
                        help='Path to JSON file containing question data')
    parser.add_argument('--output', type=str, default='grading_results.json',
                        help='Path to output file for grading results')
    args = parser.parse_args()
    
    logger.info("Starting grading engine")
    
    # Initialize grading engine
    engine = GradingEngine(args.model_dir)
    
    # Check if single submission or batch
    if args.submission and args.question:
        try:
            # Load submission data
            with open(args.submission, 'r') as f:
                submission_data = json.load(f)
            
            # Load question data
            with open(args.question, 'r') as f:
                question_data = json.load(f)
            
            # Check data format
            if isinstance(submission_data, list):
                # Batch grading
                results = engine.batch_grade_submissions(submission_data, question_data)
                report = engine.generate_detailed_report(results)
                
                # Save results
                with open(args.output, 'w') as f:
                    json.dump(report, f, indent=2)
                
                logger.info(f"Graded {len(results)} submissions. Results saved to {args.output}")
                
            else:
                # Single submission
                # Convert question data to required format if needed
                if 'id' in question_data:
                    question_id = question_data['id']
                    questions = {question_id: question_data}
                else:
                    questions = question_data
                
                # Grade submission
                result = engine.grade_submission(
                    student_answer=submission_data.get('answer', ''),
                    question_text=question_data.get('text', ''),
                    expected_answer=question_data.get('sample_answer', ''),
                    max_score=question_data.get('max_score', 10.0),
                    rubric=question_data.get('grading_rubric', {}),
                    keywords=question_data.get('keywords', [])
                )
                
                # Save result
                with open(args.output, 'w') as f:
                    json.dump(result, f, indent=2)
                
                logger.info(f"Graded submission. Result saved to {args.output}")
                
        except Exception as e:
            logger.error(f"Error grading submission: {str(e)}")
            sys.exit(1)
    else:
        logger.error("No submission or question data provided")
        sys.exit(1)
    
    logger.info("Grading complete")


if __name__ == '__main__':
    main()
