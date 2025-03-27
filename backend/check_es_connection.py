#!/usr/bin/env python3
"""
Elasticsearch Connection Tester

This script tests the connection to Elasticsearch using the configured
environment variables. It helps diagnose common connection issues.

Usage:
  python check_es_connection.py [--verbose]

Returns:
  Exit code 0 if all tests pass
  Exit code 1 if basic connectivity fails
  Exit code 2 if HTTP connectivity fails
  Exit code 3 if Elasticsearch client connection fails
  Exit code 4 if index operations fail

This makes it suitable for use in CI/CD pipelines and automated scripts.
"""

import os
import sys
import json
import time
import requests
from dotenv import load_dotenv
import logging
import traceback
from elasticsearch import Elasticsearch
import urllib3
import socket
import argparse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("es_connection_checker")

# Disable insecure HTTPS warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_elasticsearch_config():
    """Get Elasticsearch configuration from environment variables"""
    # Load environment variables from .env file
    load_dotenv()
    
    config = {
        'url': os.getenv('ELASTICSEARCH_URL'),
        'api_key': os.getenv('ELASTICSEARCH_API_KEY'),
        'index': os.getenv('ELASTICSEARCH_INDEX', 'financial_news')
    }
    
    # Check if required values are present
    for key, value in config.items():
        if not value and key != 'api_key':  # API key might be empty for certain configs
            logger.error(f"ERROR: Missing required environment variable for {key}")
    
    return config

def test_basic_connectivity(url):
    """Test basic network connectivity to the Elasticsearch endpoint"""
    logger.info("\n=== Testing basic network connectivity ===")
    
    # Extract host and port from URL
    if url.startswith('https://'):
        url = url[8:]  # Remove https://
    elif url.startswith('http://'):
        url = url[7:]  # Remove http://
    
    # Extract port if specified
    host = url
    port = 443  # Default to HTTPS port
    
    if ':' in url:
        host, port_str = url.split(':')
        if '/' in port_str:
            port_str = port_str.split('/')[0]
        port = int(port_str)
    
    logger.info(f"Testing connection to host: {host} on port: {port}")
    
    try:
        # Try to establish a socket connection
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)  # 5 second timeout
        result = sock.connect_ex((host, port))
        
        if result == 0:
            logger.info(f"✅ Socket connection successful to {host}:{port}")
        else:
            logger.error(f"❌ Socket connection failed to {host}:{port} with error code: {result}")
            return False
        
        sock.close()
        return True
    except socket.gaierror:
        logger.error(f"❌ DNS resolution failed for host: {host}")
        return False
    except socket.timeout:
        logger.error(f"❌ Connection timed out for host: {host}:{port}")
        return False
    except Exception as e:
        logger.error(f"❌ Connection error: {str(e)}")
        return False

def test_http_connectivity(url):
    """Test HTTP connectivity to Elasticsearch"""
    logger.info("\n=== Testing HTTP connectivity ===")
    
    try:
        # Make a simple GET request to the server (without auth)
        # We're just checking if we can reach it at all, not if auth works
        response = requests.get(
            url,
            timeout=10,
            verify=False  # Disable SSL verification for testing
        )
        
        logger.info(f"HTTP Status: {response.status_code}")
        
        if response.status_code == 401:
            logger.info("✅ Elasticsearch server is reachable (got 401 Unauthorized, which is expected without auth)")
            return True
        elif 200 <= response.status_code < 300:
            logger.info("✅ Elasticsearch server is reachable (got successful response)")
            return True
        else:
            logger.warning(f"⚠️ Elasticsearch server returned unexpected status: {response.status_code}")
            logger.warning(f"Response body: {response.text[:200]}...")
            return False
            
    except requests.exceptions.SSLError as e:
        logger.error(f"❌ SSL Error connecting to Elasticsearch: {str(e)}")
        logger.error("Try setting verify=False in your Elasticsearch client or fix SSL certificates")
        return False
    except requests.exceptions.ConnectionError as e:
        logger.error(f"❌ Connection Error: {str(e)}")
        logger.error("This could indicate network connectivity issues or firewall restrictions")
        return False
    except requests.exceptions.Timeout:
        logger.error("❌ Connection Timeout")
        logger.error("The server took too long to respond. Check network latency or server load")
        return False
    except Exception as e:
        logger.error(f"❌ Error testing HTTP connectivity: {str(e)}")
        return False

def test_es_client(url, api_key=None):
    """Test Elasticsearch client connectivity with proper authentication"""
    logger.info("\n=== Testing Elasticsearch client connection ===")
    
    try:
        # Get the Elasticsearch version
        import elasticsearch
        es_version = elasticsearch.__version__
        es_major_version = int(es_version.split('.')[0])
        logger.info(f"Using Elasticsearch client version: {es_version}")
        
        # Configure the Elasticsearch client based on version
        if es_major_version >= 8:
            # For ES 8.x
            if api_key:
                es = Elasticsearch(
                    url,
                    api_key=api_key,
                    verify_certs=False,  # For testing only
                    request_timeout=10
                )
            else:
                es = Elasticsearch(
                    url,
                    verify_certs=False,  # For testing only
                    request_timeout=10
                )
        else:
            # For ES 7.x and earlier
            if api_key:
                es = Elasticsearch(
                    [url],
                    api_key=api_key,
                    verify_certs=False,  # For testing only
                    request_timeout=10
                )
            else:
                es = Elasticsearch(
                    [url],
                    verify_certs=False,  # For testing only
                    request_timeout=10
                )
        
        # Check if the cluster is responding
        info = es.info()
        
        logger.info("✅ Elasticsearch client connection successful!")
        logger.info(f"Cluster name: {info.get('cluster_name', 'N/A')}")
        logger.info(f"Elasticsearch version: {info.get('version', {}).get('number', 'N/A')}")
        
        # Test cluster health
        health = es.cluster.health()
        logger.info(f"Cluster health: {health.get('status', 'unknown')}")
        
        return True, es
    except Exception as e:
        logger.error(f"❌ Elasticsearch client connection failed: {str(e)}")
        logger.error(f"Exception traceback: {traceback.format_exc()}")
        return False, None

def test_index_operations(es, index_name):
    """Test basic index operations"""
    logger.info(f"\n=== Testing operations on index '{index_name}' ===")
    
    try:
        # Check if the index exists
        index_exists = es.indices.exists(index=index_name)
        
        if index_exists:
            logger.info(f"✅ Index '{index_name}' exists")
            
            # Get index stats
            stats = es.indices.stats(index=index_name)
            doc_count = stats['indices'][index_name]['total']['docs']['count']
            
            logger.info(f"Index stats: {doc_count} documents")
            
            # Try a simple search
            search_result = es.search(
                index=index_name,
                body={"query": {"match_all": {}}},
                size=1
            )
            
            hits = search_result['hits']['total']['value']
            logger.info(f"Search test: Found {hits} documents")
            
            if hits > 0:
                logger.info("✅ Search operation successful")
            else:
                logger.warning("⚠️ Search returned 0 results (this may be normal for a new index)")
        else:
            logger.warning(f"⚠️ Index '{index_name}' does not exist")
            
            # For CI/CD, we'll just warn but not try to create the index
            logger.warning("Index creation skipped in automated testing mode")
            return True
        
        return True
    except Exception as e:
        logger.error(f"❌ Index operations failed: {str(e)}")
        return False

def main():
    """Main function to test Elasticsearch connectivity."""
    parser = argparse.ArgumentParser(description='Test Elasticsearch connectivity')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('--no-prompt', action='store_true', help='Run without interactive prompts (for CI/CD)')
    args = parser.parse_args()
    
    # Set logging level based on verbosity
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
    logger.info("=== Elasticsearch Connection Checker ===")
    
    # Get config from environment
    config = get_elasticsearch_config()
    
    if not config['url']:
        logger.error("❌ ERROR: ELASTICSEARCH_URL is not set. Please configure it in .env file")
        sys.exit(1)
    
    # Test basic network connectivity
    if not test_basic_connectivity(config['url']):
        logger.error("\n❌ CRITICAL: Basic network connectivity failed. Please check:")
        logger.error("  - Network connectivity")
        logger.error("  - Firewall settings")
        logger.error("  - DNS resolution")
        logger.error("  - VPC/network configuration if running on AWS")
        sys.exit(1)
    
    # Test HTTP connectivity
    if not test_http_connectivity(config['url']):
        logger.error("\n❌ CRITICAL: HTTP connectivity failed. Please check:")
        logger.error("  - SSL/TLS configuration")
        logger.error("  - HTTP proxy settings")
        logger.error("  - API Gateway/Load Balancer settings if applicable")
        sys.exit(2)
    
    # Test Elasticsearch client
    success, es_client = test_es_client(config['url'], config['api_key'])
    if not success:
        logger.error("\n❌ CRITICAL: Elasticsearch client connection failed. Please check:")
        logger.error("  - API Key validity")
        logger.error("  - Elasticsearch service health")
        logger.error("  - Network ACLs and security groups")
        sys.exit(3)
    
    # Test index operations
    if not test_index_operations(es_client, config['index']):
        logger.error("\n⚠️ WARNING: Index operations failed. Please check:")
        logger.error("  - Index permissions")
        logger.error("  - Index configuration")
        logger.error("  - Elasticsearch disk space and quotas")
        sys.exit(4)
    
    logger.info("\n✅ SUCCESS: All Elasticsearch connection tests passed!")
    
    # Print diagnostic information
    logger.info("\n=== Diagnostic Information ===")
    logger.info(f"Elasticsearch URL: {config['url']}")
    logger.info(f"Index name: {config['index']}")
    
    # Get detailed cluster information
    try:
        info = es_client.info()
        cluster_name = info.get('cluster_name', 'N/A')
        es_version = info.get('version', {}).get('number', 'N/A')
        
        health = es_client.cluster.health()
        status = health.get('status', 'unknown')
        nodes = health.get('number_of_nodes', 0)
        
        logger.info(f"Cluster name: {cluster_name}")
        logger.info(f"Elasticsearch version: {es_version}")
        logger.info(f"Cluster health: {status}")
        logger.info(f"Number of nodes: {nodes}")
    except Exception as e:
        logger.error(f"Error getting cluster information: {str(e)}")
    
    logger.info("\nTroubleshooting Suggestions:")
    logger.info("1. If you're seeing authentication errors, verify your API key")
    logger.info("2. If you're having connectivity issues, check your VPC and security group settings")
    logger.info("3. For AWS Elasticsearch Service, verify domain access policies")
    
    # Exit with success code
    sys.exit(0)

if __name__ == "__main__":
    main() 