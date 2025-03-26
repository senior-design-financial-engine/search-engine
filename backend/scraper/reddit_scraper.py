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

# Persistent Deduplication
SCRAPED_IDS_FILE = "data/scraped_reddit_ids.json"

def load_scraped_ids():
    if os.path.exists(SCRAPED_IDS_FILE):
        with open(SCRAPED_IDS_FILE, "r") as f:
            return set(json.load(f))
    return set()

def save_scraped_ids(ids_set):
    with open(SCRAPED_IDS_FILE, "w") as f:
        json.dump(list(ids_set), f)

persistent_scraped_ids = load_scraped_ids()

# Company-specific keywords for tagging
COMPANY_KEYWORDS = {
    "nvidia": ["nvidia", "nvda", "jensen huang", "rtx", "gpu", "cuda", "tensor cores"],
    "microsoft": ["microsoft", "msft", "satya nadella", "azure", "windows", "xbox"],
    "apple": ["apple", "aapl", "tim cook", "iphone", "mac", "ipad", "ios", "app store", "vision pro"],
    "alphabet": ["alphabet", "googl", "goog", "google", "sundar pichai", "chrome"],
    "amazon": ["amazon", "amzn", "andy jassy", "aws", "alexa", "amazon web services"],
    "meta": ["meta", "meta platforms", "facebook", "mark zuckerberg", "instagram", "quest"],
    "tesla": ["tesla", "tsla", "elon musk", "cybertruck", "model 3", "model y"],
    "netflix": ["netflix", "nflx",  "netflix original", "reed hastings", "ted sarandos"],
    "jp_morgan": ["jp morgan", "jpm", "jpmorgan", "jamie dimon", "jp morgan chase", "chase bank"],
    "tempus_ai": ["tempus ai", "tempus labs", "eric lefkofsky"],
    "openai": ["openai", "sam altman", "chatgpt", "gpt-4", "anthropic", "claude", "microsoft ai"]
}

class RedditScraper:
    def __init__(self, apify_api_key=None):
        """Initialize the Reddit scraper with Apify client."""
        self.api_key = apify_api_key or os.environ.get('APIFY_API_KEY')
        if not self.api_key:
            logger.warning("No Apify API key provided. Using demonstration API key.")
            self.api_key = "apify_api_61EahawqG9QTcms99KZPe8LOtFQsqJ2KVuJQ"  # Demo key, should be replaced
        
        self.client = ApifyClient(self.api_key)
        self.threads = {}
        
        # Define keywords for finance-related content (for efficient searching)
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

    def build_or_query(self, keywords):
        """Build and URL-encode OR query from keywords."""
        query = "(" + " OR ".join(keywords) + ")"
        return urllib.parse.quote(query)

    def get_company_tags(self, text):
        """Identify companies mentioned in the text using detailed keywords."""
        text = text.lower()
        tags = []
        for company, keywords in COMPANY_KEYWORDS.items():
            if any(keyword.lower() in text for keyword in keywords):
                tags.append(company)
        return tags if tags else ["misc"]

    def scrape(self):
        """Main scraping function."""
        logger.info("Starting Reddit scraping")
        
        for category, keywords in self.keywords_dict.items():
            encoded_query = self.build_or_query(keywords)
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
                    run = self.client.actor("FgJtjDwJCLhRH9saM").call(run_input=run_input)
                    
                    for item in self.client.dataset(run["defaultDatasetId"]).iterate_items():
                        if item.get("dataType") == "post":
                            if item["id"] in persistent_scraped_ids:
                                continue
                            persistent_scraped_ids.add(item["id"])
                            
                            # Get company tags from post content
                            content = f"{item.get('title', '')} {item.get('body', '')}"
                            company_tags = self.get_company_tags(content)
                            
                            # Initialize thread with post data
                            self.threads[item["id"]] = {
                                "post": {
                                    "id": item["id"],
                                    "category": category,
                                    "query": raw_query,
                                    "subreddit": subreddit,
                                    "title": item.get("title", ""),
                                    "body": item.get("body", ""),
                                    "url": item.get("url"),
                                    "upVotes": item.get("upVotes"),
                                    "upVoteRatio": item.get("upVoteRatio"),
                                    "createdAt": item.get("createdAt", ""),
                                    "scrapedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                                    "company_tags": company_tags
                                },
                                "comments": []
                            }
                        elif item.get("dataType") == "comment" and item.get("postId") in self.threads:
                            # Get company tags from comment content
                            content = item.get("body", "")
                            company_tags = self.get_company_tags(content)
                            
                            # Add comment to existing thread
                            if item["id"] not in {c["id"] for c in self.threads[item["postId"]]["comments"]}:
                                self.threads[item["postId"]]["comments"].append({
                                    "id": item["id"],
                                    "username": item.get("username"),
                                    "body": item.get("body", ""),
                                    "url": item.get("url"),
                                    "upVotes": item.get("upVotes"),
                                    "upVoteRatio": item.get("upVoteRatio"),
                                    "createdAt": item.get("createdAt", ""),
                                    "scrapedAt": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
                                    "company_tags": company_tags
                                })
                    
                    time.sleep(2)  # Rate limiting
                
                except Exception as e:
                    logger.error(f"Error scraping Reddit: {e}")
        
        # Save all threads to a single JSON file
        self.save_threads()
        save_scraped_ids(persistent_scraped_ids)
        
        logger.info("Reddit scraping completed")
        return self.threads

    def save_threads(self):
        """Save all threads to a single JSON file."""
        os.makedirs("data", exist_ok=True)
        filename = "articles/reddit_threads.json"
        
        # Check for existing data
        if os.path.exists(filename):
            with open(filename, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                
            # Update existing threads and add new ones
            existing_data.update(self.threads)
            combined_data = existing_data
        else:
            combined_data = self.threads

        # Save the updated data
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(combined_data, f, ensure_ascii=False, indent=4)
            
        logger.info(f"Saved {len(self.threads)} threads to {filename}")


if __name__ == "__main__":
    # Test the scraper
    scraper = RedditScraper()
    scraper.scrape() 