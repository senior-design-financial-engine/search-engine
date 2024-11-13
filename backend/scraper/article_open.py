import json

# Load the JSON data from the file
with open("article.json", "r", encoding="utf-8") as json_file:
    article_data = json.load(json_file)

# Print out the headline and content
print("Headline:")
print(article_data["headline"])
print("\nContent:")
print(article_data["content"])
