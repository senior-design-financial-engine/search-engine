import os
import json
import urllib.parse
from apify_client import ApifyClient
import time
import logging
from datetime import datetime

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class RedditScraper:
    def __init__(self, processed_urls_file='data/processed_reddit_urls.json', apify_api_key=None):
        """
        Initialize the Reddit scraper
        
        Args:
            processed_urls_file: File to keep track of already processed Reddit posts
            apify_api_key: Optional API key for Apify, will use env variable if not provided
        """
        self.processed_urls_file = processed_urls_file
        self.processed_ids = self.load_processed_ids()
        self.articles_data = []
        
        # Get Apify API key
        self.api_key = apify_api_key or os.environ.get('APIFY_API_KEY')
        if not self.api_key:
            logger.warning("No Apify API key provided. Using demonstration API key.")
            self.api_key = "apify_api_nUPLDv51uaDm3hlgodMtbGDjD3MmlC0Jp3JD"  # Demo key, should be replaced
        
        # Initialize Apify client
        self.client = ApifyClient(self.api_key)
        
        # Define keywords for finance-related content
        self.keywords_dict = {
            "tech1": [
                "Apple", "AAPL", "Microsoft", "MSFT", "Google", "GOOG", "Alphabet", "GOOGL", "Tesla", "TSLA"
            ],
            "tech2": [
                "Nvidia", "NVDA", "Amazon", "AMZN", "Meta", "META", "Facebook", "OpenAI", "Intel", "INTC"
            ],
            "finance1": [
                "JPMorgan", "JPM", "Goldman Sachs", "GS", "Morgan Stanley", "MS",
                "Bank of America", "BAC", "Citigroup", "C", "Wells Fargo", "WFC"
            ],
            "finance2": [
                "BlackRock", "BLK", "Visa", "V", "Mastercard", "MA",
                "American Express", "AXP", "Charles Schwab", "SCHW", "Berkshire Hathaway", "BRK"
            ]
        }
        
        # Define subreddits to scrape
        self.subreddits_dict = {
            "tech1": ["stocks", "investing", "wallstreetbets", "technology"],
            "tech2": ["stocks", "investing", "wallstreetbets", "technology"],
            "finance1": ["stocks", "investing", "finance"],
            "finance2": ["stocks", "investing", "finance"]
        }

    def load_processed_ids(self):
        """Load previously processed Reddit post IDs"""
        if os.path.exists(self.processed_urls_file):
            with open(self.processed_urls_file, 'r') as f:
                return set(json.load(f))
        return set()

    def save_processed_ids(self):
        """Save processed Reddit post IDs"""
        os.makedirs(os.path.dirname(self.processed_urls_file), exist_ok=True)
        with open(self.processed_urls_file, 'w') as f:
            json.dump(list(self.processed_ids), f, indent=4)

    def build_or_query(self, keywords):
        """
        Joins keywords using ' OR ' and encloses in parentheses.
        Then URL-encodes the result.
        """
        query = "(" + " OR ".join(keywords) + ")"
        return urllib.parse.quote(query)

    def scrape(self):
        """Scrape Reddit posts based on finance-related keywords"""
        all_results = []
        
        logger.info("Starting Reddit scraper")
        for category, keywords in self.keywords_dict.items():
            encoded_query = self.build_or_query(keywords)
            # Decode for annotation purposes
            raw_query = urllib.parse.unquote(encoded_query)
            
            for subreddit in self.subreddits_dict.get(category, []):
                logger.info(f"Scraping r/{subreddit} for {category} keywords")
                search_url = (
                    f"https://www.reddit.com/r/{subreddit}/search/"
                    f"?q={encoded_query}&sort=top&t=day&restrict_sr=1"
                )
                
                run_input = {
                    "startUrls": [{"url": search_url}],
                    "skipComments": False,
                    "searchPosts": True,
                    "searchComments": False,
                    "sort": "top",
                    "commentSort": "top",
                    "maxItems": 5,
                    "maxPostCount": 5,
                    "maxComments": 5,
                    "includeNSFW": True,
                    "proxy": {"useApifyProxy": True, "apifyProxyGroups": ["RESIDENTIAL"]},
                    "debugMode": False,
                }
                
                try:
                    # Create and run the Apify actor for Reddit scraping
                    run = self.client.actor("FgJtjDwJCLhRH9saM").call(run_input=run_input)
                    
                    # Process results
                    for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
                        if item.get("dataType") == "post":
                            if item["id"] in self.processed_ids:
                                continue
                            self.processed_ids.add(item["id"])
                            
                            # Add metadata fields
                            item["category"] = category
                            item["query"] = raw_query
                            item["subreddit"] = subreddit
                            all_results.append(item)
                    
                    # Don't overload the API
                    time.sleep(2)
                
                except Exception as e:
                    logger.error(f"Error scraping Reddit: {e}")
                    
        # Save processed IDs
        self.save_processed_ids()
        
        # Format the results to match our article format
        self.format_articles(all_results)
        
        # Save the articles
        self.save_articles_data()
        
        return self.articles_data

    def format_articles(self, reddit_items):
        """Convert Reddit posts to article format compatible with our system"""
        for item in reddit_items:
            if item.get("dataType") != "post":
                continue
                
            # Create article from Reddit post
            article = {
                "url": item.get("url", ""),
                "headline": item.get("title", ""),
                "date": datetime.utcfromtimestamp(item.get("postedAt", 0) / 1000).strftime("%Y-%m-%d"),
                "content": item.get("body", ""),
                "source": f"reddit_r/{item.get('subreddit')}",
                "score": item.get("upVotes", 0),
                "category": item.get("category", "")
            }
            
            self.articles_data.append(article)

    def save_articles_data(self):
        """Save all scraped articles to a JSON file"""
        os.makedirs('articles', exist_ok=True)
        filename = "articles/reddit_articles.json"
        
        # Check for existing data
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                
            # Check which articles are new
            urls_in_existing = {article['url'] for article in existing_data}
            new_articles = [article for article in self.articles_data if article['url'] not in urls_in_existing]
            combined_data = existing_data + new_articles
        else:
            combined_data = self.articles_data
            new_articles = self.articles_data

        # Save the updated data
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
            
        logger.info(f"Saved {len(new_articles)} new article(s) to {filename}")
        
        # Clear the articles data for the next run
        self.articles_data = []


if __name__ == "__main__":
    # Test the scraper
    scraper = RedditScraper()
    scraper.scrape() 