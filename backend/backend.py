from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from dotenv import load_dotenv
import logging
import os
from flask_cors import CORS
import traceback
import json
import sys
import requests
import time
from datetime import datetime

# Load environment variables first
load_dotenv()

# Import our custom utilities
from utils.logger import get_logger, setup_request_logging, setup_debug_endpoints, performance_monitor
from utils.diagnostics import register_diagnostic_endpoints
from utils.network import test_es_connection, network_diagnostics

# Create Flask app
app = Flask(__name__)

# Initialize logger
logger = get_logger()
logger.info("="*50)
logger.info("BACKEND STARTING")
logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
logger.info(f"Elasticsearch URL: {os.getenv('ELASTICSEARCH_URL', 'Not configured')}")
logger.info(f"Elasticsearch Index: {os.getenv('ELASTICSEARCH_INDEX', 'Not configured')}")
logger.info("="*50)

# Setup CORS
cors_origins = [
    "http://localhost:3000",                         # Local development
    "https://financial-news-frontend-*.s3.amazonaws.com",  # S3 bucket
    "https://*.cloudfront.net",                      # CloudFront distribution
    "https://*.amazonaws.com",                       # Any AWS domain
    "https://financialnewsengine.com",               # Production domain
    "https://www.financialnewsengine.com",           # www subdomain
    "https://development-backend-alb-261878750.us-east-1.elb.amazonaws.com"  # ALB domain
]
CORS(app, resources={r"/*": {"origins": cors_origins, "supports_credentials": True, "allow_headers": ["Content-Type", "Authorization"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]}})

# Setup request logging middleware
setup_request_logging(app)

# Add explicit handling for preflight OPTIONS requests
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_preflight(path):
    response = app.make_default_options_response()
    return response

class BackEnd:
    def __init__(self):
        try:
            # Log initialization
            logger.info("Initializing backend components...")
            
            # Initialize components
            self.web_scraper = WebScraper()
            logger.info("Web scraper initialized")
            
            # Test Elasticsearch connection before initializing engine
            self._test_elasticsearch_connection()
            
            # Initialize the Elasticsearch engine
            from es_database import Engine
            self.engine = Engine()
            self.engine.config.validate_config()
            logger.info("Backend initialized with Elasticsearch engine")
        except Exception as e:
            error_trace = traceback.format_exc()
            logger.error(f"Failed to initialize backend: {str(e)}", extra={
                'extra': {'traceback': error_trace}
            })
            raise

    @performance_monitor(name="test_elasticsearch_connection")
    def _test_elasticsearch_connection(self):
        """Test the connection to Elasticsearch and log the results."""
        # Use our advanced ES connection test utility
        result = test_es_connection()
        
        if result.get("success", False):
            logger.info("Elasticsearch connection test successful")
        else:
            logger.error(f"Elasticsearch connection test failed: {result.get('error', 'Unknown error')}")
            
        return result

    @performance_monitor(name="process_search_query")
    def process_search_query(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ) -> Dict:
        """Process a search query with optional filters and time range."""
        query_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}-{hash(query_text or '')}"
        logger.info(f"Processing search query: '{query_text}'", extra={
            'extra': {
                'query_id': query_id,
                'filters': filters,
                'time_range': time_range
            }
        })
        
        start_time = time.time()
        try:
            results = self.engine.search_news(query_text, filters, time_range)
            processing_time = time.time() - start_time
            
            hits_count = len(results['hits']['hits']) if results and 'hits' in results else 0
            logger.info(f"Query completed with {hits_count} results", extra={
                'extra': {
                    'query_id': query_id,
                    'processing_time_ms': processing_time * 1000,
                    'hits_count': hits_count
                }
            })
            
            return results['hits']['hits']
        except Exception as e:
            processing_time = time.time() - start_time
            error_trace = traceback.format_exc()
            logger.error(f"Error processing search query: {str(e)}", extra={
                'extra': {
                    'query_id': query_id,
                    'processing_time_ms': processing_time * 1000,
                    'traceback': error_trace
                }
            })
            raise

    @performance_monitor(name="update_index")
    def update_index(self, articles: List[Dict] = None):
        """Update the index with new articles."""
        try:
            if articles:
                logger.info(f"Updating index with {len(articles)} articles")
                for article in articles:
                    # Add directly to Elasticsearch without processing
                    self.engine.add_article(article)
                logger.info(f"Added {len(articles)} articles to index")
            else:
                # Could implement scraping logic here if needed
                logger.info("No articles provided to update index")
        except Exception as e:
            error_trace = traceback.format_exc()
            logger.error(f"Error updating index: {str(e)}", extra={
                'extra': {'traceback': error_trace}
            })
            raise

# Initialize the backend
try:
    logger.info("Creating backend instance...")
    backend = BackEnd()
    logger.info("Backend instance created successfully")
except Exception as e:
    logger.critical(f"Failed to initialize backend: {str(e)}")
    # Continue with Flask app, but endpoints will return errors

@app.route('/health', methods=['GET'])
@performance_monitor(name="health_check")
def health_check():
    """Health check endpoint to verify system status."""
    status = {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "elasticsearch": False,
            "backend_api": True
        },
        "version": "1.0"
    }
    
    # Check Elasticsearch connectivity
    try:
        es_url = os.getenv('ELASTICSEARCH_URL')
        es_api_key = os.getenv('ELASTICSEARCH_API_KEY')
        
        if es_url and es_api_key:
            # Use our network diagnostics utility
            result = network_diagnostics.test_connection(
                url=es_url,
                headers={"Authorization": f"ApiKey {es_api_key}"},
                timeout=5
            )
            
            status["services"]["elasticsearch"] = result["success"]
            
            # Include more connection details
            status["elasticsearch"] = {
                "connected": result["success"],
                "latency_ms": result.get("total_latency_ms")
            }
        
        if not status["services"]["elasticsearch"]:
            status["status"] = "degraded"
            
    except Exception as e:
        logger.error(f"Health check - Elasticsearch error: {str(e)}")
        status["status"] = "degraded"
        status["error"] = str(e)
    
    return jsonify(status)

@app.route('/query', methods=['GET'])
@performance_monitor(name="query_endpoint")
def query():
    try:
        query_text = request.args.get('query', None)
        source = request.args.get('source', None)
        time_range = request.args.get('time_range', None)
        sentiment = request.args.get('sentiment', None)
        
        filters = {}
        if source:
            filters["source"] = source
        if sentiment:
            filters["sentiment"] = sentiment
        
        logger.info(f"API query request received", extra={
            'extra': {
                'query': query_text,
                'source': source,
                'time_range': time_range,
                'sentiment': sentiment
            }
        })
        
        results = backend.process_search_query(query_text, filters, time_range)
        return jsonify(results)
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Query endpoint error: {str(e)}", extra={
            'extra': {'traceback': error_trace}
        })
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__,
            'timestamp': datetime.now().isoformat(),
            'request_id': getattr(request, 'request_id', None)
        }), 500

@app.route('/article/<article_id>', methods=['GET'])
@performance_monitor(name="get_article_endpoint")
def get_article(article_id):
    try:
        logger.info(f"Retrieving article with ID: {article_id}")
        article = backend.engine.get_article_by_id(article_id)
        if article:
            return jsonify(article)
        else:
            logger.warning(f"Article not found: {article_id}")
            return jsonify({'error': 'Article not found'}), 404
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Get article endpoint error: {str(e)}", extra={
            'extra': {'traceback': error_trace}
        })
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__,
            'timestamp': datetime.now().isoformat(),
            'request_id': getattr(request, 'request_id', None)
        }), 500

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 Not Found: {request.path}")
    return jsonify({
        'error': 'Not Found',
        'path': request.path,
        'timestamp': datetime.now().isoformat()
    }), 404

@app.errorhandler(500)
def server_error(error):
    logger.error(f"500 Server Error: {str(error)}", extra={
        'extra': {'traceback': traceback.format_exc()}
    })
    return jsonify({
        'error': 'Internal Server Error',
        'message': str(error),
        'timestamp': datetime.now().isoformat(),
        'request_id': getattr(request, 'request_id', None)
    }), 500

# Register debug endpoints
logger.info("Setting up debug endpoints...")
setup_debug_endpoints(app)

# Register diagnostic endpoints
logger.info("Setting up diagnostic endpoints...")
register_diagnostic_endpoints(app)

# Success startup message
logger.info("Backend service fully initialized and ready")

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    logger.info(f"Starting Flask server on port {port} (debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)
