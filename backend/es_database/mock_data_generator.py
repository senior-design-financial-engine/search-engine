import random
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

# Sample data for generating fake articles
sources = ["Bloomberg", "Reuters", "CNBC", "Financial Times", "Wall Street Journal", "MarketWatch", "Barron's"]
companies = ["Apple", "Microsoft", "Google", "Amazon", "Tesla", "Meta", "Nvidia", "IBM", "Intel", "AMD"]
sectors = ["Technology", "Finance", "Healthcare", "Energy", "Consumer Goods", "Communications", "Utilities"]
sentiment_options = ["positive", "negative", "neutral"]
headline_templates = [
    "{company} Reports Strong Quarterly Earnings, Stock {movement}",
    "{company} Announces New {product_type} Products",
    "{company} Faces Regulatory Scrutiny in {region}",
    "{company} Expands Operations in {region}",
    "{company} CEO Discusses Future of {sector}",
    "Investors React to {company}'s Latest {announcement_type}",
    "{company} Stock {movement} After Analyst Upgrade",
    "{company} Partners with {company2} on New Initiative",
    "Market Analysis: What's Next for {company}?",
    "{sector} Sector Outlook: Focus on {company}"
]

def generate_fake_id():
    """Generate a fake document ID."""
    return f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def generate_fake_date(days_ago_max=30):
    """Generate a random date within the specified range."""
    days_ago = random.randint(0, days_ago_max)
    return (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

def generate_fake_headline():
    """Generate a realistic-looking financial news headline."""
    template = random.choice(headline_templates)
    company = random.choice(companies)
    company2 = random.choice([c for c in companies if c != company])
    sector = random.choice(sectors)
    region = random.choice(["US", "Europe", "Asia", "Global"])
    movement = random.choice(["Surges", "Drops", "Rises", "Falls", "Stabilizes"])
    product_type = random.choice(["Consumer", "Enterprise", "Cloud", "AI", "IoT", "Mobile"])
    announcement_type = random.choice(["Earnings Report", "Product Launch", "Strategic Plan", "Restructuring"])
    
    return template.format(
        company=company,
        company2=company2,
        sector=sector,
        region=region,
        movement=movement,
        product_type=product_type,
        announcement_type=announcement_type
    )

def generate_fake_article():
    """Generate a single fake financial news article."""
    company = random.choice(companies)
    published_date = generate_fake_date()
    sentiment = random.choice(sentiment_options)
    
    return {
        "_id": generate_fake_id(),
        "_source": {
            "headline": generate_fake_headline(),
            "url": f"http://example.com/article/{generate_fake_id()}",
            "published_at": published_date,
            "source": random.choice(sources),
            "content": f"This is a placeholder article about {company}. It contains sample text for frontend debugging purposes.",
            "snippet": f"Sample article snippet about {company} for testing the frontend interface...",
            "sentiment": sentiment,
            "sentiment_score": random.uniform(-1.0, 1.0),
            "companies": [
                {
                    "name": company,
                    "ticker": company[:3].upper(),
                    "sentiment": sentiment,
                    "mentions": random.randint(1, 10)
                }
            ],
            "categories": [random.choice(sectors)],
            "relevance_score": random.uniform(0.5, 1.0)
        }
    }

def generate_fake_articles(count=10):
    """Generate multiple fake articles."""
    return [generate_fake_article() for _ in range(count)]

def generate_mock_search_response(query_text="", source=None, time_range=None, count=None):
    """
    Generate a mock search response that matches the Elasticsearch response format.
    
    Args:
        query_text: The search query text
        source: Optional source filter
        time_range: Optional time range filter
        count: Number of results to generate (if None, generates a random number)
        
    Returns:
        Dict that mimics Elasticsearch search response
    """
    # Generate between 5 and 15 fake results if count not specified
    results_count = count if count is not None else random.randint(5, 15)
    
    # Generate fake articles
    fake_articles = generate_fake_articles(results_count)
    
    # Filter by source if specified
    if source:
        fake_articles = [article for article in fake_articles if article["_source"]["source"] == source]
    
    # If query contains a company name, bias results toward that company
    for company in companies:
        if query_text and company.lower() in query_text.lower():
            for article in fake_articles[:3]:  # Modify first few results
                article["_source"]["headline"] = article["_source"]["headline"].replace(
                    random.choice(companies), company
                )
                article["_source"]["companies"][0]["name"] = company
                article["_source"]["companies"][0]["ticker"] = company[:3].upper()
    
    # Return in Elasticsearch response format
    return {
        "hits": {
            "total": {"value": len(fake_articles)},
            "hits": fake_articles
        }
    }

# Mock Engine class that mimics the real Engine but uses fake data
class MockEngine:
    """
    A mock implementation of the Engine class that returns fake data.
    This can be used as a drop-in replacement for the real Engine.
    """
    
    def __init__(self):
        """Initialize the mock engine."""
        # We don't need actual Elasticsearch connection
        pass
    
    def search_news(self, query_text=None, filters=None, time_range=None):
        """
        Mock implementation of search_news that returns fake articles.
        
        Args:
            query_text: Search query text
            filters: Optional filters dictionary
            time_range: Optional time range dictionary
            
        Returns:
            Dict containing fake search results in Elasticsearch format
        """
        source = None
        if filters and 'source' in filters:
            source = filters['source']
            
        return generate_mock_search_response(query_text, source, time_range)
    
    def add_article(self, article, embeddings=None, custom_id=None):
        """
        Mock implementation of add_article.
        
        Args:
            article: Article data dictionary
            embeddings: Optional embeddings
            custom_id: Optional custom ID
            
        Returns:
            Fake document ID
        """
        # Just return a fake ID as if we indexed the document
        return generate_fake_id()
    
    def get_article_by_id(self, article_id):
        """
        Mock implementation of get_article_by_id.
        
        Args:
            article_id: Article ID
            
        Returns:
            Fake article data
        """
        # Generate a deterministic article based on the ID
        article = generate_fake_article()
        article["_id"] = article_id
        return article["_source"] 