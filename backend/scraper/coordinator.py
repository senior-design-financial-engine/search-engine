import subprocess
import time
import json
import os
from datetime import datetime
import threading
import queue

class Coordinator:
    def __init__(self):
        self.processed_articles_file = "data/processed_articles.json"
        self.article_queue = queue.Queue()
        self.load_processed_articles()
        
    def load_processed_articles(self):
        """Load the list of processed article URLs"""
        if os.path.exists(self.processed_articles_file):
            with open(self.processed_articles_file, 'r') as f:
                self.processed_articles = set(json.load(f))
        else:
            self.processed_articles = set()
            
    def save_processed_articles(self):
        """Save the list of processed article URLs"""
        os.makedirs(os.path.dirname(self.processed_articles_file), exist_ok=True)
        with open(self.processed_articles_file, 'w', encoding='utf-8') as f:
            json.dump(list(self.processed_articles), f)
            
    def run_scraper(self):
        """Run the article scraper script"""
        while True:
            try:
                # Run the optimized scrapers script
                subprocess.run(["python", "run_optimized_scrapers.py"], check=True)
                print(f"[{datetime.now()}] Scraper completed successfully")
            except Exception as e:
                print(f"[{datetime.now()}] Error in scraper: {e}")
            time.sleep(180)  # Wait 3 minutes before next scrape
            
    def process_new_articles(self):
        """Process newly scraped articles and add them to the queue"""
        while True:
            try:
                # Process Reddit articles
                reddit_file = "articles/reddit_threads.json"
                if os.path.exists(reddit_file):
                    with open(reddit_file, 'r', encoding='utf-8') as f:
                        articles_data = json.load(f)
                        articles = list(articles_data.values())
                        print(f"[{datetime.now()}] Found {len(articles)} Reddit articles")
                        
                        # Filter out already processed articles
                        new_articles = [article for article in articles 
                                      if article.get('post', {}).get('url') not in self.processed_articles]
                        print(f"[{datetime.now()}] Found {len(new_articles)} new Reddit articles")
                        
                        # Add new articles to queue and mark as processed
                        for article in new_articles:
                            url = article.get('post', {}).get('url')
                            if url:
                                self.article_queue.put(article)
                                self.processed_articles.add(url)
                                print(f"[{datetime.now()}] Added Reddit article to queue: {url}")

                # Process news articles from other sources
                news_sources = {
                    "cnn": "cnn_articles.json",
                    "ap_news": "ap_optimized_articles.json",
                    "cnbc": "cnbc_optimized_articles.json",
                    "bbc": "bbc_optimized_articles.json",
                    "npr": "npr_optimized_articles.json"
                }
                for source, filename in news_sources.items():
                    news_file = f"articles/{filename}"
                    if os.path.exists(news_file):
                        with open(news_file, 'r', encoding='utf-8') as f:
                            articles_data = json.load(f)
                            print(f"[{datetime.now()}] Found {len(articles_data)} {source} articles")
                            
                            # Filter out already processed articles
                            new_articles = [article for article in articles_data 
                                          if article.get('url') not in self.processed_articles]
                            print(f"[{datetime.now()}] Found {len(new_articles)} new {source} articles")
                            
                            # Add new articles to queue and mark as processed
                            for article in new_articles:
                                url = article.get('url')
                                if url:
                                    self.article_queue.put(article)
                                    self.processed_articles.add(url)
                                    print(f"[{datetime.now()}] Added {source} article to queue: {url}")
                
                # Save updated processed articles list
                self.save_processed_articles()
                    
            except Exception as e:
                print(f"[{datetime.now()}] Error processing articles: {e}")
                print(f"Error details: {str(e)}")
            time.sleep(30)  # Check for new articles every 30 seconds
            
    def ingest_articles(self):
        """Process articles from the queue and ingest them into Elasticsearch"""
        while True:
            try:
                if not self.article_queue.empty():
                    article = self.article_queue.get()
                    # Run the ingestion script with the article
                    subprocess.run(["python", "ingest_article.py", json.dumps(article)], check=True)
                    print(f"[{datetime.now()}] Ingested article: {article.get('post', {}).get('url')}")
                else:
                    # Only sleep if the queue is empty
                    time.sleep(1)  # Reduced from 5 to 1 second
            except Exception as e:
                print(f"[{datetime.now()}] Error ingesting article: {e}")
                time.sleep(1)  # Sleep on error to prevent rapid retries
            
    def run(self):
        """Start all processes"""
        print("Coordinator started")
        # Start scraper thread
        scraper_thread = threading.Thread(target=self.run_scraper)
        scraper_thread.daemon = True
        scraper_thread.start()
        print("Scraper thread started")
        
        # Start article processor thread
        processor_thread = threading.Thread(target=self.process_new_articles)
        processor_thread.daemon = True
        processor_thread.start()
        print("Article processor thread started")
        
        # Start ingestion thread
        ingestion_thread = threading.Thread(target=self.ingest_articles)
        ingestion_thread.daemon = True
        ingestion_thread.start()
        print("Ingestion thread started")
        
        # Keep main thread alive
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nShutting down coordinator...")
            self.save_processed_articles()
            print("Coordinator shut down successfully")

if __name__ == "__main__":
    coordinator = Coordinator()
    coordinator.run() 