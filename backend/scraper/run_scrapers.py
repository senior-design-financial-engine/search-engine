from scrapers import OptimizedRSSFeedScraper, OptimizedAPNewsScraper
import schedule
import time
import logging
import os

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Run optimized scrapers to collect news from various sources"""
    try:
        # Create necessary directories
        os.makedirs('data', exist_ok=True)
        os.makedirs('articles', exist_ok=True)

        # SCRAPE NEWS SITES
        sources = ["npr", "bbc"]
        
        for source in sources:
            try:
                logger.info(f"Running optimized RSS scraper for {source}")
                rss_scraper = OptimizedRSSFeedScraper(source, processed_urls_file=f'data/processed_urls_optimized_{source}.json')
                rss_scraper.scrape()
            except Exception as e:
                logger.error(f"Error scraping {source}: {str(e)}")
        
        try:
            logger.info("Running optimized AP News scraper")
            ap_scraper = OptimizedAPNewsScraper()
            ap_scraper.scrape()
        except Exception as e:
            logger.error(f"Error scraping AP News: {str(e)}")
    
    except Exception as e:
        logger.error(f"Error in main scraper function: {str(e)}")

def run_scrapers():
    """Function to be called from other modules to run the scrapers"""
    logger.info("Starting optimized scrapers")
    main()
    logger.info("Optimized scrapers completed")

if __name__ == "__main__":
    # Create data directory if it doesn't exist
    os.makedirs('data', exist_ok=True)
    
    # Run once immediately
    main()
    
    # Schedule to run every minute
    logger.info("Setting up optimized scraper schedule (every minute)")
    schedule.every(1).minutes.do(main)
    
    # Run the scheduler
    logger.info("Running scheduler")
    while True:
        schedule.run_pending()
        time.sleep(1)  # Check every second 