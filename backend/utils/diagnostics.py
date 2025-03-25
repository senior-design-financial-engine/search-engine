"""
Diagnostic utilities for the backend service.

This module provides diagnostic endpoints and tools for troubleshooting
the backend service, including network, Elasticsearch, and system diagnostics.
"""

import os
import sys
import json
import socket
import platform
import psutil
import time
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, Blueprint
from typing import Dict, List, Optional

from .logger import get_logger, performance_monitor
from .network import network_diagnostics, test_es_connection

logger = get_logger('diagnostics')

# Store diagnostic data for retrieval
diagnostic_history = {
    'network_tests': [],
    'api_checks': [],
    'system_stats': [],
    'error_reports': []
}

# Maximum history items to store
MAX_HISTORY_ITEMS = 20

def register_diagnostic_endpoints(app: Flask) -> Blueprint:
    """
    Register diagnostic endpoints with the Flask app.
    
    Args:
        app: The Flask application
        
    Returns:
        Blueprint: The diagnostic blueprint
    """
    diagnostics_bp = Blueprint('diagnostics', __name__, url_prefix='/diagnostic')
    
    @diagnostics_bp.route('/health', methods=['GET'])
    @performance_monitor(name="diagnostic_health")
    def health_check():
        """Advanced health check endpoint with detailed diagnostics."""
        # Basic service status
        status = {
            "status": "ok",
            "timestamp": datetime.utcnow().isoformat(),
            "service": os.getenv('SERVICE_NAME', 'search-engine-backend'),
            "version": os.getenv('SERVICE_VERSION', '1.0'),
            "environment": os.getenv('FLASK_ENV', 'development'),
            "services": {
                "backend_api": True,
                "elasticsearch": False
            },
            "system": get_system_stats()
        }
        
        # Check Elasticsearch connectivity
        try:
            es_url = os.getenv('ELASTICSEARCH_URL')
            es_api_key = os.getenv('ELASTICSEARCH_API_KEY')
            
            if es_url and es_api_key:
                # Simplified check for the basic health endpoint
                headers = {"Authorization": f"ApiKey {es_api_key}"}
                
                # Use our network diagnostic utility
                result = network_diagnostics.test_connection(
                    url=es_url,
                    headers=headers
                )
                
                status["services"]["elasticsearch"] = result["success"]
                
                # Include more details about the connection
                status["elasticsearch"] = {
                    "url": es_url,
                    "connected": result["success"],
                    "response_time_ms": result.get("total_latency_ms"),
                    "status_code": result.get("status_code")
                }
                
                if not result["success"]:
                    status["status"] = "degraded"
                    status["issues"] = [{
                        "service": "elasticsearch",
                        "message": result.get("error", "Connection failed"),
                        "timestamp": datetime.utcnow().isoformat()
                    }]
            else:
                logger.warning("Elasticsearch URL or API key not configured")
                status["services"]["elasticsearch"] = False
                status["status"] = "degraded"
                status["issues"] = [{
                    "service": "elasticsearch",
                    "message": "Not configured",
                    "timestamp": datetime.utcnow().isoformat()
                }]
                
        except Exception as e:
            logger.error(f"Health check - Elasticsearch error: {str(e)}")
            status["status"] = "degraded"
            status["error"] = str(e)
            status["services"]["elasticsearch"] = False
            status["issues"] = [{
                "service": "elasticsearch",
                "message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }]
        
        # Check API endpoints
        api_status = check_api_endpoints(app)
        status["api"] = api_status
        
        if not api_status["all_endpoints_ok"]:
            status["status"] = "degraded"
            if "issues" not in status:
                status["issues"] = []
            status["issues"].append({
                "service": "api",
                "message": f"{len(api_status['failing_endpoints'])} endpoints failing",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Store health check in history
        if len(diagnostic_history['api_checks']) >= MAX_HISTORY_ITEMS:
            diagnostic_history['api_checks'].pop(0)
        diagnostic_history['api_checks'].append({
            "timestamp": datetime.utcnow().isoformat(),
            "status": status["status"],
            "services": status["services"]
        })
        
        return jsonify(status)
    
    @diagnostics_bp.route('/system', methods=['GET'])
    @performance_monitor(name="diagnostic_system")
    def system_diagnostics():
        """System diagnostic endpoint with detailed stats."""
        stats = get_system_stats(detailed=True)
        
        # Store system stats in history
        if len(diagnostic_history['system_stats']) >= MAX_HISTORY_ITEMS:
            diagnostic_history['system_stats'].pop(0)
        diagnostic_history['system_stats'].append({
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": stats["cpu"]["percent"],
            "memory": stats["memory"]["percent_used"],
            "disk": stats["disk"]["percent_used"]
        })
        
        return jsonify(stats)
    
    @diagnostics_bp.route('/network', methods=['GET'])
    @performance_monitor(name="diagnostic_network")
    def network_diagnostics_endpoint():
        """Run comprehensive network diagnostics."""
        # Get targets to test
        targets = []
        
        # Always include Elasticsearch
        es_url = os.getenv('ELASTICSEARCH_URL')
        if es_url:
            targets.append(es_url)
        
        # Include any other important services
        # Could add AWS services, external APIs, etc.
        
        # Add requested targets
        request_targets = request.args.get('targets')
        if request_targets:
            for target in request_targets.split(','):
                target = target.strip()
                if target and target not in targets:
                    targets.append(target)
        
        # If no targets specified, use default important services
        if not targets:
            targets = [
                "api.github.com",  # Example external service
                "8.8.8.8",         # Google DNS for basic connectivity test
                "elasticsearch.com" # Elasticsearch main site
            ]
        
        # Run diagnostics
        results = network_diagnostics.run_full_diagnostics(targets)
        
        # Store diagnostics in history
        if len(diagnostic_history['network_tests']) >= MAX_HISTORY_ITEMS:
            diagnostic_history['network_tests'].pop(0)
        
        summary = {
            "timestamp": results["timestamp"],
            "targets_tested": len(targets),
            "successful_connections": sum(1 for target, data in results["tests"].items() 
                                        if "http" in data and data["http"]["success"])
        }
        diagnostic_history['network_tests'].append(summary)
        
        return jsonify(results)
    
    @diagnostics_bp.route('/elasticsearch', methods=['GET'])
    @performance_monitor(name="diagnostic_elasticsearch")
    def elasticsearch_diagnostics():
        """Run detailed Elasticsearch diagnostics."""
        results = test_es_connection()
        return jsonify(results)
    
    @diagnostics_bp.route('/history', methods=['GET'])
    def diagnostic_history_endpoint():
        """Retrieve diagnostic history."""
        return jsonify(diagnostic_history)
    
    @diagnostics_bp.route('/errors', methods=['GET'])
    def error_history():
        """Retrieve error history."""
        # Get parameters
        limit = min(int(request.args.get('limit', 50)), 200)
        
        # Get error log files
        log_dir = os.getenv('LOG_DIR', 'logs')
        error_log_file = f"{log_dir}/error.log"
        
        errors = []
        
        if os.path.exists(error_log_file):
            try:
                with open(error_log_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-limit:]:
                        try:
                            # Try to parse as JSON
                            error = json.loads(line)
                            errors.append(error)
                        except json.JSONDecodeError:
                            # Handle non-JSON log format
                            errors.append({"raw": line.strip()})
            except Exception as e:
                logger.error(f"Failed to read error log: {str(e)}")
                return jsonify({
                    "error": f"Failed to read error log: {str(e)}"
                }), 500
        
        return jsonify({
            "errors": errors,
            "count": len(errors),
            "log_file": error_log_file
        })
    
    @diagnostics_bp.route('/report', methods=['GET'])
    def generate_diagnostic_report():
        """Generate a comprehensive diagnostic report for troubleshooting."""
        # Start with system info
        report = {
            "timestamp": datetime.utcnow().isoformat(),
            "system": get_system_stats(detailed=True),
            "environment": get_environment_info(),
            "health": {},
            "network": {},
            "elasticsearch": {},
            "recent_errors": []
        }
        
        # Get health status
        try:
            es_url = os.getenv('ELASTICSEARCH_URL')
            es_api_key = os.getenv('ELASTICSEARCH_API_KEY')
            
            health_status = {
                "status": "ok",
                "services": {
                    "backend_api": True,
                    "elasticsearch": False
                }
            }
            
            if es_url and es_api_key:
                # Test Elasticsearch
                headers = {"Authorization": f"ApiKey {es_api_key}"}
                result = network_diagnostics.test_connection(
                    url=es_url,
                    headers=headers
                )
                health_status["services"]["elasticsearch"] = result["success"]
                
                if not result["success"]:
                    health_status["status"] = "degraded"
            
            report["health"] = health_status
        except Exception as e:
            logger.error(f"Failed to get health status: {str(e)}")
            report["health"] = {
                "status": "error",
                "error": str(e)
            }
        
        # Get Elasticsearch info
        try:
            es_results = test_es_connection()
            report["elasticsearch"] = es_results
        except Exception as e:
            logger.error(f"Failed to test Elasticsearch connection: {str(e)}")
            report["elasticsearch"] = {
                "success": False,
                "error": str(e)
            }
        
        # Get recent errors
        log_dir = os.getenv('LOG_DIR', 'logs')
        error_log_file = f"{log_dir}/error.log"
        
        if os.path.exists(error_log_file):
            try:
                with open(error_log_file, 'r') as f:
                    lines = f.readlines()
                    for line in lines[-10:]:  # Last 10 errors
                        try:
                            error = json.loads(line)
                            report["recent_errors"].append(error)
                        except json.JSONDecodeError:
                            report["recent_errors"].append({"raw": line.strip()})
            except Exception as e:
                logger.error(f"Failed to read error log: {str(e)}")
        
        # Add diagnostic history
        report["history"] = diagnostic_history
        
        return jsonify(report)
    
    @diagnostics_bp.route('/cors', methods=['GET', 'OPTIONS'])
    def diagnostic_cors():
        """Test CORS configuration."""
        from flask import current_app
        
        origin = request.headers.get('Origin', 'Unknown')
        
        if request.method == 'OPTIONS':
            # Handle preflight request
            response = current_app.make_default_options_response()
        else:
            # Handle actual request
            response = jsonify({
                "status": "ok",
                "timestamp": datetime.now().isoformat(),
                "cors_test": "successful",
                "request_origin": origin,
                "allowed_origins": app.config.get('CORS_ORIGINS', [])
            })
            
        # Add CORS headers in response
        response.headers.add('Access-Control-Allow-Origin', origin)
        response.headers.add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        
        return response
    
    app.register_blueprint(diagnostics_bp)
    
    # Return the blueprint for testing purposes
    return diagnostics_bp


def get_system_stats(detailed: bool = False) -> Dict:
    """
    Get system statistics.
    
    Args:
        detailed: Whether to include detailed stats
        
    Returns:
        Dict containing system stats
    """
    stats = {
        "hostname": socket.gethostname(),
        "platform": platform.system(),
        "platform_version": platform.version(),
        "python_version": platform.python_version(),
        "cpu": {
            "count": psutil.cpu_count(),
            "percent": psutil.cpu_percent(interval=0.1)
        },
        "memory": {
            "total": psutil.virtual_memory().total,
            "available": psutil.virtual_memory().available,
            "used": psutil.virtual_memory().used,
            "percent_used": psutil.virtual_memory().percent
        },
        "disk": {
            "total": psutil.disk_usage('/').total,
            "used": psutil.disk_usage('/').used,
            "free": psutil.disk_usage('/').free,
            "percent_used": psutil.disk_usage('/').percent
        },
        "process": {
            "pid": os.getpid(),
            "memory_used": psutil.Process(os.getpid()).memory_info().rss,
            "cpu_percent": psutil.Process(os.getpid()).cpu_percent(interval=0.1),
            "threads": len(psutil.Process(os.getpid()).threads())
        },
        "uptime": {
            "system": time.time() - psutil.boot_time(),
            "process": time.time() - psutil.Process(os.getpid()).create_time()
        }
    }
    
    if detailed:
        # Add more detailed system information
        stats["memory"]["swap"] = {
            "total": psutil.swap_memory().total,
            "used": psutil.swap_memory().used,
            "percent": psutil.swap_memory().percent
        }
        
        # Get network interfaces
        stats["network"] = {
            "interfaces": {}
        }
        
        for iface, addrs in psutil.net_if_addrs().items():
            stats["network"]["interfaces"][iface] = []
            for addr in addrs:
                if addr.family == socket.AF_INET:
                    stats["network"]["interfaces"][iface].append({
                        "address": addr.address,
                        "netmask": addr.netmask
                    })
        
        # Get network IO counters
        net_io = psutil.net_io_counters()
        stats["network"]["io"] = {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        }
        
        # Get disk IO counters
        try:
            disk_io = psutil.disk_io_counters()
            stats["disk"]["io"] = {
                "read_count": disk_io.read_count,
                "write_count": disk_io.write_count,
                "read_bytes": disk_io.read_bytes,
                "write_bytes": disk_io.write_bytes,
                "read_time": disk_io.read_time,
                "write_time": disk_io.write_time
            }
        except:
            stats["disk"]["io"] = "Not available"
        
        # Process details
        proc = psutil.Process(os.getpid())
        stats["process"]["detailed"] = {
            "username": proc.username(),
            "name": proc.name(),
            "cwd": proc.cwd(),
            "status": proc.status(),
            "create_time": proc.create_time(),
            "cmdline": proc.cmdline(),
            "open_files": len(proc.open_files())
        }
    
    return stats


def get_environment_info() -> Dict:
    """
    Get environment information for the application.
    
    Returns:
        Dict containing environment information
    """
    # Filter out sensitive environment variables
    sensitive_vars = [
        "API_KEY", "SECRET", "PASSWORD", "TOKEN", "CREDENTIAL",
        "AUTH", "SESSION", "PRIVATE"
    ]
    
    # Get all environment variables
    env_vars = {}
    for key, value in os.environ.items():
        # Skip sensitive variables
        if any(s in key.upper() for s in sensitive_vars):
            env_vars[key] = "[REDACTED]"
        else:
            env_vars[key] = value
    
    return {
        "environment_variables": env_vars,
        "python_path": sys.path,
        "working_directory": os.getcwd()
    }


def check_api_endpoints(app: Flask) -> Dict:
    """
    Check the health of all API endpoints.
    
    Args:
        app: The Flask application
        
    Returns:
        Dict containing API endpoint status
    """
    endpoints = []
    failing_endpoints = []
    
    # Get all endpoints from the Flask app
    for rule in app.url_map.iter_rules():
        # Skip diagnostic endpoints to avoid recursion
        if 'diagnostic' in rule.endpoint:
            continue
            
        endpoint = {
            "url": str(rule),
            "endpoint": rule.endpoint,
            "methods": list(rule.methods - set(['OPTIONS', 'HEAD'])),
            "status": "unknown"
        }
        
        endpoints.append(endpoint)
    
    # Could implement actual testing of endpoints here
    # For now, we just return the list without testing
    
    return {
        "all_endpoints_ok": len(failing_endpoints) == 0,
        "total_endpoints": len(endpoints),
        "failing_endpoints": failing_endpoints,
        "endpoints": endpoints
    } 