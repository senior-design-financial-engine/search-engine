import os
import json
import urllib.parse
from apify_client import ApifyClient

# Persistent Deduplication

SCRAPED_IDS_FILE = "scraped_ids_tech_finance_split4.json"

def load_scraped_ids():
    if os.path.exists(SCRAPED_IDS_FILE):
        with open(SCRAPED_IDS_FILE, "r") as f:
            return set(json.load(f))
    return set()

def save_scraped_ids(ids_set):
    with open(SCRAPED_IDS_FILE, "w") as f:
        json.dump(list(ids_set), f)

persistent_scraped_ids = load_scraped_ids()


# Keywords

keywords_dict = {
    "tech1": [
        "Apple", "AAPL", "Microsoft", "MSFT", "Google", "GOOG", "Alphabet", "GOOGL", "Tesla", "TSLA"
    ],
    "tech2": [
        "Nvidia", "NVDA", "Amazon", "AMZN", "Meta", "META", "Facebook", "OpenAI", "Intel", "INTC"
    ],
    "tech3": [
        "AMD", "Advanced Micro Devices", "Qualcomm", "QCOM", "Cisco", "CSCO", "IBM", "Oracle", "ORCL", "Netflix"
    ],
    "finance1": [
        "JPMorgan", "JPM", "Goldman Sachs", "GS", "Morgan Stanley", "MS", 
        "Bank of America", "BAC", "Citigroup", "C", "Wells Fargo", "WFC"
    ],
    "finance2": [
        "BlackRock", "BLK", "Visa", "V", "Mastercard", "MA", 
        "American Express", "AXP", "Charles Schwab", "SCHW", "Berkshire Hathaway", "BRK.A", "BRK.B"
    ],
    "healthcare": [
        "Pfizer", "PFE", "Moderna", "MRNA", "Johnson & Johnson", "JNJ", "Eli Lilly", "LLY", "AbbVie", "ABBV",
        "Amgen", "AMGN", "Gilead", "UnitedHealth", "UNH"
    ],
    "consumer_goods": [
        "Coca-Cola", "PepsiCo", "Procter & Gamble", "PG", "Walmart", "Costco", 
        "Nike", "NKE", "Starbucks", "SBUX", "McDonald's", "MCD", "Target", "Disney", "DIS"
    ]

}


# Subreddits Mapping

subreddits_dict = {
    "tech1": ["stocks", "investing", "wallstreetbets", "technology"],
    "tech2": ["stocks", "investing", "wallstreetbets", "technology"],
    "tech3": ["stocks", "investing", "wallstreetbets", "technology"],
    "finance1": ["stocks", "investing", "finance"],
    "finance2": ["stocks", "investing", "finance"],
    "healthcare": ["stocks", "investing", "wallstreetbets"],
    "consumer_goods": ["stocks", "investing", "wallstreetbets"]
}
all_results = []

# Initialize Apify Client 

client = ApifyClient("apify_api_nUPLDv51uaDm3hlgodMtbGDjD3MmlC0Jp3JD")

def build_or_query(keywords):
    """
    Joins keywords using ' OR ' and encloses in parentheses.
    Then URL-encodes the result.
    """
    query = "(" + " OR ".join(keywords) + ")"
    return urllib.parse.quote(query)

# Scrape Reddit Posts with Combined Queries per Group

for category, keywords in keywords_dict.items():
    encoded_query = build_or_query(keywords)
    # Decode for annotation purposes
    raw_query = urllib.parse.unquote(encoded_query)
    
    for subreddit in subreddits_dict.get(category, []):
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
        
        run = client.actor("FgJtjDwJCLhRH9saM").call(run_input=run_input)
        
        for item in client.dataset(run["defaultDatasetId"]).iterate_items():
            if item.get("dataType") == "post":
                if item["id"] in persistent_scraped_ids:
                    continue
                persistent_scraped_ids.add(item["id"])
            item["category"] = category
            item["query"] = raw_query
            item["subreddit"] = subreddit
            all_results.append(item)

save_scraped_ids(persistent_scraped_ids)

# Group Posts & Comments into Threads

threads = {}
for item in all_results:
    if item.get("dataType") == "post":
        threads[item["id"]] = {
            "post": {
                "id": item["id"],
                "category": item["category"],
                "query": item["query"],
                "subreddit": item["subreddit"],
                "title": item.get("title", ""),
                "body": item.get("body", ""),
                "url": item.get("url"),
                "upVotes": item.get("upVotes"),
                "upVoteRatio": item.get("upVoteRatio"),
            },
            "comments": []
        }

for item in all_results:
    if item.get("dataType") == "comment" and item.get("postId") in threads:
        if item["id"] not in {c["id"] for c in threads[item["postId"]]["comments"]}:
            threads[item["postId"]]["comments"].append({
                "id": item["id"],
                "username": item.get("username"),
                "body": item.get("body", ""),
                "url": item.get("url"),
                "upVotes": item.get("upVotes"),
                "upVoteRatio": item.get("upVoteRatio"),
            })

# Save Threads as JSON Files

os.makedirs("threads_tech_finance_split4", exist_ok=True)
for post_id, thread_data in threads.items():
    with open(f"threads_tech_finance_split4/{post_id}.json", "w") as f:
        json.dump(thread_data, f, indent=4)

print("Data saved in 'threads_tech_finance_split4' directory.")