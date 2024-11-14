from typing import Dict, List
import os
from dotenv import load_dotenv

class RecommenderConfig:
    def __init__(self):
        # Load environment variables from .env file
        load_dotenv()
        
        # Query Processing Configuration
        self.min_query_length: int = int(os.getenv('MIN_QUERY_LENGTH', '2'))
        self.max_query_length: int = int(os.getenv('MAX_QUERY_LENGTH', '100'))
        self.default_query_limit: int = int(os.getenv('DEFAULT_QUERY_LIMIT', '10'))
        
        # Filter Configuration
        self.allowed_categories: List[str] = [
            'earnings',
            'mergers',
            'market_news',
            'company_news',
            'economic_news'
        ]
        self.sentiment_values: List[str] = ['positive', 'negative', 'neutral']
        self.max_companies_per_query: int = int(os.getenv('MAX_COMPANIES_PER_QUERY', '5'))
        
        # Time Range Configuration
        self.max_historical_days: int = int(os.getenv('MAX_HISTORICAL_DAYS', '365'))
        self.default_timeframe: str = os.getenv('DEFAULT_TIMEFRAME', '7d')
        self.allowed_timeframes: List[str] = ['1d', '7d', '30d', '90d', '180d', '365d']

    def validate_config(self) -> None:
        """Validate that all configuration values are within acceptable ranges."""
        if self.min_query_length < 1:
            raise ValueError("MIN_QUERY_LENGTH must be at least 1")
        if self.max_query_length < self.min_query_length:
            raise ValueError("MAX_QUERY_LENGTH must be greater than MIN_QUERY_LENGTH")
        if self.default_query_limit < 1:
            raise ValueError("DEFAULT_QUERY_LIMIT must be at least 1")
        if self.max_companies_per_query < 1:
            raise ValueError("MAX_COMPANIES_PER_QUERY must be at least 1")
        if self.max_historical_days < 1:
            raise ValueError("MAX_HISTORICAL_DAYS must be at least 1")
        if self.default_timeframe not in self.allowed_timeframes:
            raise ValueError(f"DEFAULT_TIMEFRAME must be one of {self.allowed_timeframes}")

    def get_query_config(self) -> Dict:
        """Get query processing configuration."""
        return {
            'min_length': self.min_query_length,
            'max_length': self.max_query_length,
            'default_limit': self.default_query_limit
        }

    def get_filter_config(self) -> Dict:
        """Get filter configuration."""
        return {
            'allowed_categories': self.allowed_categories,
            'sentiment_values': self.sentiment_values,
            'max_companies_per_query': self.max_companies_per_query
        }

    def get_time_config(self) -> Dict:
        """Get time range configuration."""
        return {
            'max_historical_days': self.max_historical_days,
            'default_timeframe': self.default_timeframe,
            'allowed_timeframes': self.allowed_timeframes
        }