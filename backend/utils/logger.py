import logging
import json
import sys
import time
import os
import uuid
import traceback
import socket
from datetime import datetime
from logging.handlers import RotatingFileHandler
from functools import wraps
from flask import request, g, Flask, Blueprint
import threading

# Environment configuration
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
LOG_FORMAT = os.getenv('LOG_FORMAT', 'json')  # 'json' or 'text'
ENABLE_REQUEST_LOGGING = os.getenv('ENABLE_REQUEST_LOGGING', 'true').lower() == 'true'
ENABLE_PERFORMANCE_LOGGING = os.getenv('ENABLE_PERFORMANCE_LOGGING', 'true').lower() == 'true'
LOG_DIR = os.getenv('LOG_DIR', 'logs')
SERVICE_NAME = os.getenv('SERVICE_NAME', 'financial-news-engine')
# Max number of consecutive duplicate log messages to allow before suppressing
MAX_CONSECUTIVE_DUPLICATES = int(os.getenv('MAX_CONSECUTIVE_DUPLICATES', '1'))

# Create logs directory if it doesn't exist
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Configure the root logger
root_logger = logging.getLogger()
root_logger.setLevel(getattr(logging, LOG_LEVEL))

# Clear existing handlers
for handler in root_logger.handlers[:]:
    root_logger.removeHandler(handler)

# Create handlers
console_handler = logging.StreamHandler(sys.stdout)
file_handler = RotatingFileHandler(
    f"{LOG_DIR}/backend.log", 
    maxBytes=10*1024*1024,  # 10 MB
    backupCount=5
)
debug_file_handler = RotatingFileHandler(
    f"{LOG_DIR}/debug.log", 
    maxBytes=20*1024*1024,  # 20 MB
    backupCount=10
)
error_file_handler = RotatingFileHandler(
    f"{LOG_DIR}/error.log", 
    maxBytes=10*1024*1024,  # 10 MB
    backupCount=10
)

# Filter for deduplicating consecutive identical log messages
class DuplicateFilter(logging.Filter):
    """Filter that prevents logging the same message consecutively more than MAX_CONSECUTIVE_DUPLICATES times."""
    
    def __init__(self):
        super().__init__()
        self.last_log = {}  # Dict to track last log per thread
        self.repeat_count = {}  # Count of repetitions
    
    def filter(self, record):
        # Create a key that uniquely identifies this log message
        # Include thread to avoid false suppression between threads
        thread_id = threading.get_ident()
        
        # Create message key (level + message + module + function)
        msg_key = f"{record.levelno}:{record.getMessage()}:{record.module}:{record.funcName}"
        
        # For errors, also include the traceback to uniquely identify the error
        if record.levelno >= logging.ERROR and record.exc_info:
            tb_str = "".join(traceback.format_exception(*record.exc_info))
            msg_key += f":{tb_str}"
        
        # Thread-specific tracking key
        track_key = f"{thread_id}:{msg_key}"
        
        # If this is a repeat of the last message
        if track_key in self.last_log:
            self.repeat_count[track_key] += 1
            
            # Only log the first MAX_CONSECUTIVE_DUPLICATES occurrences
            if self.repeat_count[track_key] <= MAX_CONSECUTIVE_DUPLICATES:
                return True
            
            # For every 100th occurrence after suppression starts, log a summary
            if self.repeat_count[track_key] % 100 == 0:
                record.msg = f"Previous message repeated {self.repeat_count[track_key]} times: {record.msg}"
                return True
                
            # Suppress this duplicate
            return False
        else:
            # New message, reset counter
            self.last_log[track_key] = time.time()
            self.repeat_count[track_key] = 1
            
            # Check if we just finished a series of duplicates
            for old_key in list(self.last_log.keys()):
                if old_key != track_key and old_key.startswith(f"{thread_id}:"):
                    old_count = self.repeat_count.pop(old_key, 0)
                    if old_count > MAX_CONSECUTIVE_DUPLICATES:
                        # The previous type of message was suppressed, log a summary
                        parts = old_key.split(':', 2)
                        level = int(parts[1]) if len(parts) > 1 else logging.INFO
                        
                        # Don't create a new record, just modify the current one
                        if record.levelno == level:
                            record.msg = f"Previous message was suppressed, occurred {old_count} times. New message: {record.msg}"
                    
                    # Clean up old keys
                    del self.last_log[old_key]
            
            return True

# Set log levels
console_handler.setLevel(getattr(logging, LOG_LEVEL))
file_handler.setLevel(logging.INFO)
debug_file_handler.setLevel(logging.DEBUG)
error_file_handler.setLevel(logging.ERROR)

# Create formatter based on configuration
if LOG_FORMAT.lower() == 'json':
    class JsonFormatter(logging.Formatter):
        def format(self, record):
            log_data = {
                "timestamp": datetime.utcnow().isoformat(),
                "level": record.levelname,
                "message": record.getMessage(),
                "module": record.module,
                "function": record.funcName,
                "line": record.lineno,
                "service": SERVICE_NAME,
                "hostname": socket.gethostname(),
                "thread": threading.current_thread().name,
                "process": os.getpid(),
            }
            
            # Add request_id if available
            if hasattr(g, 'request_id'):
                log_data["request_id"] = g.request_id
            
            # Add extra fields from the log record
            if hasattr(record, 'extra'):
                log_data.update(record.extra)
                
            # Add exception info if present
            if record.exc_info:
                log_data["exception"] = {
                    "type": record.exc_info[0].__name__,
                    "value": str(record.exc_info[1]),
                    "traceback": traceback.format_exception(*record.exc_info)
                }
                
            return json.dumps(log_data)
    
    formatter = JsonFormatter()
else:
    formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - [%(request_id)s] - %(name)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )

# Apply formatter to handlers
console_handler.setFormatter(formatter)
file_handler.setFormatter(formatter)
debug_file_handler.setFormatter(formatter)
error_file_handler.setFormatter(formatter)

# Add handlers to the root logger
root_logger.addHandler(console_handler)
root_logger.addHandler(file_handler)
root_logger.addHandler(debug_file_handler)
root_logger.addHandler(error_file_handler)

# Create a specific logger for the application
logger = logging.getLogger('search_engine_backend')
logger.setLevel(getattr(logging, LOG_LEVEL))

# Add duplicate filter to file handlers (especially for error logs)
duplicate_filter = DuplicateFilter()
file_handler.addFilter(duplicate_filter)
error_file_handler.addFilter(duplicate_filter)
debug_file_handler.addFilter(duplicate_filter)

# Add request_id filter to all loggers
class RequestIdFilter(logging.Filter):
    def filter(self, record):
        record.request_id = getattr(g, 'request_id', 'no-request-id')
        return True

for handler in root_logger.handlers:
    handler.addFilter(RequestIdFilter())

def get_logger(name=None):
    """Get a logger with the specified name."""
    if name:
        return logging.getLogger(f"{SERVICE_NAME}.{name}")
    return logger

# Performance monitoring
performance_data = {}

def log_performance(name, elapsed_ms, metadata=None):
    """Log performance data for a specific operation."""
    if not ENABLE_PERFORMANCE_LOGGING:
        return
    
    metadata = metadata or {}
    
    # Add request_id if available
    if hasattr(g, 'request_id'):
        metadata['request_id'] = g.request_id
    
    logger.info(
        f"Performance: {name} took {elapsed_ms:.2f}ms", 
        extra={
            'extra': {
                'performance': {
                    'operation': name,
                    'elapsed_ms': elapsed_ms,
                    **metadata
                }
            }
        }
    )
    
    # Store in memory for the /debug/performance endpoint
    global performance_data
    request_id = getattr(g, 'request_id', 'no-request-id')
    
    if request_id not in performance_data:
        performance_data[request_id] = []
    
    performance_data[request_id].append({
        'operation': name,
        'elapsed_ms': elapsed_ms,
        'timestamp': datetime.utcnow().isoformat(),
        **metadata
    })

def performance_monitor(name=None):
    """Decorator to monitor the performance of a function."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            operation_name = name or func.__name__
            start_time = time.time()
            result = func(*args, **kwargs)
            elapsed_ms = (time.time() - start_time) * 1000
            log_performance(operation_name, elapsed_ms)
            return result
        return wrapper
    return decorator

def setup_request_logging(app):
    """Configure request logging middleware for a Flask app."""
    if not ENABLE_REQUEST_LOGGING:
        return
    
    @app.before_request
    def before_request():
        g.request_id = request.headers.get('X-Request-ID', str(uuid.uuid4()))
        g.start_time = time.time()
        
        # Log request details
        logger.info(f"Request started: {request.method} {request.path}", 
            extra={
                'extra': {
                    'http_request': {
                        'method': request.method,
                        'path': request.path,
                        'headers': dict(request.headers),
                        'query_params': dict(request.args),
                        'remote_addr': request.remote_addr,
                        'user_agent': request.user_agent.string
                    }
                }
            }
        )
    
    @app.after_request
    def after_request(response):
        if hasattr(g, 'start_time'):
            elapsed_ms = (time.time() - g.start_time) * 1000
            log_performance(f"{request.method} {request.path}", elapsed_ms, {
                'status_code': response.status_code,
                'content_length': response.content_length
            })
        
        # Log response details
        logger.info(f"Request completed: {request.method} {request.path} - {response.status_code}",
            extra={
                'extra': {
                    'http_response': {
                        'status_code': response.status_code,
                        'content_length': response.content_length,
                        'content_type': response.content_type,
                        'elapsed_ms': elapsed_ms if hasattr(g, 'start_time') else None
                    }
                }
            }
        )
        
        # Add request ID to response headers
        response.headers['X-Request-ID'] = g.request_id
        return response
    
    @app.errorhandler(Exception)
    def handle_exception(e):
        logger.exception(f"Unhandled exception: {str(e)}", 
            extra={
                'extra': {
                    'http_request': {
                        'method': request.method,
                        'path': request.path,
                        'query_params': dict(request.args),
                    }
                }
            }
        )
        return {
            "error": str(e),
            "error_type": e.__class__.__name__,
            "request_id": getattr(g, 'request_id', None),
            "timestamp": datetime.utcnow().isoformat()
        }, 500

def setup_debug_endpoints(app: Flask):
    """Add debugging endpoints to the Flask app."""
    debug_bp = Blueprint('debug', __name__, url_prefix='/debug')
    
    # Add CORS handler for debug endpoints
    @debug_bp.after_request
    def add_cors_headers(response):
        """Add CORS headers to all debug endpoint responses"""
        origin = request.headers.get('Origin', '')
        response.headers['Access-Control-Allow-Origin'] = origin or '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
        if origin:
            response.headers['Access-Control-Allow-Credentials'] = 'true'
        return response
    
    # Add OPTIONS handler for debug routes
    @debug_bp.route('/<path:path>', methods=['OPTIONS'])
    @debug_bp.route('/', defaults={'path': ''}, methods=['OPTIONS'])
    def handle_debug_options(path):
        """Handle OPTIONS requests for debug endpoints"""
        logger.debug(f"Processing OPTIONS request for debug path: {path}")
        response = app.make_default_options_response()
        return response
    
    @debug_bp.route('/logs', methods=['GET'])
    def get_recent_logs():
        try:
            count = min(int(request.args.get('count', 100)), 1000)
            level = request.args.get('level', 'INFO').upper()
            
            # Read the last 'count' lines from the appropriate log file
            log_file = f"{LOG_DIR}/backend.log"
            if level == 'DEBUG':
                log_file = f"{LOG_DIR}/debug.log"
            elif level == 'ERROR':
                log_file = f"{LOG_DIR}/error.log"
            
            if not os.path.exists(log_file):
                return {"error": "Log file not found"}, 404
            
            # Get the last 'count' lines from the log file
            with open(log_file, 'r') as f:
                lines = f.readlines()
                lines = lines[-count:]
            
            # Parse JSON logs if using JSON format
            if LOG_FORMAT.lower() == 'json':
                logs = []
                for line in lines:
                    try:
                        logs.append(json.loads(line))
                    except json.JSONDecodeError:
                        logs.append({"raw": line.strip()})
                return {"logs": logs}
            else:
                return {"logs": [line.strip() for line in lines]}
                
        except Exception as e:
            logger.exception(f"Error retrieving logs: {str(e)}")
            return {"error": str(e)}, 500
    
    @debug_bp.route('/performance', methods=['GET'])
    def get_performance_data():
        try:
            request_id = request.args.get('request_id')
            limit = min(int(request.args.get('limit', 100)), 1000)
            
            if request_id:
                data = performance_data.get(request_id, [])
            else:
                # Flatten all performance data, sorted by timestamp (newest first)
                data = []
                for req_data in performance_data.values():
                    data.extend(req_data)
                data.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            return {"performance_data": data[:limit]}
                
        except Exception as e:
            logger.exception(f"Error retrieving performance data: {str(e)}")
            return {"error": str(e)}, 500
    
    @debug_bp.route('/status', methods=['GET'])
    def get_debug_status():
        try:
            # Gather system information
            status = {
                "service": SERVICE_NAME,
                "timestamp": datetime.utcnow().isoformat(),
                "uptime": time.time() - app.start_time if hasattr(app, 'start_time') else None,
                "environment": os.getenv('FLASK_ENV', 'development'),
                "hostname": socket.gethostname(),
                "process_id": os.getpid(),
                "thread_count": threading.active_count(),
                "python_version": sys.version,
                "memory_usage": {
                    "rss": os.popen(f'ps -p {os.getpid()} -o rss=').read().strip()
                },
                "log_level": LOG_LEVEL,
                "log_format": LOG_FORMAT,
                "log_directory": LOG_DIR,
                "configuration": {
                    "ENABLE_REQUEST_LOGGING": ENABLE_REQUEST_LOGGING,
                    "ENABLE_PERFORMANCE_LOGGING": ENABLE_PERFORMANCE_LOGGING
                }
            }
            
            # Add service-specific metrics
            if hasattr(app, 'request_count'):
                status["request_count"] = app.request_count
            
            if hasattr(app, 'error_count'):
                status["error_count"] = app.error_count
            
            return status
                
        except Exception as e:
            logger.exception(f"Error retrieving debug status: {str(e)}")
            return {"error": str(e)}, 500
            
    # Initialize application stats
    app.start_time = time.time()
    app.request_count = 0
    app.error_count = 0
    
    # Update request and error counters
    @app.before_request
    def count_request():
        app.request_count = getattr(app, 'request_count', 0) + 1
    
    @app.errorhandler(Exception)
    def count_error(e):
        app.error_count = getattr(app, 'error_count', 0) + 1
        # Re-raise to let other error handlers process it
        raise e
    
    # Register the blueprint with the app
    logger.info("Registering debug endpoints blueprint")
    app.register_blueprint(debug_bp)
    logger.info(f"Debug endpoints registered with prefix: {debug_bp.url_prefix}")
    
    # Return the blueprint for testing purposes
    return debug_bp

# Elasticsearch logging utilities
def log_elasticsearch_request(url, method, body=None, params=None):
    """Log Elasticsearch request details for debugging."""
    logger.debug(f"Elasticsearch request: {method} {url}", 
        extra={
            'extra': {
                'elasticsearch_request': {
                    'url': url,
                    'method': method,
                    'body': body,
                    'params': params
                }
            }
        }
    )

def log_elasticsearch_response(url, method, status_code, body, elapsed_ms):
    """Log Elasticsearch response details for debugging."""
    logger.debug(f"Elasticsearch response: {method} {url} - {status_code} ({elapsed_ms:.2f}ms)",
        extra={
            'extra': {
                'elasticsearch_response': {
                    'url': url,
                    'method': method,
                    'status_code': status_code,
                    'body_sample': str(body)[:200] + ('...' if len(str(body)) > 200 else ''),
                    'elapsed_ms': elapsed_ms
                }
            }
        }
    )

def log_elasticsearch_error(url, method, error):
    """Log Elasticsearch error details for debugging."""
    logger.error(f"Elasticsearch error: {method} {url} - {str(error)}",
        extra={
            'extra': {
                'elasticsearch_error': {
                    'url': url,
                    'method': method,
                    'error': str(error),
                    'error_type': error.__class__.__name__
                }
            }
        }
    )

# Initialize the logger when this module is loaded
logger.info(f"Logger initialized with level {LOG_LEVEL} and format {LOG_FORMAT}") 