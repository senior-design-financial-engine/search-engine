#!/usr/bin/env python3
"""
WSGI application for Financial News Engine

This file serves as the entry point for the gunicorn WSGI server.
It provides a simple Flask application with health check endpoint and
initializes logging properly.
"""

import os
import sys
import logging
import traceback
from pathlib import Path
from datetime import datetime
import json

# Create log directory
log_dir = '/opt/financial-news-engine/logs'
os.makedirs(log_dir, exist_ok=True)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f"{log_dir}/app.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger("financial-news")
logger.info("Starting Financial News Engine application")

# Import Flask and initialize app
try:
    from flask import Flask, jsonify, request
    from flask_cors import CORS
    from dotenv import load_dotenv
    
    # Load environment variables
    load_dotenv()
    
    # Log environment variables (exclude sensitive ones)
    env_vars = {k: v for k, v in os.environ.items() 
                if k.startswith('ELASTICSEARCH') and not k.endswith('API_KEY')}
    logger.info(f"Environment variables: {json.dumps(env_vars, indent=2)}")
    
    # Initialize Flask app
    app = Flask(__name__)
    CORS(app)
    
    # Health check endpoint
    @app.route('/health', methods=['GET'])
    def health_check():
        es_url = os.getenv('ELASTICSEARCH_URL') or os.getenv('ELASTICSEARCH_ENDPOINT')
        return jsonify({
            'status': 'ok',
            'timestamp': datetime.now().isoformat(),
            'elasticsearch': {
                'configured': bool(es_url),
                'url': es_url.split('@')[-1] if es_url else None  # Hide credentials
            },
            'environment': os.getenv('ENVIRONMENT', 'development')
        })
    
    # Initialize main app by importing from backend
    try:
        # Import your actual application logic here
        logger.info("Attempting to import main backend application logic")
        # Import directly from backend.py not from scraper
        from backend import app as backend_app, backend
        logger.info("Successfully imported backend module")
        
        # Register the backend Flask app routes with this app
        # Copy over the routes from the backend app
        for rule in backend_app.url_map.iter_rules():
            # Skip the health check endpoint we already defined
            if rule.endpoint != 'health_check':
                endpoint = getattr(backend_app.view_functions, rule.endpoint)
                app.add_url_rule(rule.rule, rule.endpoint, endpoint, methods=rule.methods)
                logger.debug(f"Registered route {rule.rule} ({rule.endpoint})")
    except ImportError as e:
        logger.warning(f"Could not import backend module, falling back to basic API: {e}")
        
        # Create a mock API if main logic import fails
        @app.route('/', methods=['GET'])
        def home():
            return jsonify({
                'service': 'Financial News Engine',
                'status': 'API running in limited mode',
                'endpoints': ['/health', '/api/status']
            })
        
        @app.route('/api/status', methods=['GET'])
        def api_status():
            return jsonify({
                'status': 'limited',
                'message': 'API is running in fallback mode with limited functionality',
                'error': str(e)
            })
    
    logger.info("Application initialization complete")
    
except Exception as e:
    logger.critical(f"Fatal error during application initialization: {e}")
    logger.critical(traceback.format_exc())
    
    # Create a minimal Flask app for error reporting
    from flask import Flask, jsonify
    app = Flask(__name__)
    
    @app.route('/', methods=['GET'])
    def error_response():
        return jsonify({
            'status': 'error',
            'message': 'Application failed to initialize properly',
            'error': str(e)
        }), 500

# This is needed for gunicorn to find the app
if __name__ == "__main__":
    logger.info("Starting development server")
    app.run(host='0.0.0.0', port=5000, debug=True) 