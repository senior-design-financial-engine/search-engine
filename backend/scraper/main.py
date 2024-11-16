from RSS_Scraper import RSSFeedScraper
import schedule
import time

def main():
    sources = ["npr", "bbc"]  

    for source in sources:
        rss_scraper = RSSFeedScraper(source, processed_urls_file=f'processed_urls_{source}.json')
        rss_scraper.scrape()

if __name__ == "__main__":
    main()
    schedule.every(1).minutes.do(main)
    print("running programs")
    while True:
        schedule.run_pending()
        time.sleep(1)