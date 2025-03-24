from .scrapers import APNewsScraper, RSSFeedScraper
import schedule
import time
import os

def main():
    
    # SCRAPE DETAILS 
    sources = ["npr", "bbc"]  
    
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))

    for source in sources:
        processed_urls_file = os.path.join(script_dir, f'data/processed_urls_{source}.json')
        rss_scraper = RSSFeedScraper(source, processed_urls_file=processed_urls_file)
        rss_scraper.scrape()

    ap_scraper = APNewsScraper()
    ap_scraper.scrape()
    
def run_scrapers():
    main()

if __name__ == "__main__":
    main()
    schedule.every(1).minutes.do(main)
    print("Running programs")
    while True:
        schedule.run_pending()
        time.sleep(1)
