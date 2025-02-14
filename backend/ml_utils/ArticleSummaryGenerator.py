import openai
import os
import json
from typing import List

def load_api_key() -> str:
    """Loads the API key from an environment variable or external file."""
    return os.getenv("OPENAI_API_KEY") or read_api_key_from_file()

def read_api_key_from_file(file_path: str = "config.txt") -> str:
    """Reads the API key from a file (default: config.txt)."""
    try:
        with open(file_path, "r") as file:
            return file.read().strip()
    except FileNotFoundError:
        raise ValueError("API key not found. Set OPENAI_API_KEY or provide a config.txt file.")

def summarize_headlines(articles: List[str]) -> List[str]:
    """Generates summarized headlines for a batch of article texts."""
    api_key = load_api_key()
    openai.api_key = api_key
    
    messages = [{"role": "system", "content": "You are an AI that generates concise headlines for given article texts."}]
    for article in articles:
        messages.append({"role": "user", "content": f"Summarize this article into a short headline: {article}"})
    
    response = openai.ChatCompletion.create(
        model="gpt-4",
        messages=messages
    )
    
    return [choice["message"]["content"].strip() for choice in response["choices"]]

def lambda_handler(event, context):
    """AWS Lambda handler function."""
    try:
        body = json.loads(event.get("body", "{}"))
        articles = body.get("articles", [])
        if not isinstance(articles, list) or not articles:
            return {"statusCode": 400, "body": json.dumps({"error": "Invalid input. Provide a list of articles."})}
        
        headlines = summarize_headlines(articles)
        return {"statusCode": 200, "body": json.dumps({"headlines": headlines})}
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
