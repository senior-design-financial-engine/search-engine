import os
import unittest
from unittest import mock
from unittest.mock import patch, MagicMock
from es_database.Engine import Engine
from es_database.mock_data_generator import (
    generate_fake_article, 
    generate_fake_articles,
    generate_fake_id,
    generate_mock_search_response
)
from dotenv import load_dotenv
from datetime import datetime, timedelta
import random
import json
from flask import Flask, jsonify, request

# Use the test environment
load_dotenv('.env.test')

# Create a Flask app for the mock API
app = Flask(__name__)
from flask_cors import CORS
CORS(app)

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

# Helper functions to generate random fake articles
def generate_fake_date(days_ago_max=30):
    days_ago = random.randint(0, days_ago_max)
    return (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

def generate_fake_headline():
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
    return [generate_fake_article() for _ in range(count)]

# API routes for frontend testing
@app.route('/query', methods=['GET'])
def query():
    query_text = request.args.get('query', '')
    source = request.args.get('source', None)
    time_range = request.args.get('time_range', None)
    
    # Generate between 5 and 15 fake results
    results_count = random.randint(5, 15)
    
    # Filter by source if specified
    fake_articles = generate_fake_articles(results_count)
    
    if source:
        fake_articles = [article for article in fake_articles if article["_source"]["source"] == source]
    
    # If query contains a company name, bias results toward that company
    for company in companies:
        if company.lower() in query_text.lower():
            for article in fake_articles[:3]:  # Modify first few results
                article["_source"]["headline"] = article["_source"]["headline"].replace(
                    random.choice(companies), company
                )
                article["_source"]["companies"][0]["name"] = company
                article["_source"]["companies"][0]["ticker"] = company[:3].upper()
    
    response = {
        "hits": {
            "total": {"value": len(fake_articles)},
            "hits": fake_articles
        }
    }
    
    return jsonify(response)

# Simple placeholder tests that don't rely on mocking Elasticsearch
class TestElasticsearch(unittest.TestCase):
    def setUp(self):
        """Setup test environment without mocking"""
        # Set up the environment to use mock data
        os.environ['USE_MOCK_DATA'] = 'true'
        
    def test_engine_initialization(self):
        """Test using the MockEngine that doesn't need Elasticsearch."""
        # Import the MockEngine directly instead of mocking Elasticsearch
        from es_database.mock_data_generator import MockEngine
        mock_engine = MockEngine()
        self.assertIsNotNone(mock_engine)
    
    def test_search_articles(self):
        """Test search functionality with the MockEngine."""
        from es_database.mock_data_generator import MockEngine
        mock_engine = MockEngine()
        results = mock_engine.search_news("test query")
        self.assertIsNotNone(results)
        self.assertIn('hits', results)
        self.assertGreater(len(results['hits']['hits']), 0)
    
    def test_index_article(self):
        """Test indexing an article with the MockEngine."""
        from es_database.mock_data_generator import MockEngine
        mock_engine = MockEngine()
        article = generate_fake_article()["_source"]
        result = mock_engine.add_article(article)
        self.assertIsNotNone(result)

if __name__ == '__main__':
    # Check if we should run the API server or tests
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--server':
        # Run as API server if flag is provided
        print("Starting mock Elasticsearch API server for frontend testing...")
        print("Generating fake articles for search results")
        print("Access the API at: http://127.0.0.1:5001/query?query=your+search+query")
        app.run(host='127.0.0.1', port=5001, debug=True)
    else:
        # Run tests by default
        unittest.main() 