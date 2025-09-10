#!/usr/bin/env python3
"""
ML model training pipeline for Auto-Grade system.
This script handles training, validation, and versioning of ML models
for automatic assignment grading.
"""
import sys
import os
import argparse
import json
import pickle
import joblib
import numpy as np
import pandas as pd
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional, Union
import logging

# ML libraries
from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.svm import SVC
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.pipeline import Pipeline

# NLP libraries
import nltk
from nltk.corpus import stopwords
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize
import spacy

# Deep Learning
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model, load_model, save_model
from tensorflow.keras.layers import Dense, Dropout, LSTM, Embedding, Input, Bidirectional
from tensorflow.keras.preprocessing.text import Tokenizer
from tensorflow.keras.preprocessing.sequence import pad_sequences
from transformers import AutoTokenizer, AutoModel, TFAutoModel

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("ml_training.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("ml_training")

# Ensure NLTK data is downloaded
try:
    nltk.download('punkt', quiet=True)
    nltk.download('stopwords', quiet=True)
    nltk.download('wordnet', quiet=True)
except Exception as e:
    logger.warning(f"Could not download NLTK data: {str(e)}")

# Try loading spaCy model
try:
    nlp = spacy.load('en_core_web_md')
    SPACY_AVAILABLE = True
except Exception:
    logger.warning("spaCy model 'en_core_web_md' not available. Some features will be limited.")
    SPACY_AVAILABLE = False

class DataProcessor:
    """Handles data loading and preprocessing for ML training"""
    
    def __init__(self):
        self.lemmatizer = WordNetLemmatizer()
        self.stop_words = set(stopwords.words('english'))
    
    def load_training_data(self, 
                          assignments_dir: str, 
                          feedback_dir: str = None) -> pd.DataFrame:
        """
        Load training data from nbgrader assignments and feedback directories
        
        Args:
            assignments_dir: Path to nbgrader assignments directory
            feedback_dir: Path to nbgrader feedback directory
            
        Returns:
            DataFrame with questions, answers, and grades
        """
        logger.info(f"Loading training data from {assignments_dir}")
        
        # Placeholder for actual implementation
        # In a real implementation, this would parse Jupyter notebooks
        # and extract questions, sample answers, and grading rubrics
        
        # Dummy data for development
        data = {
            'question_id': [],
            'question_text': [],
            'sample_answer': [],
            'keywords': [],
            'grading_rubric': [],
            'max_score': []
        }
        
        # Walk through the assignments directory
        assignment_path = Path(assignments_dir)
        
        for notebook_file in assignment_path.glob('**/*.ipynb'):
            try:
                with open(notebook_file, 'r', encoding='utf-8') as f:
                    notebook_content = json.load(f)
                
                # Extract cells from notebook
                cells = notebook_content.get('cells', [])
                
                # Process cells to extract questions and answers
                current_question = None
                current_question_id = None
                
                for cell in cells:
                    cell_type = cell.get('cell_type')
                    source = ''.join(cell.get('source', []))
                    
                    # Identify question cells (usually markdown cells with specific metadata)
                    if cell_type == 'markdown' and ('### Question' in source or '## Question' in source):
                        # Extract question ID and text
                        current_question = source
                        # Simple heuristic to extract question ID
                        if 'Question' in source:
                            parts = source.split('Question')
                            if len(parts) > 1:
                                id_part = parts[1].strip().split(' ')[0].replace(':', '').strip()
                                try:
                                    current_question_id = id_part
                                except ValueError:
                                    current_question_id = f"q_{len(data['question_id']) + 1}"
                            else:
                                current_question_id = f"q_{len(data['question_id']) + 1}"
                        else:
                            current_question_id = f"q_{len(data['question_id']) + 1}"
                        
                        data['question_id'].append(current_question_id)
                        data['question_text'].append(current_question)
                        data['sample_answer'].append("")  # Will be filled by answer cells
                        data['keywords'].append([])  # Will extract keywords later
                        data['grading_rubric'].append({})  # Will be filled by rubric cells
                        data['max_score'].append(10)  # Default max score
                    
                    # Identify answer cells (usually cells with solution metadata)
                    elif current_question and 'solution' in str(cell.get('metadata', {})) and cell.get('metadata', {}).get('solution', False):
                        # Extract sample answer
                        sample_answer = source
                        
                        # Update the last added sample answer
                        if data['sample_answer'][-1] == "":
                            data['sample_answer'][-1] = sample_answer
                        else:
                            data['sample_answer'][-1] += "\n\n" + sample_answer
                    
                    # Identify rubric cells (cells with grading metadata)
                    elif current_question and 'rubric' in str(cell.get('metadata', {})):
                        # Extract grading rubric
                        rubric_text = source
                        
                        # Simple parsing of rubric format (customize based on your format)
                        rubric = {}
                        max_score = 10
                        
                        # Example format: "Full credit (10 points): Clear explanation with all steps shown"
                        if 'points' in rubric_text.lower():
                            for line in rubric_text.split('\n'):
                                if 'points' in line.lower():
                                    try:
                                        points = int(''.join(filter(str.isdigit, line.split('points')[0])))
                                        description = line.split(':', 1)[1].strip() if ':' in line else line
                                        rubric[points] = description
                                        max_score = max(max_score, points)
                                    except (ValueError, IndexError):
                                        pass
                        
                        # Update the last added rubric and max score
                        if data['grading_rubric'][-1] == {}:
                            data['grading_rubric'][-1] = rubric
                            data['max_score'][-1] = max_score
            
            except Exception as e:
                logger.error(f"Error processing notebook {notebook_file}: {str(e)}")
        
        # Extract keywords from sample answers
        for i, answer in enumerate(data['sample_answer']):
            data['keywords'][i] = self.extract_keywords(answer)
        
        return pd.DataFrame(data)
    
    def extract_keywords(self, text: str) -> List[str]:
        """
        Extract important keywords from text
        
        Args:
            text: Input text
            
        Returns:
            List of keywords
        """
        if not text:
            return []
        
        # Use spaCy if available for better keyword extraction
        if SPACY_AVAILABLE:
            doc = nlp(text)
            # Extract nouns, proper nouns, and key terms
            keywords = [token.lemma_.lower() for token in doc 
                        if (token.pos_ in ('NOUN', 'PROPN') or token.ent_type_) 
                        and not token.is_stop and len(token.text) > 2]
            return list(set(keywords))
        
        # Fallback to basic NLTK approach
        tokens = word_tokenize(text.lower())
        tokens = [self.lemmatizer.lemmatize(token) for token in tokens 
                  if token.isalnum() and token not in self.stop_words and len(token) > 2]
        return list(set(tokens))
    
    def preprocess_text(self, text: str) -> str:
        """
        Preprocess text for ML model training
        
        Args:
            text: Input text
            
        Returns:
            Preprocessed text
        """
        if not text:
            return ""
        
        # Basic preprocessing
        text = text.lower()
        
        # Use spaCy if available
        if SPACY_AVAILABLE:
            doc = nlp(text)
            # Remove stopwords and punctuation, lemmatize
            processed_text = ' '.join([token.lemma_ for token in doc 
                                       if not token.is_stop and not token.is_punct])
            return processed_text
        
        # Fallback to basic NLTK approach
        tokens = word_tokenize(text)
        tokens = [self.lemmatizer.lemmatize(token.lower()) for token in tokens 
                  if token.isalnum() and token.lower() not in self.stop_words]
        return ' '.join(tokens)
    
    def generate_training_pairs(self, df: pd.DataFrame) -> Tuple[List, List]:
        """
        Generate training pairs (X, y) from the dataset
        
        Args:
            df: DataFrame with questions and answers
            
        Returns:
            Tuple of (X, y) for training
        """
        X = []
        y = []
        
        # For each question, generate positive and negative examples
        for _, row in df.iterrows():
            question = row['question_text']
            correct_answer = row['sample_answer']
            max_score = row['max_score']
            
            # Preprocess
            processed_question = self.preprocess_text(question)
            processed_answer = self.preprocess_text(correct_answer)
            
            # Positive example (correct answer)
            X.append((processed_question, processed_answer))
            y.append(1.0)  # Full score
            
            # Generate synthetic examples with partial credit
            # This is a simple approach - in production you would have real examples
            
            # Partial answer (removing some content)
            if len(correct_answer.split()) > 5:
                words = correct_answer.split()
                partial_answer = ' '.join(words[:len(words)//2])
                processed_partial = self.preprocess_text(partial_answer)
                X.append((processed_question, processed_partial))
                y.append(0.5)  # Half credit
            
            # Wrong answer (using content from a different question)
            other_answers = df[df['question_id'] != row['question_id']]['sample_answer'].tolist()
            if other_answers:
                wrong_answer = np.random.choice(other_answers)
                processed_wrong = self.preprocess_text(wrong_answer)
                X.append((processed_question, processed_wrong))
                y.append(0.0)  # No credit
        
        return X, y


class ModelTrainer:
    """Handles model training and evaluation"""
    
    def __init__(self, model_dir: str):
        """
        Initialize the model trainer
        
        Args:
            model_dir: Directory to save trained models
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.metrics = {}
    
    def train_similarity_model(self, X_train, y_train, X_test, y_test):
        """
        Train a text similarity model
        
        Args:
            X_train: Training data (question, answer) pairs
            y_train: Training labels (scores)
            X_test: Test data
            y_test: Test labels
            
        Returns:
            Trained model
        """
        logger.info("Training similarity model...")
        
        # Extract questions and answers
        questions_train = [x[0] for x in X_train]
        answers_train = [x[1] for x in X_train]
        
        questions_test = [x[0] for x in X_test]
        answers_test = [x[1] for x in X_test]
        
        # Create TF-IDF vectorizer
        vectorizer = TfidfVectorizer(max_features=5000)
        
        # Fit vectorizer on both questions and answers
        all_text = questions_train + answers_train
        vectorizer.fit(all_text)
        
        # Train a simple model that uses cosine similarity
        # This is a basic approach - more sophisticated models would be used in production
        
        # Create a simple pipeline
        pipeline = Pipeline([
            ('vectorizer', vectorizer),
            ('classifier', RandomForestClassifier(n_estimators=100, random_state=42))
        ])
        
        # Prepare features: for each (question, answer) pair, compute:
        # 1. TF-IDF vectors for question and answer
        # 2. Cosine similarity between them
        # 3. Other features like length ratio, etc.
        
        features_train = []
        for q, a in zip(questions_train, answers_train):
            q_vec = vectorizer.transform([q]).toarray()
            a_vec = vectorizer.transform([a]).toarray()
            
            # Cosine similarity
            similarity = cosine_similarity(q_vec, a_vec)[0][0]
            
            # Length-based features
            q_length = len(q.split())
            a_length = len(a.split())
            length_ratio = a_length / max(q_length, 1)
            
            # Combined features
            features_train.append([similarity, length_ratio, a_length])
        
        features_test = []
        for q, a in zip(questions_test, answers_test):
            q_vec = vectorizer.transform([q]).toarray()
            a_vec = vectorizer.transform([a]).toarray()
            
            similarity = cosine_similarity(q_vec, a_vec)[0][0]
            
            q_length = len(q.split())
            a_length = len(a.split())
            length_ratio = a_length / max(q_length, 1)
            
            features_test.append([similarity, length_ratio, a_length])
        
        # Convert to numpy arrays
        features_train = np.array(features_train)
        features_test = np.array(features_test)
        
        # Train model
        model = GradientBoostingClassifier(n_estimators=100, random_state=42)
        model.fit(features_train, y_train)
        
        # Evaluate
        y_pred = model.predict(features_test)
        
        # Calculate metrics
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, average='weighted')
        recall = recall_score(y_test, y_pred, average='weighted')
        f1 = f1_score(y_test, y_pred, average='weighted')
        
        logger.info(f"Model performance: Accuracy={accuracy:.4f}, F1={f1:.4f}")
        
        # Save metrics
        self.metrics = {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1)
        }
        
        # Create a model package
        model_package = {
            'vectorizer': vectorizer,
            'model': model,
            'metrics': self.metrics
        }
        
        return model_package
    
    def train_transformer_model(self, X_train, y_train, X_test, y_test, model_name='bert-base-uncased'):
        """
        Train a transformer-based model for more advanced semantic understanding
        
        Args:
            X_train: Training data
            y_train: Training labels
            X_test: Test data
            y_test: Test labels
            model_name: Name of the pretrained transformer model
            
        Returns:
            Trained model
        """
        logger.info(f"Training transformer model using {model_name}...")
        
        try:
            # Load tokenizer and model
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            
            # Prepare data
            questions_train = [x[0] for x in X_train]
            answers_train = [x[1] for x in X_train]
            
            questions_test = [x[0] for x in X_test]
            answers_test = [x[1] for x in X_test]
            
            # Tokenize inputs
            max_length = 128
            
            def tokenize_pair(questions, answers):
                tokens = tokenizer(
                    questions,
                    answers,
                    padding='max_length',
                    truncation=True,
                    max_length=max_length,
                    return_tensors='tf'
                )
                return tokens
            
            # Tokenize train and test data
            train_tokens = tokenize_pair(questions_train, answers_train)
            test_tokens = tokenize_pair(questions_test, answers_test)
            
            # Convert to TensorFlow datasets
            train_dataset = tf.data.Dataset.from_tensor_slices((
                {
                    'input_ids': train_tokens['input_ids'],
                    'attention_mask': train_tokens['attention_mask'],
                    'token_type_ids': train_tokens.get('token_type_ids', tf.zeros_like(train_tokens['input_ids']))
                },
                y_train
            )).batch(16)
            
            test_dataset = tf.data.Dataset.from_tensor_slices((
                {
                    'input_ids': test_tokens['input_ids'],
                    'attention_mask': test_tokens['attention_mask'],
                    'token_type_ids': test_tokens.get('token_type_ids', tf.zeros_like(test_tokens['input_ids']))
                },
                y_test
            )).batch(16)
            
            # Build model
            input_ids = Input(shape=(max_length,), dtype=tf.int32, name='input_ids')
            attention_mask = Input(shape=(max_length,), dtype=tf.int32, name='attention_mask')
            token_type_ids = Input(shape=(max_length,), dtype=tf.int32, name='token_type_ids')
            
            # Load the transformer model
            transformer_model = TFAutoModel.from_pretrained(model_name)
            
            # Get the output of the transformer model
            outputs = transformer_model({
                'input_ids': input_ids,
                'attention_mask': attention_mask,
                'token_type_ids': token_type_ids
            })
            
            # Use the [CLS] token representation for classification
            cls_output = outputs.last_hidden_state[:, 0, :]
            
            # Add dense layers for classification
            x = Dense(128, activation='relu')(cls_output)
            x = Dropout(0.2)(x)
            outputs = Dense(1, activation='sigmoid')(x)
            
            # Create model
            model = Model(
                inputs=[input_ids, attention_mask, token_type_ids],
                outputs=outputs
            )
            
            # Compile model
            model.compile(
                optimizer=tf.keras.optimizers.Adam(learning_rate=2e-5),
                loss='binary_crossentropy',
                metrics=['accuracy']
            )
            
            # Train model
            history = model.fit(
                train_dataset,
                validation_data=test_dataset,
                epochs=3,
                verbose=1
            )
            
            # Evaluate model
            evaluation = model.evaluate(test_dataset)
            
            # Save metrics
            self.metrics = {
                'accuracy': float(evaluation[1]),
                'loss': float(evaluation[0]),
                'history': {
                    'accuracy': [float(x) for x in history.history['accuracy']],
                    'val_accuracy': [float(x) for x in history.history['val_accuracy']]
                }
            }
            
            logger.info(f"Transformer model performance: Accuracy={evaluation[1]:.4f}")
            
            # Create model package
            model_package = {
                'tokenizer': tokenizer,
                'model': model,
                'metrics': self.metrics
            }
            
            return model_package
            
        except Exception as e:
            logger.error(f"Error training transformer model: {str(e)}")
            return None
    
    def save_model(self, model_package, model_type, version=None):
        """
        Save trained model and metadata
        
        Args:
            model_package: Trained model and associated components
            model_type: Type of model (similarity, nlp, transformer)
            version: Version of the model (if None, will generate)
            
        Returns:
            Path to saved model
        """
        # Generate version if not provided
        if version is None:
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            version = f"v{timestamp}"
        
        # Create model directory
        model_path = self.model_dir / f"{model_type}_{version}"
        model_path.mkdir(parents=True, exist_ok=True)
        
        # Save model components based on type
        if model_type == 'similarity':
            # Save vectorizer
            joblib.dump(model_package['vectorizer'], model_path / 'vectorizer.joblib')
            
            # Save model
            joblib.dump(model_package['model'], model_path / 'model.joblib')
            
        elif model_type == 'transformer':
            # Save tokenizer
            model_package['tokenizer'].save_pretrained(model_path / 'tokenizer')
            
            # Save model
            model_package['model'].save(model_path / 'model')
        
        # Save metrics
        with open(model_path / 'metrics.json', 'w') as f:
            json.dump(model_package['metrics'], f, indent=2)
        
        # Save metadata
        metadata = {
            'model_type': model_type,
            'version': version,
            'created_at': datetime.now().isoformat(),
            'metrics_summary': {
                k: v for k, v in model_package['metrics'].items() 
                if k not in ('history')
            }
        }
        
        with open(model_path / 'metadata.json', 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"Model saved to {model_path}")
        return model_path


class ModelManager:
    """Manages model versioning, selection, and deployment"""
    
    def __init__(self, model_dir):
        """
        Initialize the model manager
        
        Args:
            model_dir: Directory containing trained models
        """
        self.model_dir = Path(model_dir)
        self.active_models = {}
        self.load_active_models()
    
    def load_active_models(self):
        """Load the currently active models of each type"""
        # Find all model directories
        model_dirs = [d for d in self.model_dir.glob('*_v*') if d.is_dir()]
        
        # Group by model type
        model_types = {}
        for model_dir in model_dirs:
            try:
                model_type = model_dir.name.split('_v')[0]
                if model_type not in model_types:
                    model_types[model_type] = []
                
                # Read metadata
                metadata_path = model_dir / 'metadata.json'
                if metadata_path.exists():
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    
                    model_types[model_type].append((model_dir, metadata))
            except Exception as e:
                logger.error(f"Error loading model {model_dir}: {str(e)}")
        
        # Find the latest version of each model type
        for model_type, models in model_types.items():
            if not models:
                continue
            
            # Sort by creation date (newest first)
            sorted_models = sorted(models, key=lambda x: x[1]['created_at'], reverse=True)
            latest_model_dir, latest_metadata = sorted_models[0]
            
            # Load the model
            try:
                model = self.load_model(latest_model_dir, model_type)
                if model:
                    self.active_models[model_type] = {
                        'model': model,
                        'metadata': latest_metadata,
                        'path': latest_model_dir
                    }
                    logger.info(f"Loaded active {model_type} model: {latest_metadata['version']}")
            except Exception as e:
                logger.error(f"Error loading active {model_type} model: {str(e)}")
    
    def load_model(self, model_path, model_type):
        """
        Load a model from disk
        
        Args:
            model_path: Path to model directory
            model_type: Type of model
            
        Returns:
            Loaded model
        """
        try:
            if model_type == 'similarity':
                # Load vectorizer
                vectorizer = joblib.load(model_path / 'vectorizer.joblib')
                
                # Load model
                model = joblib.load(model_path / 'model.joblib')
                
                return {
                    'vectorizer': vectorizer,
                    'model': model
                }
                
            elif model_type == 'transformer':
                # Load tokenizer
                tokenizer = AutoTokenizer.from_pretrained(model_path / 'tokenizer')
                
                # Load model
                model = tf.keras.models.load_model(model_path / 'model')
                
                return {
                    'tokenizer': tokenizer,
                    'model': model
                }
                
            return None
        except Exception as e:
            logger.error(f"Error loading model {model_path}: {str(e)}")
            return None
    
    def get_model(self, model_type):
        """
        Get the active model of a specific type
        
        Args:
            model_type: Type of model
            
        Returns:
            Active model of that type, or None if not found
        """
        return self.active_models.get(model_type, {}).get('model')
    
    def compare_models(self, model_type, limit=5):
        """
        Compare different versions of a model type
        
        Args:
            model_type: Type of model
            limit: Maximum number of models to compare
            
        Returns:
            Comparison results
        """
        # Find all models of the specified type
        model_dirs = [d for d in self.model_dir.glob(f'{model_type}_v*') if d.is_dir()]
        
        if not model_dirs:
            return []
        
        results = []
        for model_dir in model_dirs:
            try:
                # Read metadata
                metadata_path = model_dir / 'metadata.json'
                if metadata_path.exists():
                    with open(metadata_path, 'r') as f:
                        metadata = json.load(f)
                    
                    # Read metrics
                    metrics_path = model_dir / 'metrics.json'
                    if metrics_path.exists():
                        with open(metrics_path, 'r') as f:
                            metrics = json.load(f)
                    else:
                        metrics = {}
                    
                    results.append({
                        'version': metadata['version'],
                        'created_at': metadata['created_at'],
                        'metrics': metrics,
                        'path': str(model_dir)
                    })
            except Exception as e:
                logger.error(f"Error reading model metadata {model_dir}: {str(e)}")
        
        # Sort by creation date (newest first)
        results.sort(key=lambda x: x['created_at'], reverse=True)
        
        # Limit the number of results
        return results[:limit]


def main():
    """Main function to run the ML model training pipeline"""
    parser = argparse.ArgumentParser(description='Train ML models for Auto-Grade system')
    parser.add_argument('--assignments', type=str, default='../storage/nbgrader_assignments',
                        help='Path to nbgrader assignments directory')
    parser.add_argument('--feedback', type=str, default='../storage/nbgrader_feedback',
                        help='Path to nbgrader feedback directory')
    parser.add_argument('--model-dir', type=str, default='../ml/models',
                        help='Path to save trained models')
    parser.add_argument('--model-type', type=str, choices=['similarity', 'transformer', 'all'],
                        default='all', help='Type of model to train')
    args = parser.parse_args()
    
    logger.info("Starting ML model training pipeline")
    
    # Initialize components
    data_processor = DataProcessor()
    model_trainer = ModelTrainer(args.model_dir)
    
    # Load training data
    df = data_processor.load_training_data(args.assignments, args.feedback)
    logger.info(f"Loaded {len(df)} questions for training")
    
    if len(df) == 0:
        logger.error("No training data found. Exiting.")
        sys.exit(1)
    
    # Generate training pairs
    X, y = data_processor.generate_training_pairs(df)
    logger.info(f"Generated {len(X)} training pairs")
    
    # Split into train and test sets
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Train models based on specified type
    if args.model_type in ['similarity', 'all']:
        try:
            similarity_model = model_trainer.train_similarity_model(X_train, y_train, X_test, y_test)
            model_trainer.save_model(similarity_model, 'similarity')
        except Exception as e:
            logger.error(f"Error training similarity model: {str(e)}")
    
    if args.model_type in ['transformer', 'all']:
        try:
            transformer_model = model_trainer.train_transformer_model(X_train, y_train, X_test, y_test)
            if transformer_model:
                model_trainer.save_model(transformer_model, 'transformer')
        except Exception as e:
            logger.error(f"Error training transformer model: {str(e)}")
    
    logger.info("ML model training complete")


if __name__ == '__main__':
    main()
