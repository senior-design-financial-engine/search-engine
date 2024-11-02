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
└── src/
    ├── __init__.py
    ├── backend/
    │   ├── __init__.py
    │   ├── backend.py
    │   ├── web_scraper.py
    │   ├── indexer.py
    │   └── elasticsearch/
    │       ├── DataValidator.py
    │       ├── Engine.py
    │       |── EngineConfig.py
            └── StorageManager.py  
    ├── frontend/
    │   ├── frontend.js
    ├── utils/
    │   ├── __init__.py
    │   └── helpers.py
    └── main.py

```


### API Flowchart/Diagram
```mermaid
classDiagram
    class SiteAPIs:::external {
        External API(s)
    }
    
    class WebScraper {
        int num_pages
        List[str] list_source_sites
        crawl_web() ~List[JSON]~
        clean_webpage(~JSON~ webpage_raw) ~str~
        get_new_webpage() ~str~
    }

    class Engine {
        +config: EngineConfig
        +validator: DataValidator
        +storage: StorageManager
        +es: Elasticsearch
        +add_article(article: Dict)
        +search_news(query_text, filters, time_range)
        +get_trending_topics(timeframe)
        +get_sentiment_trends(ticker)
        +get_source_distribution(timeframe)
        +get_volume_spikes(threshold)
        +get_correlation_matrix(tickers)
        +get_institutional_activity(ticker)
    }

    class EngineConfig {
        +config_path: str
        +api_key: str
        +elasticsearch_url: str
        +index_settings: Dict
        +load_config()
        -get_default_settings()
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
        -get_index_mappings()
    }

    class BackEnd ["BackEnd (Python)"] {
        WebScraper web_scraper
        Engine engine
        ElasticSearch elastic_search
        +initialize_components()
        +process_query(query) List[JSON] results
        +update_index()
    }

    class FrontEnd["Frontend (React.js)"] {
        str user_interface
        +display_results(List[JSON] results)
        +get_user_query() Query
        +show_error(str message)
    }

    class ElasticSearch:::external {
        External API
    }

    class YFinance:::external {
        External API
    }

    WebScraper <-- BackEnd : Uses
    WebScraper --> SiteAPIs : Uses
    Engine --> BackEnd : Uses
    Engine --> ElasticSearch : Uses
    BackEnd --> FrontEnd : Provides data
    FrontEnd --> BackEnd : Sends queries
    Engine --> EngineConfig : Uses
    Engine --> DataValidator : Uses
    Engine --> StorageManager : Uses
    StorageManager --> EngineConfig : Uses
    StorageManager -- ElasticSearch : Connects to
    DataValidator -- YFinance : Validates with

    note for Engine "Orchestrates financial\ndata processing"
    note for WebScraper "Collects news from\nvarious sources"
    note for BackEnd "Coordinates system\ncomponents"
    note for FrontEnd "User interface and\nvisualization"

```
