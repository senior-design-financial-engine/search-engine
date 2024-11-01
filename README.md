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
    │   └── engine.py
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

    class Query {
        str query_str
        date start_date
        date end_date
        ... 
    }

    class WebScraper {
        int num_pages
        List[str] list_source_sites
        crawl_web() ~List[JSON]~
        clean_webpage(~JSON~ webpage_raw) ~str~
        get_new_webpage() ~str~
    }

    class Indexer {
        embedding_model
        int num_dim
        calc_index(~str~ webpage) np.array
    }


    class Engine {
        List[str] recent_results
        add_webpage(~str~ webpage)
        remove_webpage(~str~ webpage)
        query(~Query~) List[~JSON~] results
    }

    class BackEnd ["BackEnd (Python)"] {
        WebScraper web_scraper
        Indexer indexer
        Engine engine
        ElasticSearch elastic_search
        +initialize_components()
        +process_query(~Query~ query) List[~JSON~] results
        +update_index()
    }

    class FrontEnd["Frontend (React.js)"] {
        str user_interface
        +display_results(~List[JSON]~ results)
        +get_user_query() Query
        +show_error(~str~ message)
    }

    class ElasticSearch:::external {
        External API
    }

    WebScraper <-- BackEnd : Uses
    WebScraper --> SiteAPIs : Uses
    Indexer <-- Engine : Uses
    Engine --> BackEnd : Uses
    Engine --> ElasticSearch : Uses
    BackEnd --> FrontEnd : Provides data
    FrontEnd --> BackEnd : Sends queries

```
