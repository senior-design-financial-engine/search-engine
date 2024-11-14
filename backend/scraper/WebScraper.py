from bs4 import BeautifulSoup
import requests
import json

# Current news source application for clean JSON outputs
# NPR
# AP News
# BBC

# Future news sources to be worked on
# Reurers (Might not allow scraping?)
# Bloomberg (Paid service)
# CNBC
# Forbes
# Wall Street Journal (Paid service) 

NEWS_SOURCES = {
    "npr": {
        "headline": {"tag": "h1"},
        "content": {"tag": "div", "id": "storytext"}
    },
    "ap_news": {
        "headline": {"tag": "h1", "class": "Page-headline"},
        "content": {"tag": "div", "class": "RichTextStoryBody"}
    },
    "bbc": {
        "headline": {"tag": "h1"},
        "content": {"tag": "div", "data-component": "text-block"}
    }
}

class WebScraper:
    def __init__(self, url: str, source: str):
        """Initialize with the URL and news source type (e.g., 'npr', 'ap_news', 'bbc')."""
        self.url = url
        self.source = source
        self.html_content = None
        self.article_data = {}

    def fetch_content(self):
        """Fetch the HTML content of the webpage."""
        headers = {'User-Agent': 'Mozilla/5.0'}
        response = requests.get(self.url, headers=headers)
        self.html_content = response.content

    def parse_content(self):
        """
        Parse the HTML content based on source rules and extract the article headline and content.
        """
        soup = BeautifulSoup(self.html_content, "html.parser")
        source_rules = NEWS_SOURCES.get(self.source)

        if not source_rules:
            raise ValueError(f"No parsing rules defined for source: {self.source}")

        for caption_div in soup.find_all('div', class_='credit-caption'):                    # Used specifically for NPR
            caption_div.decompose()

        headline_rules = source_rules.get("headline", {})
        headline_tag = soup.find(
            headline_rules.get("tag"),
            id=headline_rules.get("id"),
            class_=headline_rules.get("class")
        )
        if not headline_tag:
            headline_tag = soup.find("h1")
        headline = headline_tag.get_text(strip=True) if headline_tag else "No headline found"

        content = ""
        if self.source == "bbc":
            content_sections = soup.find_all(
                source_rules['content'].get("tag"),
                attrs={"data-component": source_rules['content'].get("data-component")}
            )
            for section in content_sections:
                paragraphs = section.find_all("p")
                for paragraph in paragraphs:
                    content += paragraph.get_text(" ", strip=True) + " "
        else:
            content_rules = source_rules.get("content", {})
            content_section = soup.find(
                content_rules.get("tag"),
                id=content_rules.get("id"),
                class_=content_rules.get("class")
            )
            if not content_section:
                content_section = soup.find(id="storytext") or soup.find("div")

            if content_section:
                content_paragraphs = content_section.find_all("p")
                for paragraph in content_paragraphs:
                    content += paragraph.get_text(" ", strip=True) + " "
            else:
                content = "No content found"

        self.article_data = {
            "headline": headline,
            "content": content.strip()
        }

    def save_to_json(self, filename="article.json"):
        """Save the article data to a JSON file."""
        with open(filename, "w", encoding="utf-8") as json_file:
            json.dump(self.article_data, json_file, ensure_ascii=False, indent=4)
        print(f"Article data saved to {filename}")

    def scrape(self):
        """Perform the complete scraping process."""
        self.fetch_content()
        self.parse_content()
        self.save_to_json()
        return self.article_data

def main():
    url = "https://www.npr.org/2024/11/13/nx-s1-5188441/inflation-prices-trump-election"  
    scraper = WebScraper(url, "npr")
    article_data = scraper.scrape()
    #print(json.dumps(article_data, indent=4, ensure_ascii=False))

    with open('article.json', 'r', encoding='utf-8') as f:
        article_data = json.load(f)
        
    content = article_data['content']
    print(content)

if __name__ == "__main__":
    main()


