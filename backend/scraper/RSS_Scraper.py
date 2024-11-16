import feedparser
import json
import os
import time
from news_sources import NEWS_SOURCES 
from WebScraper import WebScraper

class RSSFeedScraper:
    def __init__(self, source, processed_urls_file='processed_urls.json'):
        self.source = source
        self.feed_url = NEWS_SOURCES.get(self.source, {}).get('rss_feed')
        if not self.feed_url:
            raise ValueError(f"No RSS feed URL defined for source: {self.source}")
        self.processed_urls_file = processed_urls_file
        self.processed_urls = self.load_processed_urls()
    
    def load_processed_urls(self):
        if os.path.exists(self.processed_urls_file):
            with open(self.processed_urls_file, 'r') as f:
                return set(json.load(f))
        return set()
    
    def save_processed_urls(self):
        with open(self.processed_urls_file, 'w') as f:
            json.dump(list(self.processed_urls), f)
    
    def get_articles(self):
        feed = feedparser.parse(self.feed_url)
        articles = []
        for entry in feed.entries:
            articles.append((entry.link, entry.title))
        return articles
    
    def scrape_new_articles(self):
        articles = self.get_articles()
        new_articles = []
        for url, title in articles:
            if url not in self.processed_urls:
                new_articles.append((url, title))
                self.processed_urls.add(url)
        self.save_processed_urls()
        return new_articles
    
    def scrape(self):
        new_articles = self.scrape_new_articles()
        for url, title in new_articles:
            scraper = WebScraper(url, self.source)
            try:
                scraper.scrape()
                safe_title = ''.join(c if c.isalnum() else '_' for c in title)[:50]
                filename = f"articles/{self.source}_{safe_title}.json"
                scraper.save_to_json(filename)
                print(f"Scraped article: {title}")
                time.sleep(5) 
            except Exception as e:
                print(f"Error scraping {url}: {e}")