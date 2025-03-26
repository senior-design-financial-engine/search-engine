import requests
from bs4 import BeautifulSoup
import json
import time
import os
import feedparser
from urllib.parse import urljoin

# Define topics and their related keywords
TOPICS = {
    # Individual company tags
    "nvidia": ["nvidia", "nvda", "jensen huang", "rtx", "ai chips", "gpu"],
    "microsoft": ["microsoft", "msft", "satya nadella", "azure", "windows", "xbox"],
    "apple": ["apple", "aapl", "tim cook", "iphone", "mac", "ipad"],
    "alphabet": ["alphabet", "googl", "goog", "google", "sundar pichai", "youtube", "android"],
    "amazon": ["amazon", "amzn", "andy jassy", "aws", "prime", "alexa"],
    "meta": ["meta", "meta platforms", "facebook", "mark zuckerberg", "instagram", "whatsapp"],
    "tesla": ["tesla", "tsla", "elon musk", "cybertruck"],
    
    # Other specific company tags
    "netflix": ["netflix", "nflx", "netflix original", "reed hastings", "ted sarandos"],
    "jp_morgan": ["jp morgan", "jpm", "jpmorgan", "jamie dimon", "jp morgan chase"],
    "tempus_ai": ["tempus ai", "tempus labs", "eric lefkofsky"],
    "openai": ["openai", "sam altman", "chatgpt", "gpt-4", "anthropic", "claude", "microsoft ai"]
}

# Load sources configuration
with open("data/sources.json") as f:
    NEWS_SOURCES = json.load(f)

class RSSFeedScraper:
    def __init__(self, source, processed_urls_file='data/processed_urls.json'):
        self.source = source

        with open("sources.json") as f:
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

    def get_article_timestamp(self, soup):
        """Extract article publication timestamp from the page."""
        if self.source == "ap_news":
            # AP News uses bsp-timestamp with data-timestamp attribute
            timestamp_div = soup.find('bsp-timestamp')
            if timestamp_div and 'data-timestamp' in timestamp_div.attrs:
                # Convert milliseconds timestamp to datetime
                timestamp = int(timestamp_div['data-timestamp']) / 1000  # Convert to seconds
                return time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
        return None

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
        """Parse the HTML content based on source rules and extract the article headline and content."""
        soup = BeautifulSoup(self.html_content, "html.parser")
        source_rules = NEWS_SOURCES.get(self.source)

        if not source_rules:
            raise ValueError(f"No parsing rules defined for source: {self.source}")

        # Clean up unwanted elements first
        cleanup_rules = source_rules.get("cleanup", [])
        for rule in cleanup_rules:
            kwargs = self.build_find_kwargs(rule)
            for tag in soup.find_all(rule.get("tag"), **kwargs):
                tag.decompose()

        # Remove common unwanted elements
        for unwanted in soup.find_all(['script', 'style', 'iframe', 'nav', 'header', 'footer', 'aside']):
            unwanted.decompose()
        
        # Remove social media buttons and share options
        for social in soup.find_all(class_=['ActionBar', 'Page-actions', 'Page-actions-menu', 'ActionLink']):
            social.decompose()
        
        # Remove ads
        for ad in soup.find_all(class_=['LeaderBoardAd', 'Ad', 'Advertisement']):
            ad.decompose()

        # Get headline
        headline_rules = source_rules.get("headline", {})
        kwargs = self.build_find_kwargs(headline_rules)
        headline_tag = soup.find(headline_rules.get("tag"), **kwargs)
        headline = headline_tag.get_text(strip=True) if headline_tag else "No headline found"

        # Get content
        content = ""
        content_rules = source_rules.get("content", {})

        # For AP News, specifically target the main story content
        if self.source == "ap_news":
            story_body = soup.find('div', class_='RichTextStoryBody')
            if story_body:
                paragraphs = story_body.find_all('p')
                content = " ".join(p.get_text(strip=True) for p in paragraphs)
        else:
            # Handle other sources using their specific rules
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

        # Get article timestamp
        timestamp = self.get_article_timestamp(soup)

        return headline, content.strip(), timestamp

    def scrape(self):
        """Scrape the article and return the data with tags."""
        try:
            self.fetch_content()
            if not self.html_content:
                return None

            # Parse content using existing methods
            headline, content, timestamp = self.parse_content()
            
            # Get tags for the article
            tags = TopicTagger.get_article_tags(content, headline)

            # Build article data dictionary
            article_data = {
                'url': self.url,
                'source': self.source,
                'headline': headline,
                'content': content,
                'tags': tags,
                'timestamp': timestamp or time.strftime('%Y-%m-%d %H:%M:%S')  # Use article time if available, fallback to scrape time
            }

            return article_data

        except Exception as e:
            print(f"Error scraping {self.url}: {e}")
            return None




"""
For future reference, some JSON outputs will containt '\' throughout the parsed content which will cause noise when running it 
through a NLP model. In order to avoid this pointless noise, load the JSON content into a python string and it will remove
the JSON '\' characters, making it clean and ready for summarization use. 
"""

#with open('article.json', 'r', encoding='utf-8') as f:
#    article_data = json.load(f)
    
#content = article_data['content']

class TopicTagger:
    @staticmethod
    def get_article_tags(text, title=""):
        """
        Analyze article text and title to determine relevant tags
        Returns a list of tags that match our topics of interest
        
        Args:
            text (str): The main article content
            title (str): The article headline/title
            
        Returns:
            list: List of topic tags found in the content, includes 'misc' if no other tags found
        """
        # Combine title and text, convert to lowercase for case-insensitive matching
        full_content = (title + " " + text).lower()
        tags = []
        
        # Check each topic's keywords against the content
        for topic, keywords in TOPICS.items():
            # If any keyword for this topic is found in the content, add the topic tag
            if any(keyword.lower() in full_content for keyword in keywords):
                tags.append(topic)
        
        # If no tags were found, mark as miscellaneous
        if not tags:
            tags.append("misc")
        
        return tags

class OptimizedRSSFeedScraper:
    def __init__(self, source, processed_urls_file='data/processed_urls_optimized.json'):
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

    def get_article_timestamp(self, entry):
        """Extract article timestamp from RSS feed entry."""
        # Try different possible timestamp fields
        if hasattr(entry, 'published_parsed'):
            return time.strftime('%Y-%m-%d %H:%M:%S', entry.published_parsed)
        elif hasattr(entry, 'published'):
            return entry.published
        elif hasattr(entry, 'updated_parsed'):
            return time.strftime('%Y-%m-%d %H:%M:%S', entry.updated_parsed)
        elif hasattr(entry, 'updated'):
            return entry.updated
        return None

    def get_articles(self):
        feed = feedparser.parse(self.feed_url)
        articles = []
        for entry in feed.entries:
            # Check if the headline contains any of our target keywords
            headline_tags = TopicTagger.get_article_tags("", entry.title)
            if "misc" not in headline_tags:  # Only include if headline matches a target topic
                timestamp = self.get_article_timestamp(entry)
                articles.append((entry.link, entry.title, headline_tags, timestamp))
                print(f"Found relevant headline: {entry.title} (Tags: {headline_tags})")
        return articles

    def scrape_new_articles(self):
        articles = self.get_articles()
        new_articles = []
        for url, title, tags, timestamp in articles:
            if url not in self.processed_urls:
                new_articles.append((url, title, tags, timestamp))
                self.processed_urls.add(url)
        self.save_processed_urls()
        return new_articles

    def scrape(self):
        new_articles = self.scrape_new_articles()
        for url, title, headline_tags, timestamp in new_articles:
            scraper = WebScraper(url, self.source)
            try:
                article_data = scraper.scrape()
                if article_data:
                    # Add the headline tags and timestamp to help track which articles were caught by headline
                    article_data['headline_tags'] = headline_tags
                    article_data['timestamp'] = timestamp or article_data['timestamp']  # Use RSS timestamp if available
                    self.articles_data.append(article_data)
                    print(f"Scraped article: {title} (Tags: {article_data['tags']})")
                time.sleep(5)
            except Exception as e:
                print(f"Error scraping {url}: {e}")

        self.save_articles_data()

    def save_articles_data(self):
        """Save all scraped articles to a JSON file."""
        os.makedirs('articles', exist_ok=True)
        filename = f"articles/{self.source}_optimized_articles.json"
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


class OptimizedAPNewsScraper:
    def __init__(self, processed_urls_file='data/processed_urls_optimized_ap_news.json'):
        self.hub_urls = [
            "https://apnews.com/hub/technology",  # Added technology hub
            "https://apnews.com/hub/economy",
            "https://apnews.com/hub/financial-markets",
            "https://apnews.com/hub/artificial-intelligence"  # Added AI hub
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
                    title = link_tag.get_text(strip=True)
                    
                    # Check if the headline contains any of our target keywords
                    headline_tags = TopicTagger.get_article_tags("", title)
                    if "misc" not in headline_tags and article_url not in self.processed_urls:
                        article_urls.append((article_url, title, headline_tags))
                        self.processed_urls.add(article_url)
                        print(f"Found relevant headline: {title} (Tags: {headline_tags})")

        return article_urls
    
    def scrape(self):
        for hub_url in self.hub_urls:
            print(f"Scraping articles from: {hub_url}")
            article_urls = self.scrape_article_urls(hub_url)
            print(f"Found {len(article_urls)} new relevant articles.")
            time.sleep(2)

            for url, title, headline_tags in article_urls:
                print(f"Scraping article: {url}")
                scraper = WebScraper(url, "ap_news")
                article_data = scraper.scrape()
                if article_data:
                    # Add the headline tags to help track which articles were caught by headline
                    article_data['headline_tags'] = headline_tags
                    self.articles_data.append(article_data)
                    print(f"Scraped article: {title} (Tags: {article_data['tags']})")
                else:
                    print(f"Failed to scrape article at {url}")
                time.sleep(5)

        self.save_processed_urls()
        self.save_articles_data()

    def save_articles_data(self):
        """Save all scraped articles to a JSON file."""
        os.makedirs('articles', exist_ok=True)
        filename = "articles/ap_optimized_articles.json"
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