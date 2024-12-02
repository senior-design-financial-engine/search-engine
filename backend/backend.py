from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from indexer import Indexer
from es_database import Engine
from dotenv import load_dotenv
import logging
import os
from flask_cors import CORS

app = Flask(__name__)
cors = CORS(app)
logger = logging.getLogger(__name__)

class BackEnd:
    def __init__(self, embedding_model_path: str, num_dim: int):
        try:
            # Load environment variables
            load_dotenv()
            
            # Initialize components
            # self.web_scraper = WebScraper()
            # self.indexer = Indexer(embedding_model_path, num_dim)
            self.engine = Engine()
            self.engine.config.validate_config()
            logger.info("Backend initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize backend: {str(e)}")
            raise

    def process_search_query(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ) -> Dict:
        logger.info(msg=f"hello {filters}")
        """Process a search query with optional filters and time range."""
        try:
            results = self.engine.search_news(query_text, filters, time_range)
            # return self.indexer.score_and_rank(results)
            return results['hits']['hits']
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            raise

    def update_index(self):
        # Update the index with new data
        pass
    
    def dummy_search(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ):
        dummy_results = [
            { "url": 'https://example.com/1', "snippet": 'Result 1 summary...', "sentiment": 'Positive', "date": '2024-11-01' },
            { "url": 'https://example.com/2', "snippet": 'Result 2 summary...', "sentiment": 'Neutral', "date": '2024-11-02' },
            { "url": 'https://example.com/3', "snippet": 'Result 3 summary...', "sentiment": 'Negative', "date": '2024-11-03' }
            ]
        return dummy_results

# Initialize the backend
embedding_model_path = 'models/embedding_model.pth'
num_dim = 300  # Example dimension size
backend = BackEnd(embedding_model_path, num_dim)

@app.route('/query', methods=['GET'])
def query():
    try:
        query_text = request.args.get('query', None)
        source = request.args.get('source', None)
        time_range = request.args.get('time_range', None)
        
        filters = {
            "source": source
        }
        
        logger.info(msg=f"hello {filters}")
        
        results = backend.process_search_query(query_text, filters, time_range)
        # results = backend.dummy_search(query_text, filters, time_range)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Query endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
