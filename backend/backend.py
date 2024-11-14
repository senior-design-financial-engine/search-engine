from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from indexer import Indexer
from elasticsearch import Engine
from dotenv import load_dotenv
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

app = Flask(__name__)

class BackEnd:
    def __init__(self, embedding_model_path: str, num_dim: int):
        try:
            # Load environment variables
            load_dotenv()
            
            # Initialize components
            self.web_scraper = WebScraper()
            self.indexer = Indexer(embedding_model_path, num_dim)
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
        """Process a search query with optional filters and time range."""
        try:
            results = self.engine.search_news(query_text, filters, time_range)
            return self.indexer.score_and_rank(results)
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            raise

    def update_index(self):
        # Update the index with new data
        pass

# Initialize the backend
embedding_model_path = 'models/embedding_model.pth'
num_dim = 300  # Example dimension size
backend = BackEnd(embedding_model_path, num_dim)

@app.route('/query', methods=['POST'])
def query():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
            
        query_text = data.get('query')
        filters = data.get('filters')
        time_range = data.get('time_range')
        
        results = backend.process_search_query(query_text, filters, time_range)
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
