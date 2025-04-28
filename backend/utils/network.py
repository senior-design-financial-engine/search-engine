"""
Network diagnostics and connectivity utilities.

This module provides tools for diagnosing network connectivity issues
and testing upstream service connections.
"""

import os
import requests
import socket
import json
import time
from datetime import datetime
import subprocess
import platform
import traceback
from typing import Dict, List, Tuple, Optional, Any, Union

from .logger import get_logger, performance_monitor

logger = get_logger('network')

class NetworkDiagnostics:
    """Network diagnostic utilities for the backend service."""
    
    def __init__(self):
        """Initialize the network diagnostics utilities."""
        self.hostname = socket.gethostname()
        self.local_ip = self._get_local_ip()
        self.platform = platform.system()
        self.session = requests.Session()
        self.timeout = 10  # Default timeout in seconds
    
    def _get_local_ip(self) -> str:
        """Get the local IP address of the host."""
        try:
            # Create a socket to get the outgoing IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # Doesn't need to be reachable
            s.connect(('8.8.8.8', 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception as e:
            logger.error(f"Failed to get local IP: {str(e)}")
            return "unknown"
    
    @performance_monitor(name="network_test_connection")
    def test_connection(self, url: str, method: str = "GET", 
                       headers: Optional[Dict] = None,
                       data: Optional[Any] = None,
                       timeout: Optional[int] = None,
                       verify_ssl: bool = True) -> Dict:
        """
        Test connection to a URL and return detailed results.
        
        Args:
            url: The URL to test
            method: HTTP method to use (GET, POST, etc.)
            headers: Optional HTTP headers
            data: Optional data for POST requests
            timeout: Request timeout in seconds
            verify_ssl: Whether to verify SSL certificates
            
        Returns:
            Dict containing test results
        """
        start_time = time.time()
        timeout = timeout or self.timeout
        headers = headers or {}
        
        # Add CORS checking headers if not already present
        if 'Origin' not in headers:
            headers['Origin'] = 'https://financialnewsengine.com'
        
        result = {
            "success": False,
            "url": url,
            "method": method,
            "timestamp": datetime.utcnow().isoformat(),
            "dns_resolved": False,
            "request_sent": False,
            "response_received": False,
            "status_code": None,
            "latency_ms": None,
            "dns_latency_ms": None,
            "connection_latency_ms": None,
            "total_latency_ms": None,
            "cors_enabled": False,
            "error": None
        }
        
        try:
            # DNS resolution test
            dns_start = time.time()
            hostname = url.split("://")[-1].split("/")[0].split(":")[0]
            try:
                ip = socket.gethostbyname(hostname)
                result["dns_resolved"] = True
                result["ip_address"] = ip
                result["dns_latency_ms"] = (time.time() - dns_start) * 1000
                logger.debug(f"Resolved {hostname} to {ip} in {result['dns_latency_ms']:.2f}ms")
            except socket.gaierror as e:
                result["error"] = f"DNS resolution failed: {str(e)}"
                logger.error(f"DNS resolution failed for {hostname}: {str(e)}")
                return result
            
            # Connection test
            conn_start = time.time()
            try:
                response = self.session.request(
                    method=method,
                    url=url,
                    headers=headers,
                    data=data,
                    timeout=timeout,
                    verify=verify_ssl
                )
                result["request_sent"] = True
                result["response_received"] = True
                result["status_code"] = response.status_code
                result["headers"] = dict(response.headers)
                result["success"] = 200 <= response.status_code < 400
                result["content_type"] = response.headers.get("Content-Type")
                
                # Check for CORS headers
                result["cors_enabled"] = 'Access-Control-Allow-Origin' in response.headers
                if result["cors_enabled"]:
                    result["cors_allow_origin"] = response.headers.get('Access-Control-Allow-Origin')
                    result["cors_allow_methods"] = response.headers.get('Access-Control-Allow-Methods')
                    result["cors_allow_headers"] = response.headers.get('Access-Control-Allow-Headers')
                
                # Log sample of the response
                content_sample = response.text[:500] + '...' if len(response.text) > 500 else response.text
                result["response_sample"] = content_sample
                
                # Get SSL info if HTTPS
                if url.startswith("https://"):
                    result["ssl_verified"] = verify_ssl
            except requests.exceptions.Timeout as e:
                result["error"] = f"Request timed out after {timeout}s: {str(e)}"
                logger.error(f"Request to {url} timed out after {timeout}s: {str(e)}")
                return result
            except requests.exceptions.ConnectionError as e:
                result["error"] = f"Connection error: {str(e)}"
                logger.error(f"Connection error to {url}: {str(e)}")
                return result
            except Exception as e:
                result["error"] = f"Request failed: {str(e)}"
                logger.error(f"Request to {url} failed: {str(e)}", extra={
                    "extra": {"traceback": traceback.format_exc()}
                })
                return result
            
            result["connection_latency_ms"] = (time.time() - conn_start) * 1000
            result["total_latency_ms"] = (time.time() - start_time) * 1000
            result["latency_ms"] = result["total_latency_ms"]
            
            logger.info(
                f"Connection test to {url} completed successfully in {result['total_latency_ms']:.2f}ms "
                f"with status {result['status_code']}"
            )
            
            return result
        except Exception as e:
            result["error"] = f"Test failed: {str(e)}"
            result["total_latency_ms"] = (time.time() - start_time) * 1000
            logger.error(f"Connection test to {url} failed: {str(e)}", extra={
                "extra": {"traceback": traceback.format_exc()}
            })
            return result
    
    def ping_host(self, host: str, count: int = 4) -> Dict:
        """
        Ping a host and return results.
        
        Args:
            host: Hostname or IP to ping
            count: Number of ping packets to send
            
        Returns:
            Dict containing ping results
        """
        result = {
            "success": False,
            "host": host,
            "timestamp": datetime.utcnow().isoformat(),
            "packets_sent": count,
            "packets_received": 0,
            "packet_loss_percent": 100,
            "min_latency_ms": None,
            "avg_latency_ms": None,
            "max_latency_ms": None,
            "output": "",
            "error": None
        }
        
        try:
            # Determine ping command based on platform
            if self.platform == "Windows":
                cmd = ["ping", "-n", str(count), host]
            else:
                cmd = ["ping", "-c", str(count), host]
            
            logger.debug(f"Running ping command: {' '.join(cmd)}")
            
            # Run ping command
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            stdout, stderr = process.communicate()
            
            result["output"] = stdout
            
            if process.returncode != 0:
                result["error"] = f"Ping failed with code {process.returncode}: {stderr}"
                logger.error(f"Ping to {host} failed: {stderr}")
                return result
            
            # Parse ping output
            if self.platform == "Windows":
                # Parse Windows ping output
                try:
                    # Extract packets received
                    for line in stdout.splitlines():
                        if "Packets: Sent = " in line:
                            parts = line.split(",")
                            sent = int(parts[0].split("=")[1].strip())
                            received = int(parts[1].split("=")[1].strip())
                            loss = int(parts[2].split("=")[1].strip().replace("%", ""))
                            result["packets_sent"] = sent
                            result["packets_received"] = received
                            result["packet_loss_percent"] = loss
                            break
                    
                    # Extract latency
                    for line in stdout.splitlines():
                        if "Minimum = " in line:
                            parts = line.split(",")
                            min_ms = int(parts[0].split("=")[1].strip().replace("ms", ""))
                            avg_ms = int(parts[1].split("=")[1].strip().replace("ms", ""))
                            max_ms = int(parts[2].split("=")[1].strip().replace("ms", ""))
                            result["min_latency_ms"] = min_ms
                            result["avg_latency_ms"] = avg_ms
                            result["max_latency_ms"] = max_ms
                            break
                except Exception as e:
                    logger.error(f"Failed to parse Windows ping output: {str(e)}")
            else:
                # Parse Linux/Mac ping output
                try:
                    for line in stdout.splitlines():
                        if "packets transmitted" in line:
                            parts = line.split(",")
                            sent = int(parts[0].split()[0])
                            received = int(parts[1].split()[0])
                            loss = float(parts[2].split()[0].replace("%", ""))
                            result["packets_sent"] = sent
                            result["packets_received"] = received
                            result["packet_loss_percent"] = loss
                            break
                    
                    for line in stdout.splitlines():
                        if "min/avg/max" in line:
                            latency = line.split("=")[1].strip().split("/")
                            result["min_latency_ms"] = float(latency[0])
                            result["avg_latency_ms"] = float(latency[1])
                            result["max_latency_ms"] = float(latency[2])
                            break
                except Exception as e:
                    logger.error(f"Failed to parse Unix ping output: {str(e)}")
            
            result["success"] = result["packets_received"] > 0
            logger.info(f"Ping to {host} completed with {result['packet_loss_percent']}% packet loss")
            return result
        except Exception as e:
            result["error"] = f"Ping failed: {str(e)}"
            logger.error(f"Ping to {host} failed: {str(e)}", extra={
                "extra": {"traceback": traceback.format_exc()}
            })
            return result
    
    def trace_route(self, host: str, max_hops: int = 30) -> Dict:
        """
        Perform a traceroute to a host.
        
        Args:
            host: Hostname or IP to trace
            max_hops: Maximum number of hops
            
        Returns:
            Dict containing traceroute results
        """
        result = {
            "success": False,
            "host": host,
            "timestamp": datetime.utcnow().isoformat(),
            "hops": [],
            "reached_destination": False,
            "output": "",
            "error": None
        }
        
        try:
            # Determine traceroute command based on platform
            if self.platform == "Windows":
                cmd = ["tracert", "-d", "-h", str(max_hops), host]
            else:
                cmd = ["traceroute", "-n", "-m", str(max_hops), host]
            
            logger.debug(f"Running traceroute command: {' '.join(cmd)}")
            
            # Run traceroute command
            process = subprocess.Popen(
                cmd, 
                stdout=subprocess.PIPE, 
                stderr=subprocess.PIPE,
                universal_newlines=True
            )
            stdout, stderr = process.communicate()
            
            result["output"] = stdout
            
            if process.returncode != 0 and process.returncode != 1:
                # Note: traceroute on some systems returns 1 even on success
                result["error"] = f"Traceroute failed with code {process.returncode}: {stderr}"
                logger.error(f"Traceroute to {host} failed: {stderr}")
                return result
            
            # Simple parsing of output - just check if we reached destination
            if self.platform == "Windows":
                # For Windows tracert
                result["reached_destination"] = "Trace complete" in stdout
            else:
                # For Unix traceroute
                try:
                    ip = socket.gethostbyname(host)
                    result["reached_destination"] = ip in stdout
                except:
                    result["reached_destination"] = host in stdout
            
            result["success"] = True
            logger.info(f"Traceroute to {host} completed, destination reached: {result['reached_destination']}")
            return result
        except Exception as e:
            result["error"] = f"Traceroute failed: {str(e)}"
            logger.error(f"Traceroute to {host} failed: {str(e)}", extra={
                "extra": {"traceback": traceback.format_exc()}
            })
            return result

    def run_full_diagnostics(self, targets: List[str]) -> Dict:
        """
        Run a full network diagnostic suite against multiple targets.
        
        Args:
            targets: List of URLs or hostnames to test
            
        Returns:
            Dict containing comprehensive diagnostic results
        """
        results = {
            "timestamp": datetime.utcnow().isoformat(),
            "system_info": {
                "hostname": self.hostname,
                "local_ip": self.local_ip,
                "platform": self.platform,
                "python_version": platform.python_version()
            },
            "tests": {}
        }
        
        for target in targets:
            logger.info(f"Running full diagnostics for target: {target}")
            
            target_results = {}
            
            # Determine if target is a URL or hostname
            is_url = target.startswith(("http://", "https://"))
            hostname = target.split("://")[-1].split("/")[0].split(":")[0] if is_url else target
            
            # Run ping test
            ping_result = self.ping_host(hostname)
            target_results["ping"] = ping_result
            
            # Run traceroute
            trace_result = self.trace_route(hostname)
            target_results["traceroute"] = trace_result
            
            # Run HTTP connection test if target is a URL
            if is_url:
                connection_result = self.test_connection(target)
                target_results["http"] = connection_result
            
            results["tests"][target] = target_results
            
            logger.info(f"Completed diagnostics for {target}")
        
        return results


# Create a singleton instance
network_diagnostics = NetworkDiagnostics()


def test_es_connection():
    """Test the connection to Elasticsearch and return detailed results."""
    # Try multiple environment variable patterns for Elasticsearch URL
    es_url = (os.getenv('ELASTICSEARCH_URL') or 
              os.getenv('ELASTICSEARCH_ENDPOINT') or 
              os.getenv('ES_URL') or 
              os.getenv('ES_ENDPOINT'))
    
    es_api_key = (os.getenv('ELASTICSEARCH_API_KEY') or 
                  os.getenv('ES_API_KEY'))
    
    if not es_url:
        logger.warning("Elasticsearch URL environment variable is not set")
        return {
            "success": False,
            "error": "ELASTICSEARCH_URL environment variable is not set",
            "timestamp": datetime.utcnow().isoformat(),
            "environment_checked": ["ELASTICSEARCH_URL", "ELASTICSEARCH_ENDPOINT", "ES_URL", "ES_ENDPOINT"]
        }
        
    if not es_api_key:
        logger.warning("Elasticsearch API key environment variable is not set")
        return {
            "success": False,
            "error": "ELASTICSEARCH_API_KEY environment variable is not set",
            "timestamp": datetime.utcnow().isoformat(),
            "environment_checked": ["ELASTICSEARCH_API_KEY", "ES_API_KEY"]
        }
    
    # Validate URL format
    try:
        # Extract hostname for network tests
        if "://" in es_url:
            hostname = es_url.split("://")[-1].split("/")[0].split(":")[0]
            if "@" in hostname:
                # Handle case where credentials are in the URL
                hostname = hostname.split("@")[-1]
        else:
            # Add http:// prefix if missing
            es_url = f"http://{es_url}"
            hostname = es_url.split("://")[-1].split("/")[0].split(":")[0]
            
        logger.info(f"Testing connection to Elasticsearch at {hostname}")
    except Exception as e:
        logger.error(f"Invalid Elasticsearch URL format: {str(e)}")
        return {
            "success": False,
            "error": f"Invalid Elasticsearch URL format: {str(e)}",
            "url_provided": es_url,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    try:
        # Run network diagnostics
        ping_result = network_diagnostics.ping_host(hostname)
        
        # Test HTTP connection
        headers = {
            "Authorization": f"ApiKey {es_api_key}",
            "Content-Type": "application/json"
        }
        
        http_result = network_diagnostics.test_connection(
            url=es_url,
            headers=headers,
            timeout=10  # Increase timeout for potentially slow connections
        )
        
        # Test a sample query if connection was successful
        query_result = None
        if http_result["success"]:
            es_index = os.getenv('ELASTICSEARCH_INDEX', 'financial_news')
            query_url = f"{es_url}/{es_index}/_search"
            query = {
                "query": {
                    "match_all": {}
                },
                "size": 1
            }
            
            query_result = network_diagnostics.test_connection(
                url=query_url,
                method="POST",
                headers=headers,
                data=json.dumps(query),
                timeout=10
            )
            
            # Parse sample document if query was successful
            if query_result["success"] and query_result["status_code"] == 200:
                try:
                    response_data = json.loads(query_result["response_sample"])
                    hit_count = response_data['hits']['total']['value'] if 'hits' in response_data else 0
                    query_result["hit_count"] = hit_count
                    
                    if hit_count > 0:
                        sample_doc = response_data['hits']['hits'][0]['_source']
                        query_result["sample_document_fields"] = list(sample_doc.keys())
                except Exception as e:
                    query_result["parsing_error"] = str(e)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "elasticsearch_url": es_url.split('@')[-1] if '@' in es_url else es_url,  # Hide credentials
            "success": http_result["success"],
            "ping": ping_result,
            "connection": http_result,
            "query": query_result,
            "environment": {
                "elasticsearch_index": os.getenv('ELASTICSEARCH_INDEX', 'Not configured'),
                "region": os.getenv('AWS_REGION', 'Not configured'),
                "environment": os.getenv('ENVIRONMENT', 'development')
            }
        }
    except Exception as e:
        error_trace = traceback.format_exc()
        logger.error(f"Exception during Elasticsearch connection test: {str(e)}")
        logger.debug(f"Error traceback: {error_trace}")
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "elasticsearch_url": es_url.split('@')[-1] if '@' in es_url else es_url,  # Hide credentials
            "success": False,
            "error": str(e),
            "error_type": type(e).__name__,
            "environment": {
                "elasticsearch_index": os.getenv('ELASTICSEARCH_INDEX', 'Not configured'),
                "region": os.getenv('AWS_REGION', 'Not configured'),
                "environment": os.getenv('ENVIRONMENT', 'development')
            }
        } 