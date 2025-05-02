import sys
import json
import os
from elasticsearch import Elasticsearch
from datetime import datetime

# Initialize Elasticsearch client with correct endpoint and API key
ES_URL = "https://fc9fa0b183414ca28ea4c7288ad74e23.us-east-1.aws.found.io:443/financial_news/_doc?pipeline=ent-search-generic-ingestion"
API_KEY = "cnAxVV81VUJ1LXVFajl5Z0tHWlE6bldrVTQtTkRRTWFPbDQ3X0NTeXJyZw=="

def get_sentiment_category(score):
    """Determine sentiment category based on score"""
    if score > 0.3:
        return "positive"
    elif score < -0.3:
        return "negative"
    return "neutral"

def format_timestamp(timestamp):
    """Format timestamp to ISO format"""
    if not timestamp:
        return datetime.now().isoformat() + "Z"
        
    try:
        # Handle UTC "Z" suffix
        if isinstance(timestamp, str):
            # Remove Z suffix if present before parsing
            timestamp = timestamp.rstrip("Z")
            dt = datetime.fromisoformat(timestamp)
            return timestamp + "Z"  # Add Z back to maintain UTC
    except (ValueError, TypeError):
        try:
            # Try to parse as float (Unix timestamp)
            ts = float(timestamp)
            dt = datetime.fromtimestamp(ts)
            return dt.isoformat() + "Z"  # Add Z to indicate UTC
        except (ValueError, TypeError):
            return datetime.now().isoformat() + "Z"
    
    return timestamp  # Return original if somehow we get here

def process_reddit_article(article_data):
    """Process Reddit-specific article data"""
    try:
        post = article_data.get('post', {})
        if not post:
            return None
            
        # Get required fields
        headline = post.get('title', '')
        url = post.get('url', '')
        content = article_data.get('summary', '')
        
        # Use scrapedAt timestamp directly
        published_at = article_data.get('scrapedAt')
        if not published_at:
            # Fallback to createdAt only if scrapedAt is not available
            published_at = post.get('createdAt')
            
        if not published_at:
            # If still no timestamp, use current time
            published_at = datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ')
        
        # Get sentiment
        sentiment = article_data.get('sentiment', {})
        sentiment_score = float(sentiment.get('score', 0))
        sentiment_category = get_sentiment_category(sentiment_score)
        
        # Skip if missing required fields
        if not all([headline, url, content]):
            return None
            
        return {
            'headline': headline,
            'content': content,
            'url': url,
            'published_at': published_at,
            'source': 'reddit',
            'category': 'news',
            'sentiment_score': sentiment_score,
            'sentiment': sentiment_category
        }
    except Exception as e:
        print(f"Error processing Reddit article: {str(e)}")
        return None

def process_news_article(article_data):
    """Process news article data"""
    url = article_data.get('url', '')
    headline = article_data.get('headline', '')
    content = article_data.get('content', '')
    source = article_data.get('source', '').lower()
    
    # Convert ap_news to AP
    if source == 'ap_news':
        source = 'AP'
        
    # Handle timestamp
    published_at = article_data.get('timestamp', datetime.now().strftime('%Y-%m-%dT%H:%M:%SZ'))
    
    # Get sentiment
    sentiment_score = article_data.get('sentiment', {}).get('score', 0)
    sentiment = get_sentiment_category(sentiment_score)
    
    return {
        "headline": headline,
        "content": content,
        "source": source,
        "url": url,
        "published_at": published_at,
        "category": "news",
        "sentiment_score": sentiment_score,
        "sentiment": sentiment
    }

def process_article(article_data):
    """Process and index an article into Elasticsearch"""
    try:
        # Determine article type and process accordingly
        if 'post' in article_data:
            payload = process_reddit_article(article_data)
        else:
            payload = process_news_article(article_data)

        if not payload['url'] or not payload['headline']:
            print(f"Missing required fields in article")
            return

        # Send to Elasticsearch using requests
        import requests
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"ApiKey {API_KEY}"
        }
        response = requests.post(ES_URL, headers=headers, json=payload)
        
        print(f"----------------------------------------")
        print(f"Processed: {payload['headline']}")
        print(f"Source: {payload['source']}")
        print(f"Published At: {payload['published_at']}")
        print(f"Sentiment Category: {payload['sentiment']}")
        print(f"Sentiment Score: {payload['sentiment_score']}")
        print(f"----------------------------------------")

    except Exception as e:
        print(f"Error processing article: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ingest_article.py <article_json>")
        sys.exit(1)

    try:
        article_data = json.loads(sys.argv[1])
        process_article(article_data)
    except json.JSONDecodeError:
        print("Invalid JSON input")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1) 