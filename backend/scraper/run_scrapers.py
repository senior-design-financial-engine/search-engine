from .scrapers import APNewsScraper, RSSFeedScraper
from .reddit_scraper import RedditScraper
import schedule
import time
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Run all scrapers to collect news from various sources"""
    
    # Check if APIFY_API_KEY is set
    apify_api_key = os.environ.get('APIFY_API_KEY')
    if not apify_api_key:
        logger.warning("APIFY_API_KEY environment variable not set. Reddit scraper will use demo key.")
    
    try:
        # SCRAPE NEWS SITES
        sources = ["npr", "bbc"]  
        
        for source in sources:
            try:
                logger.info(f"Running RSS scraper for {source}")
                rss_scraper = RSSFeedScraper(source, processed_urls_file=f'data/processed_urls_{source}.json')
                rss_scraper.scrape()
            except Exception as e:
                logger.error(f"Error scraping {source}: {str(e)}")
        
        try:
            logger.info("Running AP News scraper")
            ap_scraper = APNewsScraper()
            ap_scraper.scrape()
        except Exception as e:
            logger.error(f"Error scraping AP News: {str(e)}")
        
        # SCRAPE REDDIT
        try:
            logger.info("Running Reddit scraper")
            reddit_scraper = RedditScraper(apify_api_key=apify_api_key)
            reddit_scraper.scrape()
        except Exception as e:
            logger.error(f"Error scraping Reddit: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in main scraper function: {str(e)}")
    
def run_scrapers():
    """Function to be called from other modules to run the scrapers"""
    logger.info("Starting scrapers")
    main()
    logger.info("Scrapers completed")

if __name__ == "__main__":
    # Run once immediately
    main()
    
    # Schedule to run every hour
    logger.info("Setting up scraper schedule (every hour)")
    schedule.every(1).hours.do(main)
    
    # Run the scheduler
    logger.info("Running scheduler")
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute
