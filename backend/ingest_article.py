import sys
import json
import requests
import os
from datetime import datetime

ELASTICSEARCH_URL = "https://fc9fa0b183414ca28ea4c7288ad74e23.us-east-1.aws.found.io:443/financial_news/_doc?pipeline=ent-search-generic-ingestion"
API_KEY = "cnAxVV81VUJ1LXVFajl5Z0tHWlE6bldrVTQtTkRRTWFPbDQ3X0NTeXJyZw=="

def clean_text(text):
    """Clean text for Elasticsearch ingestion"""
    if not text:
        return ""
    # Remove non-printable characters and escape quotes
    text = ''.join(char for char in text if char.isprintable())
    text = text.replace('"', '\\"')
    text = text.replace("'", "\\'")
    return text

def get_sentiment_category(score):
    """Determine sentiment category based on score"""
    try:
        score = float(score)
        if score > 0.3:
            return "positive"
        elif score < -0.3:
            return "negative"
        else:
            return "neutral"
    except (ValueError, TypeError):
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

def ingest_article(article):
    """Ingest a single article into Elasticsearch"""
    try:
        # Handle both Reddit and news article formats
        if 'post' in article:  # Reddit format
            post = article.get('post', {})
            headline = clean_text(post.get('title', ''))
            
            # Use summary for content, fallback to post body if summary is empty
            content = clean_text(article.get('summary', ''))
            if not content and post.get('body'):
                content = clean_text(post.get('body', ''))
            
            url = post.get('url', '')
            
            # Use scrapedAt for timestamp, fallback to createdAt
            published_at = format_timestamp(article.get('scrapedAt')) or format_timestamp(post.get('createdAt'))
            
            # Handle sentiment data
            sentiment_data = article.get('sentiment', {})
            try:
                sentiment_score = float(sentiment_data.get('score', 0))
            except (ValueError, TypeError):
                sentiment_score = 0
                
            source = "reddit"
            
        else:  # News format (AP, BBC, CNBC, NPR)
            headline = clean_text(article.get('headline', ''))
            content = clean_text(article.get('summary', ''))
            url = article.get('url', '')
            published_at = format_timestamp(article.get('timestamp'))
            
            try:
                sentiment_score = float(article.get('sentiment', {}).get('score', 0))
            except (ValueError, TypeError):
                sentiment_score = 0
                
            source = article.get('source', 'news')
            if source == 'ap_news':
                source = 'AP'
        
        # Skip if any required field is empty
        if not all([headline, content, url]):
            print(f"Skipping article due to missing required fields: {url}")
            return False
            
        # Get sentiment category
        sentiment_category = get_sentiment_category(sentiment_score)
        
        # Create payload matching the bash script structure exactly
        payload = {
            "headline": headline,
            "content": content,
            "source": source,
            "url": url,
            "published_at": published_at,
            "category": "news",
            "sentiment_score": sentiment_score,
            "sentiment": sentiment_category
        }
        
        # Debug: Print the payload
        print(f"Sending payload for article: {headline}")
        print("----------------------------------------")
        print(f"Content preview: {content[:200]}...")
        print(f"Published at: {published_at}")
        print(f"Sentiment Category: {sentiment_category}")
        print(f"Sentiment Score: {sentiment_score}")
        print("----------------------------------------")
        
        # Send to Elasticsearch
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'ApiKey {API_KEY}'
        }
        
        response = requests.post(ELASTICSEARCH_URL, json=payload, headers=headers)
        
        if response.status_code == 201:
            print(f"Successfully ingested article: {url}")
            return True
        else:
            print(f"Failed to ingest article: {url}")
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"Error ingesting article: {str(e)}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python ingest_article.py <article_json>")
        sys.exit(1)
        
    try:
        article = json.loads(sys.argv[1])
        ingest_article(article)
    except json.JSONDecodeError:
        print("Invalid JSON format")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1) 