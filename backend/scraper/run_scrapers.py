from .scrapers import APNewsScraper, RSSFeedScraper
import schedule
import time

def main():
    
    # SCRAPE DETAILS 
    sources = ["npr", "bbc"]  

    for source in sources:
        rss_scraper = RSSFeedScraper(source, processed_urls_file=f'data/processed_urls_{source}.json')
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
