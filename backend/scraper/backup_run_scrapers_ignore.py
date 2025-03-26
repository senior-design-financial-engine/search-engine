from .scrapers import APNewsScraper, RSSFeedScraper
from .reddit_scraper import RedditScraper
import schedule
import time
import logging
import os
import json

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def scrape_rss_source(source, feed_url, processed_urls_file):
    """Scrape a single RSS feed for a source"""
    try:
        logger.info(f"Running RSS scraper for {source} with feed: {feed_url}")
        rss_scraper = RSSFeedScraper(source, processed_urls_file=processed_urls_file)
        rss_scraper.scrape()
    except Exception as e:
        logger.error(f"Error scraping {source} feed {feed_url}: {str(e)}")

def main():
    """Run all scrapers to collect news from various sources"""
    
    # Load sources configuration
    try:
        with open("data/sources.json", "r") as f:
            sources_config = json.load(f)
    except Exception as e:
        logger.error(f"Error loading sources configuration: {str(e)}")
        return

    try:
        # SCRAPE NEWS SITES
        for source, config in sources_config.items():
            if source != "ap_news":  # AP News has its own scraper
                # Scrape main RSS feed
                if "rss_feed" in config:
                    processed_urls_file = f'data/processed_urls_{source}.json'
                    scrape_rss_source(source, config["rss_feed"], processed_urls_file)
                
                # Scrape additional feeds if present
                if "additional_feeds" in config:
                    for i, feed_url in enumerate(config["additional_feeds"]):
                        processed_urls_file = f'data/processed_urls_{source}_{i+1}.json'
                        scrape_rss_source(source, feed_url, processed_urls_file)
        
        # Run AP News scraper
        try:
            logger.info("Running AP News scraper")
            ap_scraper = APNewsScraper()
            ap_scraper.scrape()
        except Exception as e:
            logger.error(f"Error scraping AP News: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in main scraper function: {str(e)}")
    
def run_scrapers():
    """Function to be called from other modules to run the scrapers"""
    logger.info("Starting scrapers")
    main()
    logger.info("Scrapers completed")

if __name__ == "__main__":
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Run once immediately
    main()
    
    # Schedule to run every hour
    logger.info("Setting up scraper schedule (every hour)")
    schedule.every(1).hours.do(main)
    
    # Run the scheduler
    logger.info("Running scheduler")
    while True:
        schedule.run_pending()
        time.sleep(1)  # Check every minute
