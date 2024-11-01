import torch
import numpy as np
from typing import List

class Indexer:
    
    def __init__(self, embedding_model_path: str):
        """ Initialize the Indexer with an embedding model """
        
        self.embedding_model = self.load_model(embedding_model_path)

    def load_model(self, model_path: str):
        """ Load the embedding model from a given file path. """
        model = torch.load(model_path)
        model.eval()  # Set the model to evaluation mode
        return model

    def calc_index(self, webpage: str) -> np.array:
        """
        Calculate the index (embedding) of a given webpage.
        
        Args:
            webpage (str): The content of the webpage to be indexed.
        
        Returns:
            np.array: The embedding of the webpage.
        """
        with torch.no_grad():
            # Assuming embedding_model has a method to convert text to embedding
            embedding = self.embedding_model.encode(webpage)
        return embedding.numpy()
