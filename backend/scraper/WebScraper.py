from bs4 import BeautifulSoup
import requests
import json
import feedparser
import os
import time
import schedule
#from RSS_Scraper import RSSFeedScraper
from news_sources import NEWS_SOURCES  # Import NEWS_SOURCES

class WebScraper:
    def __init__(self, url: str, source: str):
        """Initialize with the URL and news source type."""
        self.url = url
        self.source = source
        self.html_content = None
        self.article_data = {}

    def fetch_content(self):
        """Fetch the HTML content of the webpage."""
        headers = {'User-Agent': 'Mozilla/5.0'}                      # Experiment with headers and requests to see if we could possibly accessed paid news info. Looking into NewsAPI first before doing anymore exploration.
        response = requests.get(self.url, headers=headers)
        self.html_content = response.content

    def build_find_kwargs(self, rule):
        """Helper method to build keyword arguments for find/find_all based on the rule."""
        kwargs = {}
        if 'id' in rule:
            kwargs['id'] = rule['id']
        if 'class' in rule:
            kwargs['class_'] = rule['class']
        if 'attrs' in rule:
            kwargs['attrs'] = rule['attrs']
        return kwargs

    def parse_content(self):
        """
        Parse the HTML content based on source rules and extract the article headline and content.
        """
        soup = BeautifulSoup(self.html_content, "html.parser")
        source_rules = NEWS_SOURCES.get(self.source)

        if not source_rules:
            raise ValueError(f"No parsing rules defined for source: {self.source}")

        cleanup_rules = source_rules.get("cleanup", [])
        for rule in cleanup_rules:
            kwargs = self.build_find_kwargs(rule)
            for tag in soup.find_all(rule.get("tag"), **kwargs):
                tag.decompose()

        headline_rules = source_rules.get("headline", {})
        kwargs = self.build_find_kwargs(headline_rules)
        headline_tag = soup.find(headline_rules.get("tag"), **kwargs)
        headline = headline_tag.get_text(strip=True) if headline_tag else "No headline found"

        content = ""
        content_rules = source_rules.get("content", {})

        containers = []
        if 'containers' in content_rules:
            kwargs = self.build_find_kwargs(content_rules['containers'])
            containers = soup.find_all(content_rules['containers'].get("tag"), **kwargs)
        elif 'container' in content_rules:
            kwargs = self.build_find_kwargs(content_rules['container'])
            container = soup.find(content_rules['container'].get("tag"), **kwargs)
            if container:
                containers = [container]

        for container in containers:
            if container:
                kwargs = self.build_find_kwargs(content_rules['paragraphs'])
                paragraphs = container.find_all(content_rules['paragraphs'].get("tag"), **kwargs)
                for paragraph in paragraphs:
                    content += paragraph.get_text(" ", strip=True) + " "

        if not content.strip():
            content = "No content found"

        self.article_data = {
            "headline": headline,
            "content": content.strip()
        }

    def save_to_json(self, filename="article.json"):
        """Save the article data to a JSON file."""
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        with open(filename, "w", encoding="utf-8") as json_file:
            json.dump(self.article_data, json_file, ensure_ascii=False, indent=4)
        print(f"Article data saved to {filename}")

    def scrape(self):
        """Perform the complete scraping process."""
        self.fetch_content()
        self.parse_content()
        self.save_to_json()
        return self.article_data





"""
For future reference, some JSON outputs will containt '\' throughout the parsed content which will cause noise when running it 
through a NLP model. In order to avoid this pointless noise, load the JSON content into a python string and it will remove
the JSON '\' characters, making it clean and ready for summarization use. 
"""

#with open('article.json', 'r', encoding='utf-8') as f:
#    article_data = json.load(f)
    
#content = article_data['content']