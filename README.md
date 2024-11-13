# Financial News Engine

## Overview
The Financial News Engine is an open-source, customizable search platform designed to provide real-time financial news aggregation and analysis. The system aims to democratize access to financial information by offering a free alternative to expensive terminals while incorporating advanced machine learning capabilities for enhanced news processing and analysis.

## Project Status
Currently in development by Team 14 at Boston University's Electrical & Computer Engineering department as part of the EC463/EC464 Capstone Senior Design Project.

## Key Features

### Real-Time News Aggregation
- Continuous web crawling of diverse financial news sources
- Real-time indexing with updates within 3 minutes of publication
- Support for multiple news categories and regions

### Advanced Search Capabilities
- Full-text search across headlines, summaries, and content
- Filtering by companies, categories, regions, and time ranges
- Customizable news feeds based on user portfolios and preferences
- Response time under 500ms for standard queries

### Machine Learning Integration
- Automated sentiment analysis with 80% accuracy
- Article summarization (≤ 100 words per article)
- Trending topic identification
- Category evolution tracking

### Analytics Features
- Stock price mention tracking
- Institutional activity monitoring
- Volatility analysis
- Regional news distribution analysis
- Company correlation analysis
- Earnings coverage tracking

## Technical Architecture

### Frontend (React.js)
- Responsive web interface
- Customizable dashboard layouts
- Real-time updates
- Advanced query interface
- Interactive visualization components

### Backend (Python/Flask)
- RESTful API architecture
- Elasticsearch integration
- Scalable cloud infrastructure
- Real-time data processing pipeline

### Core Components
1. **Web Crawler**
   - Recursive website scraping
   - Source validation
   - Content extraction and cleaning

2. **Indexer**
   - Document processing
   - Metadata extraction
   - Real-time index updates

3. **Search Engine**
   - Query processing
   - Relevance scoring
   - Result ranking
   - Aggregation pipeline

4. **Storage Layer**
   - Elasticsearch backend
   - Distributed architecture
   - High availability setup
   - Data validation

## System Requirements

### Performance Metrics
- News indexing within 3 minutes of publication
- Search query response time < 500ms
- Support for 10,000+ concurrent requests
- High availability with 3 shards and 2 replicas

### Technical Dependencies
- Python 3.x
- Flask 3.0.0
- Elasticsearch 8.11.0
- React.js
- Additional libraries:
  - pandas 2.1.4
  - numpy 1.26.2
  - requests 2.31.0
  - yfinance 0.2.36

## Differentiators

### vs. Bloomberg Terminal
- Open-source and free access
- Machine learning-enhanced search
- Customizable interface
- Focus on diverse news sources

### vs. Yahoo Finance
- Advanced filtering capabilities
- Sentiment analysis
- Real-time processing
- Comprehensive API access

## Target Users
- Individual traders and investors
- Financial professionals
- Business owners
- Market analysts
- Anyone interested in financial markets

## Development Constraints
- Open-source requirement
- Data privacy compliance
- Development budget cap of $1,000
- Real-time processing requirements

## Future Enhancements
- Extended machine learning capabilities
- Additional data source integration
- Enhanced visualization tools
- Mobile application development
- API ecosystem expansion