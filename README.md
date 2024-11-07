# search-engine
BU ECE Capstone Project: an effective financial search engine

### Project Structure

```
search-engine/
├── README.md
├── LICENSE
├── requirements.txt
├── models/
|    ├── trained/
│    |   └── embedding_model.pth
|    └── train_embedding_model.py
|
├── backend/
│   ├── __init__.py
│   ├── backend.py
│   ├── web_scraper.py
│   ├── indexer.py
│   └── elasticsearch/
│       ├── DataValidator.py
│       ├── Engine.py
│       |── EngineConfig.py
|       └── StorageManager.py  
|
├── frontend/
│   └── ... react stuff ...
|
├── utils/
│   ├── __init__.py
│   └── helpers.py
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
        +scrape_news()
        +process_content()
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

    Engine --> EngineConfig : Uses
    Engine --> DataValidator : Uses
    Engine --> StorageManager : Uses
    StorageManager --> EngineConfig : Uses
    BackEnd --> Engine : Uses
    BackEnd --> WebScraper : Uses
    BackEnd --> Indexer : Uses
    FrontEnd --> BackEnd : Makes API calls

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

```

### Data Flow Diagram
```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant E as Engine
    participant ML as ML Processing
    participant ES as Elasticsearch
    participant S as Scraper
    participant N as News Sources

    U->>F: Enter Search Query
    F->>B: Send Query Request
    B->>E: Process Query
    
    par Data Collection
        E->>ES: Search Indexed Data
        S->>N: Fetch Latest News
        S->>ES: Update Index
    end
    
    E->>ML: Analyze Sentiment
    ML->>E: Return Analysis
    
    E->>B: Aggregated Results
    B->>F: Formatted Response
    F->>U: Display Results
    
    Note over U,N: Real-time updates maintain data freshness
```

### Search Process Flow
```mermaid
stateDiagram-v2
    [*] --> QueryInput: User enters search
    
    QueryInput --> QueryProcessing: Submit query
    
    state QueryProcessing {
        [*] --> TextAnalysis
        TextAnalysis --> FilterApplication
        FilterApplication --> RelevanceScoring
        RelevanceScoring --> ResultsAggregation
        ResultsAggregation --> [*]
    }
    
    QueryProcessing --> MLEnrichment: Process results
    
    state MLEnrichment {
        [*] --> SentimentAnalysis
        SentimentAnalysis --> Summarization
        Summarization --> CategoryTagging
        CategoryTagging --> [*]
    }
    
    MLEnrichment --> ResultsDisplay: Show results
    
    state ResultsDisplay {
        [*] --> RankResults
        RankResults --> ApplyHighlighting
        ApplyHighlighting --> AddMetadata
        AddMetadata --> [*]
    }
    
    ResultsDisplay --> [*]: Display to user
```
