import requests
from bs4 import BeautifulSoup
import json
import time
import os
from urllib.parse import urljoin
from WebScraper import WebScraper  
from news_sources import NEWS_SOURCES  

class APNewsScraper:
    def __init__(self, processed_urls_file='processed_urls_ap_news.json'):
        self.hub_urls = [
            "https://apnews.com/hub/economy",
            "https://apnews.com/hub/financial-wellness",
            "https://apnews.com/hub/financial-markets"
        ]
        self.processed_urls_file = processed_urls_file
        self.processed_urls = self.load_processed_urls()
        self.articles_data = []

    def load_processed_urls(self):
        if os.path.exists(self.processed_urls_file):
            with open(self.processed_urls_file, 'r') as f:
                return set(json.load(f))
        return set()

    def save_processed_urls(self):
        with open(self.processed_urls_file, 'w') as f:
            json.dump(list(self.processed_urls), f, indent=4)

    def scrape_article_urls(self, url):
        headers = {
            "User-Agent": "Mozilla/5.0 (compatible; ArticleScraper/1.0; +http://yourwebsite.com/)"
        }
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
        except requests.exceptions.HTTPError as http_err:
            print(f"HTTP error occurred while accessing {url}: {http_err}")
            return []
        except Exception as err:
            print(f"An error occurred while accessing {url}: {err}")
            return []

        soup = BeautifulSoup(response.text, 'html.parser')
        article_urls = []

        articles = soup.find_all('div', class_='PageList-items-item')

        for article in articles:
            title_div = article.find('h3', class_='PagePromo-title')
            if title_div:
                link_tag = title_div.find('a', class_='Link')
                if link_tag and 'href' in link_tag.attrs:
                    article_url = urljoin('https://apnews.com', link_tag['href'])
                    if article_url not in self.processed_urls:
                        article_urls.append(article_url)
                        self.processed_urls.add(article_url)

        return article_urls
    
    def scrape(self):
        for hub_url in self.hub_urls:
            print(f"Scraping articles from: {hub_url}")
            article_urls = self.scrape_article_urls(hub_url)
            print(f"Found {len(article_urls)} new articles.")
            time.sleep(2)  

            for url in article_urls:
                print(f"Scraping article: {url}")
                scraper = WebScraper(url, "ap_news")
                article_data = scraper.scrape()
                if article_data:
                    self.articles_data.append(article_data)
                    print(f"Scraped article: {article_data['headline']}")
                else:
                    print(f"Failed to scrape article at {url}")
                time.sleep(5)  

        self.save_processed_urls()
        self.save_articles_data()

    def save_articles_data(self):
        """Save all scraped articles to a JSON file."""
        os.makedirs('articles', exist_ok=True)
        filename = "articles/ap_news_articles.json"
        new_articles = []
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
            urls_in_existing = {article['url'] for article in existing_data}
            new_articles = [article for article in self.articles_data if article['url'] not in urls_in_existing]
            combined_data = existing_data + new_articles
        else:
            combined_data = self.articles_data
            new_articles = self.articles_data  

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
        print(f"Saved {len(new_articles)} new article{'s' if len(new_articles) != 1 else ''} to {filename}")

        self.articles_data = []
