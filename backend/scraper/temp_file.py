from bs4 import BeautifulSoup
import requests
import json

# Specify the URL of the NPR article
url = "https://www.npr.org/2024/11/12/g-s1-33817/shell-dutch-appeals-court-overturns-climate-ruling-carbon-emissions"

# Fetch the HTML content of the article
response = requests.get(url)
html_content = response.content

# Parse the HTML content with BeautifulSoup
soup = BeautifulSoup(html_content, "html.parser")

for caption_div in soup.find_all('div', class_='credit-caption'):
    caption_div.decompose()

# Extract the headline
headline_tag = soup.find("h1")
headline = headline_tag.get_text(strip=True) if headline_tag else "No headline found"

# Extract the main content by finding the relevant tags (adjust selectors as necessary)
content = ""
content_section = soup.find(id="storytext")


if content_section:
    content_paragraphs = content_section.find_all("p")
    
    for paragraph in content_paragraphs:
        # Process hyperlinks within each paragraph by only keeping the visible text
        for a_tag in paragraph.find_all("a"):
            link_text = a_tag.get_text(strip=True)
            a_tag.replace_with(link_text)
        
        # Append each paragraph to the content with space separation between paragraphs
        content += paragraph.get_text(" ", strip=True) 
else:
    content = "No content found"


# Store in a JSON structure
article_json = {
    "headline": headline,
    "content": content
}

with open("article.json", "w", encoding="utf-8") as json_file:
    json.dump(article_json, json_file, ensure_ascii=False, indent=4)

print("Article data saved to article.json")