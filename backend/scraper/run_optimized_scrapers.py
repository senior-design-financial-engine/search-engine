from scrapers import OptimizedRSSFeedScraper, OptimizedAPNewsScraper, CNNScraper
import schedule
import time
import logging
import os

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

def main():
    """Main function to run all optimized scrapers."""
    try:
        # Create data directory if it doesn't exist
        os.makedirs('data', exist_ok=True)
        
        # Run RSS feed scrapers (BBC, NPR, CNBC TV18)
        rss_sources = ["bbc", "npr", "cnbc"]
        for source in rss_sources:
            try:
                scraper = OptimizedRSSFeedScraper(source)
                scraper.scrape()
                logger.info(f"Completed scraping {source}")
            except Exception as e:
                logger.error(f"Error scraping {source}: {e}")

        # Run AP News scraper
        try:
            ap_scraper = OptimizedAPNewsScraper()
            ap_scraper.scrape()
            logger.info("Completed scraping AP News")
        except Exception as e:
            logger.error(f"Error scraping AP News: {e}")

        # Run CNN scraper
        try:
            cnn_scraper = CNNScraper()
            cnn_scraper.scrape()
            logger.info("Completed scraping CNN")
        except Exception as e:
            logger.error(f"Error scraping CNN: {e}")

        logger.info("Completed all scraping tasks")
    except Exception as e:
        logger.error(f"Error in main scraping process: {e}")

def run_scrapers():
    """Function to be called from other modules to run the scrapers"""
    logger.info("Starting optimized scrapers")
    main()
    logger.info("Optimized scrapers completed")

if __name__ == "__main__":
    # Run immediately on startup
    main()
    
    # Schedule to run every minute
    schedule.every(1).minutes.do(main)
    
    # Keep the script running
    while True:
        schedule.run_pending()
        time.sleep(1)  # Check every second for pending tasks 