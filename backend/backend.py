from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from indexer import Indexer
from dotenv import load_dotenv
import logging
import os
from flask_cors import CORS
import threading
import time
import schedule
from update_database import main as update_db

# Load environment variables
load_dotenv()

# Check if we should use mock data
USE_MOCK_DATA = os.getenv('USE_MOCK_DATA', 'false').lower() == 'true'

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
cors = CORS(app)

class BackEnd:
    def __init__(self, embedding_model_path: str, num_dim: int):
        try:
            # Initialize components
            # self.web_scraper = WebScraper()
            # self.indexer = Indexer(embedding_model_path, num_dim)
            
            # Use mock or real Engine based on environment variable
            if USE_MOCK_DATA:
                from es_database.mock_data_generator import MockEngine
                self.engine = MockEngine()
                logger.info("Backend initialized with MOCK Elasticsearch engine")
            else:
                from es_database import Engine
                self.engine = Engine()
                self.engine.config.validate_config()
                logger.info("Backend initialized with real Elasticsearch engine")
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
            # return self.indexer.score_and_rank(results)
            return results['hits']['hits']
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            raise

    def update_index(self):
        """Update the index with new data"""
        try:
            logger.info("Starting scheduled database update")
            # Run the update_database script
            update_db(skip_scrape=False)
            logger.info("Scheduled database update completed successfully")
        except Exception as e:
            logger.error(f"Error updating index: {str(e)}")
    
    def dummy_search(
        self,
        query_text: Optional[str] = None,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ):
        # This method is deprecated in favor of the MockEngine
        # but kept for backward compatibility
        if USE_MOCK_DATA:
            from es_database.mock_data_generator import generate_mock_search_response
            return generate_mock_search_response(query_text, 
                                               filters.get('source') if filters else None, 
                                               time_range)['hits']['hits']
        else:
            dummy_results = [
                { "url": 'https://example.com/1', "snippet": 'Result 1 summary...', "sentiment": 'Positive', "date": '2024-11-01' },
                { "url": 'https://example.com/2', "snippet": 'Result 2 summary...', "sentiment": 'Neutral', "date": '2024-11-02' },
                { "url": 'https://example.com/3', "snippet": 'Result 3 summary...', "sentiment": 'Negative', "date": '2024-11-03' }
                ]
            return dummy_results

def run_scheduler():
    """Run the scheduler in a separate thread"""
    while True:
        schedule.run_pending()
        time.sleep(60)  # Check every minute

# Initialize the backend
embedding_model_path = 'models/embedding_model.pth'
num_dim = 300  # Example dimension size
backend = BackEnd(embedding_model_path, num_dim)

# Set up scheduled tasks
UPDATE_INTERVAL = os.getenv('UPDATE_INTERVAL_HOURS', '4')
try:
    update_interval = int(UPDATE_INTERVAL)
except ValueError:
    update_interval = 4  # Default to 4 hours if invalid config

# Schedule regular database updates
schedule.every(update_interval).hours.do(backend.update_index)
logger.info(f"Scheduled database updates every {update_interval} hours")

# Run an initial update if configured
INITIAL_UPDATE = os.getenv('INITIAL_UPDATE', 'false').lower() == 'true'
if INITIAL_UPDATE:
    logger.info("Running initial database update")
    threading.Thread(target=backend.update_index).start()

# Start the scheduler in a separate thread
scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
scheduler_thread.start()
logger.info("Scheduler thread started")

@app.route('/query', methods=['GET'])
def query():
    try:
        query_text = request.args.get('query', None)
        source = request.args.get('source', None)
        time_range = request.args.get('time_range', None)
        
        filters = {}
        if source:
            filters["source"] = source
        
        results = backend.process_search_query(query_text, filters, time_range)
        # This line is commented out in favor of the integrated mock support
        # results = backend.dummy_search(query_text, filters, time_range)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Query endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/update', methods=['POST'])
def update():
    """Endpoint to manually trigger database update"""
    try:
        threading.Thread(target=backend.update_index).start()
        return jsonify({"status": "update started"}), 202
    except Exception as e:
        logger.error(f"Update endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)
