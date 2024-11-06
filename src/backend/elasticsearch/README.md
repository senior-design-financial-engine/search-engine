# Class: Engine

## Initialization
```python
engine = Engine(config_path: str = 'api_key.json')
```
- `config_path`: Path to configuration file

## Methods

### Article Management
```python
def add_article(article: Dict) -> bool
```
Adds a new article to the index with validation.
- **Arguments**:
  - `article`: Dictionary containing article data with required fields:
    - `headline`: Article headline
    - `content`: Article content
    - `published_at` (optional): Publication datetime
    - `companies` (optional): List of company data
- **Returns**: Boolean indicating success

### Search and Retrieval

```python
def search_news(
    query_text: Optional[str] = None,
    filters: Optional[Dict] = None,
    time_range: Optional[Dict] = None
) -> Dict
```
Performs advanced search for financial news.
- **Arguments**:
  - `query_text`: Search text to match against articles
  - `filters`: Dictionary of filters:
    - `companies`: List of company tickers
    - `categories`: List of news categories
    - `sentiment`: Sentiment value
    - `regions`: List of regions
  - `time_range`: Dictionary with keys:
    - `start`: Start datetime
    - `end`: End datetime
- **Returns**: Search results with highlights and aggregations

### Trend Analysis

```python
def get_trending_topics(timeframe: str = "1d") -> Dict
```
Retrieves trending financial topics.
- **Arguments**:
  - `timeframe`: Time period ("1d", "1w", "1m")
- **Returns**: Dictionary with popular categories and company mentions

```python
def get_sentiment_trends(ticker: str, time_range: str = '30d') -> List[Dict]
```
Analyzes sentiment trends for a company.
- **Arguments**:
  - `ticker`: Company stock ticker symbol
  - `time_range`: Time period for analysis
- **Returns**: List of daily sentiment metrics

### Source Analysis

```python
def get_source_distribution(
    timeframe: str = '7d',
    min_articles: int = 5
) -> Dict
```
Analyzes news distribution across sources.
- **Arguments**:
  - `timeframe`: Time period to analyze
  - `min_articles`: Minimum articles required for inclusion
- **Returns**: Source distribution metrics

### Volume Analysis

```python
def get_volume_spikes(
    threshold: float = 2.0,
    timeframe: str = '30d'
) -> Dict
```
Identifies periods of high news volume.
- **Arguments**:
  - `threshold`: Multiple of average volume to consider as spike
  - `timeframe`: Time period to analyze
- **Returns**: Dictionary with volume analysis and spike information

### Correlation Analysis

```python
def get_correlation_matrix(
    tickers: List[str],
    timeframe: str = '30d'
) -> Dict
```
Generates correlation matrix between companies.
- **Arguments**:
  - `tickers`: List of company ticker symbols
  - `timeframe`: Time period for analysis
- **Returns**: Matrix of correlation scores

### Category Analysis

```python
def get_category_evolution(
    category: str,
    timeframe: str = '90d',
    interval: str = '1d'
) -> Dict
```
Tracks category evolution over time.
- **Arguments**:
  - `category`: Category to analyze
  - `timeframe`: Time period for analysis
  - `interval`: Time interval for aggregation
- **Returns**: Category evolution metrics

### Stock Analysis

```python
def get_stock_price_mentions(
    ticker: str,
    timeframe: str = '30d'
) -> Dict
```
Finds articles mentioning stock prices.
- **Arguments**:
  - `ticker`: Company stock ticker symbol
  - `timeframe`: Time period to analyze
- **Returns**: Articles with price mentions

```python
def get_stock_momentum_signals(
    ticker: str,
    timeframe: str = '7d',
    sentiment_threshold: float = 0.6
) -> Dict
```
Analyzes news momentum signals.
- **Arguments**:
  - `ticker`: Company stock ticker symbol
  - `timeframe`: Time period to analyze
  - `sentiment_threshold`: Threshold for significant sentiment
- **Returns**: Momentum signal analysis

### Regional Analysis

```python
def get_regional_activity(
    timeframe: str = '7d',
    include_categories: bool = True
) -> Dict
```
Analyzes news distribution across regions.
- **Arguments**:
  - `timeframe`: Time period to analyze
  - `include_categories`: Whether to include category analysis
- **Returns**: Regional activity analysis

### Earnings Analysis

```python
def get_earnings_coverage(
    ticker: str,
    quarters: int = 4
) -> Dict
```
Analyzes earnings-related news coverage.
- **Arguments**:
  - `ticker`: Company stock ticker symbol
  - `quarters`: Number of quarters to analyze
- **Returns**: Earnings coverage analysis

### Institutional Activity

```python
def get_institutional_activity(
    ticker: str,
    timeframe: str = '90d'
) -> Dict
```
Tracks institutional investor activity mentions.
- **Arguments**:
  - `ticker`: Company stock ticker symbol
  - `timeframe`: Time period to analyze
- **Returns**: Institutional activity analysis

### Volatility Analysis

```python
def get_stock_volatility_news(
    ticker: str,
    volatility_threshold: float = 2.0,
    timeframe: str = '180d'
) -> Dict
```
Finds news during volatile periods.
- **Arguments**:
  - `ticker`: Company stock ticker symbol
  - `volatility_threshold`: Threshold for considering price movement volatile
  - `timeframe`: Time period to analyze
- **Returns**: Volatility analysis and related news

# Common Parameters

## Time Formats
- Standard time periods: '1d', '7d', '30d', '90d', '180d'
- Date format: 'YYYY-MM-DD'
- DateTime format: 'YYYY-MM-DD HH:mm:ss'

## Ticker Symbols
- Always provided in uppercase (e.g., 'AAPL', 'MSFT')
- The engine will automatically convert to uppercase if needed

## Thresholds
- Sentiment threshold: Float between -1.0 and 1.0
- Volatility threshold: Typically 1.0 to 5.0, representing standard deviations
- Volume threshold: Typically 1.5 to 3.0, representing multiples of average volume