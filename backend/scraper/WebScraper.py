from bs4 import BeautifulSoup
import requests
import json

# Current news source application for clean JSON outputs
# NPR
# AP News

# Future news sources to be worked on
# Reurers
# BBC
# Bloomberg
# CNBC
# Forbes
# Wall Street Journal (This is a paid subscription)

NEWS_SOURCES = {
    "npr": {
        "headline": {"tag": "h1"},
        "content": {"tag": "div", "id": "storytext"}
    },
    "ap_news": {
        "headline": {"tag": "h1", "class": "Page-headline"},
        "content": {"tag": "div", "class": "RichTextStoryBody"}
    }
}

class WebScraper:
    def __init__(self, url: str, source: str):
        """Initialize with the URL and news source type (e.g., 'npr', 'ap_news')."""
        self.url = url
        self.source = source
        self.html_content = None
        self.article_data = {}

    def fetch_content(self):
        """Fetch the HTML content of the webpage."""
        response = requests.get(self.url)
        self.html_content = response.content

    def parse_content(self):
        """
        Parse through the html contents based off source rules and return a JSON file containing the article headline and article content
        """
        soup = BeautifulSoup(self.html_content, "html.parser")
        source_rules = NEWS_SOURCES.get(self.source)
        

        # Source rules need improvement, considering different options to avoid a messy main webscraper code. Possibly reference a dictionary for each source to avoid so many if statements when scraping
        # This current format will definitely only work for 2 news sources, needs optimization

        if not source_rules:
            raise ValueError(f"No parsing rules defined for source: {self.source}")
        
        for caption_div in soup.find_all('div', class_='credit-caption'):                    # Used specifically for NPR
            caption_div.decompose()

        headline_rules = source_rules.get("headline", {})                                    # Used mostly for AP News
        headline_tag = soup.find(headline_rules.get("tag"), 
                                 id=headline_rules.get("id"), 
                                 class_=headline_rules.get("class"))
        if not headline_tag:                                                                
            headline_tag = soup.find("h1")
        headline = headline_tag.get_text(strip=True) if headline_tag else "No headline found"
        
        content_rules = source_rules.get("content", {})
        content_section = soup.find(content_rules.get("tag"), 
                                    id=content_rules.get("id"), 
                                    class_=content_rules.get("class"))
        if not content_section:
            content_section = soup.find(id="storytext") or soup.find("div")
        
        content = ""
        if content_section:
            content_paragraphs = content_section.find_all("p")
            for paragraph in content_paragraphs:
                for a_tag in paragraph.find_all("a"):
                    link_text = a_tag.get_text(strip=True)
                    a_tag.replace_with(link_text)
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
    

def main():   # testing class by user inputs
    url = "https://apnews.com/article/home-depot-hurricane-atlanta-consumer-housing-1fc6196ff0ac81b85ef20cfba74ad051"     
    
    scraper = WebScraper(url, "ap_news")
    article_data = scraper.scrape()
    

if __name__ == "__main__":
    main()    