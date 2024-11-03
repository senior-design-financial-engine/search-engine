from flask import Flask, request, jsonify
from datetime import datetime
from typing import Dict, Optional, List
import logging
from elasticsearch.Engine import Engine

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class BackEnd:
    def __init__(self, config_path: str = 'api_key.json'):
        """Initialize the backend with the Engine component."""
        try:
            self.engine = Engine(config_path)
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
            return self.engine.search_news(query_text, filters, time_range)
        except Exception as e:
            logger.error(f"Error processing search query: {str(e)}")
            raise

    def get_company_analysis(
        self,
        ticker: str,
        timeframe: str = '30d'
    ) -> Dict:
        """Get comprehensive analysis for a company."""
        try:
            sentiment = self.engine.get_sentiment_trends(ticker, timeframe)
            price_mentions = self.engine.get_stock_price_mentions(ticker, timeframe)
            momentum = self.engine.get_stock_momentum_signals(ticker, timeframe)
            institutional = self.engine.get_institutional_activity(ticker, timeframe)
            
            return {
                'sentiment_trends': sentiment,
                'price_mentions': price_mentions,
                'momentum_signals': momentum,
                'institutional_activity': institutional
            }
        except Exception as e:
            logger.error(f"Error getting company analysis: {str(e)}")
            raise

    def get_market_overview(self, timeframe: str = '7d') -> Dict:
        """Get overall market analysis and trends."""
        try:
            trending = self.engine.get_trending_topics(timeframe)
            sources = self.engine.get_source_distribution(timeframe)
            volume = self.engine.get_volume_spikes(threshold=2.0, timeframe=timeframe)
            regions = self.engine.get_regional_activity(timeframe)
            
            return {
                'trending_topics': trending,
                'source_distribution': sources,
                'volume_spikes': volume,
                'regional_activity': regions
            }
        except Exception as e:
            logger.error(f"Error getting market overview: {str(e)}")
            raise

# Initialize backend
backend = BackEnd()

@app.route('/api/search', methods=['POST'])
def search():
    """API endpoint for searching news articles."""
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
        logger.error(f"Search endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/company/<ticker>', methods=['GET'])
def company_analysis(ticker):
    """API endpoint for company analysis."""
    try:
        timeframe = request.args.get('timeframe', '30d')
        analysis = backend.get_company_analysis(ticker, timeframe)
        return jsonify(analysis)
    except Exception as e:
        logger.error(f"Company analysis endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/market/overview', methods=['GET'])
def market_overview():
    """API endpoint for market overview."""
    try:
        timeframe = request.args.get('timeframe', '7d')
        overview = backend.get_market_overview(timeframe)
        return jsonify(overview)
    except Exception as e:
        logger.error(f"Market overview endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/correlations', methods=['POST'])
def correlations():
    """API endpoint for correlation analysis."""
    try:
        data = request.get_json()
        if not data or 'tickers' not in data:
            return jsonify({'error': 'Tickers list is required'}), 400
            
        timeframe = data.get('timeframe', '30d')
        correlations = backend.engine.get_correlation_matrix(data['tickers'], timeframe)
        return jsonify(correlations)
    except Exception as e:
        logger.error(f"Correlations endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/categories/<category>', methods=['GET'])
def category_evolution(category):
    """API endpoint for category evolution analysis."""
    try:
        timeframe = request.args.get('timeframe', '90d')
        interval = request.args.get('interval', '1d')
        evolution = backend.engine.get_category_evolution(category, timeframe, interval)
        return jsonify(evolution)
    except Exception as e:
        logger.error(f"Category evolution endpoint error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=False)