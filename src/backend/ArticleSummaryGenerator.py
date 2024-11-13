from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqGeneration
from typing import Dict, Optional, Tuple
import torch
import numpy as np
from dataclasses import dataclass
import logging

@dataclass
class SummaryMetrics:
    length: int
    compression_ratio: float
    rouge_scores: Dict[str, float]

class ArticleSummaryGenerator:
    def __init__(self, model_name: str = "facebook/bart-large-cnn", device: str = "cuda" if torch.cuda.is_available() else "cpu"):
        """Initialize the summary generator with specified model."""
        self.device = device
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForSeq2SeqGeneration.from_pretrained(model_name).to(device)
        
        # Initialize ROUGE scorer for quality metrics
        self.rouge_scorer = pipeline(
            "text2text-generation",
            model="google/pegasus-xsum",
            device=self.device
        )
        
        self.logger = logging.getLogger(__name__)
        self.max_summary_words = 100
        self.min_compression_ratio = 0.15  # Minimum ratio of summary to original length
        self.rouge_threshold = 0.3  # Minimum ROUGE-L score

    def generate_summary(self, article: Dict) -> Tuple[str, SummaryMetrics]:
        """
        Generate a concise summary of the article with quality metrics.
        
        Args:
            article: Dictionary containing article data with 'content' and 'headline' fields
            
        Returns:
            Tuple containing the generated summary and its metrics
        """
        content = f"{article['headline']}\n\n{article['content']}"
        
        # First attempt at summarization
        summary, metrics = self._generate_and_evaluate(content)
        
        # Regenerate if metrics don't meet requirements
        attempts = 1
        max_attempts = 3
        
        while (not self._meets_requirements(metrics)) and (attempts < max_attempts):
            self.logger.info(f"Regenerating summary (attempt {attempts + 1})")
            
            # Adjust parameters based on previous attempt
            params = self._adjust_parameters(metrics)
            summary, metrics = self._generate_and_evaluate(content, **params)
            attempts += 1
        
        if not self._meets_requirements(metrics):
            self.logger.warning("Could not meet all summary requirements after maximum attempts")
        
        return summary, metrics

    def _generate_and_evaluate(
        self,
        content: str,
        max_length: int = 150,
        min_length: int = 50,
        length_penalty: float = 2.0,
        num_beams: int = 4
    ) -> Tuple[str, SummaryMetrics]:
        """Generate summary and compute quality metrics."""
        # Tokenize and generate summary
        inputs = self.tokenizer(content, max_length=1024, truncation=True, return_tensors="pt").to(self.device)
        
        summary_ids = self.model.generate(
            inputs["input_ids"],
            max_length=max_length,
            min_length=min_length,
            length_penalty=length_penalty,
            num_beams=num_beams,
            early_stopping=True
        )
        
        summary = self.tokenizer.decode(summary_ids[0], skip_special_tokens=True)
        
        # Calculate metrics
        metrics = self._calculate_metrics(content, summary)
        
        return summary, metrics

    def _calculate_metrics(self, original: str, summary: str) -> SummaryMetrics:
        """Calculate quality metrics for the generated summary."""
        # Calculate basic metrics
        summary_words = len(summary.split())
        original_words = len(original.split())
        compression_ratio = summary_words / original_words
        
        # Calculate ROUGE scores
        rouge_output = self.rouge_scorer(original, summary, max_length=150, min_length=50)
        rouge_scores = {
            'rouge1': rouge_output[0]['score'],
            'rouge2': rouge_output[1]['score'] if len(rouge_output) > 1 else 0,
            'rougeL': rouge_output[-1]['score']
        }
        
        return SummaryMetrics(
            length=summary_words,
            compression_ratio=compression_ratio,
            rouge_scores=rouge_scores
        )

    def _meets_requirements(self, metrics: SummaryMetrics) -> bool:
        """Check if summary meets quality requirements."""
        return (
            metrics.length <= self.max_summary_words and
            metrics.compression_ratio >= self.min_compression_ratio and
            metrics.rouge_scores['rougeL'] >= self.rouge_threshold
        )

    def _adjust_parameters(self, metrics: SummaryMetrics) -> Dict:
        """Adjust generation parameters based on previous metrics."""
        params = {}
        
        if metrics.length > self.max_summary_words:
            params['max_length'] = int(150 * 0.8)  # Reduce max length
            params['length_penalty'] = 1.5  # Encourage shorter summaries
        elif metrics.compression_ratio < self.min_compression_ratio:
            params['min_length'] = int(50 * 1.2)  # Increase min length
            params['length_penalty'] = 2.5  # Encourage longer summaries
        
        if metrics.rouge_scores['rougeL'] < self.rouge_threshold:
            params['num_beams'] = 6  # Increase beam search
            
        return params
