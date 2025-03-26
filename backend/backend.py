from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from dotenv import load_dotenv
import logging
import os
from flask_cors import CORS
import traceback
import sys
import requests
import time
from datetime import datetime
import uuid
import hashlib
import json
from functools import lru_cache

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
# Define default CORS origins
cors_origins = [
    "http://localhost:3000",                         # Local development
    "https://financial-news-frontend-*.s3.amazonaws.com",  # S3 bucket
    "https://*.cloudfront.net",                      # CloudFront distribution
    "https://*.amazonaws.com",                       # Any AWS domain
    "https://financialnewsengine.com",               # Production domain
    "https://www.financialnewsengine.com",           # www subdomain
    "https://development-backend-alb-261878750.us-east-1.elb.amazonaws.com",  # ALB domain
    "https://d3dw79zwd8sn9g.cloudfront.net"          # CloudFront distribution domain
]

# Get CORS allowed origins from environment variable if available
cors_env = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_env:
    # Split by comma and strip whitespace
    additional_origins = [origin.strip() for origin in cors_env.split(',') if origin.strip()]
    logger.info(f"Adding {len(additional_origins)} origins from CORS_ALLOWED_ORIGINS env var")
    cors_origins.extend(additional_origins)

# Log the configured CORS origins
logger.info(f"Configured CORS origins: {cors_origins}")

CORS(app, resources={r"/*": {"origins": cors_origins, "supports_credentials": True, "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "X-Api-Key", "X-Amz-Date", "X-Amz-Security-Token"], "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"]}})

# Add after_request handler to ensure CORS headers are set on all responses
@app.after_request
def add_cors_headers(response):
    # Get the origin from the request
    origin = request.headers.get('Origin', '')
    
    # Log all CORS requests for debugging
    logger.debug(f"CORS request from origin: {origin}")
    
    # For production domains, set permissive CORS headers regardless of path
    if origin:
        # Check if origin matches any allowed pattern
        origin_allowed = False
        
        # For exact match
        if origin in cors_origins:
            origin_allowed = True
        # For wildcard matches
        else:
            for allowed_origin in cors_origins:
                if '*' in allowed_origin:
                    # Convert the pattern to a prefix/suffix match
                    pattern = allowed_origin.replace('*', '')
                    if origin.startswith(pattern.replace('*.', '')) or origin.endswith(pattern.replace('*', '')):
                        origin_allowed = True
                        break
        
        # If origin is allowed or in development mode, set CORS headers
        if origin_allowed or os.getenv('FLASK_ENV') == 'development':
            response.headers['Access-Control-Allow-Origin'] = origin
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-Api-Key, X-Amz-Date, X-Amz-Security-Token'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            response.headers['Access-Control-Max-Age'] = '3600'
    
    # For OPTIONS requests always return 200 with headers
    if request.method == 'OPTIONS':
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, X-Api-Key, X-Amz-Date, X-Amz-Security-Token'
        response.headers['Access-Control-Max-Age'] = '3600'
        if origin:
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            
    return response

# Setup request logging middleware
setup_request_logging(app)

# Add explicit handling for preflight OPTIONS requests
@app.route('/', defaults={'path': ''}, methods=['OPTIONS'])
@app.route('/<path:path>', methods=['OPTIONS'])
def handle_preflight(path):
    logger.debug(f"Handling OPTIONS preflight request for path: {path}")
    origin = request.headers.get('Origin', '')
    
    response = app.make_default_options_response()
    # Set permissive CORS headers for OPTIONS
    response.headers['Access-Control-Allow-Origin'] = origin or '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    
    # Allow credentials if origin is provided
    if origin:
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        
    logger.debug(f"Preflight response for {origin}: {dict(response.headers)}")
    return response

# Simple in-memory cache for search results
# Maximum of 100 most recent search results will be cached
# Each entry has a key hash(query params) -> {result, timestamp}
search_results_cache = {}
CACHE_MAX_ITEMS = 100
CACHE_TTL_SECONDS = 5 * 60  # 5 minutes cache

# Function to generate a cache key based on query parameters
def generate_cache_key(query_text, filters, time_range, sort_by, sort_order):
    """Generate a unique cache key based on query parameters."""
    key_dict = {
        'query': query_text,
        'filters': filters,
        'time_range': time_range,
        'sort_by': sort_by,
        'sort_order': sort_order
    }
    key_str = json.dumps(key_dict, sort_keys=True)
    return hashlib.md5(key_str.encode()).hexdigest()

# Function to get cached search results
def get_cached_search_results(cache_key):
    """Get search results from cache if they exist and are not expired."""
    if cache_key in search_results_cache:
        cache_entry = search_results_cache[cache_key]
        cache_age = time.time() - cache_entry['timestamp']
        
        # Check if cache entry is still valid
        if cache_age < CACHE_TTL_SECONDS:
            logger.debug(f"Cache hit for key {cache_key[:8]}...")
            return cache_entry['result']
            
    return None

# Function to cache search results
def cache_search_results(cache_key, result):
    """Cache search results with timestamp."""
    # If cache is full, remove oldest entry
    if len(search_results_cache) >= CACHE_MAX_ITEMS:
        oldest_key = min(search_results_cache.keys(), 
                        key=lambda k: search_results_cache[k]['timestamp'])
        del search_results_cache[oldest_key]
    
    # Add new entry
    search_results_cache[cache_key] = {
        'result': result,
        'timestamp': time.time()
    }
    logger.debug(f"Cached result for key {cache_key[:8]}...")
    
    return result

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

# Register diagnostic endpoints
logger.info("Registering diagnostic endpoints...")
diagnostics_bp = register_diagnostic_endpoints(app)
app.register_blueprint(diagnostics_bp)
logger.info(f"Registered diagnostic endpoints with prefix: {diagnostics_bp.url_prefix}")

# Add cache statistics endpoint
@diagnostics_bp.route('/cache-stats', methods=['GET'])
@performance_monitor(name="cache_stats_endpoint")
def cache_stats():
    """Get statistics about the search results cache."""
    current_time = time.time()
    
    # Calculate statistics
    total_entries = len(search_results_cache)
    valid_entries = sum(1 for entry in search_results_cache.values() 
                         if current_time - entry['timestamp'] < CACHE_TTL_SECONDS)
    
    # Calculate memory usage (approximate)
    import sys
    total_size = sys.getsizeof(search_results_cache)
    for key, value in search_results_cache.items():
        total_size += sys.getsizeof(key)
        total_size += sys.getsizeof(value)
        if 'result' in value:
            total_size += sys.getsizeof(value['result'])
    
    # Get sample keys (first 10)
    sample_keys = list(search_results_cache.keys())[:10]
    
    # Age information
    age_info = {}
    if search_results_cache:
        oldest_key = min(search_results_cache.keys(), 
                        key=lambda k: search_results_cache[k]['timestamp'])
        newest_key = max(search_results_cache.keys(), 
                        key=lambda k: search_results_cache[k]['timestamp'])
        
        oldest_age = current_time - search_results_cache[oldest_key]['timestamp']
        newest_age = current_time - search_results_cache[newest_key]['timestamp']
        
        age_info = {
            'oldest_entry_age_seconds': oldest_age,
            'newest_entry_age_seconds': newest_age
        }
    
    return jsonify({
        'total_entries': total_entries,
        'valid_entries': valid_entries,
        'expired_entries': total_entries - valid_entries,
        'max_entries': CACHE_MAX_ITEMS,
        'ttl_seconds': CACHE_TTL_SECONDS,
        'memory_usage_bytes': total_size,
        'memory_usage_mb': round(total_size / (1024 * 1024), 2),
        'cache_hit_ratio': round(valid_entries / total_entries, 2) if total_entries > 0 else 0,
        'sample_keys': sample_keys,
        **age_info,
        'timestamp': datetime.now().isoformat()
    })

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
        # Extract query parameters
        query_text = request.args.get('query', None)
        source = request.args.get('source', None)
        time_range = request.args.get('time_range', None)
        sentiment = request.args.get('sentiment', None)
        sort_by = request.args.get('sort_by', 'relevance')  # Default to relevance sorting
        sort_order = request.args.get('sort_order', 'desc')  # Default to descending order
        
        # Check if cache should be bypassed
        bypass_cache = request.args.get('bypass_cache', 'false').lower() == 'true'
        
        # Build filter dictionary
        filters = {}
        if source:
            filters["source"] = source
        if sentiment:
            filters["sentiment"] = sentiment
        
        # Format time range if provided
        time_range_obj = None
        if time_range:
            if time_range == '24h':
                time_range_obj = {'start': 'now-1d/d'}
            elif time_range == '7d':
                time_range_obj = {'start': 'now-7d/d'}
            elif time_range == '30d':
                time_range_obj = {'start': 'now-30d/d'}
            elif time_range == '90d':
                time_range_obj = {'start': 'now-90d/d'}
        
        logger.info(f"API query request received", extra={
            'extra': {
                'query': query_text,
                'source': source,
                'time_range': time_range,
                'sentiment': sentiment,
                'sort_by': sort_by,
                'sort_order': sort_order,
                'bypass_cache': bypass_cache
            }
        })
        
        # Generate cache key
        cache_key = generate_cache_key(query_text, filters, time_range, sort_by, sort_order)
        
        # Try to get results from cache if not bypassing
        if not bypass_cache:
            cached_result = get_cached_search_results(cache_key)
            if cached_result:
                logger.info(f"Returning cached search results for query: '{query_text}'")
                return jsonify({
                    **cached_result,
                    'cached': True,
                    'timestamp': datetime.now().isoformat(),
                    'request_id': getattr(request, 'request_id', str(uuid.uuid4()))
                })
        
        try:
            # Try to get results from Elasticsearch
            results = backend.process_search_query(query_text, filters, time_range_obj)
            
            # Format the response using the structure expected by frontend
            response = {
                'results': results,  # This is what frontend expects - direct access to results
                'metadata': {
                    'query': query_text,
                    'filters': filters,
                    'sort': {
                        'field': sort_by,
                        'order': sort_order
                    },
                    'timestamp': datetime.now().isoformat(),
                    'request_id': getattr(request, 'request_id', str(uuid.uuid4()))
                }
            }
            
            # Cache the result
            if not bypass_cache:
                cache_search_results(cache_key, response)
            
            return jsonify(response)
        except Exception as es_error:
            # Log the Elasticsearch error
            logger.error(f"Elasticsearch error: {str(es_error)}", extra={
                'extra': {'traceback': traceback.format_exc()}
            })
            
            # Generate fallback results
            fallback_results = generate_mock_results(query_text, source, time_range, sentiment, sort_by, sort_order)
            
            # Format the response using the structure expected by frontend
            response = {
                'results': fallback_results,  # This is what frontend expects - direct access to results
                'metadata': {
                    'query': query_text,
                    'filters': filters,
                    'sort': {
                        'field': sort_by,
                        'order': sort_order
                    },
                    'fallback': True,
                    'fallback_reason': str(es_error),
                    'timestamp': datetime.now().isoformat(),
                    'request_id': getattr(request, 'request_id', str(uuid.uuid4()))
                }
            }
            
            return jsonify(response)
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

# Add a fallback mock results generator
def generate_mock_results(query_text, source=None, time_range=None, sentiment=None, sort_by='relevance', sort_order='desc'):
    """Generate mock search results when Elasticsearch is unavailable."""
    import random
    from datetime import datetime, timedelta
    
    # Sample data for fallback results
    sources = ["Reuters", "Bloomberg", "Wall Street Journal", "CNBC", "Financial Times"]
    companies = ["Apple", "Tesla", "Microsoft", "Amazon", "Google", "Meta", "Netflix"]
    sentiments = ["positive", "negative", "neutral"]
    
    # Apply source filter if provided
    available_sources = [source] if source else sources
    
    # Configure number of results
    num_results = random.randint(5, 15)
    results = []
    
    for i in range(num_results):
        # Generate published date based on time range
        if time_range == '24h':
            published_date = datetime.now() - timedelta(hours=random.randint(1, 24))
        elif time_range == '7d':
            published_date = datetime.now() - timedelta(days=random.randint(1, 7))
        elif time_range == '30d':
            published_date = datetime.now() - timedelta(days=random.randint(1, 30))
        elif time_range == '90d':
            published_date = datetime.now() - timedelta(days=random.randint(1, 90))
        else:
            published_date = datetime.now() - timedelta(days=random.randint(1, 30))
        
        # Generate sentiment
        article_sentiment = sentiment if sentiment else random.choice(sentiments)
        
        # Generate sentiment score based on sentiment
        if article_sentiment == "positive":
            sentiment_score = random.uniform(0.3, 1.0)
        elif article_sentiment == "negative":
            sentiment_score = random.uniform(-1.0, -0.3)
        else:
            sentiment_score = random.uniform(-0.3, 0.3)
        
        # Generate article
        article_source = random.choice(available_sources)
        company = random.choice(companies)
        
        # Include query text in headline if provided
        headline = f"{company} Reports Strong Financial Results"
        if query_text:
            if random.random() > 0.3:  # 70% chance to include query in headline
                headline = f"{query_text}: {headline}"
        
        # Create the result object matching ES format
        result = {
            "_id": f"mock-{i}-{hash(f'{query_text}-{i}')}",
            "_index": "financial_news",
            "_score": random.uniform(0.7, 1.0),
            "_source": {
                "headline": headline,
                "summary": f"A brief summary about {company}'s financial performance.",
                "content": f"This is mock content for {company} related to {query_text if query_text else 'financial news'}.",
                "url": f"https://example.com/article/{i}",
                "source": article_source,
                "published_at": published_date.isoformat(),
                "sentiment": article_sentiment,
                "sentiment_score": sentiment_score,
                "categories": ["Finance", "Technology", "Markets"],
                "companies": [
                    {
                        "name": company,
                        "ticker": company[:4].upper()
                    }
                ]
            },
            "highlight": {
                "headline": [f"<em>{headline}</em>"] if query_text and query_text.lower() in headline.lower() else [headline],
                "summary": [f"A brief <em>summary</em> about {company}'s financial performance."]
            }
        }
        results.append(result)
    
    # Sort results according to sort_by parameter
    if sort_by == 'date':
        results.sort(key=lambda x: x["_source"]["published_at"], reverse=(sort_order == 'desc'))
    elif sort_by == 'sentiment':
        results.sort(key=lambda x: x["_source"]["sentiment_score"], reverse=(sort_order == 'desc'))
    elif sort_by == 'relevance' and query_text:
        # Higher scores for results with query text in headline
        for result in results:
            if query_text.lower() in result["_source"]["headline"].lower():
                result["_score"] += 0.3
        results.sort(key=lambda x: x["_score"], reverse=(sort_order == 'desc'))
    
    return results

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

# Add a CORS test endpoint 
@app.route('/cors-test', methods=['GET', 'OPTIONS'])
def cors_test():
    """Test endpoint that returns detailed info about the request for CORS troubleshooting."""
    if request.method == 'OPTIONS':
        return handle_preflight('cors-test')
        
    origin = request.headers.get('Origin', 'No origin header')
    
    # Log the request details
    logger.info(f"CORS test endpoint accessed from origin: {origin}")
    logger.debug(f"Request headers: {dict(request.headers)}")
    
    # Return detailed information about the request
    return jsonify({
        'cors_test': 'success',
        'timestamp': datetime.now().isoformat(),
        'request': {
            'origin': origin,
            'method': request.method,
            'headers': {k: v for k, v in request.headers.items()},
            'path': request.path,
            'url': request.url,
            'remote_addr': request.remote_addr,
        },
        'response_headers': {
            'Access-Control-Allow-Origin': origin or '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
            'Access-Control-Allow-Credentials': 'true' if origin else 'not set',
        },
        'message': 'If you can see this response in your browser or application, CORS is working correctly.'
    })

# Add error handler for CORS issues
@app.errorhandler(Exception)
def handle_error(error):
    """Global error handler to ensure CORS headers are set even for uncaught exceptions."""
    # First log the error
    logger.error(f"Uncaught exception: {str(error)}", extra={
        'extra': {'traceback': traceback.format_exc()}
    })
    
    # Prepare the error response
    status_code = 500
    if hasattr(error, 'code'):
        status_code = error.code
    
    response = jsonify({
        'error': str(error),
        'error_type': type(error).__name__,
        'timestamp': datetime.now().isoformat(),
        'request_id': getattr(request, 'request_id', None)
    })
    response.status_code = status_code
    
    # Set CORS headers directly on the error response
    origin = request.headers.get('Origin', '')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
    else:
        # If no origin, set a wildcard for API tools to work
        response.headers['Access-Control-Allow-Origin'] = '*'
    
    return response

# Success startup message
logger.info("Backend service fully initialized and ready")

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    logger.info(f"Starting Flask server on port {port} (debug={debug})")
    app.run(host='0.0.0.0', port=port, debug=debug)
