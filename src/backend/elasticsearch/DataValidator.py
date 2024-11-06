import yfinance as yf
from typing import Dict

class DataValidator:
    @staticmethod
    def validate_article(article: Dict) -> bool:
        required_fields = ['headline', 'content', 'companies']
        return all(field in article for field in required_fields)

    @staticmethod
    def validate_company_data(company: Dict) -> bool:
        try:
            if 'ticker' in company:
                stock = yf.Ticker(company['ticker'])
                return bool(stock.info)
            return False
        except:
            return False