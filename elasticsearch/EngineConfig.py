from typing import Dict, Optional
import json
import os

class EngineConfig:
    def __init__(self, config_path: str = 'api_key.json'):
        self.config_path = config_path
        self.api_key: Optional[str] = None
        self.elasticsearch_url: str = 'https://f4e7b79a4d854dceaa351824e58f2065.us-east-2.aws.elastic-cloud.com:443'
        self.index_settings: Dict = self._get_default_settings()

    def load_config(self) -> None:
        try:
            if not os.path.exists(self.config_path):
                raise FileNotFoundError(f"Configuration file not found: {self.config_path}")
            
            with open(self.config_path, 'r') as file:
                config = json.load(file)
            
            self.api_key = config['api_key']
            if not self.api_key:
                raise KeyError("API key is empty")
            
        except json.JSONDecodeError as e:
            raise json.JSONDecodeError(f"Invalid JSON format in config file: {str(e)}", e.doc, e.pos)
        except KeyError:
            raise KeyError("'api_key' not found in config file")

    def _get_default_settings(self) -> Dict:
        return {
            "number_of_shards": 3,
            "number_of_replicas": 2,
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