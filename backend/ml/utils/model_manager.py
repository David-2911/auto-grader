#!/usr/bin/env python3
"""
Model version management system for Auto-Grade.
This script manages model versions, tracks performance metrics, and handles A/B testing.
"""
import sys
import os
import json
import argparse
import shutil
from pathlib import Path
from datetime import datetime
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("model_management.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("model_management")

class ModelVersion:
    """Represents a model version with associated metadata"""
    
    def __init__(self, 
                model_path: Path, 
                model_type: str, 
                version: str = None):
        """
        Initialize a model version
        
        Args:
            model_path: Path to model directory
            model_type: Type of model (similarity, transformer, etc.)
            version: Version string (if None, will be extracted from path)
        """
        self.model_path = Path(model_path)
        self.model_type = model_type
        
        # Extract version from path if not provided
        if version is None:
            version_part = model_path.name.split(f"{model_type}_")[-1]
            self.version = version_part
        else:
            self.version = version
        
        self.metadata = {}
        self.metrics = {}
        self.loaded = False
        
        # Load metadata if available
        metadata_path = self.model_path / 'metadata.json'
        if metadata_path.exists():
            try:
                with open(metadata_path, 'r') as f:
                    self.metadata = json.load(f)
                self.loaded = True
            except Exception as e:
                logger.error(f"Error loading metadata for {self.model_path}: {str(e)}")
        
        # Load metrics if available
        metrics_path = self.model_path / 'metrics.json'
        if metrics_path.exists():
            try:
                with open(metrics_path, 'r') as f:
                    self.metrics = json.load(f)
            except Exception as e:
                logger.error(f"Error loading metrics for {self.model_path}: {str(e)}")
    
    def get_creation_date(self) -> datetime:
        """Get the creation date of the model"""
        if 'created_at' in self.metadata:
            try:
                return datetime.fromisoformat(self.metadata['created_at'])
            except (ValueError, TypeError):
                pass
        
        # Fallback to file creation time
        stats = self.model_path.stat()
        return datetime.fromtimestamp(stats.st_ctime)
    
    def get_accuracy(self) -> float:
        """Get the accuracy of the model"""
        if 'metrics' in self.metadata:
            return self.metadata['metrics'].get('accuracy', 0.0)
        elif 'accuracy' in self.metrics:
            return self.metrics.get('accuracy', 0.0)
        return 0.0
    
    def get_f1_score(self) -> float:
        """Get the F1 score of the model"""
        if 'metrics' in self.metadata:
            return self.metadata['metrics'].get('f1_score', 0.0)
        elif 'f1_score' in self.metrics:
            return self.metrics.get('f1_score', 0.0)
        return 0.0
    
    def to_dict(self) -> Dict:
        """Convert model version to dictionary"""
        return {
            'model_type': self.model_type,
            'version': self.version,
            'path': str(self.model_path),
            'created_at': self.metadata.get('created_at', ''),
            'metrics': self.metrics,
            'metadata': self.metadata
        }


class ModelManager:
    """Manages model versions and performance tracking"""
    
    def __init__(self, model_dir: str):
        """
        Initialize the model manager
        
        Args:
            model_dir: Directory containing model versions
        """
        self.model_dir = Path(model_dir)
        self.model_versions = {}
        self.active_versions = {}
        self.load_model_versions()
    
    def load_model_versions(self):
        """Load model versions from model directory"""
        logger.info(f"Loading model versions from {self.model_dir}")
        
        # Reset model versions
        self.model_versions = {}
        
        # Find all model directories
        model_dirs = [d for d in self.model_dir.glob('*_v*') if d.is_dir()]
        
        # Group by model type
        for model_dir in model_dirs:
            try:
                # Extract model type from directory name
                model_type = model_dir.name.split('_v')[0]
                
                # Create model version object
                model_version = ModelVersion(model_dir, model_type)
                
                if not model_version.loaded:
                    logger.warning(f"Skipping {model_dir} - metadata not found")
                    continue
                
                # Add to model versions
                if model_type not in self.model_versions:
                    self.model_versions[model_type] = []
                
                self.model_versions[model_type].append(model_version)
                
            except Exception as e:
                logger.error(f"Error loading model version {model_dir}: {str(e)}")
        
        # Sort model versions by creation date (newest first)
        for model_type in self.model_versions:
            self.model_versions[model_type].sort(
                key=lambda v: v.get_creation_date(), 
                reverse=True
            )
        
        # Determine active versions
        self.determine_active_versions()
        
        logger.info(f"Loaded {sum(len(versions) for versions in self.model_versions.values())} model versions")
    
    def determine_active_versions(self):
        """Determine active model versions from active markers"""
        self.active_versions = {}
        
        # Check for active version marker
        active_path = self.model_dir / 'active_versions.json'
        if active_path.exists():
            try:
                with open(active_path, 'r') as f:
                    active_data = json.load(f)
                
                for model_type, version in active_data.items():
                    versions = self.model_versions.get(model_type, [])
                    for v in versions:
                        if v.version == version:
                            self.active_versions[model_type] = v
                            break
            except Exception as e:
                logger.error(f"Error loading active versions: {str(e)}")
        
        # If no active version specified, use the newest version
        for model_type, versions in self.model_versions.items():
            if model_type not in self.active_versions and versions:
                self.active_versions[model_type] = versions[0]
    
    def set_active_version(self, model_type: str, version: str):
        """
        Set the active version for a model type
        
        Args:
            model_type: Type of model
            version: Version string
        
        Returns:
            bool: Whether the operation was successful
        """
        # Check if model type exists
        if model_type not in self.model_versions:
            logger.error(f"Model type {model_type} not found")
            return False
        
        # Find the specified version
        for v in self.model_versions[model_type]:
            if v.version == version:
                # Set as active version
                self.active_versions[model_type] = v
                
                # Update active version marker
                active_data = {}
                active_path = self.model_dir / 'active_versions.json'
                
                if active_path.exists():
                    try:
                        with open(active_path, 'r') as f:
                            active_data = json.load(f)
                    except Exception:
                        pass
                
                active_data[model_type] = version
                
                with open(active_path, 'w') as f:
                    json.dump(active_data, f, indent=2)
                
                logger.info(f"Set active version for {model_type} to {version}")
                return True
        
        logger.error(f"Version {version} not found for model type {model_type}")
        return False
    
    def get_active_version(self, model_type: str) -> Optional[ModelVersion]:
        """
        Get the active version for a model type
        
        Args:
            model_type: Type of model
            
        Returns:
            ModelVersion or None
        """
        return self.active_versions.get(model_type)
    
    def list_versions(self, model_type: str = None) -> List[Dict]:
        """
        List model versions
        
        Args:
            model_type: Type of model (if None, list all)
            
        Returns:
            List of model version dictionaries
        """
        result = []
        
        if model_type:
            # List versions for specific model type
            versions = self.model_versions.get(model_type, [])
            active_version = self.active_versions.get(model_type)
            
            for v in versions:
                version_dict = v.to_dict()
                version_dict['is_active'] = (active_version == v)
                result.append(version_dict)
        else:
            # List all versions
            for model_type, versions in self.model_versions.items():
                active_version = self.active_versions.get(model_type)
                
                for v in versions:
                    version_dict = v.to_dict()
                    version_dict['is_active'] = (active_version == v)
                    result.append(version_dict)
        
        return result
    
    def delete_version(self, model_type: str, version: str) -> bool:
        """
        Delete a model version
        
        Args:
            model_type: Type of model
            version: Version string
            
        Returns:
            bool: Whether the operation was successful
        """
        # Check if model type exists
        if model_type not in self.model_versions:
            logger.error(f"Model type {model_type} not found")
            return False
        
        # Find the specified version
        for i, v in enumerate(self.model_versions[model_type]):
            if v.version == version:
                # Check if it's the active version
                active_version = self.active_versions.get(model_type)
                if active_version and active_version.version == version:
                    logger.error(f"Cannot delete active version {version}")
                    return False
                
                # Delete model directory
                try:
                    shutil.rmtree(v.model_path)
                    
                    # Remove from model versions
                    del self.model_versions[model_type][i]
                    
                    logger.info(f"Deleted version {version} for model type {model_type}")
                    return True
                except Exception as e:
                    logger.error(f"Error deleting version {version}: {str(e)}")
                    return False
        
        logger.error(f"Version {version} not found for model type {model_type}")
        return False
    
    def get_model_performance_history(self, model_type: str) -> List[Dict]:
        """
        Get performance history for a model type
        
        Args:
            model_type: Type of model
            
        Returns:
            List of performance data points
        """
        if model_type not in self.model_versions:
            return []
        
        history = []
        
        for v in sorted(self.model_versions[model_type], key=lambda v: v.get_creation_date()):
            if not v.metrics:
                continue
            
            data_point = {
                'version': v.version,
                'created_at': v.metadata.get('created_at', ''),
                'accuracy': v.get_accuracy(),
                'f1_score': v.get_f1_score()
            }
            
            history.append(data_point)
        
        return history
    
    def compare_versions(self, model_type: str, version1: str, version2: str) -> Dict:
        """
        Compare two model versions
        
        Args:
            model_type: Type of model
            version1: First version string
            version2: Second version string
            
        Returns:
            Comparison results
        """
        if model_type not in self.model_versions:
            return {'error': f"Model type {model_type} not found"}
        
        # Find the versions
        v1 = None
        v2 = None
        
        for v in self.model_versions[model_type]:
            if v.version == version1:
                v1 = v
            elif v.version == version2:
                v2 = v
        
        if not v1:
            return {'error': f"Version {version1} not found"}
        
        if not v2:
            return {'error': f"Version {version2} not found"}
        
        # Compare metrics
        comparison = {
            'version1': v1.to_dict(),
            'version2': v2.to_dict(),
            'differences': {}
        }
        
        # Compare accuracy
        acc1 = v1.get_accuracy()
        acc2 = v2.get_accuracy()
        comparison['differences']['accuracy'] = {
            'version1': acc1,
            'version2': acc2,
            'difference': acc2 - acc1,
            'percent_change': (acc2 - acc1) / acc1 * 100 if acc1 > 0 else float('inf')
        }
        
        # Compare F1 score
        f1_1 = v1.get_f1_score()
        f1_2 = v2.get_f1_score()
        comparison['differences']['f1_score'] = {
            'version1': f1_1,
            'version2': f1_2,
            'difference': f1_2 - f1_1,
            'percent_change': (f1_2 - f1_1) / f1_1 * 100 if f1_1 > 0 else float('inf')
        }
        
        return comparison
    
    def register_external_model(self, 
                              model_path: Path, 
                              model_type: str,
                              metadata: Dict) -> Optional[ModelVersion]:
        """
        Register an external model
        
        Args:
            model_path: Path to model directory
            model_type: Type of model
            metadata: Model metadata
            
        Returns:
            ModelVersion or None
        """
        try:
            # Generate version string
            timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
            version = f"v{timestamp}"
            
            # Create target directory
            target_dir = self.model_dir / f"{model_type}_{version}"
            target_dir.mkdir(parents=True, exist_ok=True)
            
            # Copy model files
            if model_path.is_dir():
                # Copy directory contents
                for item in model_path.glob('*'):
                    if item.is_dir():
                        shutil.copytree(item, target_dir / item.name)
                    else:
                        shutil.copy2(item, target_dir / item.name)
            else:
                # Copy single file
                shutil.copy2(model_path, target_dir / model_path.name)
            
            # Create metadata file
            metadata['model_type'] = model_type
            metadata['version'] = version
            metadata['created_at'] = datetime.now().isoformat()
            
            with open(target_dir / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)
            
            # Create model version object
            model_version = ModelVersion(target_dir, model_type, version)
            
            # Add to model versions
            if model_type not in self.model_versions:
                self.model_versions[model_type] = []
            
            self.model_versions[model_type].append(model_version)
            
            # Sort by creation date
            self.model_versions[model_type].sort(
                key=lambda v: v.get_creation_date(),
                reverse=True
            )
            
            logger.info(f"Registered external model as {model_type} {version}")
            return model_version
            
        except Exception as e:
            logger.error(f"Error registering external model: {str(e)}")
            return None


class ABTestManager:
    """Manages A/B testing of model versions"""
    
    def __init__(self, model_manager: ModelManager):
        """
        Initialize the A/B test manager
        
        Args:
            model_manager: Model manager
        """
        self.model_manager = model_manager
        self.tests = {}
        self.load_tests()
    
    def load_tests(self):
        """Load A/B tests from storage"""
        test_path = self.model_manager.model_dir / 'ab_tests.json'
        if test_path.exists():
            try:
                with open(test_path, 'r') as f:
                    self.tests = json.load(f)
            except Exception as e:
                logger.error(f"Error loading A/B tests: {str(e)}")
    
    def save_tests(self):
        """Save A/B tests to storage"""
        test_path = self.model_manager.model_dir / 'ab_tests.json'
        try:
            with open(test_path, 'w') as f:
                json.dump(self.tests, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving A/B tests: {str(e)}")
    
    def create_test(self, 
                  test_name: str,
                  model_type: str,
                  version_a: str,
                  version_b: str,
                  traffic_split: float = 0.5,
                  metrics: List[str] = None) -> Dict:
        """
        Create a new A/B test
        
        Args:
            test_name: Name of the test
            model_type: Type of model
            version_a: First version string
            version_b: Second version string
            traffic_split: Percentage of traffic for version A (0-1)
            metrics: List of metrics to track
            
        Returns:
            Test configuration
        """
        # Validate model type and versions
        if model_type not in self.model_manager.model_versions:
            return {'error': f"Model type {model_type} not found"}
        
        version_a_found = False
        version_b_found = False
        
        for v in self.model_manager.model_versions[model_type]:
            if v.version == version_a:
                version_a_found = True
            elif v.version == version_b:
                version_b_found = True
        
        if not version_a_found:
            return {'error': f"Version {version_a} not found"}
        
        if not version_b_found:
            return {'error': f"Version {version_b} not found"}
        
        # Create test configuration
        test_id = f"test_{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        if not metrics:
            metrics = ['accuracy', 'f1_score']
        
        test_config = {
            'id': test_id,
            'name': test_name,
            'model_type': model_type,
            'version_a': version_a,
            'version_b': version_b,
            'traffic_split': traffic_split,
            'metrics': metrics,
            'start_date': datetime.now().isoformat(),
            'end_date': None,
            'status': 'running',
            'results': {
                'version_a': {
                    'samples': 0,
                    'metrics': {}
                },
                'version_b': {
                    'samples': 0,
                    'metrics': {}
                }
            }
        }
        
        # Add to tests
        self.tests[test_id] = test_config
        self.save_tests()
        
        logger.info(f"Created A/B test {test_name} ({test_id})")
        return test_config
    
    def get_test(self, test_id: str) -> Dict:
        """
        Get A/B test configuration
        
        Args:
            test_id: Test ID
            
        Returns:
            Test configuration
        """
        return self.tests.get(test_id, {'error': f"Test {test_id} not found"})
    
    def list_tests(self, status: str = None) -> List[Dict]:
        """
        List A/B tests
        
        Args:
            status: Filter by status (running, completed, etc.)
            
        Returns:
            List of test configurations
        """
        if status:
            return [test for test in self.tests.values() if test.get('status') == status]
        return list(self.tests.values())
    
    def update_test_metrics(self, 
                          test_id: str, 
                          version: str, 
                          metrics: Dict,
                          sample_count: int = 1) -> bool:
        """
        Update metrics for an A/B test
        
        Args:
            test_id: Test ID
            version: Version string
            metrics: Metrics dictionary
            sample_count: Number of samples
            
        Returns:
            Whether the operation was successful
        """
        if test_id not in self.tests:
            logger.error(f"Test {test_id} not found")
            return False
        
        test = self.tests[test_id]
        
        # Check if test is running
        if test['status'] != 'running':
            logger.error(f"Test {test_id} is not running")
            return False
        
        # Check which version this is
        if version == test['version_a']:
            version_key = 'version_a'
        elif version == test['version_b']:
            version_key = 'version_b'
        else:
            logger.error(f"Version {version} not part of test {test_id}")
            return False
        
        # Update metrics
        results = test['results'][version_key]
        results['samples'] += sample_count
        
        for metric, value in metrics.items():
            if metric not in results['metrics']:
                results['metrics'][metric] = {
                    'sum': 0,
                    'sum_squared': 0,
                    'count': 0
                }
            
            # Update running statistics
            m = results['metrics'][metric]
            m['sum'] += value * sample_count
            m['sum_squared'] += value * value * sample_count
            m['count'] += sample_count
        
        self.save_tests()
        return True
    
    def end_test(self, test_id: str) -> Dict:
        """
        End an A/B test
        
        Args:
            test_id: Test ID
            
        Returns:
            Test results
        """
        if test_id not in self.tests:
            return {'error': f"Test {test_id} not found"}
        
        test = self.tests[test_id]
        
        # Check if test is running
        if test['status'] != 'running':
            return {'error': f"Test {test_id} is not running"}
        
        # Calculate final metrics
        version_a_metrics = {}
        version_b_metrics = {}
        
        for metric, data in test['results']['version_a']['metrics'].items():
            if data['count'] > 0:
                mean = data['sum'] / data['count']
                # Calculate standard deviation
                variance = (data['sum_squared'] / data['count']) - (mean * mean)
                std_dev = np.sqrt(max(0, variance))
                
                version_a_metrics[metric] = {
                    'mean': mean,
                    'std_dev': std_dev
                }
        
        for metric, data in test['results']['version_b']['metrics'].items():
            if data['count'] > 0:
                mean = data['sum'] / data['count']
                # Calculate standard deviation
                variance = (data['sum_squared'] / data['count']) - (mean * mean)
                std_dev = np.sqrt(max(0, variance))
                
                version_b_metrics[metric] = {
                    'mean': mean,
                    'std_dev': std_dev
                }
        
        # Determine winner
        winner = None
        comparisons = {}
        
        for metric in test['metrics']:
            if metric in version_a_metrics and metric in version_b_metrics:
                mean_a = version_a_metrics[metric]['mean']
                mean_b = version_b_metrics[metric]['mean']
                
                comparisons[metric] = {
                    'version_a': mean_a,
                    'version_b': mean_b,
                    'difference': mean_b - mean_a,
                    'percent_change': (mean_b - mean_a) / mean_a * 100 if mean_a > 0 else float('inf')
                }
        
        # Simple winner determination - use the first metric
        if test['metrics']:
            primary_metric = test['metrics'][0]
            if primary_metric in comparisons:
                if comparisons[primary_metric]['percent_change'] > 5:  # 5% improvement threshold
                    winner = 'version_b'
                elif comparisons[primary_metric]['percent_change'] < -5:  # 5% degradation threshold
                    winner = 'version_a'
        
        # Update test status
        test['status'] = 'completed'
        test['end_date'] = datetime.now().isoformat()
        test['final_metrics'] = {
            'version_a': version_a_metrics,
            'version_b': version_b_metrics,
            'comparisons': comparisons,
            'winner': winner
        }
        
        self.save_tests()
        
        logger.info(f"Ended A/B test {test['name']} ({test_id})")
        return test
    
    def get_test_results(self, test_id: str) -> Dict:
        """
        Get results of an A/B test
        
        Args:
            test_id: Test ID
            
        Returns:
            Test results
        """
        if test_id not in self.tests:
            return {'error': f"Test {test_id} not found"}
        
        test = self.tests[test_id]
        
        # If test is completed, return final metrics
        if test['status'] == 'completed' and 'final_metrics' in test:
            return {
                'id': test['id'],
                'name': test['name'],
                'status': test['status'],
                'start_date': test['start_date'],
                'end_date': test['end_date'],
                'model_type': test['model_type'],
                'version_a': test['version_a'],
                'version_b': test['version_b'],
                'metrics': test['final_metrics']
            }
        
        # If test is running, calculate current metrics
        version_a_metrics = {}
        version_b_metrics = {}
        
        for metric, data in test['results']['version_a']['metrics'].items():
            if data['count'] > 0:
                mean = data['sum'] / data['count']
                # Calculate standard deviation
                variance = (data['sum_squared'] / data['count']) - (mean * mean)
                std_dev = np.sqrt(max(0, variance))
                
                version_a_metrics[metric] = {
                    'mean': mean,
                    'std_dev': std_dev
                }
        
        for metric, data in test['results']['version_b']['metrics'].items():
            if data['count'] > 0:
                mean = data['sum'] / data['count']
                # Calculate standard deviation
                variance = (data['sum_squared'] / data['count']) - (mean * mean)
                std_dev = np.sqrt(max(0, variance))
                
                version_b_metrics[metric] = {
                    'mean': mean,
                    'std_dev': std_dev
                }
        
        return {
            'id': test['id'],
            'name': test['name'],
            'status': test['status'],
            'start_date': test['start_date'],
            'model_type': test['model_type'],
            'version_a': test['version_a'],
            'version_b': test['version_b'],
            'metrics': {
                'version_a': version_a_metrics,
                'version_b': version_b_metrics,
                'samples': {
                    'version_a': test['results']['version_a']['samples'],
                    'version_b': test['results']['version_b']['samples']
                }
            }
        }
    
    def promote_winner(self, test_id: str) -> bool:
        """
        Promote the winner of an A/B test
        
        Args:
            test_id: Test ID
            
        Returns:
            Whether the operation was successful
        """
        if test_id not in self.tests:
            logger.error(f"Test {test_id} not found")
            return False
        
        test = self.tests[test_id]
        
        # Check if test is completed
        if test['status'] != 'completed':
            logger.error(f"Test {test_id} is not completed")
            return False
        
        # Check if there's a winner
        winner = test.get('final_metrics', {}).get('winner')
        if not winner:
            logger.error(f"Test {test_id} has no clear winner")
            return False
        
        # Determine which version to promote
        version = test['version_a'] if winner == 'version_a' else test['version_b']
        
        # Set as active version
        success = self.model_manager.set_active_version(test['model_type'], version)
        
        if success:
            logger.info(f"Promoted {version} to active version for {test['model_type']}")
        
        return success


def main():
    """Main function for the model management system"""
    parser = argparse.ArgumentParser(description='Manage ML model versions')
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # List command
    list_parser = subparsers.add_parser('list', help='List model versions')
    list_parser.add_argument('--model-type', type=str, help='Type of model')
    
    # Set active command
    active_parser = subparsers.add_parser('set-active', help='Set active model version')
    active_parser.add_argument('--model-type', type=str, required=True, help='Type of model')
    active_parser.add_argument('--version', type=str, required=True, help='Version string')
    
    # Compare command
    compare_parser = subparsers.add_parser('compare', help='Compare model versions')
    compare_parser.add_argument('--model-type', type=str, required=True, help='Type of model')
    compare_parser.add_argument('--version1', type=str, required=True, help='First version string')
    compare_parser.add_argument('--version2', type=str, required=True, help='Second version string')
    
    # Delete command
    delete_parser = subparsers.add_parser('delete', help='Delete model version')
    delete_parser.add_argument('--model-type', type=str, required=True, help='Type of model')
    delete_parser.add_argument('--version', type=str, required=True, help='Version string')
    
    # Register command
    register_parser = subparsers.add_parser('register', help='Register external model')
    register_parser.add_argument('--model-path', type=str, required=True, help='Path to model directory')
    register_parser.add_argument('--model-type', type=str, required=True, help='Type of model')
    register_parser.add_argument('--name', type=str, required=True, help='Model name')
    register_parser.add_argument('--description', type=str, help='Model description')
    
    # A/B test commands
    ab_parser = subparsers.add_parser('ab-test', help='A/B testing operations')
    ab_subparsers = ab_parser.add_subparsers(dest='ab_command', help='A/B test command')
    
    # Create A/B test
    ab_create_parser = ab_subparsers.add_parser('create', help='Create A/B test')
    ab_create_parser.add_argument('--name', type=str, required=True, help='Test name')
    ab_create_parser.add_argument('--model-type', type=str, required=True, help='Type of model')
    ab_create_parser.add_argument('--version-a', type=str, required=True, help='First version string')
    ab_create_parser.add_argument('--version-b', type=str, required=True, help='Second version string')
    ab_create_parser.add_argument('--traffic-split', type=float, default=0.5, help='Traffic split (0-1)')
    
    # List A/B tests
    ab_list_parser = ab_subparsers.add_parser('list', help='List A/B tests')
    ab_list_parser.add_argument('--status', type=str, choices=['running', 'completed'], help='Filter by status')
    
    # Get A/B test
    ab_get_parser = ab_subparsers.add_parser('get', help='Get A/B test')
    ab_get_parser.add_argument('--id', type=str, required=True, help='Test ID')
    
    # End A/B test
    ab_end_parser = ab_subparsers.add_parser('end', help='End A/B test')
    ab_end_parser.add_argument('--id', type=str, required=True, help='Test ID')
    
    # Promote A/B test winner
    ab_promote_parser = ab_subparsers.add_parser('promote', help='Promote A/B test winner')
    ab_promote_parser.add_argument('--id', type=str, required=True, help='Test ID')
    
    # Global arguments
    parser.add_argument('--model-dir', type=str, default='../ml/models',
                        help='Path to model directory')
    
    args = parser.parse_args()
    
    # Initialize model manager
    model_manager = ModelManager(args.model_dir)
    
    # Execute command
    if args.command == 'list':
        versions = model_manager.list_versions(args.model_type)
        print(json.dumps(versions, indent=2))
    
    elif args.command == 'set-active':
        success = model_manager.set_active_version(args.model_type, args.version)
        if success:
            print(f"Set active version for {args.model_type} to {args.version}")
        else:
            print(f"Failed to set active version")
    
    elif args.command == 'compare':
        comparison = model_manager.compare_versions(args.model_type, args.version1, args.version2)
        print(json.dumps(comparison, indent=2))
    
    elif args.command == 'delete':
        success = model_manager.delete_version(args.model_type, args.version)
        if success:
            print(f"Deleted version {args.version} for model type {args.model_type}")
        else:
            print(f"Failed to delete version")
    
    elif args.command == 'register':
        metadata = {
            'name': args.name,
            'description': args.description or f"Registered model for {args.model_type}"
        }
        model_version = model_manager.register_external_model(
            Path(args.model_path),
            args.model_type,
            metadata
        )
        if model_version:
            print(f"Registered model as {args.model_type} {model_version.version}")
        else:
            print(f"Failed to register model")
    
    elif args.command == 'ab-test':
        ab_manager = ABTestManager(model_manager)
        
        if args.ab_command == 'create':
            test = ab_manager.create_test(
                args.name,
                args.model_type,
                args.version_a,
                args.version_b,
                args.traffic_split
            )
            print(json.dumps(test, indent=2))
        
        elif args.ab_command == 'list':
            tests = ab_manager.list_tests(args.status)
            print(json.dumps(tests, indent=2))
        
        elif args.ab_command == 'get':
            test = ab_manager.get_test_results(args.id)
            print(json.dumps(test, indent=2))
        
        elif args.ab_command == 'end':
            test = ab_manager.end_test(args.id)
            print(json.dumps(test, indent=2))
        
        elif args.ab_command == 'promote':
            success = ab_manager.promote_winner(args.id)
            if success:
                print(f"Promoted winner of test {args.id}")
            else:
                print(f"Failed to promote winner")
    
    else:
        parser.print_help()


if __name__ == '__main__':
    main()
