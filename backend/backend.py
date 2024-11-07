from flask import Flask, request, jsonify
from web_scraper import WebScraper
from indexer import Indexer
from elasticsearch import Engine
from dotenv import load_dotenv
import os

app = Flask(__name__)

class BackEnd:
    def __init__(self, embedding_model_path: str, num_dim: int):
        # Load environment variables
        load_dotenv()
        
        # Initialize components
        self.web_scraper = WebScraper()
        self.indexer = Indexer(embedding_model_path, num_dim)
        self.engine = Engine()

    def initialize_components(self):
        # Validate configuration before starting
        self.engine.config.validate_config()

    def process_query(self, query_str: str):
        # Process the query and return results
        query_embedding = self.indexer.calc_index(query_str)
        results = self.engine.query(query_embedding)
        return results

    def update_index(self):
        # Update the index with new data
        pass

# Initialize the backend
embedding_model_path = 'models/embedding_model.pth'
num_dim = 300  # Example dimension size
backend = BackEnd(embedding_model_path, num_dim)
backend.initialize_components()

@app.route('/query', methods=['POST'])
def query():
    data = request.json
    query_str = data.get('query')
    if not query_str:
        return jsonify({'error': 'Query string is required'}), 400

    results = backend.process_query(query_str)
    return jsonify({'results': results})

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000)