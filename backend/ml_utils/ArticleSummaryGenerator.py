import openai
import logging
import os
from typing import Dict, Tuple

class ArticleSummaryGenerator:
    def __init__(self, api_key: str = None):
        """Initialize the generator with OpenAI API key."""
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OpenAI API key must be provided or set as an environment variable.")
        openai.api_key = self.api_key

        self.logger = logging.getLogger(__name__)
        self.max_summary_words = 100

    def generate_summary_and_sentiment(self, article: Dict) -> Tuple[str, float]:
        """Generate a summary and sentiment score for the article."""
        content = f"{article['headline']}\n\n{article['content']}"
        response = self._generate_summary_and_sentiment(content)
        return self._parse_response(response)

    def _generate_summary_and_sentiment(self, content: str) -> str:
        """Use OpenAI API to generate summary and sentiment analysis."""
        try:
            prompt = (
                f"Summarize the following article in less than {self.max_summary_words} words "
                f"and analyze its sentiment. Provide the output in this format:\n\n"
                f"Summary: <summary text>\nSentiment: <sentiment score between -1 and 1>\n\n"
                f"Article:\n{content}"
            )
            response = openai.Completion.create(
                engine="gpt-4",
                prompt=prompt,
                max_tokens=200,
                temperature=0.7,
                n=1,
                stop=None
            )
            return response.choices[0].text.strip()
        except Exception as e:
            self.logger.error(f"Error generating summary and sentiment: {e}")
            raise

    def _parse_response(self, response: str) -> Tuple[str, float]:
        """Parse the response to extract summary and sentiment score."""
        try:
            lines = response.split("\n")
            summary = next(line.replace("Summary:", "").strip() for line in lines if line.startswith("Summary:"))
            sentiment_score = float(next(line.replace("Sentiment:", "").strip() for line in lines if line.startswith("Sentiment:")))
            return summary, sentiment_score
        except Exception as e:
            self.logger.error(f"Error parsing response: {e}")
            raise