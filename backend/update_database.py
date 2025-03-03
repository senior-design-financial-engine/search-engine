from es_database import Engine
from scraper import run_scrapers
import os
import json
import logging
import argparse
import time
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Define data directory
data_dir = os.path.join("scraper", "articles")

def process_article(article, source):
    """Process a single article and return data in the format Elasticsearch expects"""
    # Extract fields with defaults for missing values
    processed_article = {
        "url": article.get("url", ""),
        "headline": article.get("headline", "No headline"),
        "source": source,
        "published_at": article.get("date", datetime.now().strftime("%Y-%m-%d")),
        "content": article.get("content", ""),
    }
    
    # Add additional fields if they exist
    if "category" in article:
        processed_article["category"] = article["category"]
    if "score" in article:
        processed_article["score"] = article["score"]
        
    return processed_article

def update_elasticsearch():
    """Add all articles to Elasticsearch"""
    # Initialize Elasticsearch engine
    engine = Engine()
    engine.config.validate_config()
    
    total_added = 0
    
    # Make sure data directory exists
    if not os.path.exists(data_dir):
        logger.warning(f"Data directory {data_dir} does not exist. No articles to process.")
        return
    
    # Process each JSON file in the articles directory
    for file in os.listdir(data_dir):
        if not file.endswith('.json'):
            continue
            
        file_path = os.path.join(data_dir, file)
        logger.info(f"Processing {file_path}")
        
        try:
            with open(file_path, 'r', encoding='utf-8') as fp:
                data = json.load(fp)
                
                # Determine source from filename (e.g. "npr_articles.json" -> "npr")
                source = file.split("_")[0]
                
                articles_added = 0
                for article in data:
                    try:
                        # Process the article data
                        processed_article = process_article(article, source)
                        
                        # Add to Elasticsearch
                        engine.add_article(article=processed_article)
                        articles_added += 1
                        
                    except Exception as e:
                        logger.error(f"Error processing article {article.get('url', 'unknown')}: {str(e)}")
                
                logger.info(f"Added {articles_added} articles from {file}")
                total_added += articles_added
                
        except Exception as e:
            logger.error(f"Error processing file {file}: {str(e)}")
    
    logger.info(f"Total articles added to Elasticsearch: {total_added}")
    return total_added

def main(skip_scrape=False, retry_count=3, retry_delay=5):
    """Main function to update the database"""
    logger.info("Starting database update process")
    
    if not skip_scrape:
        # Run scrapers to collect new data
        logger.info("Running scrapers to collect new data")
        run_scrapers()
    else:
        logger.info("Skipping scraping phase as requested")
    
    # Try to update Elasticsearch with retries
    total_added = 0
    for attempt in range(retry_count):
        try:
            logger.info(f"Updating Elasticsearch (attempt {attempt+1}/{retry_count})")
            total_added = update_elasticsearch()
            logger.info(f"Successfully added {total_added} articles to Elasticsearch")
            break
        except Exception as e:
            logger.error(f"Error updating Elasticsearch (attempt {attempt+1}/{retry_count}): {str(e)}")
            if attempt < retry_count - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
    
    logger.info("Database update process completed")
    return total_added

if __name__ == "__main__":
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Update Elasticsearch with scraped content')
    parser.add_argument('--skip-scrape', action='store_true', 
                        help='Skip the scraping phase and only update Elasticsearch with existing files')
    parser.add_argument('--retries', type=int, default=3,
                        help='Number of times to retry updating Elasticsearch on failure')
    parser.add_argument('--retry-delay', type=int, default=5,
                        help='Delay in seconds between retry attempts')
    
    args = parser.parse_args()
    
    # Run the main function with parsed arguments
    main(skip_scrape=args.skip_scrape, retry_count=args.retries, retry_delay=args.retry_delay)
        
    