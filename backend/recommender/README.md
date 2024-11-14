# Recommender Module

## Initialization
```python
recommender = Recommender()
```
Initializes the recommender with default configuration from environment variables.

## Core Features

### Query Processing

```python
def process_query(
    query_text: str,
    filters: Optional[Dict] = None,
    time_range: Optional[Dict] = None
) -> Dict
```
Processes and enhances search queries.
- **Arguments**:
  - `query_text`: Search query text
  - `filters`: Optional dictionary of filters:
    - `companies`: List of company tickers
    - `categories`: List of categories
    - `sentiment`: Sentiment filter
  - `time_range`: Optional time range dictionary with start/end dates
- **Returns**: Processed query with enhancements

## Configuration

The module uses environment variables for configuration:

### Query Processing
- `MIN_QUERY_LENGTH`: Minimum query length (default: 2)
- `MAX_QUERY_LENGTH`: Maximum query length (default: 100)
- `DEFAULT_QUERY_LIMIT`: Default result limit (default: 10)
- `MAX_COMPANIES_PER_QUERY`: Maximum companies per query (default: 5)
- `MAX_HISTORICAL_DAYS`: Maximum days for historical queries (default: 365)
- `DEFAULT_TIMEFRAME`: Default time range (default: '7d')

## Data Types and Formats

### Query Schema
Required fields:
- `query_text`: str

Optional fields:
- `filters`: Dict
- `time_range`: Dict

### Time Formats
- Standard periods: '1d', '7d', '30d', '90d', '180d', '365d'
- Date format: 'YYYY-MM-DD'
- DateTime format: 'YYYY-MM-DD HH:mm:ss'

### Filter Format
```python
{
    "companies": List[str],  # Company tickers
    "categories": List[str],
    "sentiment": str,
    "time_range": {
        "start": str,  # ISO format
        "end": str     # ISO format
    }
}
```

### Categories
Available categories:
- earnings
- mergers
- market_news
- company_news
- economic_news

### Sentiment Values
Available sentiment filters:
- positive
- negative
- neutral

## Error Handling
- Invalid query length: ValueError
- Invalid time range: ValueError
- Invalid category: ValueError
- Invalid sentiment value: ValueError
- Too many companies: ValueError