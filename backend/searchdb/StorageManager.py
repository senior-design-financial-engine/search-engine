from .EngineConfig import EngineConfig
from elasticsearch import Elasticsearch
from typing import Dict, Optional, List, Union
import numpy as np

class StorageManager:
    def __init__(self, config: EngineConfig):
        self.config = config
        self.es = Elasticsearch(config.elasticsearch_url, api_key=config.api_key)
        self.index_name = config.index_name

    def create_index(self) -> None:
        mappings = self._get_index_mappings()
        self.es.indices.create(index=self.index_name, body={
            "mappings": mappings,
            "settings": self.config.index_settings
        })

    def _get_index_mappings(self) -> Dict:
        base_mappings = {
            "properties": {
                "headline": {
                    "type": "text",
                    "analyzer": "english",
                    "fields": {
                        "keyword": {"type": "keyword"}
                    }
                },
                "url": {
                    "type": "keyword",
                    "index": True
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
                    "type": "nested",
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
                    "type": "keyword"
                },
                "sentiment": {
                    "type": "keyword"
                },
                "sentiment_score": {
                    "type": "float"
                },
                "regions": {
                    "type": "keyword"
                },
                "source": {
                    "type": "keyword"
                },
                "author": {
                    "type": "keyword"
                },
                "published_at": {
                    "type": "date"
                },
                "updated_at": {
                    "type": "date"
                },
                "embeddings": {
                    "type": "dense_vector",
                    "dims": self.config.embedding_dimensions,
                    "index": True,
                    "similarity": "cosine"
                }
            }
        }
        return base_mappings