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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("backend_debug.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

# Create a specific logger for the application
logger = logging.getLogger('search_engine_backend')
logger.setLevel(logging.DEBUG)

# Load environment variables
load_dotenv()

app = Flask(__name__)
cors = CORS(app)

# Log startup information
logger.info("="*50)
logger.info("BACKEND STARTING")
logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")
logger.info(f"Elasticsearch URL: {os.getenv('ELASTICSEARCH_URL', 'Not configured')}")
logger.info(f"Elasticsearch Index: {os.getenv('ELASTICSEARCH_INDEX', 'Not configured')}")
logger.info("="*50)

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
            logger.error(f"Failed to initialize backend: {str(e)}")
            logger.error(f"Error trace: {error_trace}")
            raise

    def _test_elasticsearch_connection(self):
        """Test the connection to Elasticsearch and log the results."""
        es_url = os.getenv('ELASTICSEARCH_URL')
        es_api_key = os.getenv('ELASTICSEARCH_API_KEY')
        
        if not es_url:
            logger.error("ELASTICSEARCH_URL environment variable is not set")
            return
            
        if not es_api_key:
            logger.error("ELASTICSEARCH_API_KEY environment variable is not set")
            return
            
        try:
            logger.info(f"Testing connection to Elasticsearch at {es_url}")
            headers = {
                "Authorization": f"ApiKey {es_api_key}",
                "Content-Type": "application/json"
            }
            
            start_time = time.time()
            response = requests.get(
                es_url, 
                headers=headers,
                timeout=10
            )
            request_time = time.time() - start_time
            
            logger.info(f"Elasticsearch response time: {request_time:.2f}s")
            logger.info(f"Elasticsearch response status: {response.status_code}")
            
            if response.status_code >= 400:
                logger.error(f"Elasticsearch error response: {response.text}")
            else:
                logger.info("Elasticsearch connection successful")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to connect to Elasticsearch: {str(e)}")

    def process_search_query(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ) -> Dict:
        """Process a search query with optional filters and time range."""
        query_id = f"{datetime.now().strftime('%Y%m%d%H%M%S')}-{hash(query_text or '')}"
        logger.info(f"[Query:{query_id}] Processing search query: '{query_text}'")
        logger.info(f"[Query:{query_id}] Filters: {json.dumps(filters)}")
        logger.info(f"[Query:{query_id}] Time range: {json.dumps(time_range)}")
        
        start_time = time.time()
        try:
            results = self.engine.search_news(query_text, filters, time_range)
            processing_time = time.time() - start_time
            
            hits_count = len(results['hits']['hits']) if results and 'hits' in results else 0
            logger.info(f"[Query:{query_id}] Query completed in {processing_time:.2f}s with {hits_count} results")
            
            return results['hits']['hits']
        except Exception as e:
            processing_time = time.time() - start_time
            error_trace = traceback.format_exc()
            logger.error(f"[Query:{query_id}] Error processing search query after {processing_time:.2f}s: {str(e)}")
            logger.error(f"[Query:{query_id}] Error trace: {error_trace}")
            raise

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
            logger.error(f"Error updating index: {str(e)}")
            logger.error(f"Error trace: {error_trace}")
            raise

# Add request logging middleware
@app.before_request
def log_request_info():
    logger.info(f"Request: {request.method} {request.path} - {dict(request.args)}")

@app.after_request
def log_response_info(response):
    logger.info(f"Response: {response.status_code}")
    return response

# Initialize the backend
try:
    logger.info("Creating backend instance...")
    backend = BackEnd()
    logger.info("Backend instance created successfully")
except Exception as e:
    logger.critical(f"Failed to initialize backend: {str(e)}")
    # Continue with Flask app, but endpoints will return errors

@app.route('/health', methods=['GET'])
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
            headers = {"Authorization": f"ApiKey {es_api_key}"}
            response = requests.get(es_url, headers=headers, timeout=5)
            status["services"]["elasticsearch"] = response.status_code < 400
        
        if not status["services"]["elasticsearch"]:
            status["status"] = "degraded"
            
    except Exception as e:
        logger.error(f"Health check - Elasticsearch error: {str(e)}")
        status["status"] = "degraded"
        status["error"] = str(e)
    
    return jsonify(status)

@app.route('/query', methods=['GET'])
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
        
        results = backend.process_search_query(query_text, filters, time_range)
        return jsonify(results)
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Query endpoint error: {str(e)}")
        logger.error(f"Error trace: {error_trace}")
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.route('/article/<article_id>', methods=['GET'])
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
        logger.error(f"Get article endpoint error: {str(e)}")
        logger.error(f"Error trace: {error_trace}")
        return jsonify({
            'error': str(e),
            'error_type': type(e).__name__,
            'timestamp': datetime.now().isoformat()
        }), 500

@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 error: {request.path}")
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    error_trace = traceback.format_exc()
    logger.error(f"500 error: {str(error)}")
    logger.error(f"Error trace: {error_trace}")
    return jsonify({
        'error': 'Internal server error',
        'error_details': str(error),
        'timestamp': datetime.now().isoformat()
    }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
