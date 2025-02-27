import random
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

# Sample data for generating fake articles
sources = ["Bloomberg", "Reuters", "CNBC", "Financial Times", "Wall Street Journal", "MarketWatch", "Barron's"]
companies = ["Apple", "Microsoft", "Google", "Amazon", "Tesla", "Meta", "Nvidia", "IBM", "Intel", "AMD"]
sectors = ["Technology", "Finance", "Healthcare", "Energy", "Consumer Goods", "Communications", "Utilities"]
sentiment_options = ["positive", "negative", "neutral"]

# Enhanced headline templates including multi-company templates
headline_templates = [
    # Single company templates
    "{company} Reports Strong Quarterly Earnings, Stock {movement}",
    "{company} Announces New {product_type} Products",
    "{company} Faces Regulatory Scrutiny in {region}",
    "{company} Expands Operations in {region}",
    "{company} CEO Discusses Future of {sector}",
    "Investors React to {company}'s Latest {announcement_type}",
    "{company} Stock {movement} After Analyst Upgrade",
    "Market Analysis: What's Next for {company}?",
    "{sector} Sector Outlook: Focus on {company}",
    
    # Multi-company templates
    "{company} and {company2} Announce Strategic Partnership in {sector}",
    "Competition Heats Up Between {company} and {company2} in {sector} Market",
    "{company}, {company2}, and {company3} Lead {sector} Innovation Race",
    "Analysts Compare {company} and {company2} Performance in Q{quarter} Earnings",
    "{sector} Market Shake-up: {company} Gains While {company2} Struggles",
    "Joint Venture: {company} Teams Up with {company2} to Challenge {company3}",
    "Market Report: How {company} and {company2} Are Reshaping {sector}",
    "{company} Acquisition of {company2} Subsidiary Raises Antitrust Concerns",
    "Investment Comparison: {company} vs {company2} - Which Stock Performs Better?",
    "{sector} Industry Report: {company}, {company2}, and Others Face New Regulations"
]

# Trending headline templates for very recent articles
trending_headline_templates = [
    "BREAKING: {company} {announcement_type} Sends Shockwaves Through {sector} Sector",
    "TRENDING: {company} and {company2} in Talks for Potential Merger",
    "JUST IN: {company} Stock {movement} {percent}% After Surprise Announcement",
    "MARKET ALERT: {company} Leads {sector} Rally as Markets React to {event}",
    "DEVELOPING: {company} Faces Unexpected {challenge} as {company2} Capitalizes",
    "HOT TAKE: Analysts Scramble to Reassess {company} After {announcement_type}",
    "EXCLUSIVE: Inside {company}'s Plan to Disrupt {sector} Market",
    "FLASH UPDATE: {company} and {company2} Announce Game-Changing Partnership",
    "URGENT: Regulatory Decision on {company} Expected to Impact Entire {sector} Industry",
    "SPOTLIGHT: {company}'s Latest Move Signals Major Shift in {sector} Strategy"
]

# Enhanced content templates for more realistic articles
content_templates = [
    "In a significant development for the {sector1} and {sector2} sectors, {company1} and {company2} have announced {announcement_type}. This move comes as {company3} also reported {news_type} last week. Analysts at {source} suggest this could reshape competitive dynamics in the industry. '{quote},' said a spokesperson for {company1}. Meanwhile, {company2}'s CEO emphasized their commitment to innovation and market expansion.",
    
    "Market observers are closely watching {company1} and {company2} as both companies navigate challenges in the {sector1} space. Recent {news_type} from {company1} contrasts with {company2}'s approach to similar market conditions. '{quote},' noted industry expert from {source}. {company3}, another key player in {sector2}, may also be affected by these developments.",
    
    "A new report from {source} highlights growing competition between {company1}, {company2}, and {company3} in the {sector1} market. The study points to {company1}'s strength in {area1}, while {company2} leads in {area2}. '{quote},' the report states. Investors are particularly interested in how these dynamics will affect smaller players in both the {sector1} and {sector2} sectors.",
    
    "The {sector1} landscape is evolving rapidly as {company1} and {company2} introduce competing technologies. '{quote},' said the CEO of {company1} during a recent investor call. {company3}, which operates across both {sector1} and {sector2}, has yet to respond to these market shifts. Analysts from {source} predict significant implications for industry standards and consumer preferences.",
    
    "Economic headwinds are affecting companies across {sector1} and {sector2}, with {company1}, {company2}, and {company3} implementing different strategies to maintain growth. '{quote},' explained a market analyst from {source}. The contrast between {company1}'s focus on {area1} and {company2}'s investment in {area2} highlights divergent approaches to similar challenges."
]

# Trending content templates for breaking news
trending_content_templates = [
    "BREAKING NEWS: In a dramatic development that's unfolding right now in the {sector1} sector, {company1} has just announced {announcement_type} that has caught investors and industry analysts by surprise. {company2}, a major competitor, is reportedly scrambling to respond. '{quote},' a spokesperson for {company1} told {source} in an exclusive statement just minutes ago. Market watchers expect significant volatility as this story develops throughout the day.",
    
    "MARKET ALERT: Trading volume for {company1} has surged in the past few hours following reports of {news_type}. The company's stock has {movement_direction} by {percent}% as investors react to this breaking development. '{quote},' said a senior analyst at {source}, who is closely monitoring the situation. Competitors {company2} and {company3} may also see market impacts as this story continues to unfold.",
    
    "JUST IN: {company1} and {company2} have shocked the {sector1} industry with an unexpected announcement of {announcement_type}. The news, which broke less than 24 hours ago, has already triggered a {percent}% {movement_direction} in {company1}'s stock price. '{quote},' the CEO of {company1} stated in an emergency press conference. This development could reshape competitive dynamics in both the {sector1} and {sector2} sectors.",
    
    "TRENDING NOW: A major revelation about {company1}'s approach to {area1} is sending ripples through the {sector1} market today. The company has reportedly {news_type}, catching both {company2} and {company3} off guard. '{quote},' according to an insider who spoke to {source} on condition of anonymity. Analysts are advising investors to watch for potential short-term volatility across the sector.",
    
    "DEVELOPING STORY: Regulatory authorities have just announced a surprise decision regarding {company1}'s {area1} initiative, causing immediate reactions across the {sector1} sector. The company's stock has {movement_direction} sharply as traders digest this breaking news. '{quote},' said a {company1} executive in a hastily arranged media call. Competitors {company2} and {company3} are also seeing unusual trading patterns as this situation develops."
]

# New areas of business focus for content generation
business_areas = [
    "artificial intelligence", "cloud computing", "cybersecurity", "e-commerce", 
    "renewable energy", "digital transformation", "mobile technology", "data analytics", 
    "blockchain", "quantum computing", "autonomous systems", "subscription services",
    "healthcare technology", "fintech solutions", "consumer electronics", "enterprise software"
]

# New announcement types
announcement_types = [
    "a strategic partnership", "a major acquisition", "new product launches", 
    "a restructuring plan", "quarterly earnings", "executive leadership changes",
    "market expansion", "cost-cutting measures", "research breakthroughs",
    "regulatory compliance initiatives", "sustainability commitments"
]

# News types for content generation
news_types = [
    "strong quarterly results", "disappointing earnings", "a major product recall",
    "significant market share gains", "regulatory challenges", "successful product launches",
    "unexpected leadership changes", "promising research developments", "strategic pivots",
    "investor concerns", "positive analyst ratings", "international expansion plans"
]

# Business quotes for more realistic content
business_quotes = [
    "This represents a transformative opportunity for our business and shareholders",
    "We're committed to innovation while maintaining our focus on sustainable growth",
    "The market dynamics are shifting, and we're positioning ourselves to lead that change",
    "Our strategic investments are beginning to yield the results we anticipated",
    "We see significant synergies that will drive value creation across multiple segments",
    "Competition remains fierce, but we're confident in our differentiated approach",
    "The regulatory landscape presents both challenges and opportunities for industry leaders",
    "We're focused on execution and operational excellence in this uncertain environment",
    "Our research indicates substantial untapped potential in emerging market segments",
    "This collaboration allows us to combine complementary strengths and capabilities"
]

# Breaking news events
breaking_events = [
    "Fed Rate Decision", "Market Selloff", "Tech Rally", "Earnings Season", 
    "IPO Announcement", "Regulatory Crackdown", "Industry Disruption",
    "Economic Data Release", "Global Trade Tensions", "Supply Chain Crisis"
]

# Business challenges
business_challenges = [
    "regulatory scrutiny", "supply chain disruption", "labor shortage",
    "cybersecurity breach", "product delay", "competitive pressure",
    "investor activism", "patent litigation", "market saturation",
    "technological obsolescence", "consumer backlash", "talent exodus"
]

def generate_fake_id():
    """Generate a fake document ID."""
    return f"{random.randint(1000, 9999)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"

def generate_fake_date(days_ago_max=30, trending=False):
    """
    Generate a random date within the specified range.
    
    Args:
        days_ago_max: Maximum number of days in the past
        trending: If True, generate a very recent date (0-1 days ago)
    """
    if trending:
        # For trending articles, use very recent dates (0-24 hours ago)
        hours_ago = random.randint(0, 24)
        return (datetime.now() - timedelta(hours=hours_ago)).strftime('%Y-%m-%d')
    else:
        days_ago = random.randint(0, days_ago_max)
        return (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')

def generate_fake_headline(trending=False):
    """
    Generate a realistic-looking financial news headline.
    
    Args:
        trending: If True, use trending headline templates
    """
    if trending:
        template = random.choice(trending_headline_templates)
    else:
        template = random.choice(headline_templates)
        
    company = random.choice(companies)
    company2 = random.choice([c for c in companies if c != company])
    company3 = random.choice([c for c in companies if c != company and c != company2])
    sector = random.choice(sectors)
    region = random.choice(["US", "Europe", "Asia", "Global"])
    movement = random.choice(["Surges", "Drops", "Rises", "Falls", "Stabilizes"])
    product_type = random.choice(["Consumer", "Enterprise", "Cloud", "AI", "IoT", "Mobile"])
    announcement_type = random.choice(["Earnings Report", "Product Launch", "Strategic Plan", "Restructuring"])
    quarter = random.randint(1, 4)
    percent = random.randint(2, 15)
    event = random.choice(breaking_events)
    challenge = random.choice(business_challenges)
    
    return template.format(
        company=company,
        company2=company2,
        company3=company3,
        sector=sector,
        region=region,
        movement=movement,
        product_type=product_type,
        announcement_type=announcement_type,
        quarter=quarter,
        percent=percent,
        event=event,
        challenge=challenge
    ), [company, company2, company3] if "{company3}" in template else [company, company2] if "{company2}" in template else [company]

def generate_realistic_content(companies_list, sectors_list, trending=False):
    """
    Generate more realistic article content with multiple companies and sectors.
    
    Args:
        companies_list: List of companies to mention
        sectors_list: List of sectors to mention
        trending: If True, use trending content templates
    """
    if trending:
        template = random.choice(trending_content_templates)
    else:
        template = random.choice(content_templates)
    
    # Ensure we have enough companies and sectors
    while len(companies_list) < 3:
        new_company = random.choice(companies)
        if new_company not in companies_list:
            companies_list.append(new_company)
    
    while len(sectors_list) < 2:
        new_sector = random.choice(sectors)
        if new_sector not in sectors_list:
            sectors_list.append(new_sector)
    
    # Additional parameters for trending content
    movement_direction = random.choice(["jumped", "plunged", "surged", "dropped", "rallied", "declined"])
    percent = random.randint(2, 15)
    
    return template.format(
        company1=companies_list[0],
        company2=companies_list[1],
        company3=companies_list[2],
        sector1=sectors_list[0],
        sector2=sectors_list[1],
        source=random.choice(sources),
        area1=random.choice(business_areas),
        area2=random.choice(business_areas),
        announcement_type=random.choice(announcement_types),
        news_type=random.choice(news_types),
        quote=random.choice(business_quotes),
        movement_direction=movement_direction,
        percent=percent
    )

def generate_company_data(company_name, primary=False):
    """Generate data for a company mentioned in an article."""
    sentiment = random.choice(sentiment_options)
    return {
        "name": company_name,
        "ticker": company_name[:3].upper(),
        "sentiment": sentiment,
        "mentions": random.randint(5 if primary else 1, 15 if primary else 8),
        "sentiment_score": random.uniform(-0.8, 0.8),
        "is_primary": primary
    }

def generate_fake_article(trending=False):
    """
    Generate a single fake financial news article with multiple companies and categories.
    
    Args:
        trending: If True, generate a trending article with very recent date
    """
    # Generate headline and extract companies mentioned
    headline, mentioned_companies = generate_fake_headline(trending)
    
    # Select 1-3 categories (sectors)
    num_categories = random.randint(1, 3)
    article_categories = random.sample(sectors, num_categories)
    
    # Generate article data with appropriate date
    published_date = generate_fake_date(trending=trending)
    
    # For trending articles, add timestamp with hours and minutes
    if trending:
        hours_ago = random.randint(0, 23)
        minutes_ago = random.randint(0, 59)
        published_time = (datetime.now() - timedelta(hours=hours_ago, minutes=minutes_ago)).strftime('%H:%M')
        published_datetime = f"{published_date}T{published_time}"
    else:
        published_datetime = published_date
    
    # Create company data with one primary company
    primary_company = mentioned_companies[0]
    companies_data = [generate_company_data(primary_company, True)]
    
    # Add other mentioned companies
    for company in mentioned_companies[1:]:
        companies_data.append(generate_company_data(company, False))
    
    # Generate realistic content
    content = generate_realistic_content(mentioned_companies, article_categories, trending)
    
    # Create snippet from content
    snippet = content[:150] + "..." if len(content) > 150 else content
    
    # Calculate overall sentiment based on company sentiments
    sentiment_scores = [c["sentiment_score"] for c in companies_data]
    overall_sentiment_score = sum(sentiment_scores) / len(sentiment_scores)
    overall_sentiment = "positive" if overall_sentiment_score > 0.2 else "negative" if overall_sentiment_score < -0.2 else "neutral"
    
    # For trending articles, boost relevance score
    relevance_score = random.uniform(0.8, 1.0) if trending else random.uniform(0.5, 1.0)
    
    return {
        "_id": generate_fake_id(),
        "_source": {
            "headline": headline,
            "url": f"http://example.com/article/{generate_fake_id()}",
            "published_at": published_datetime,
            "source": random.choice(sources),
            "content": content,
            "snippet": snippet,
            "sentiment": overall_sentiment,
            "sentiment_score": overall_sentiment_score,
            "companies": companies_data,
            "categories": article_categories,
            "relevance_score": relevance_score,
            "is_trending": trending,
            "view_count": random.randint(500, 10000) * (5 if trending else 1)  # Trending articles get more views
        }
    }

def generate_time_distributed_articles(count=50):
    """
    Generate articles with a realistic time distribution.
    
    Args:
        count: Total number of articles to generate
        
    Returns:
        List of articles with realistic time distribution
    """
    articles = []
    
    # 10% trending articles (last 24 hours, marked as trending)
    trending_count = max(1, int(count * 0.1))
    for _ in range(trending_count):
        articles.append(generate_fake_article(trending=True))
    
    # 30% very recent articles (1-3 days old)
    recent_count = int(count * 0.3)
    for _ in range(recent_count):
        article = generate_fake_article()
        days_ago = random.randint(1, 3)
        article["_source"]["published_at"] = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        articles.append(article)
    
    # 30% recent articles (4-7 days old)
    week_count = int(count * 0.3)
    for _ in range(week_count):
        article = generate_fake_article()
        days_ago = random.randint(4, 7)
        article["_source"]["published_at"] = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        articles.append(article)
    
    # 20% older articles (8-14 days old)
    older_count = int(count * 0.2)
    for _ in range(older_count):
        article = generate_fake_article()
        days_ago = random.randint(8, 14)
        article["_source"]["published_at"] = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        articles.append(article)
    
    # 10% oldest articles (15-30 days old)
    oldest_count = count - (trending_count + recent_count + week_count + older_count)
    for _ in range(oldest_count):
        article = generate_fake_article()
        days_ago = random.randint(15, 30)
        article["_source"]["published_at"] = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
        articles.append(article)
    
    return articles

def generate_fake_articles(count=10, use_time_distribution=True):
    """
    Generate multiple fake articles.
    
    Args:
        count: Number of articles to generate
        use_time_distribution: If True, use realistic time distribution
    """
    if use_time_distribution:
        return generate_time_distributed_articles(count)
    else:
        return [generate_fake_article() for _ in range(count)]

def get_trending_articles(count=5):
    """Generate a set of trending articles."""
    return [generate_fake_article(trending=True) for _ in range(count)]

def generate_time_analysis(articles):
    """
    Generate time-based analysis of articles.
    
    Args:
        articles: List of articles to analyze
        
    Returns:
        Dictionary with time-based analysis
    """
    today = datetime.now().date()
    
    # Initialize counters
    time_buckets = {
        "last_24_hours": 0,
        "last_week": 0,
        "last_month": 0
    }
    
    # Count articles in each time bucket
    for article in articles:
        published_date_str = article["_source"]["published_at"].split('T')[0]
        published_date = datetime.strptime(published_date_str, '%Y-%m-%d').date()
        days_ago = (today - published_date).days
        
        if days_ago < 1:
            time_buckets["last_24_hours"] += 1
        
        if days_ago < 7:
            time_buckets["last_week"] += 1
            
        if days_ago < 30:
            time_buckets["last_month"] += 1
    
    # Calculate daily averages
    if time_buckets["last_month"] > 0:
        time_buckets["daily_average"] = round(time_buckets["last_month"] / 30, 1)
    else:
        time_buckets["daily_average"] = 0
        
    # Add time distribution percentages
    total_articles = len(articles)
    if total_articles > 0:
        time_buckets["last_24_hours_pct"] = round(time_buckets["last_24_hours"] / total_articles * 100)
        time_buckets["last_week_pct"] = round(time_buckets["last_week"] / total_articles * 100)
        time_buckets["last_month_pct"] = round(time_buckets["last_month"] / total_articles * 100)
    
    return time_buckets

def generate_mock_search_response(query_text="", source=None, time_range=None, count=None):
    """
    Generate a mock search response that matches the Elasticsearch response format.
    
    Args:
        query_text: The search query text
        source: Optional source filter
        time_range: Optional time range filter
        count: Number of results to generate (if None, generates a random number)
        
    Returns:
        Dict that mimics Elasticsearch search response
    """
    # Generate between 5 and 15 fake results if count not specified
    results_count = count if count is not None else random.randint(5, 15)
    
    # Generate fake articles with time distribution
    fake_articles = generate_fake_articles(results_count)
    
    # Filter by source if specified
    if source:
        fake_articles = [article for article in fake_articles if article["_source"]["source"] == source]
    
    # Filter by time range if specified
    if time_range:
        today = datetime.now().date()
        filtered_articles = []
        
        for article in fake_articles:
            published_date_str = article["_source"]["published_at"].split('T')[0]
            published_date = datetime.strptime(published_date_str, '%Y-%m-%d').date()
            days_ago = (today - published_date).days
            
            if time_range == "day" and days_ago < 1:
                filtered_articles.append(article)
            elif time_range == "week" and days_ago < 7:
                filtered_articles.append(article)
            elif time_range == "month" and days_ago < 30:
                filtered_articles.append(article)
            elif time_range == "year" and days_ago < 365:
                filtered_articles.append(article)
            elif time_range == "all":
                filtered_articles.append(article)
        
        fake_articles = filtered_articles
    
    # If query contains a company name, bias results toward that company
    for company in companies:
        if query_text and company.lower() in query_text.lower():
            for article in fake_articles[:min(3, len(fake_articles))]:  # Modify first few results
                # Make sure this company is included in the article
                company_exists = False
                for comp in article["_source"]["companies"]:
                    if comp["name"] == company:
                        comp["is_primary"] = True
                        comp["mentions"] = random.randint(8, 15)
                        company_exists = True
                
                if not company_exists:
                    # Add the company to the article
                    article["_source"]["companies"].append(generate_company_data(company, True))
                    
                    # Update headline if possible
                    if random.random() > 0.5:
                        article["_source"]["headline"] = article["_source"]["headline"].replace(
                            random.choice([c["name"] for c in article["_source"]["companies"] if c["name"] != company]), 
                            company
                        )
    
    # Generate time analysis
    time_analysis = generate_time_analysis(fake_articles)
    
    # Return in Elasticsearch response format
    return {
        "hits": {
            "total": {"value": len(fake_articles)},
            "hits": fake_articles
        },
        "aggregations": {
            "time_analysis": time_analysis
        }
    }

def get_trending_articles_response(count=5):
    """
    Generate a response with trending articles.
    
    Args:
        count: Number of trending articles to generate
        
    Returns:
        Dict with trending articles
    """
    trending_articles = get_trending_articles(count)
    
    return {
        "trending_articles": trending_articles,
        "timestamp": datetime.now().isoformat()
    }

# Mock Engine class that mimics the real Engine but uses fake data
class MockEngine:
    """
    A mock implementation of the Engine class that returns fake data.
    This can be used as a drop-in replacement for the real Engine.
    """
    
    def __init__(self):
        """Initialize the mock engine."""
        # We don't need actual Elasticsearch connection
        pass
    
    def search_news(self, query_text=None, filters=None, time_range=None):
        """
        Mock implementation of search_news that returns fake articles.
        
        Args:
            query_text: Search query text
            filters: Optional filters dictionary
            time_range: Optional time range dictionary
            
        Returns:
            Dict containing fake search results in Elasticsearch format
        """
        source = None
        if filters and 'source' in filters:
            source = filters['source']
            
        return generate_mock_search_response(query_text, source, time_range)
    
    def get_trending_articles(self, count=5):
        """
        Get trending articles from the last 24 hours.
        
        Args:
            count: Number of trending articles to return
            
        Returns:
            Dict containing trending articles
        """
        return get_trending_articles_response(count)
    
    def add_article(self, article, embeddings=None, custom_id=None):
        """
        Mock implementation of add_article.
        
        Args:
            article: Article data dictionary
            embeddings: Optional embeddings
            custom_id: Optional custom ID
            
        Returns:
            Fake document ID
        """
        # Just return a fake ID as if we indexed the document
        return generate_fake_id()
    
    def get_article_by_id(self, article_id):
        """
        Mock implementation of get_article_by_id.
        
        Args:
            article_id: Article ID
            
        Returns:
            Fake article data
        """
        # Generate a deterministic article based on the ID
        article = generate_fake_article()
        article["_id"] = article_id
        return article["_source"] 