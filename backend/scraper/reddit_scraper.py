import os
import json
import urllib.parse
from apify_client import ApifyClient
import time
import logging
from datetime import datetime
import openai
from typing import Optional, Dict, Any

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# OpenAI API configuration

openai.api_key = ''


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
            self.api_key = "apify_api_2K848Em7cJOhFutBhW2acAIQh0XRa63EjftD"  # Demo key, should be replaced
        
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

    def generate_summary(self, title: str, content: str, comments: list = None, primary_company: str = None) -> Optional[Dict[str, Any]]:
        """
        Generate a summary and sentiment analysis of the Reddit thread using OpenAI's API.
        
        Args:
            title: The thread title
            content: The thread content
            comments: List of comment dictionaries
            primary_company: The primary company to focus sentiment analysis on
            
        Returns:
            Dictionary containing summary and sentiment score or None if generation fails
        """
        try:
            # Prepare comments text with more context
            comments_text = ""
            if comments:
                # Take top 5 most upvoted comments for better context
                top_comments = sorted(comments, key=lambda x: x.get('upVotes', 0), reverse=True)[:5]
                comments_text = "\n\nKey comments:\n" + "\n".join(
                    f"- [{comment.get('upVotes', 0)} upvotes] {comment.get('body', '')[:300]}..." 
                    for comment in top_comments
                )

            # Truncate content but keep more context
            truncated_content = content[:2000] + "..." if len(content) > 2000 else content

            # Get company keywords for more focused analysis
            company_keywords = COMPANY_KEYWORDS.get(primary_company, [primary_company])
            company_context = f"Focus the sentiment analysis specifically on {primary_company} and its related topics ({', '.join(company_keywords)})."

            # Prepare a more detailed prompt for the API
            prompt = f"""Analyze this Reddit thread and provide:
1. A comprehensive summary of the main points and discussions
2. An overall sentiment score specifically for {primary_company} (provide a score from -1 to +1, where:
   - -1 is very negative
   - 0 is neutral
   - +1 is very positive)

{company_context}

Title: {title}
Content: {truncated_content}{comments_text}

Provide your response in this exact format:
SUMMARY:
[Your summary here]

SENTIMENT: [Score]"""

            # Add delay between API calls to avoid rate limits
            time.sleep(2)  # Wait 2 seconds between calls

            # Call OpenAI API using GPT-3.5-turbo for cost efficiency
            response = openai.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are an expert financial analyst and Reddit thread analyzer. Create detailed summaries and accurate sentiment analysis scores, focusing specifically on the primary company mentioned."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=400,
                temperature=0.3
            )

            # Extract the response
            full_response = response.choices[0].message.content.strip()
            
            # Split the response into summary and sentiment sections
            summary_section = ""
            sentiment_score = 0.0
            current_section = ""
            
            for line in full_response.split('\n'):
                if line.startswith('SUMMARY:'):
                    current_section = 'summary'
                elif line.startswith('SENTIMENT:'):
                    try:
                        sentiment_score = float(line.split(':', 1)[1].strip())
                        sentiment_score = max(min(sentiment_score, 1.0), -1.0)
                    except (ValueError, IndexError):
                        sentiment_score = 0.0
                elif line.strip() and current_section == 'summary':
                    summary_section += line + '\n'

            return {
                "summary": summary_section.strip(),
                "sentiment": sentiment_score
            }

        except openai.RateLimitError as e:
            logger.error(f"Rate limit exceeded. Waiting 60 seconds before retrying...")
            time.sleep(60)  # Wait 60 seconds on rate limit error
            return None
        except openai.APIError as e:
            if "insufficient_quota" in str(e):
                logger.error("OpenAI API quota exceeded. Please check your billing details.")
            else:
                logger.error(f"OpenAI API error: {e}")
            return None
        except Exception as e:
            logger.error(f"Error generating summary: {e}")
            return None

    def get_primary_company(self, title: str, content: str, comments: list, company_tags: list) -> str:
        """
        Determine the primary company based on content relevance.
        
        Args:
            title: The thread title
            content: The thread content
            comments: List of comment dictionaries
            company_tags: List of company tags
            
        Returns:
            The primary company tag
        """
        if not company_tags or len(company_tags) == 1:
            return company_tags[0] if company_tags else "misc"
            
        # Combine title and content for analysis
        full_text = (title + " " + content).lower()
        
        # Count mentions of each company in the text
        mention_counts = {}
        for tag in company_tags:
            # Get keywords for this company from TOPICS
            keywords = COMPANY_KEYWORDS.get(tag, [tag])
            # Count mentions of each keyword
            count = sum(full_text.count(keyword.lower()) for keyword in keywords)
            mention_counts[tag] = count
            
        # If no mentions found, return the first tag
        if not any(mention_counts.values()):
            return company_tags[0]
            
        # Get the company with the most mentions
        primary_company = max(mention_counts.items(), key=lambda x: x[1])[0]
        
        # If the title contains a company name, prioritize that company
        title_lower = title.lower()
        for tag in company_tags:
            keywords = COMPANY_KEYWORDS.get(tag, [tag])
            if any(keyword.lower() in title_lower for keyword in keywords):
                return tag
                
        return primary_company

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
        
        # Generate summaries and sentiment analysis for all threads after collecting all data
        logger.info("Generating summaries and sentiment analysis for all threads...")
        for thread_id, thread in self.threads.items():
            try:
                # First determine the primary company
                primary_company = self.get_primary_company(
                    thread["post"]["title"],
                    thread["post"]["body"],
                    thread["comments"],
                    thread["post"]["company_tags"]
                )
                
                # Generate summary and sentiment analysis focused on the primary company
                analysis_result = self.generate_summary(
                    thread["post"]["title"],
                    thread["post"]["body"],
                    thread["comments"],
                    primary_company
                )
                
                if analysis_result:
                    thread["summary"] = analysis_result["summary"]
                    thread["sentiment"] = {
                        "company": primary_company,
                        "score": analysis_result["sentiment"]
                    }
                    logger.info(f"Generated analysis for thread: {thread['post']['title'][:50]}...")
                time.sleep(2)  # Rate limiting between summaries
            except Exception as e:
                logger.error(f"Error generating analysis for thread {thread_id}: {e}")
        
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