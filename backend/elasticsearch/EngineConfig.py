from typing import Dict, Optional
import os
from dotenv import load_dotenv

class EngineConfig:
    def __init__(self):
        # Load environment variables from .env file
        load_dotenv()
        
        # Get configuration from environment variables with fallbacks
        self.api_key: Optional[str] = os.getenv('ELASTICSEARCH_API_KEY')
        self.elasticsearch_url: str = os.getenv(
            'ELASTICSEARCH_URL', 
            'https://f4e7b79a4d854dceaa351824e58f2065.us-east-2.aws.elastic-cloud.com:443'
        )
        self.index_name: str = os.getenv('ELASTICSEARCH_INDEX', 'financial_news')
        
        # Embedding configuration
        self.embedding_dimensions: int = int(os.getenv('EMBEDDING_DIMENSIONS', '768'))
        
        self.index_settings: Dict = self._get_default_settings()

    def validate_config(self) -> None:
        """Validate that all required configuration values are present."""
        if not self.api_key:
            raise ValueError("ELASTICSEARCH_API_KEY environment variable is required")
        if not self.elasticsearch_url:
            raise ValueError("ELASTICSEARCH_URL environment variable is required")
        if not self.index_name:
            raise ValueError("ELASTICSEARCH_INDEX environment variable is required")
        if self.embedding_dimensions <= 0:
            raise ValueError("EMBEDDING_DIMENSIONS must be a positive integer")

    def _get_default_settings(self) -> Dict:
        """Get default Elasticsearch index settings."""
        return {
            "number_of_shards": int(os.getenv('ES_NUMBER_OF_SHARDS', '3')),
            "number_of_replicas": int(os.getenv('ES_NUMBER_OF_REPLICAS', '2')),
            "analysis": {
                "analyzer": {
                    "financial_analyzer": {
                        "type": "custom",
                        "tokenizer": "standard",
                        "filter": ["lowercase", "stop", "financial_symbols", "company_names"]
                    }
                }
            }
        }