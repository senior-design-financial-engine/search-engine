from typing import Dict, Optional, List
from .QueryProcessor import QueryProcessor
from .ResultEnhancer import ResultEnhancer
from .QueryTable import QueryTable
from .RecommenderConfig import RecommenderConfig

class Recommender:
    def __init__(self):
        """Initialize the Recommender with its components."""
        self.config = RecommenderConfig()
        self.config.validate_config()
        
        self.query_processor = QueryProcessor(
            min_query_length=self.config.min_query_length,
            max_query_length=self.config.max_query_length
        )
        self.result_enhancer = ResultEnhancer()
        self.query_table = QueryTable('financial_queries')
        
        # Ensure the DynamoDB table exists
        self.query_table.create_table()

    def process_query(
        self,
        query_text: str,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None,
        user_id: Optional[str] = None
    ) -> Dict:
        """Process and enhance the search query."""
        # Process the query
        processed_query = self.query_processor.process_query(
            query_text,
            filters,
            time_range
        )
        
        # Log the query to DynamoDB
        self.query_table.log_query(
            query_text=query_text,
            filters=filters,
            user_id=user_id
        )
        
        return processed_query

    def enhance_results(
        self,
        results: Dict,
        query_id: Optional[str] = None
    ) -> Dict:
        """Enhance search results with recommendations and additional features."""
        enhanced_results = self.result_enhancer.enhance_results(results)
        
        # Update the query record with results count if we have a query_id
        if query_id:
            results_count = enhanced_results.get('hits', {}).get('total', {}).get('value', 0)
            self.query_table.update_query_results(query_id, results_count)
            
        return enhanced_results

    def get_user_query_history(
        self,
        user_id: str,
        start_time: Optional[str] = None,
        end_time: Optional[str] = None
    ) -> List[Dict]:
        """Retrieve query history for a specific user."""
        return self.query_table.get_user_queries(user_id, start_time, end_time)

    def get_query_details(self, query_id: str) -> Optional[Dict]:
        """Retrieve details for a specific query."""
        return self.query_table.get_query_history(query_id)