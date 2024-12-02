# Financial News Engine

## Overview
The Financial News Engine is an open-source, customizable search platform designed to provide real-time financial news aggregation and analysis. The system aims to democratize access to financial information by offering a free alternative to expensive terminals while incorporating advanced machine learning capabilities for enhanced news processing and analysis.

## Project Status
Currently in development by Team 14 at Boston University's Electrical & Computer Engineering department as part of the EC463/EC464 Capstone Senior Design Project.

## Key Features

### Real-Time News Aggregation
- Multi-source web crawling (BBC, NPR, AP News)
- Real-time indexing with updates within 3 minutes of publication
- Support for multiple news categories and regions

### Advanced Search Capabilities
- Full-text search across headlines and content
- Filtering by source, time ranges, and categories
- Customizable news feeds
- Sub-second query response time

### Machine Learning Integration
- Article summarization using transformers
- Sentiment analysis
- Topic identification
- Category classification

### Analytics Features
- News source distribution analysis
- Sentiment trends tracking
- Regional news coverage analysis
- Company mention tracking

## Technical Architecture

### Frontend (React.js)
- Responsive web interface
- Real-time updates
- Bootstrap integration
- Chart.js visualization components

### Backend (Python/Flask)
- RESTful API architecture
- CORS support
- Elasticsearch integration
- Environment-based configuration

### Core Components
1. **Web Crawler**
   - RSS feed processing
   - Multi-source support (BBC, NPR, AP News)
   - Content validation
   - URL deduplication

2. **Indexer**
   - Document processing
   - Metadata extraction
   - Real-time updates

3. **Search Engine**
   - Query processing
   - Elasticsearch backend
   - Result ranking

4. **ML Pipeline**
   - Transformer-based summarization
   - Sentiment analysis
   - Topic modeling

## System Requirements

### Technical Dependencies
- Python 3.x
- Flask
- Elasticsearch 8.11.0
- React.js
- Additional libraries:
  - transformers
  - pandas
  - numpy
  - requests
  - flask-cors
  - python-dotenv

### Development Setup
- Node.js environment for frontend
- Python virtual environment for backend
- Elasticsearch instance
- Environment configuration (.env)

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