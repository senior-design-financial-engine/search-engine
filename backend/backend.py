from flask import Flask, request, jsonify
from typing import Dict, Optional, List
from scraper import WebScraper
from dotenv import load_dotenv
import logging
import os
from flask_cors import CORS

# Load environment variables
load_dotenv()

app = Flask(__name__)
cors = CORS(app)
logger = logging.getLogger(__name__)

class BackEnd:
    def __init__(self):
        try:
            # Initialize components
            self.web_scraper = WebScraper()
            
            # Initialize the Elasticsearch engine
            from es_database import Engine
            self.engine = Engine()
            self.engine.config.validate_config()
            logger.info("Backend initialized with Elasticsearch engine")
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
            return results['hits']['hits']
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            raise

    def update_index(self, articles: List[Dict] = None):
        """Update the index with new articles."""
        try:
            if articles:
                for article in articles:
                    # Add directly to Elasticsearch without processing
                    self.engine.add_article(article)
                logger.info(f"Added {len(articles)} articles to index")
            else:
                # Could implement scraping logic here if needed
                logger.info("No articles provided to update index")
        except Exception as e:
            logger.error(f"Error updating index: {str(e)}")
            raise

# Initialize the backend
backend = BackEnd()

@app.route('/query', methods=['GET'])
def query():
    try:
        query_text = request.args.get('query', None)
        source = request.args.get('source', None)
        time_range = request.args.get('time_range', None)
        sentiment = request.args.get('sentiment', None)
        
        filters = {}
        if source:
            filters["source"] = source
        if sentiment:
            filters["sentiment"] = sentiment
        
        results = backend.process_search_query(query_text, filters, time_range)
        return jsonify(results)
    except Exception as e:
        logger.error(f"Query endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/article/<article_id>', methods=['GET'])
def get_article(article_id):
    try:
        article = backend.engine.get_article_by_id(article_id)
        if article:
            return jsonify(article)
        else:
            return jsonify({'error': 'Article not found'}), 404
    except Exception as e:
        logger.error(f"Get article endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
