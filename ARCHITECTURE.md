# search-engine
BU ECE Capstone Project: an effective financial search engine

### Project Structure

```
search-engine/
├── README.md
├── ARCHITECTURE.md
├── LICENSE
├── requirements.txt 
├── start.sh
├── stop.sh
│
├── backend/
│   ├── __init__.py
│   ├── backend.py
│   ├── update_database.py
│   ├── elasticsearch_test.py
│   │
│   ├── scraper/
│   │   ├── __init__.py
│   │   ├── README.md
│   │   ├── web_scraper.py
│   │   ├── ap_news_scraper.py
│   │   ├── RSS_scraper.py
│   │   └── articles/
│   │       ├── bbc_articles.json
│   │       └── npr_articles.json
│   │
│   ├── indexer/
│   │   ├── __init__.py
│   │   └── indexer.py
│   │
│   └── es_database/
│       ├── __init__.py
│       ├── DataValidator.py
│       ├── Engine.py
│       ├── EngineConfig.py
│       └── StorageManager.py
│
├── frontend/
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json
│   │   └── robots.txt
│   │
│   ├── src/
│   │   ├── components/
│   │   │   ├── Home.js
│   │   │   ├── Results.js
│   │   │   └── unused/
│   │   │
│   │   ├── styles/
│   │   │   ├── App.css
│   │   │   ├── Home.css
│   │   │   └── index.css
│   │   │
│   │   ├── App.js
│   │   └── index.js
│   │
│   ├── package.json
│   └── README.md
│
└── utils/
    └── __init__.py

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
Frontend->>Backend: GET /query
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