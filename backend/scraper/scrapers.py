import requests
from bs4 import BeautifulSoup
import json
import time
import os
import feedparser
from urllib.parse import urljoin
import datetime

with open("data/sources.json") as f:
    NEWS_SOURCES = json.load(f)

class RSSFeedScraper:
    def __init__(self, source, processed_urls_file='data/processed_urls.json'):
        self.source = source

        with open("data/sources.json") as f:
            self.feed_url = json.load(f).get(self.source, {}).get('rss_feed')
        
        if not self.feed_url:
            raise ValueError(f"No RSS feed URL defined for source: {self.source}")
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
                article_data = scraper.scrape()  
                self.articles_data.append(article_data)  
                print(f"Scraped article: {title}")
                time.sleep(5)  
            except Exception as e:
                print(f"Error scraping {url}: {e}")

        self.save_articles_data()

    def save_articles_data(self):
        """Save all scraped articles to a JSON file."""
        os.makedirs('articles', exist_ok=True)
        filename = f"articles/{self.source}_articles.json"
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)

            urls_in_existing = {article['url'] for article in existing_data}
            new_articles = [article for article in self.articles_data if article['url'] not in urls_in_existing]
            combined_data = existing_data + new_articles
        else:
            combined_data = self.articles_data

        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
        print(f"Saved {len(combined_data)} articles to {filename}")

        self.articles_data = []




class APNewsScraper:
    def __init__(self, processed_urls_file='data/processed_urls_ap_news.json'):
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
        filename = "articles/ap_articles.json"
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





class WebScraper:
    def __init__(self, url: str, source: str):
        """Initialize with the URL and news source type."""
        self.url = url
        self.source = source
        self.html_content = None
        self.article_data = {}

    def fetch_content(self):
        """Fetch the HTML content of the webpage."""
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(self.url, headers=headers)
        self.html_content = response.content

    def build_find_kwargs(self, rule):
        """Helper method to build keyword arguments for find/find_all based on the rule."""
        kwargs = {}
        if 'id' in rule:
            kwargs['id'] = rule['id']
        if 'class' in rule:
            kwargs['class_'] = rule['class']
        if 'attrs' in rule:
            kwargs['attrs'] = rule['attrs']
        return kwargs

    def parse_content(self):
        """
        Parse the HTML content based on source rules and extract the article headline,
        date, and content.
        """
        soup = BeautifulSoup(self.html_content, "html.parser")
        source_rules = NEWS_SOURCES.get(self.source)
        if not source_rules:
            raise ValueError(f"No parsing rules defined for source: {self.source}")

        cleanup_rules = source_rules.get("cleanup", [])
        for rule in cleanup_rules:
            kwargs = self.build_find_kwargs(rule)
            for tag in soup.find_all(rule.get("tag"), **kwargs):
                tag.decompose()

        headline_rules = source_rules.get("headline", {})
        kwargs = self.build_find_kwargs(headline_rules)
        headline_tag = soup.find(headline_rules.get("tag"), **kwargs)
        headline = headline_tag.get_text(strip=True) if headline_tag else "No headline found"

        timestamp_rules = source_rules.get("timestamp", {})
        kwargs = self.build_find_kwargs(timestamp_rules)
        timestamp_tag = soup.find(timestamp_rules.get("tag"), **kwargs)
        # If the tag is bsp-timestamp (used by AP News) and has data-timestamp, convert it.
        if timestamp_tag:
            if timestamp_tag.name.lower() == "bsp-timestamp" and timestamp_tag.has_attr("data-timestamp"):
                ts_ms = int(timestamp_tag["data-timestamp"])
                ts = ts_ms / 1000.0
                date_only = datetime.datetime.utcfromtimestamp(ts).strftime("%B %d, %Y")
            elif timestamp_tag.has_attr("datetime"):
                full_datetime = timestamp_tag["datetime"]
                date_only = full_datetime.split("T")[0]
            else:
                date_only = timestamp_tag.get_text(strip=True)
        else:
            date_only = "No date found"

        content = ""
        content_rules = source_rules.get("content", {})
        containers = []
        if 'containers' in content_rules:
            kwargs = self.build_find_kwargs(content_rules['containers'])
            containers = soup.find_all(content_rules['containers'].get("tag"), **kwargs)
        elif 'container' in content_rules:
            kwargs = self.build_find_kwargs(content_rules['container'])
            container = soup.find(content_rules['container'].get("tag"), **kwargs)
            if container:
                containers = [container]
        for container in containers:
            if container:
                kwargs = self.build_find_kwargs(content_rules['paragraphs'])
                paragraphs = container.find_all(content_rules['paragraphs'].get("tag"), **kwargs)
                for paragraph in paragraphs:
                    content += paragraph.get_text(" ", strip=True) + " "
        if not content.strip():
            content = "No content found"

        self.article_data = {
            "url": self.url,
            "headline": headline,
            "date": date_only,
            "content": content.strip()
        }

    def scrape(self):
        """Perform the complete scraping process."""
        self.fetch_content()
        self.parse_content()
        return self.article_data




"""
For future reference, some JSON outputs will containt '\' throughout the parsed content which will cause noise when running it 
through a NLP model. In order to avoid this pointless noise, load the JSON content into a python string and it will remove
the JSON '\' characters, making it clean and ready for summarization use. 
"""

#with open('article.json', 'r', encoding='utf-8') as f:
#    article_data = json.load(f)
    
#content = article_data['content']