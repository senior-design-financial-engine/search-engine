from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from indexer import Indexer
from elasticsearch import Engine
from recommender import Recommender
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
            self.recommender = Recommender()
            logger.info("Backend initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize backend: {str(e)}")
            raise

    def process_search_query(
        self,
        query_text: str,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None,
        user_id: Optional[str] = None
    ) -> Dict:
        """Process a search query with optional filters and time range."""
        try:
            # First process the query through recommender
            processed_query = self.recommender.process_query(
                query_text=query_text,
                filters=filters,
                time_range=time_range,
                user_id=user_id
            )
            
            # Use processed query for search
            results = self.engine.search_news(
                processed_query['query'],
                processed_query['filters'],
                processed_query['time_range']
            )
            
            # Enhance the results
            enhanced_results = self.recommender.enhance_results(results)
            return enhanced_results
            
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            raise

    def get_user_history(
        self,
        user_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> List[Dict]:
        """Retrieve search history for a user."""
        try:
            return self.recommender.get_user_query_history(
                user_id=user_id,
                start_time=start_time,
                end_time=end_time
            )
        except Exception as e:
            logger.error(f"Error retrieving user history: {str(e)}")
            raise

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
        if not query_text:
            return jsonify({'error': 'Query text is required'}), 400
            
        filters = data.get('filters')
        time_range = data.get('time_range')
        user_id = data.get('user_id')
        
        results = backend.process_search_query(
            query_text=query_text,
            filters=filters,
            time_range=time_range,
            user_id=user_id
        )
        return jsonify(results)
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Query endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/user/history/<user_id>', methods=['GET'])
def user_history(user_id):
    try:
        start_time = request.args.get('start_time')
        end_time = request.args.get('end_time')
        
        history = backend.get_user_history(
            user_id=user_id,
            start_time=start_time,
            end_time=end_time
        )
        return jsonify(history)
    except Exception as e:
        logger.error(f"User history endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)