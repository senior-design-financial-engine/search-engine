#!/usr/bin/env python3

import os
import json
import sys
from datetime import datetime
from pathlib import Path

# Get the absolute path of the backend directory
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

# Import Engine directly from the absolute path
sys.path.insert(0, BACKEND_DIR)  # Add backend to path
from es_database.Engine import Engine

def load_articles_from_file(filepath):
    """Load articles from a JSON file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"Error loading articles from {filepath}: {e}")
        return []

def format_article_for_db(article):
    """Format article data to match the database schema."""
    return {
        "headline": article.get("headline", ""),
        "content": article.get("content", ""),
        "source": article.get("source", "unknown"),
        "url": article.get("url", ""),
        "published_at": article.get("date", datetime.now().strftime("%B %d, %Y")),
        "category": "news"  # Default category
    }

def load_articles_to_db():
    """Load articles from the articles directory to the Elasticsearch database."""
    print("Starting database update...")
    
    # Ensure we're in the correct directory
    os.chdir(BACKEND_DIR)
    
    # Initialize the database engine
    engine = Engine()
    
    # Process and load articles into the database
    articles_dir = os.path.join(BACKEND_DIR, 'scraper', 'articles')
    
    if not os.path.exists(articles_dir):
        print(f"Articles directory {articles_dir} does not exist.")
        return
    
    article_files = [os.path.join(articles_dir, f) for f in os.listdir(articles_dir) if f.endswith('.json')]
    print(f"Found {len(article_files)} article files to process.")
    
    total_processed = 0
    total_added = 0
    
    for article_file in article_files:
        filename = os.path.basename(article_file)
        source = filename.split("_")[0]  # Extract source from filename
        articles = load_articles_from_file(article_file)
        print(f"Processing {len(articles)} articles from {source}...")
        
        for article in articles:
            article["source"] = source
            db_article = format_article_for_db(article)
            total_processed += 1
            
            try:
                article_id = engine.add_article(db_article)
                if article_id:
                    total_added += 1
            except Exception as e:
                print(f"Error adding article to database: {e}")
    
    print(f"Database update complete. Processed {total_processed} articles, added {total_added} to the database.")

if __name__ == "__main__":
    load_articles_to_db() 