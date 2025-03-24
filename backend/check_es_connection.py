#!/usr/bin/env python3
"""
Elasticsearch Connection Tester

This script tests the connection to Elasticsearch using the configured
environment variables. It helps diagnose common connection issues.
"""

import os
import sys
import json
import time
import requests
from dotenv import load_dotenv
import logging
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("es_connection_checker")

def main():
    """Main function to test Elasticsearch connectivity."""
    logger.info("Elasticsearch Connection Tester")
    logger.info("===============================")
    
    # Load environment variables
    logger.info("Loading environment variables...")
    load_dotenv()
    
    # Get Elasticsearch configuration
    es_url = os.getenv('ELASTICSEARCH_URL')
    es_api_key = os.getenv('ELASTICSEARCH_API_KEY')
    es_index = os.getenv('ELASTICSEARCH_INDEX')
    
    # Validate configuration
    if not es_url:
        logger.error("ELASTICSEARCH_URL environment variable is not set")
        logger.info("Please set the ELASTICSEARCH_URL in your .env file")
        sys.exit(1)
        
    if not es_api_key:
        logger.error("ELASTICSEARCH_API_KEY environment variable is not set")
        logger.info("Please set the ELASTICSEARCH_API_KEY in your .env file")
        sys.exit(1)
        
    if not es_index:
        logger.warning("ELASTICSEARCH_INDEX environment variable is not set")
        logger.info("ELASTICSEARCH_INDEX will default to 'financial_news'")
        es_index = "financial_news"
    
    # Display configuration (redacted for security)
    logger.info(f"Elasticsearch URL: {es_url}")
    logger.info(f"API Key: {'*' * 10}...{es_api_key[-5:] if es_api_key else 'None'}")
    logger.info(f"Index Name: {es_index}")
    
    # Test basic connectivity to Elasticsearch
    logger.info("\nTesting basic connectivity...")
    try:
        logger.info(f"Connecting to {es_url}...")
        
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
        
        logger.info(f"Connection response time: {request_time:.2f} seconds")
        logger.info(f"Response status code: {response.status_code}")
        
        if response.status_code >= 400:
            logger.error(f"Connection failed with status {response.status_code}")
            logger.error(f"Response: {response.text}")
            if response.status_code == 401 or response.status_code == 403:
                logger.error("Authentication failed. Please check your API key.")
            elif response.status_code == 404:
                logger.error("Elasticsearch URL not found. Please check the URL.")
        else:
            logger.info("Basic connectivity test: SUCCESS")
            logger.info(f"Response: {response.text[:100]}...")
    except requests.exceptions.RequestException as e:
        logger.error(f"Connection error: {str(e)}")
        
        # Network analysis
        if "SSLError" in str(e):
            logger.error("SSL error detected. This could be due to:")
            logger.error("  - Invalid certificate")
            logger.error("  - Incorrect protocol (http vs https)")
            logger.error("  - Outdated SSL/TLS version")
        elif "ConnectTimeout" in str(e):
            logger.error("Connection timeout. This could be due to:")
            logger.error("  - Elasticsearch service is down")
            logger.error("  - Network firewall is blocking the connection")
            logger.error("  - Incorrect hostname or port")
        elif "ConnectionError" in str(e):
            logger.error("Connection error. This could be due to:")
            logger.error("  - Elasticsearch service is not running")
            logger.error("  - Network connectivity issues")
            logger.error("  - Invalid URL")
    
    # Test index existence if basic connectivity succeeds
    if 'response' in locals() and response.status_code < 400:
        logger.info("\nTesting index existence...")
        try:
            index_url = f"{es_url}/{es_index}"
            response = requests.head(
                index_url,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info(f"Index '{es_index}' exists: SUCCESS")
                
                # Get index stats
                stats_url = f"{es_url}/{es_index}/_stats"
                stats_response = requests.get(
                    stats_url,
                    headers=headers,
                    timeout=10
                )
                
                if stats_response.status_code == 200:
                    stats = stats_response.json()
                    doc_count = stats['_all']['primaries']['docs']['count']
                    store_size = stats['_all']['primaries']['store']['size_in_bytes'] / 1024 / 1024
                    
                    logger.info(f"Index contains {doc_count} documents")
                    logger.info(f"Index size: {store_size:.2f} MB")
                else:
                    logger.warning(f"Could not get index stats: {stats_response.status_code}")
            elif response.status_code == 404:
                logger.warning(f"Index '{es_index}' does not exist")
                logger.info("This might be normal if you haven't created the index yet")
            else:
                logger.error(f"Unexpected status code checking index: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Error checking index: {str(e)}")
    
    # Try a sample query if the index exists
    if 'response' in locals() and response.status_code < 400:
        logger.info("\nTesting a sample search query...")
        try:
            query_url = f"{es_url}/{es_index}/_search"
            query = {
                "query": {
                    "match_all": {}
                },
                "size": 1
            }
            
            response = requests.get(
                query_url,
                headers=headers,
                data=json.dumps(query),
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                hit_count = result['hits']['total']['value'] if 'hits' in result else 0
                
                logger.info(f"Search query successful: {hit_count} total hits")
                logger.info("Sample query test: SUCCESS")
                
                if hit_count > 0:
                    sample_doc = result['hits']['hits'][0]['_source']
                    logger.info("Sample document fields:")
                    for key in sample_doc.keys():
                        logger.info(f"  - {key}")
                else:
                    logger.warning("No documents found in the index")
            else:
                logger.error(f"Search query failed with status {response.status_code}")
                logger.error(f"Response: {response.text}")
        except requests.exceptions.RequestException as e:
            logger.error(f"Error executing search query: {str(e)}")
    
    logger.info("\nTroubleshooting Suggestions:")
    logger.info("---------------------------")
    logger.info("1. Verify Elasticsearch service is running")
    logger.info("2. Check that your API key has appropriate permissions")
    logger.info("3. Ensure correct URL and port in the ELASTICSEARCH_URL")
    logger.info("4. Check for network/firewall restrictions")
    logger.info("5. Verify SSL certificates if using HTTPS")
    logger.info("6. Make sure the index exists and contains data")

if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1) 