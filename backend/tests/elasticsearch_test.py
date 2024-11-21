from es_database import Engine
from dotenv import load_dotenv
from datetime import datetime, timedelta
import time

# Initialize the engine
load_dotenv()
engine = Engine()
engine.config.validate_config()

# Create some fake articles
fake_articles = [
    {
        "headline": "Tesla Reports Record Q4 Earnings",
        "source": "Financial Times",
        "url": "https://ft.com/tesla-q4-2023",
        "content": "Tesla reported record earnings in Q4 2023, beating analyst expectations.",
        "companies": [{"name": "Tesla", "ticker": "TSLA", "exchange": "NASDAQ"}],
        "categories": ["earnings", "automotive"],
        "sentiment": "positive",
        "sentiment_score": 0.8,
        "published_at": datetime.now() - timedelta(days=1)
    },
    {
        "headline": "Apple and Microsoft Collaborate on AI Initiative",
        "source": "Reuters",
        "url": "https://reuters.com/apple-microsoft-ai",
        "content": "Tech giants Apple and Microsoft announce joint AI research initiative.",
        "companies": [
            {"name": "Apple", "ticker": "AAPL", "exchange": "NASDAQ"},
            {"name": "Microsoft", "ticker": "MSFT", "exchange": "NASDAQ"}
        ],
        "categories": ["technology", "artificial-intelligence"],
        "sentiment": "positive",
        "sentiment_score": 0.6,
        "published_at": datetime.now() - timedelta(days=2)
    },
    {
        "headline": "JPMorgan Warns of Market Volatility",
        "source": "Bloomberg",
        "url": "https://bloomberg.com/jpmorgan-warning",
        "content": "JPMorgan analysts warn of increased market volatility in coming months.",
        "companies": [{"name": "JPMorgan", "ticker": "JPM", "exchange": "NYSE"}],
        "categories": ["markets", "banking"],
        "sentiment": "negative",
        "sentiment_score": -0.4,
        "published_at": datetime.now() - timedelta(days=3)
    }
]

# Add articles to the index
article_ids = engine.batch_add_articles(fake_articles)
print(f"Added {len(article_ids)} articles")

time.sleep(5)

# Test different search scenarios
print("\n1. Search for Tesla related news:")
tesla_results = engine.search_news(
    query_text="Tesla",
    filters={
        "companies.ticker": ["TSLA"]
    }
)
print(f"Found {tesla_results['hits']['total']['value']} Tesla articles")

print("\n2. Search for positive AI news:")
ai_results = engine.search_news(
    query_text="AI artificial intelligence",
    filters={
        "sentiment": "positive",
        "categories": ["technology", "artificial-intelligence"]
    }
)
print(f"Found {ai_results['hits']['total']['value']} positive AI articles")

print("\n3. Search for recent market warnings:")
market_results = engine.search_news(
    query_text="market warning volatility",
    filters={
        "categories": ["markets"]
    },
    time_range={
        "start": (datetime.now() - timedelta(days=7)).isoformat(),
        "end": datetime.now().isoformat()
    }
)
print(f"Found {market_results['hits']['total']['value']} market warning articles")

# Print detailed results for each search
def print_results(results):
    for hit in results['hits']['hits']:
        source = hit['_source']
        print(f"\nHeadline: {source['headline']}")
        print(f"Source: {source['source']}")
        print(f"Score: {hit['_score']}")
        print(f"Categories: {source.get('categories', [])}")
        print(f"Sentiment: {source.get('sentiment', 'neutral')}")

print("\nDetailed Tesla search results:")
print_results(tesla_results)

print("\nDetailed AI search results:")
print_results(ai_results)

print("\nDetailed market warning results:")
print_results(market_results)


'''
Added 3 articles

1. Search for Tesla related news:
Found 1 Tesla articles

2. Search for positive AI news:
Found 1 positive AI articles

3. Search for recent market warnings:
Found 1 market warning articles

Detailed Tesla search results:

Headline: Tesla Reports Record Q4 Earnings
Source: Financial Times
Score: 0.8630463
Categories: ['earnings', 'automotive']
Sentiment: positive

Detailed AI search results:

Headline: Apple and Microsoft Collaborate on AI Initiative
Source: Reuters
Score: 0.8630463
Categories: ['technology', 'artificial-intelligence']
Sentiment: positive

Detailed market warning results:

Headline: JPMorgan Warns of Market Volatility
Source: Bloomberg
Score: 2.589139
Categories: ['markets', 'banking']
Sentiment: negative
'''