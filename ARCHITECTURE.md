# search-engine
BU ECE Capstone Project: an effective financial search engine

### Project Structure

```
search-engine/
├── README.md
├── ARCHITECTURE.md
├── LICENSE
├── requirements.txt
│
├── models/
│   ├── trained/
│   │   └── embedding_model.pth
│   └── train_embedding_model.py
│
├── backend/
│   ├── __init__.py
│   ├── backend.py
│   ├── scraper/
│   │   ├── __init__.py
│   │   └── WebScraper.py
│   ├── indexer.py
│   ├── elasticsearch/
│   │   ├── __init__.py
│   │   ├── DataValidator.py
│   │   ├── Engine.py
│   │   ├── EngineConfig.py
│   │   └── StorageManager.py
│   └── recommender/
│       ├── __init__.py
│       ├── Recommender.py
│       ├── QueryProcessor.py
│       ├── ResultEnhancer.py
│       ├── QueryTable.py
│       └── RecommenderConfig.py
│
├── frontend/
│   └── ... react stuff ...
│
├── utils/
│   ├── __init__.py
│   └── helpers.py
│
└── main.py

```

### Microservices Diagram
```mermaid
classDiagram
    class Engine {
        +config: EngineConfig
        +validator: DataValidator
        +storage: StorageManager
        +es: Elasticsearch
        +add_article(article: Dict)
        +search_news(query_text, filters, time_range)
        +get_trending_topics(timeframe)
        +get_sentiment_trends(ticker, time_range)
        +get_source_distribution(timeframe, min_articles)
        +get_correlation_matrix(tickers, timeframe)
        +get_regional_activity(timeframe)
        +get_earnings_coverage(ticker, quarters)
        +get_stock_momentum_signals(ticker, timeframe)
        -_build_search_query()
    }

    class EngineConfig {
        +api_key: str
        +elasticsearch_url: str
        +index_name: str
        +index_settings: Dict
        +validate_config()
        -_get_default_settings()
    }

    class DataValidator {
        +validate_article(article: Dict)
        +validate_company_data(company: Dict)
    }

    class StorageManager {
        +config: EngineConfig
        +es: Elasticsearch
        +index_name: str
        +create_index()
        -_get_index_mappings()
    }

    class BackEnd {
        +web_scraper: WebScraper
        +indexer: Indexer
        +engine: Engine
        +process_search_query()
        +update_index()
    }

    class WebScraper {
        +url: str
        +source: str
        +html_content: str
        +article_data: Dict
        +fetch_content()
        +parse_content()
        +save_to_json(filename)
        +scrape()
        -build_find_kwargs(rule)
    }

    class NewsSource {
        +headline: Dict
        +content: Dict
        +cleanup: List[Dict]
    }

    class Indexer {
        +embedding_model
        +num_dim: int
        +score_and_rank()
    }

    class FrontEnd {
        +Home
        +Results
        +SearchForm
        +ResultsList
    }

    class Recommender {
        +config: RecommenderConfig
        +query_processor: QueryProcessor
        +result_enhancer: ResultEnhancer
        +query_table: QueryTable
        +process_query(query_text, filters, time_range, user_id)
        +enhance_results(results, query_id)
        +get_user_query_history(user_id, start_time, end_time)
        +get_query_details(query_id)
    }

    class QueryProcessor {
        +min_query_length: int
        +max_query_length: int
        +process_query(query_text, filters, time_range)
        -_validate_query_text(text)
        -_preprocess_text(text)
        -_process_filters(filters)
        -_validate_time_range(time_range)
    }

    class ResultEnhancer {
        +enhance_results(results)
    }

    class QueryTable {
        +table_name: str
        +dynamodb: DynamoDB
        +create_table()
        +log_query(query_text, filters, user_id)
        +get_user_queries(user_id, start_time, end_time)
        +get_query_history(query_id)
    }

    class RecommenderConfig {
        +min_query_length: int
        +max_query_length: int
        +default_query_limit: int
        +allowed_categories: List
        +sentiment_values: List
        +validate_config()
        +get_query_config()
        +get_filter_config()
        +get_time_config()
    }

    Engine --> EngineConfig : Uses
    Engine --> DataValidator : Uses
    Engine --> StorageManager : Uses
    StorageManager --> EngineConfig : Uses
    BackEnd --> Engine : Uses
    BackEnd --> WebScraper : Uses
    BackEnd --> Indexer : Uses
    FrontEnd --> BackEnd : Makes API calls
    Recommender --> RecommenderConfig : Uses
    Recommender --> QueryProcessor : Uses
    Recommender --> ResultEnhancer : Uses
    Recommender --> QueryTable : Uses
    BackEnd --> Recommender : Uses
    WebScraper --> NewsSource : Uses

```

### Data Flow Diagram
```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Backend
    participant Engine
    participant ElasticSearch
    participant DataValidator
    participant StorageManager
    participant Recommender
    participant QueryProcessor
    participant QueryTable
    participant ResultEnhancer
    participant WebScraper
    participant NewsSource
    participant FileSystem

    User->>Frontend: Enter search query
    Frontend->>Backend: POST /query
    Backend->>Engine: process_search_query()
    
    Engine->>DataValidator: Validate parameters
    Engine->>StorageManager: Access index
    StorageManager->>ElasticSearch: Execute search
    
    ElasticSearch-->>StorageManager: Return results
    StorageManager-->>Engine: Process results
    Engine-->>Backend: Return formatted results
    Backend-->>Frontend: JSON response
    Frontend-->>User: Display results

    Backend->>Recommender: process_query()
    Recommender->>QueryProcessor: Validate & process query
    Recommender->>QueryTable: Log query
    QueryProcessor-->>Recommender: Return processed query
    Recommender->>ResultEnhancer: Enhance results
    ResultEnhancer-->>Recommender: Return enhanced results

    Backend->>WebScraper: scrape_article(url, source)
    WebScraper->>NewsSource: Get parsing rules
    WebScraper->>WebScraper: fetch_content()
    WebScraper->>WebScraper: parse_content()
    WebScraper->>FileSystem: save_to_json()
    WebScraper-->>Backend: Return article_data

```

### Search Process Diagram
```mermaid
stateDiagram-v2
    [*] --> QueryInput: User enters search
    
    QueryInput --> QueryValidation: Submit query
    
    state QueryValidation {
        [*] --> ValidateParams
        ValidateParams --> BuildQuery
        BuildQuery --> [*]
    }
    
    QueryValidation --> DataRetrieval: Process query
    
    state DataRetrieval {
        [*] --> ElasticsearchSearch
        ElasticsearchSearch --> ApplyFilters
        ApplyFilters --> TimeRangeFilter
        TimeRangeFilter --> [*]
    }
    
    DataRetrieval --> ResultsProcessing: Enrich results
    
    state ResultsProcessing {
        [*] --> RankResults
        RankResults --> ExtractHighlights
        ExtractHighlights --> AggregateMetrics
        AggregateMetrics --> [*]
    }
    
    ResultsProcessing --> Display: Show results
    
    state Display {
        [*] --> RenderList
        RenderList --> ShowPagination
        ShowPagination --> EnableFilters
        EnableFilters --> [*]
    }
    
    Display --> [*]: Display to user

    state QueryProcessing {
        [*] --> ValidateLength
        ValidateLength --> PreprocessText
        PreprocessText --> ProcessFilters
        ProcessFilters --> ValidateTimeRange
        ValidateTimeRange --> [*]
    }

    state ResultEnhancement {
        [*] --> LogQuery
        LogQuery --> EnhanceResults
        EnhanceResults --> UpdateQueryStats
        UpdateQueryStats --> [*]
    }

    QueryValidation --> QueryProcessing
    QueryProcessing --> DataRetrieval
    ResultsProcessing --> ResultEnhancement
    ResultEnhancement --> Display

    state ContentScraping {
        [*] --> FetchHTML
        FetchHTML --> ApplySourceRules
        ApplySourceRules --> ExtractHeadline
        ExtractHeadline --> ExtractContent
        ExtractContent --> CleanupContent
        CleanupContent --> [*]
    }

    DataRetrieval --> ContentScraping: Fetch new content
    ContentScraping --> ResultsProcessing: Process scraped content

```
