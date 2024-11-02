from elasticsearch import Elasticsearch
import json
import os
from datetime import datetime, timedelta
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

    def get_sentiment_trends(self, ticker, time_range='30d'):
        """
        Analyze sentiment trends for a specific company over time
        Returns daily sentiment scores and volume of mentions
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{time_range}"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "sentiment_over_time": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": "day",
                    "min_doc_count": 0
                },
                "aggs": {
                    "avg_sentiment": {"avg": {"field": "sentiment_score"}},
                    "article_count": {"value_count": {"field": "headline"}}
                }
            }
        }
        
        result = self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 0,
                "aggs": aggs
            }
        )
        
        return result['aggregations']['sentiment_over_time']['buckets']

    def get_source_distribution(self, timeframe='7d', min_articles=5):
        """
        Analyze distribution of news articles across different sources
        Returns sources ranked by volume and their sentiment metrics
        """
        query = {
            "bool": {
                "must": [
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "sources": {
                "terms": {
                    "field": "source",
                    "size": 20,
                    "min_doc_count": min_articles
                },
                "aggs": {
                    "avg_sentiment_deviation": {
                        "avg": {
                            "script": {
                                "source": "Math.abs(doc['sentiment_score'].value)"
                            }
                        }
                    },
                    "categories": {
                        "terms": {
                            "field": "categories",
                            "size": 5
                        }
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 0,
                "aggs": aggs
            }
        )

    def get_regional_activity(self, timeframe='7d', include_categories=True):
        """
        Get news distribution and trends across different regions
        Returns regional activity metrics and top stories by region
        """
        query = {
            "bool": {
                "must": [
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "regions": {
                "terms": {
                    "field": "regions",
                    "size": 20
                },
                "aggs": {
                    "daily_volume": {
                        "date_histogram": {
                            "field": "published_at",
                            "calendar_interval": "day"
                        }
                    },
                    "categories": {
                        "terms": {
                            "field": "categories",
                            "size": 5
                        }
                    } if include_categories else {},
                    "avg_sentiment": {
                        "avg": {
                            "field": "sentiment_score"
                        }
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 0,
                "aggs": aggs
            }
        )

    def get_volume_spikes(self, threshold=2.0, timeframe='30d'):
        """
        Identify periods of unusually high news volume
        Returns time periods with abnormal news activity
        """
        query = {
            "bool": {
                "must": [
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "hourly_volume": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": "hour"
                },
                "aggs": {
                    "categories": {
                        "terms": {
                            "field": "categories",
                            "size": 5
                        }
                    },
                    "companies": {
                        "terms": {
                            "field": "companies.ticker",
                            "size": 5
                        }
                    }
                }
            }
        }
        
        result = self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 0,
                "aggs": aggs
            }
        )
        
        # Calculate average volume and identify spikes
        volumes = [bucket['doc_count'] for bucket in result['aggregations']['hourly_volume']['buckets']]
        avg_volume = sum(volumes) / len(volumes)
        
        spikes = [
            {
                'timestamp': bucket['key_as_string'],
                'volume': bucket['doc_count'],
                'categories': [cat['key'] for cat in bucket['categories']['buckets']],
                'companies': [comp['key'] for comp in bucket['companies']['buckets']]
            }
            for bucket in result['aggregations']['hourly_volume']['buckets']
            if bucket['doc_count'] > avg_volume * threshold
        ]
        
        return {
            'average_volume': avg_volume,
            'threshold': threshold,
            'spikes': spikes
        }

    def get_correlation_matrix(self, tickers, timeframe='30d'):
        """
        Generate a correlation matrix between companies based on news co-occurrence
        Returns matrix of correlation scores
        """
        correlations = {}
        
        for ticker1 in tickers:
            correlations[ticker1] = {}
            
            for ticker2 in tickers:
                if ticker1 != ticker2:
                    query = {
                        "bool": {
                            "must": [
                                {"range": {
                                    "published_at": {
                                        "gte": f"now-{timeframe}"
                                    }
                                }},
                                {"terms": {
                                    "companies.ticker": [ticker1, ticker2]
                                }}
                            ]
                        }
                    }
                    
                    # Count articles mentioning both companies
                    joint_count = self.es.count(
                        index=self.index_name,
                        body={"query": query}
                    )['count']
                    
                    # Count articles mentioning each company individually
                    count1 = self.es.count(
                        index=self.index_name,
                        body={
                            "query": {
                                "bool": {
                                    "must": [
                                        {"term": {"companies.ticker": ticker1}},
                                        {"range": {"published_at": {"gte": f"now-{timeframe}"}}}
                                    ]
                                }
                            }
                        }
                    )['count']
                    
                    count2 = self.es.count(
                        index=self.index_name,
                        body={
                            "query": {
                                "bool": {
                                    "must": [
                                        {"term": {"companies.ticker": ticker2}},
                                        {"range": {"published_at": {"gte": f"now-{timeframe}"}}}
                                    ]
                                }
                            }
                        }
                    )['count']
                    
                    # Calculate correlation score
                    if count1 > 0 and count2 > 0:
                        correlation = joint_count / ((count1 * count2) ** 0.5)
                    else:
                        correlation = 0
                    
                    correlations[ticker1][ticker2] = round(correlation, 3)
                
                else:
                    correlations[ticker1][ticker2] = 1.0
        
        return correlations

    def get_category_evolution(self, category, timeframe='90d', interval='1d'):
        """
        Track how a news category evolves over time
        Returns temporal analysis of category volume and related topics
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"categories": category}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "timeline": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": interval
                },
                "aggs": {
                    "top_companies": {
                        "terms": {
                            "field": "companies.ticker",
                            "size": 5
                        }
                    },
                    "related_categories": {
                        "terms": {
                            "field": "categories",
                            "size": 5,
                            "exclude": [category]
                        }
                    },
                    "avg_sentiment": {
                        "avg": {
                            "field": "sentiment_score"
                        }
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 0,
                "aggs": aggs
            }
        )

    def get_stock_price_mentions(self, ticker, timeframe='30d'):
        """
        Find news articles mentioning specific stock price levels
        Returns articles with price mentions and sentiment context
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }},
                    {
                        "exists": {
                            "field": "financial_metrics.price_change"
                        }
                    }
                ]
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "sort": [{"published_at": "desc"}],
                "_source": [
                    "headline",
                    "published_at",
                    "financial_metrics",
                    "sentiment",
                    "sentiment_score"
                ],
                "size": 100
            }
        )

    def get_stock_momentum_signals(self, ticker, timeframe='7d', sentiment_threshold=0.6):
        """
        Analyze news momentum signals for a stock
        Returns aggregated sentiment and volume metrics
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "hourly_signals": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": "hour"
                },
                "aggs": {
                    "avg_sentiment": {
                        "avg": {"field": "sentiment_score"}
                    },
                    "strong_signals": {
                        "filter": {
                            "range": {
                                "sentiment_score": {
                                    "abs": sentiment_threshold
                                }
                            }
                        }
                    },
                    "categories": {
                        "terms": {"field": "categories"}
                    }
                }
            },
            "overall_stats": {
                "stats": {"field": "sentiment_score"}
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 0,
                "aggs": aggs
            }
        )

    def get_earnings_coverage(self, ticker, quarters=4):
        """
        Retrieve and analyze earnings-related news coverage
        Returns articles and sentiment around earnings events
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"terms": {"categories": ["earnings", "financial-results"]}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{quarters * 90}d"
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "quarterly_coverage": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": "quarter"
                },
                "aggs": {
                    "sentiment_stats": {
                        "stats": {"field": "sentiment_score"}
                    },
                    "source_breakdown": {
                        "terms": {"field": "source"}
                    },
                    "key_metrics": {
                        "stats": {"field": "financial_metrics.price_change"}
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 20,
                "sort": [{"published_at": "desc"}],
                "aggs": aggs
            }
        )

    def get_institutional_activity(self, ticker, timeframe='90d'):
        """
        Track news mentions of institutional investor activity
        Returns coverage of institutional trading, holdings, and ratings
        """
        institutional_keywords = [
            "institutional", "hedge fund", "mutual fund",
            "analyst rating", "price target", "upgrade",
            "downgrade", "stake", "position", "holdings"
        ]
        
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }},
                    {
                        "multi_match": {
                            "query": " ".join(institutional_keywords),
                            "fields": ["headline", "content"],
                            "minimum_should_match": "1"
                        }
                    }
                ]
            }
        }
        
        aggs = {
            "activity_timeline": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": "week"
                },
                "aggs": {
                    "sentiment_avg": {
                        "avg": {"field": "sentiment_score"}
                    },
                    "sources": {
                        "terms": {"field": "source"}
                    }
                }
            },
            "activity_types": {
                "terms": {
                    "field": "categories",
                    "size": 10
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 50,
                "sort": [{"published_at": "desc"}],
                "aggs": aggs
            }
        )

    def get_stock_volatility_news(self, ticker, volatility_threshold=2.0, timeframe='180d'):
        """
        Find news coverage during periods of high stock volatility
        Returns news articles during volatile periods
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {
                        "published_at": {
                            "gte": f"now-{timeframe}"
                        }
                    }},
                    {"range": {
                        "financial_metrics.price_change": {
                            "abs": volatility_threshold
                        }
                    }}
                ]
            }
        }
        
        aggs = {
            "volatility_periods": {
                "date_histogram": {
                    "field": "published_at",
                    "calendar_interval": "day"
                },
                "aggs": {
                    "avg_price_change": {
                        "avg": {"field": "financial_metrics.price_change"}
                    },
                    "volume_stats": {
                        "stats": {"field": "financial_metrics.volume"}
                    },
                    "categories": {
                        "terms": {"field": "categories"}
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={
                "query": query,
                "size": 50,
                "sort": [
                    {"financial_metrics.price_change": "desc"},
                    {"published_at": "desc"}
                ],
                "aggs": aggs
            }
        )

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