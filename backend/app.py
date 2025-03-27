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

# Add current directory to Python path to ensure local modules can be imported
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

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
logger.info(f"Python path: {sys.path}")

# Set up custom logger if available, otherwise use the default logger
try:
    from utils.logger import get_logger, setup_request_logging, setup_debug_endpoints, performance_monitor
    logger.info("Successfully imported custom logger from utils.logger")
except ImportError as e:
    logger.warning(f"Could not import custom logger: {str(e)}. Using default logger.")
    # Define fallback functions if logger module is not available
    def get_logger(name):
        return logging.getLogger(name)
    
    def setup_request_logging(app):
        logger.info("Using fallback request logging setup")
        return app
    
    def setup_debug_endpoints(app):
        logger.info("Using fallback debug endpoints setup")
        return app
    
    def performance_monitor(func):
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper

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
    
    # Set up request logging if available
    app = setup_request_logging(app)
    
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
            'environment': os.getenv('ENVIRONMENT', 'development'),
            'region': os.getenv('AWS_REGION', 'undefined'),
            'version': os.getenv('APP_VERSION', '1.0.0')
        })
    
    # Initialize main app by importing backend directly
    try:
        # Import your actual application logic here
        logger.info("Attempting to import main backend application logic")
        
        # Try both import methods to support different deployment structures
        try:
            # Import directly from backend.py - no scraper imports
            import backend
            from backend import app as backend_app
            logger.info("Successfully imported backend module as package")
        except ImportError:
            # Try relative import from the current directory
            logger.info("Trying direct module import")
            from app import backend_app
            logger.info("Successfully imported backend_app directly")
        
        # Register the backend Flask app routes with this app
        # Copy over the routes from the backend app, excluding routes we've already defined
        registered_routes = 0
        for rule in backend_app.url_map.iter_rules():
            # Skip the health check endpoint we already defined
            if rule.endpoint != 'health_check':
                # Get the view function from the backend app
                view_func = backend_app.view_functions.get(rule.endpoint)
                if view_func:
                    app.add_url_rule(rule.rule, rule.endpoint, view_func, methods=rule.methods)
                    registered_routes += 1
                    logger.debug(f"Registered route {rule.rule} ({rule.endpoint})")
        
        logger.info(f"Successfully registered {registered_routes} routes from the backend module")
        
    except ImportError as e:
        error_trace = traceback.format_exc()
        logger.warning(f"Could not import backend module, falling back to basic API: {str(e)}")
        logger.debug(f"Import error traceback: {error_trace}")
        
        # Create a mock API if main logic import fails
        @app.route('/', methods=['GET'])
        def home():
            return jsonify({
                'service': 'Financial News Engine',
                'status': 'API running in limited mode',
                'error': str(e),
                'endpoints': ['/health', '/api/status']
            })
        
        @app.route('/api/status', methods=['GET'])
        def api_status():
            return jsonify({
                'status': 'limited',
                'message': 'API is running in fallback mode with limited functionality',
                'error': str(e),
                'error_type': type(e).__name__,
                'timestamp': datetime.now().isoformat()
            })
    
    # Set up debug endpoints if in development mode
    if os.getenv('ENVIRONMENT', 'development') == 'development':
        app = setup_debug_endpoints(app)
    
    logger.info("Application initialization complete")
    
except Exception as e:
    error_trace = traceback.format_exc()
    logger.critical(f"Fatal error during application initialization: {str(e)}")
    logger.critical(f"Error traceback: {error_trace}")
    
    # Create a minimal Flask app for error reporting
    from flask import Flask, jsonify
    app = Flask(__name__)
    
    @app.route('/', methods=['GET'])
    def error_response():
        return jsonify({
            'status': 'error',
            'message': 'Application failed to initialize properly',
            'error': str(e),
            'error_type': type(e).__name__,
            'timestamp': datetime.now().isoformat()
        }), 500

# This is needed for gunicorn to find the app
if __name__ == "__main__":
    logger.info("Starting development server")
    app.run(host='0.0.0.0', port=5000, debug=True) 