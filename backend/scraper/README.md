# Scraper Module

## Initialization

The main.py script in this directory will run all the scrapers on a 1 minute clock. It will run through two of our scrapers, RSS_Scraper.py and ap_news_scraper.py. The reasoning for the two scripts is that AP News doesn't keep their RSS.xml file public, meaning that scraping their front page for each business hub was much more efficient. Combining it with the RSS_Scraper.py seemed like a futile challenge at the moment.

### RSS Scraper

Works with news sources that provide open access RSS.xml files. The article data is stored in the articles folder.

**Arguments**:
- `source`: The news source the scraper will be referencing
- `processed_urls`: The url batch that has already been scraped
**Returns**:
- `{source}_articles.json`:
    - `url`: Article url
    - `headline`: Article headline
    - `content`: Article body content

### ap_news_scraper.py

Does the sam, but is specifically made for AP news hub pages.

### WebScraper.py

Scrapes any news article from AP News, BBC, or NPR. It utilizes the dictionary in news_source.,py to do proper scraping on different websites.
