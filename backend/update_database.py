
from es_database import Engine
from scraper import run_scrapers
import os
import json

data_dir = os.path.join("scraper", "articles")

if __name__=="__main__":
    
    # scrape information
    # run_scrapers()
    
    # add all information to elasticsearch
    engine = Engine()
    engine.config.validate_config()
    
    for file in os.listdir(data_dir):
        with open(os.path.join(data_dir,file)) as fp:
            data = json.load(fp)
            
            source = str(file.split("_")[0])
            
            for article in data:
                parsed_article = {
                    "url": article["url"],
                    "headline": article["headline"],
                    "source": source
                }
                engine.add_article(
                    article=parsed_article
                )
        
    