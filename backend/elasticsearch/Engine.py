from .EngineConfig import EngineConfig
from .StorageManager import StorageManager
from .DataValidator import DataValidator
from typing import Dict, List, Optional
from datetime import datetime


class Engine:
    def __init__(self) -> None:
        """Initialize the Engine with configuration and dependencies."""
        self.config = EngineConfig()
        
        self.validator = DataValidator()
        self.storage = StorageManager(self.config)
        self.es = self.storage.es
        self.index_name = self.storage.index_name
        
        self.storage.create_index()

    def add_article(self, article: Dict) -> bool:
        """
        Add a new article with validation.
        
        Args:
            article: Dictionary containing article data
            
        Returns:
            bool: True if article was added successfully, False otherwise
        """
        if not self.validator.validate_article(article):
            return False

        article['published_at'] = article.get('published_at', datetime.now())
        article['updated_at'] = datetime.now()

        if 'companies' in article:
            for company in article['companies']:
                if not self.validator.validate_company_data(company):
                    return False

        self.es.index(
            index=self.index_name,
            body=article
        )
        return True

    def search_news(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ) -> Dict:
        """
        Perform advanced search for financial news with multiple parameters.
        
        Args:
            query_text: Optional text to search for
            filters: Optional dictionary of filters to apply
            time_range: Optional time range for filtering results
            
        Returns:
            Dict containing search results and aggregations
        """
        query = self._build_search_query(query_text, filters, time_range)
        return self.es.search(index=self.index_name, body=query)

    def get_trending_topics(self, timeframe: str = "1d") -> Dict:
        """
        Get trending financial topics within specified timeframe.
        
        Args:
            timeframe: Time period to analyze ("1d", "1w", "1m")
            
        Returns:
            Dict containing trending topics and their metrics
        """
        intervals = {
            "1d": "now-1d/d",
            "1w": "now-1w/w",
            "1m": "now-1M/M"
        }
        
        query = {
            "query": {
                "range": {
                    "published_at": {
                        "gte": intervals.get(timeframe, "now-1d/d")
                    }
                }
            },
            "aggs": {
                "popular_categories": {
                    "terms": {"field": "categories", "size": 10}
                },
                "company_mentions": {
                    "terms": {"field": "companies.ticker", "size": 10}
                }
            }
        }
        
        return self.es.search(index=self.index_name, body=query)

    def get_sentiment_trends(self, ticker: str, time_range: str = '30d') -> List[Dict]:
        """
        Analyze sentiment trends for a specific company over time.
        
        Args:
            ticker: Company stock ticker symbol
            time_range: Time period to analyze
            
        Returns:
            List of dictionaries containing sentiment trends over time
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {"published_at": {"gte": f"now-{time_range}"}}}
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
            body={"query": query, "size": 0, "aggs": aggs}
        )
        
        return result['aggregations']['sentiment_over_time']['buckets']

    def get_source_distribution(self, timeframe: str = '7d', min_articles: int = 5) -> Dict:
        """
        Analyze distribution of news articles across different sources.
        
        Args:
            timeframe: Time period to analyze
            min_articles: Minimum number of articles required for inclusion
            
        Returns:
            Dict containing source distribution analysis
        """
        query = {
            "bool": {
                "must": [
                    {"range": {
                        "published_at": {"gte": f"now-{timeframe}"}
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
            body={"query": query, "size": 0, "aggs": aggs}
        )

    def get_volume_spikes(self, threshold: float = 2.0, timeframe: str = '30d') -> Dict:
        """
        Identify periods of unusually high news volume.
        
        Args:
            threshold: Multiple of average volume to consider as spike
            timeframe: Time period to analyze
            
        Returns:
            Dict containing volume analysis and spike information
        """
        query = {
            "bool": {
                "must": [
                    {"range": {
                        "published_at": {"gte": f"now-{timeframe}"}
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
                        "terms": {"field": "categories", "size": 5}
                    },
                    "companies": {
                        "terms": {"field": "companies.ticker", "size": 5}
                    }
                }
            }
        }
        
        result = self.es.search(
            index=self.index_name,
            body={"query": query, "size": 0, "aggs": aggs}
        )
        
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

    def get_correlation_matrix(self, tickers: List[str], timeframe: str = '30d') -> Dict:
        """
        Generate a correlation matrix between companies based on news co-occurrence.
        
        Args:
            tickers: List of company ticker symbols
            timeframe: Time period to analyze
            
        Returns:
            Dict containing correlation matrix
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
                                    "published_at": {"gte": f"now-{timeframe}"}
                                }},
                                {"terms": {
                                    "companies.ticker": [ticker1, ticker2]
                                }}
                            ]
                        }
                    }
                    
                    joint_count = self.es.count(
                        index=self.index_name,
                        body={"query": query}
                    )['count']
                    
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
                    
                    correlation = (
                        joint_count / ((count1 * count2) ** 0.5)
                        if count1 > 0 and count2 > 0
                        else 0
                    )
                    
                    correlations[ticker1][ticker2] = round(correlation, 3)
                else:
                    correlations[ticker1][ticker2] = 1.0
        
        return correlations

    def get_category_evolution(
        self,
        category: str,
        timeframe: str = '90d',
        interval: str = '1d'
    ) -> Dict:
        """
        Track how a news category evolves over time.
        
        Args:
            category: Category to analyze
            timeframe: Time period to analyze
            interval: Time interval for aggregation
            
        Returns:
            Dict containing category evolution analysis
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"categories": category}},
                    {"range": {"published_at": {"gte": f"now-{timeframe}"}}}
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
                        "terms": {"field": "companies.ticker", "size": 5}
                    },
                    "related_categories": {
                        "terms": {
                            "field": "categories",
                            "size": 5,
                            "exclude": [category]
                        }
                    },
                    "avg_sentiment": {
                        "avg": {"field": "sentiment_score"}
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={"query": query, "size": 0, "aggs": aggs}
        )

    def get_stock_price_mentions(self, ticker: str, timeframe: str = '30d') -> Dict:
        """
        Find news articles mentioning specific stock price levels.
        
        Args:
            ticker: Company stock ticker symbol
            timeframe: Time period to analyze
            
        Returns:
            Dict containing articles with price mentions
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {"published_at": {"gte": f"now-{timeframe}"}}},
                    {"exists": {"field": "financial_metrics.price_change"}}
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

    def get_stock_momentum_signals(
        self,
        ticker: str,
        timeframe: str = '7d',
        sentiment_threshold: float = 0.6
    ) -> Dict:
        """
        Analyze news momentum signals for a stock.
        
        Args:
            ticker: Company stock ticker symbol
            timeframe: Time period to analyze
            sentiment_threshold: Threshold for significant sentiment
            
        Returns:
            Dict containing momentum signal analysis
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {"published_at": {"gte": f"now-{timeframe}"}}}
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
                    "avg_sentiment": {"avg": {"field": "sentiment_score"}},
                    "strong_signals": {
                        "filter": {
                            "range": {
                                "sentiment_score": {"abs": sentiment_threshold}
                            }
                        }
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={"query": query, "size": 0, "aggs": aggs}
        )

    def get_regional_activity(
        self,
        timeframe: str = '7d',
        include_categories: bool = True
    ) -> Dict:
        """
        Get news distribution and trends across different regions.
        
        Args:
            timeframe: Time period to analyze
            include_categories: Whether to include category analysis
            
        Returns:
            Dict containing regional activity analysis
        """
        query = {
            "bool": {
                "must": [
                    {"range": {"published_at": {"gte": f"now-{timeframe}"}}}
                ]
            }
        }
        
        category_agg = (
            {"terms": {"field": "categories", "size": 5}}
            if include_categories
            else {}
        )
        
        aggs = {
            "regions": {
                "terms": {"field": "regions", "size": 20},
                "aggs": {
                    "daily_volume": {
                        "date_histogram": {
                            "field": "published_at",
                            "calendar_interval": "day"
                        }
                    },
                    "categories": category_agg,
                    "avg_sentiment": {
                        "avg": {"field": "sentiment_score"}
                    }
                }
            }
        }
        
        return self.es.search(
            index=self.index_name,
            body={"query": query, "size": 0, "aggs": aggs}
        )

    def get_earnings_coverage(self, ticker: str, quarters: int = 4) -> Dict:
        """
        Retrieve and analyze earnings-related news coverage.
        
        Args:
            ticker: Company stock ticker symbol
            quarters: Number of quarters to analyze
            
        Returns:
            Dict containing earnings coverage analysis
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"terms": {"categories": ["earnings", "financial-results"]}},
                    {"range": {"published_at": {"gte": f"now-{quarters * 90}d"}}}
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

    def get_institutional_activity(self, ticker: str, timeframe: str = '90d') -> Dict:
        """
        Track news mentions of institutional investor activity.
        
        Args:
            ticker: Company stock ticker symbol
            timeframe: Time period to analyze
            
        Returns:
            Dict containing institutional activity analysis
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
                    {"range": {"published_at": {"gte": f"now-{timeframe}"}}},
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

    def get_stock_volatility_news(
        self,
        ticker: str,
        volatility_threshold: float = 2.0,
        timeframe: str = '180d'
    ) -> Dict:
        """
        Find news coverage during periods of high stock volatility.
        
        Args:
            ticker: Company stock ticker symbol
            volatility_threshold: Threshold for considering price movement volatile
            timeframe: Time period to analyze
            
        Returns:
            Dict containing volatility analysis and related news
        """
        query = {
            "bool": {
                "must": [
                    {"term": {"companies.ticker": ticker.upper()}},
                    {"range": {"published_at": {"gte": f"now-{timeframe}"}}},
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

    def _build_search_query(
        self,
        query_text: Optional[str],
        filters: Optional[Dict],
        time_range: Optional[Dict]
    ) -> Dict:
        """
        Build Elasticsearch query from parameters.
        
        Args:
            query_text: Optional text to search for
            filters: Optional dictionary of filters to apply
            time_range: Optional time range for filtering results
            
        Returns:
            Dict containing complete Elasticsearch query
        """
        must_conditions = []
        filter_conditions = []
        
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
        
        return {
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
