# Scraper Module

## Overview

The scraper module is responsible for collecting news articles from various sources. It supports multiple news outlets and provides a standardized way to process and store article data.

## Components

### run_scrapers.py

This script serves as the entry point for the scraping process. It can be scheduled to run periodically to keep the database up-to-date with the latest news articles.

**Usage**:
```bash
python run_scrapers.py
```

### scrapers.py

This unified file contains all scraper implementations for different news sources. It includes scrapers for RSS feeds as well as direct website scraping for sources that don't provide RSS feeds.

**Supported Sources**:
- AP News
- BBC
- NPR
- And other configurable sources

**Article Data Structure**:
- `url`: Article URL
- `headline`: Article headline
- `date`: Article publication date
- `content`: Article body content
- `source`: News source name
- `category`: Article category (e.g., business, technology)
- `author`: Article author(s) if available

## Data Storage

Scraped articles are stored in the `articles` directory in JSON format and are also indexed into Elasticsearch through the integration with `es_database` module.

## Configuration

Source-specific configurations and scraping patterns are defined within the scrapers themselves.

## Integration

The scraper module integrates with:
- `update_es_database.py` for database updates
- `update_processed_urls.py` for tracking scraped URLs
- `reset_and_scrape.py` for complete database resets and fresh scraping

## Error Handling

The scrapers include robust error handling to:
- Manage connection failures
- Handle unexpected HTML structure changes
- Process partial data when complete extraction isn't possible
