#!/usr/bin/env python3
"""
Helper script to run the Financial News Engine application

This script provides a simple way to run the application with proper
environment setup, either directly or through gunicorn.
"""

import os
import sys
import logging
import argparse
import subprocess
from pathlib import Path

# Set up basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("run_app")

def ensure_directories():
    """Ensure required directories exist"""
    directories = [
        "logs",
        "utils",
        "deploy_scripts"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        logger.info(f"Ensured directory exists: {directory}")

def populate_environment():
    """Populate environment variables with defaults if needed"""
    try:
        # Try to import our environment setup utility
        sys.path.append(os.getcwd())
        from utils.env_setup import setup_environment, create_env_file
        
        # Set up environment
        populated = setup_environment()
        
        # Create .env file if it doesn't exist
        if not os.path.exists('.env'):
            create_env_file()
        
        return True
    except ImportError:
        logger.warning("Could not import environment setup utility, using basic setup")
        
        # Basic environment setup
        defaults = {
            'ELASTICSEARCH_URL': 'http://localhost:9200',
            'ELASTICSEARCH_ENDPOINT': 'http://localhost:9200',
            'ELASTICSEARCH_INDEX': 'financial_news',
            'ENVIRONMENT': 'development',
        }
        
        for var, default in defaults.items():
            if not os.environ.get(var):
                os.environ[var] = default
                logger.info(f"Set {var}={default}")
        
        return True

def run_app(use_gunicorn=False, host="0.0.0.0", port=5000, workers=1):
    """Run the application"""
    logger.info(f"Starting application (gunicorn={use_gunicorn})")
    
    if use_gunicorn:
        # Check if gunicorn is available
        try:
            # Run gunicorn
            cmd = [
                sys.executable, "-m", "gunicorn",
                "--bind", f"{host}:{port}",
                "--workers", str(workers),
                "--timeout", "120",
                "--log-level", "debug",
                "app:app"
            ]
            
            logger.info(f"Running command: {' '.join(cmd)}")
            subprocess.run(cmd, check=True)
            return True
        except (subprocess.SubprocessError, FileNotFoundError) as e:
            logger.error(f"Failed to run with gunicorn: {e}")
            logger.info("Falling back to direct execution")
    
    # Direct execution
    try:
        # Import app from app.py
        sys.path.append(os.getcwd())
        from app import app
        
        # Run with built-in server
        logger.info(f"Running Flask app directly on {host}:{port}")
        app.run(host=host, port=port, debug=True)
        return True
    except Exception as e:
        logger.error(f"Failed to run application: {e}")
        return False

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description="Run Financial News Engine application")
    parser.add_argument("--gunicorn", action="store_true", help="Use gunicorn to run the app")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=5000, help="Port to bind to")
    parser.add_argument("--workers", type=int, default=1, help="Number of gunicorn workers")
    args = parser.parse_args()
    
    # Ensure required directories
    ensure_directories()
    
    # Set up environment
    populate_environment()
    
    # Run the app
    run_app(
        use_gunicorn=args.gunicorn,
        host=args.host,
        port=args.port,
        workers=args.workers
    )

if __name__ == "__main__":
    main() 