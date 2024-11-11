# Engine Module

## Initialization
```python
engine = Engine()
```
Initializes the engine with default configuration from environment variables.

## Core Features

### Article Management

```python
def add_article(
    article: Dict,
    embeddings: Optional[Union[List[float], np.ndarray]] = None,
    custom_id: Optional[str] = None
) -> str
```
Adds a new article with optional embeddings vector.
- **Arguments**:
  - `article`: Dictionary containing article data with required fields:
    - `headline`: Article headline
    - `source`: News source
    - `companies`: List of company data
    - Additional optional fields: content, summary, categories, sentiment, regions, etc.
  - `embeddings`: Optional pre-computed embeddings vector
  - `custom_id`: Optional custom identifier
- **Returns**: Article ID

```python
def batch_add_articles(
    articles: List[Dict],
    embeddings_list: Optional[List[Union[List[float], np.ndarray]]] = None,
    custom_ids: Optional[List[str]] = None
) -> List[str]
```
Adds multiple articles in batch with their embeddings.
- **Returns**: List of added article IDs

### Similarity Search

```python
def search_by_id(
    article_id: str,
    k: int = 5,
    min_score: float = 0.7,
    additional_filters: Optional[Dict] = None,
    exclude_self: bool = True
) -> Dict
```
Finds similar articles using embeddings of a reference article.
- **Arguments**:
  - `article_id`: ID of the reference article
  - `k`: Number of similar articles to return
  - `min_score`: Minimum similarity score threshold
  - `additional_filters`: Optional query filters
  - `exclude_self`: Whether to exclude reference article
- **Returns**: Search results with similarity scores

```python
def search_by_vector(
    embedding_vector: Union[List[float], np.ndarray],
    k: int = 5,
    min_score: float = 0.7,
    additional_filters: Optional[Dict] = None
) -> Dict
```
Searches for articles similar to a given embedding vector.
- **Returns**: Search results with similarity scores

```python
def bulk_search_by_ids(
    article_ids: List[str],
    k: int = 5,
    min_score: float = 0.7,
    additional_filters: Optional[Dict] = None
) -> Dict[str, Dict]
```
Performs similarity search for multiple articles.
- **Returns**: Dictionary mapping article IDs to search results

### Text Search and Filtering

```python
def search_news(
    query_text: Optional[str] = None,
    filters: Optional[Dict] = None,
    time_range: Optional[Dict] = None
) -> Dict
```
Performs advanced search with text matching and filters.
- **Arguments**:
  - `query_text`: Search text to match against articles
  - `filters`: Dictionary of filters:
    - `companies`: List of company tickers
    - `categories`: List of news categories
    - `sentiment`: Sentiment value
    - `regions`: List of regions
  - `time_range`: Dictionary with start/end dates
- **Returns**: Search results with highlights and aggregations

### Trend Analysis

```python
def get_trending_topics(timeframe: str = "1d") -> Dict
```
Retrieves trending financial topics.
- **Arguments**:
  - `timeframe`: Time period ("1d", "1w", "1m")
- **Returns**: Popular categories and company mentions

```python
def get_sentiment_trends(ticker: str, time_range: str = '30d') -> List[Dict]
```
Analyzes sentiment trends for a company.
- **Returns**: Daily sentiment metrics

### Source Analysis

```python
def get_source_distribution(
    timeframe: str = '7d',
    min_articles: int = 5
) -> Dict
```
Analyzes news distribution across sources.
- **Returns**: Source distribution with sentiment and category breakdowns

### Volume Analysis

```python
def get_volume_spikes(
    threshold: float = 2.0,
    timeframe: str = '30d'
) -> Dict
```
Identifies periods of high news volume.
- **Returns**: Volume analysis with spike information

### Company Analysis

```python
def get_correlation_matrix(
    tickers: List[str],
    timeframe: str = '30d'
) -> Dict
```
Generates correlation matrix between companies based on news co-occurrence.
- **Returns**: Matrix of correlation scores

```python
def get_earnings_coverage(
    ticker: str,
    quarters: int = 4
) -> Dict
```
Analyzes earnings-related news coverage.
- **Returns**: Quarterly coverage analysis with sentiment and source breakdown

```python
def get_institutional_activity(
    ticker: str,
    timeframe: str = '90d'
) -> Dict
```
Tracks institutional investor activity mentions.
- **Returns**: Activity timeline with sentiment and source analysis

```python
def get_stock_volatility_news(
    ticker: str,
    volatility_threshold: float = 2.0,
    timeframe: str = '180d'
) -> Dict
```
Finds news coverage during periods of high stock volatility.
- **Returns**: Volatility analysis with related news

### Category and Regional Analysis

```python
def get_category_evolution(
    category: str,
    timeframe: str = '90d',
    interval: str = '1d'
) -> Dict
```
Tracks category evolution over time.
- **Returns**: Category trends with company and sentiment analysis

```python
def get_regional_activity(
    timeframe: str = '7d',
    include_categories: bool = True
) -> Dict
```
Analyzes news distribution across regions.
- **Returns**: Regional activity with volume and sentiment metrics

## Configuration

The engine uses environment variables for configuration:
- `ELASTICSEARCH_API_KEY`: Required API key for Elasticsearch
- `ELASTICSEARCH_URL`: Elasticsearch endpoint URL
- `ELASTICSEARCH_INDEX`: Index name (default: 'financial_news')
- `EMBEDDING_DIMENSIONS`: Dimension of embedding vectors (default: 768)
- `ES_NUMBER_OF_SHARDS`: Number of index shards (default: 3)
- `ES_NUMBER_OF_REPLICAS`: Number of index replicas (default: 2)

## Data Types and Formats

### Article Schema
Required fields:
- `headline`: str
- `source`: str
- `companies`: List[Dict]

Optional fields:
- `content`: str
- `summary`: str
- `categories`: List[str]
- `sentiment`: str
- `sentiment_score`: float
- `regions`: List[str]
- `author`: str
- `published_at`: datetime
- `embeddings`: List[float]
- `financial_metrics`: Dict

### Time Formats
- Standard periods: '1d', '7d', '30d', '90d', '180d'
- Date format: 'YYYY-MM-DD'
- DateTime format: 'YYYY-MM-DD HH:mm:ss'

### Company Data
- Ticker symbols: Uppercase (e.g., 'AAPL', 'MSFT')
- Company dictionary format:
  ```python
  {
      "name": str,
      "ticker": str,
      "exchange": str
  }
  ```

### Thresholds
- Similarity score: 0.0 to 1.0 (default: 0.7)
- Sentiment: -1.0 to 1.0
- Volatility: 1.0 to 5.0 (standard deviations)
- Volume: 1.5 to 3.0 (multiples of average)