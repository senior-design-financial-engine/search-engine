import EngineConfig
from elasticsearch import Elasticsearch
from typing import Dict

class StorageManager:
    def __init__(self, config: EngineConfig):
        self.config = config
        self.es = Elasticsearch(config.elasticsearch_url, api_key=config.api_key)
        self.index_name = 'financial_news'

    def create_index(self) -> None:
        mappings = self._get_index_mappings()
        self.es.indices.create(index=self.index_name, body={
            "mappings": mappings,
            "settings": self.config.index_settings
        })

    def _get_index_mappings(self) -> Dict:
    	return {
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
              