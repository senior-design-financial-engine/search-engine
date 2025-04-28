"""
Environment setup utility functions

This module provides functions to verify and populate environment variables
with sensible defaults if they are missing.
"""

import os
import logging
from pathlib import Path
import json

logger = logging.getLogger(__name__)

def setup_environment(force_defaults=False):
    """
    Check and populate environment variables with defaults if empty
    
    Args:
        force_defaults (bool): Force using defaults even if variables exist
    
    Returns:
        dict: Dictionary of environment variables that were populated
    """
    # Define default values for required variables
    defaults = {
        'ELASTICSEARCH_URL': 'http://localhost:9200',
        'ELASTICSEARCH_ENDPOINT': 'http://localhost:9200',
        'ELASTICSEARCH_API_KEY': 'default-dev-key',
        'ELASTICSEARCH_INDEX': 'financial_news',
        'ES_NUMBER_OF_SHARDS': '1',
        'ES_NUMBER_OF_REPLICAS': '0',
        'ENVIRONMENT': 'development',
        'LOG_LEVEL': 'INFO',
        'LOG_FORMAT': 'text',
        'MAX_CONSECUTIVE_DUPLICATES': '1',
    }
    
    # Track which variables were populated
    populated = {}
    
    # Check and populate each variable
    for var_name, default_value in defaults.items():
        current_value = os.environ.get(var_name, '')
        
        # Populate if empty or forced
        if force_defaults or not current_value:
            os.environ[var_name] = default_value
            populated[var_name] = default_value
            logger.info(f"Setting environment variable {var_name} to default value")
    
    # Log summary (excluding sensitive values)
    safe_populated = {k: v for k, v in populated.items() if 'API_KEY' not in k}
    if safe_populated:
        logger.info(f"Populated {len(populated)} missing environment variables: {json.dumps(safe_populated, indent=2)}")
    
    return populated

def create_env_file(output_file=None):
    """
    Create .env file with current environment variables
    
    Args:
        output_file (str): Path to output .env file
    """
    if output_file is None:
        # Default to app directory
        output_file = os.path.join(os.getcwd(), '.env')
    
    # Ensure we have values for all required variables
    setup_environment()
    
    # Variables to include in .env file
    env_vars = [
        'ELASTICSEARCH_URL',
        'ELASTICSEARCH_ENDPOINT',
        'ELASTICSEARCH_API_KEY',
        'ELASTICSEARCH_INDEX',
        'ES_NUMBER_OF_SHARDS',
        'ES_NUMBER_OF_REPLICAS',
        'ENVIRONMENT',
        'LOG_LEVEL',
        'LOG_FORMAT',
        'MAX_CONSECUTIVE_DUPLICATES',
    ]
    
    # Create content for .env file
    content = "# Environment file for Financial News Engine\n"
    for var in env_vars:
        value = os.environ.get(var, '')
        content += f"{var}={value}\n"
    
    # Add CORS configuration
    content += 'CORS_ALLOWED_ORIGINS="https://financialnewsengine.com,https://www.financialnewsengine.com,http://localhost:3000"\n'
    
    # Write to file
    try:
        with open(output_file, 'w') as f:
            f.write(content)
        
        # Make sure file is readable
        Path(output_file).chmod(0o644)
        
        logger.info(f"Successfully created environment file at {output_file}")
        return True
    except Exception as e:
        logger.error(f"Failed to create environment file: {str(e)}")
        return False

if __name__ == '__main__':
    # Setup logging
    logging.basicConfig(level=logging.INFO)
    
    # Run environment setup
    setup_environment()
    
    # Create .env file in current directory
    create_env_file() 