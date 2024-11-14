from typing import Dict, Optional
from datetime import datetime

class QueryProcessor:
    def __init__(self, min_query_length: int = 2, max_query_length: int = 100):
        """Initialize query processor with configurable query length settings."""
        self.min_query_length = min_query_length
        self.max_query_length = max_query_length

    def process_query(
        self,
        query_text: str,
        filters: Optional[Dict] = None,
        time_range: Optional[Dict] = None
    ) -> Dict:
        """Process and enhance the search query."""
        if not self._validate_query_text(query_text):
            raise ValueError(
                f"Query length must be between {self.min_query_length} "
                f"and {self.max_query_length} characters"
            )

        processed_query = {
            'query': self._preprocess_text(query_text),
            'filters': self._process_filters(filters),
            'time_range': self._validate_time_range(time_range)
        }
        return processed_query

    def _validate_query_text(self, text: str) -> bool:
        """Validate query text length."""
        if not text:
            return False
        text_length = len(text.strip())
        return self.min_query_length <= text_length <= self.max_query_length

    def _preprocess_text(self, text: str) -> str:
        """Clean and normalize query text."""
        return text.lower().strip()

    def _process_filters(self, filters: Optional[Dict]) -> Dict:
        """Process and validate query filters."""
        if not filters:
            return {}
        
        valid_filters = {}
        if 'companies' in filters:
            valid_filters['companies'] = [c.upper() for c in filters['companies']]
        if 'categories' in filters:
            valid_filters['categories'] = filters['categories']
        if 'sentiment' in filters:
            valid_filters['sentiment'] = filters['sentiment']
            
        return valid_filters

    def _validate_time_range(self, time_range: Optional[Dict]) -> Optional[Dict]:
        """Validate and format time range parameters."""
        if not time_range:
            return None
            
        try:
            start = datetime.fromisoformat(time_range.get('start', ''))
            end = datetime.fromisoformat(time_range.get('end', ''))
            if start > end:
                start, end = end, start
            return {'start': start.isoformat(), 'end': end.isoformat()}
        except:
            return None