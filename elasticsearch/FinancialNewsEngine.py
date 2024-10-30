from elasticsearch import Elasticsearch
import json
import os
from datetime import datetime
import yfinance as yf  # For stock symbol validation
from decimal import Decimal

class FinancialNewsEngine:
    def __init__(self, url='https://f4e7b79a4d854dceaa351824e58f2065.us-east-2.aws.elastic-cloud.com:443'):
        """Initialize Elasticsearch connection"""
        config_path = 'api_key.json'
        try:
            # Check if file exists
            if not os.path.exists(config_path):
                raise FileNotFoundError(f"Configuration file not found: {config_path}")
            
            # Read and parse the JSON file
            with open(config_path, 'r') as file:
                config = json.load(file)
            
            # Get the API key
            api_key = config['api_key']
            
            if not api_key:
                raise KeyError("API key is empty")
            
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(f"Invalid JSON format in config file: {str(e)}", e.doc, e.pos)
        except KeyError:
            raise KeyError("'api_key' not found in config file")

        self.es = Elasticsearch(url, api_key=api_key)
        self.index_name = 'financial_news'
        
    def create_index(self):
        """Create index with mappings optimized for financial news"""
        mappings = {
            "mappings": {
                "properties": {
                    "headline": {
                        "type": "text",
                        "analyzer": "english",
                        "fields": {
                            "keyword": {"type": "keyword"}
                        }
                    },
                    "content": {
                        "type": "text",
                        "analyzer": "english"
                    },
                    "summary": {
                        "type": "text",
                        "analyzer": "english"
                    },
                    "companies": {
                        "properties": {
                            "name": {"type": "keyword"},
                            "ticker": {"type": "keyword"},
                            "exchange": {"type": "keyword"}
                        }
                    },
                    "financial_metrics": {
                        "properties": {
                            "market_cap": {"type": "double"},
                            "price_change": {"type": "double"},
                            "volume": {"type": "long"}
                        }
                    },
                    "categories": {
                        "type": "keyword"  # e.g., earnings, mergers, crypto
                    },
                    "sentiment": {
                        "type": "keyword"  # positive, negative, neutral
                    },
                    "sentiment_score": {
                        "type": "float"    # numerical score -1 to 1
                    },
                    "regions": {
                        "type": "keyword"  # geographical regions affected
                    },
                    "source": {
                        "type": "keyword"  # news source
                    },
                    "author": {
                        "type": "keyword"
                    },
                    "published_at": {
                        "type": "date"
                    },
                    "updated_at": {
                        "type": "date"
                    }
                }
            },
            "settings": {
                "number_of_shards": 3,  # Increased for better performance
                "number_of_replicas": 2,
                "analysis": {
                    "analyzer": {
                        "financial_analyzer": {
                            "type": "custom",
                            "tokenizer": "standard",
                            "filter": [
                                "lowercase",
                                "stop",
                                "financial_symbols",
                                "company_names"
                            ]
                        }
                    },
                    "filter": {
                        "financial_symbols": {
                            "type": "pattern_replace",
                            "pattern": "\\$([A-Z]+)",
                            "replacement": "$1"
                        },
                        "company_names": {
                            "type": "synonym",
                            "synonyms": [
                                "GOOGL, Google, Alphabet",
                                "META, Facebook, Meta Platforms",
                                "BRK.B, Berkshire Hathaway"
                            ]
                        }
                    }
                }
            }
        }
        
        self.es.indices.create(index=self.index_name, body=mappings)
    
    def add_news_article(self, article):
        """Add a financial news article with validation"""
        # Validate and enhance article data
        article['published_at'] = datetime.now() if 'published_at' not in article else article['published_at']
        article['updated_at'] = datetime.now()
        
        # Validate company tickers if present
        if 'companies' in article:
            for company in article['companies']:
                if 'ticker' in company:
                    try:
                        stock = yf.Ticker(company['ticker'])
                        company['name'] = stock.info.get('longName', company.get('name'))
                    except:
                        print(f"Warning: Could not validate ticker {company['ticker']}")
        
        return self.es.index(
            index=self.index_name,
            body=article
        )
    
    def search_news(self, query_text=None, filters=None, time_range=None):
        """
        Advanced search for financial news with multiple parameters
        """
        must_conditions = []
        
        if query_text:
            must_conditions.append({
                "multi_match": {
                    "query": query_text,
                    "fields": [
                        "headline^3",
                        "summary^2",
                        "content",
                        "companies.name"
                    ],
                    "fuzziness": "AUTO"
                }
            })
        
        filter_conditions = []
        
        if filters:
            if 'companies' in filters:
                filter_conditions.append({
                    "terms": {"companies.ticker": filters['companies']}
                })
            if 'categories' in filters:
                filter_conditions.append({
                    "terms": {"categories": filters['categories']}
                })
            if 'sentiment' in filters:
                filter_conditions.append({
                    "term": {"sentiment": filters['sentiment']}
                })
            if 'regions' in filters:
                filter_conditions.append({
                    "terms": {"regions": filters['regions']}
                })
        
        if time_range:
            filter_conditions.append({
                "range": {
                    "published_at": {
                        "gte": time_range.get('start'),
                        "lte": time_range.get('end')
                    }
                }
            })
        
        body = {
            "query": {
                "bool": {
                    "must": must_conditions,
                    "filter": filter_conditions
                }
            },
            "highlight": {
                "fields": {
                    "headline": {},
                    "summary": {},
                    "content": {}
                }
            },
            "sort": [
                {"_score": {"order": "desc"}},
                {"published_at": {"order": "desc"}}
            ],
            "aggs": {
                "sentiment_distribution": {
                    "terms": {"field": "sentiment"}
                },
                "category_distribution": {
                    "terms": {"field": "categories"}
                },
                "publication_timeline": {
                    "date_histogram": {
                        "field": "published_at",
                        "calendar_interval": "day"
                    }
                }
            }
        }
        
        return self.es.search(index=self.index_name, body=body)
    
    def get_company_news(self, ticker):
        """Get all news for a specific company"""
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}}
                ]
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "sort": [{"published_at": {"order": "desc"}}],
                "size": 100
            }
        )
    
    def get_trending_topics(self, timeframe="1d"):
        """Get trending financial topics"""
        intervals = {
            "1d": "now-1d/d",
            "1w": "now-1w/w",
            "1m": "now-1M/M"
        }
        
        body = {
            "query": {
                "range": {
                    "published_at": {
                        "gte": intervals.get(timeframe, "now-1d/d")
                    }
                }
            },
            "aggs": {
                "popular_categories": {
                    "terms": {
                        "field": "categories",
                        "size": 10
                    }
                },
                "company_mentions": {
                    "terms": {
                        "field": "companies.ticker",
                        "size": 10
                    }
                }
            },
            "size": 0
        }
        
        return self.es.search(index=self.index_name, body=body)

# Usage example
if __name__ == "__main__":
    # Initialize the search engine
    news_search = FinancialNewsEngine()
    
    # Create the index with mappings
    news_search.create_index()
    
    # Add a sample article
    sample_article = {
        "headline": "Tesla Reports Record Q4 Earnings",
        "content": "Tesla Inc. reported record-breaking earnings for Q4 2024...",
        "summary": "Tesla beats analyst expectations with strong Q4 performance",
        "companies": [
            {
                "name": "Tesla Inc.",
                "ticker": "TSLA",
                "exchange": "NASDAQ"
            }
        ],
        "financial_metrics": {
            "market_cap": 750.5,
            "price_change": 5.2,
            "volume": 25000000
        },
        "categories": ["earnings", "electric-vehicles"],
        "sentiment": "positive",
        "sentiment_score": 0.8,
        "regions": ["North America"],
        "source": "Financial Times",
        "author": "Jane Smith"
    }
    
    news_search.add_news_article(sample_article)
    
    # Search example
    results = news_search.search_news(
        query_text="Tesla earnings",
        filters={
            "categories": ["earnings"],
            "sentiment": "positive"
        },
        time_range={
            "start": "2024-01-01",
            "end": "2024-12-31"
        }
    )