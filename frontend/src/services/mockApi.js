// Mock API service for development
import { format, subDays } from 'date-fns';

// Get environment settings
const IS_AWS = process.env.REACT_APP_ENV === 'production';

// Enhanced sample data for generating more realistic fake articles
const sources = ["Bloomberg", "Reuters", "CNBC", "Financial Times", "Wall Street Journal", "MarketWatch", "Barron's"];
const companies = ["Apple", "Microsoft", "Google", "Amazon", "Tesla", "Meta", "Nvidia", "IBM", "Intel", "AMD"];
const sectors = ["Technology", "Finance", "Healthcare", "Energy", "Consumer Goods", "Communications", "Utilities"];
const sentimentOptions = ["positive", "negative", "neutral"];
const headlineTemplates = [
    "{company} Reports Strong Quarterly Earnings, Stock {movement}",
    "{company} Announces New {product_type} Products",
    "{company} Faces Regulatory Scrutiny in {region}",
    "{company} Expands Operations in {region}",
    "{company} CEO Discusses Future of {sector}",
    "Investors React to {company}'s Latest {announcement_type}",
    "{company} Stock {movement} After Analyst Upgrade",
    "{company} Partners with {company2} on New Initiative",
    "Market Analysis: What's Next for {company}?",
    "{sector} Sector Outlook: Focus on {company}"
];

// Keywords mapping for smarter search results
const keywordMappings = {
    'earnings': {
        templates: [
            "{company} Reports Q{quarter} Earnings: {beat_miss} Analyst Expectations",
            "{company} {beat_miss} Earnings Forecast in Latest Quarter",
            "Wall Street Reacts to {company}'s Earnings Report",
            "Earnings Alert: {company} Reports {earnings_change} in Profits"
        ],
        companies: ["Apple", "Microsoft", "Google", "Amazon", "Tesla"]
    },
    'ai': {
        templates: [
            "{company} Unveils New AI Strategy to Compete with {company2}",
            "{company}'s AI Investment Pays Off with Breakthrough in {ai_field}",
            "{company} CEO: AI Will Transform Our {sector} Business",
            "Analysts Optimistic About {company}'s AI Roadmap"
        ],
        companies: ["Microsoft", "Google", "Amazon", "Nvidia", "Meta", "IBM"],
        sectors: ["Technology", "Communications"]
    },
    'market': {
        templates: [
            "Market Volatility Impacts {company}'s Stock Performance",
            "{company} Navigates Challenging Market Conditions",
            "Bull Market: Is {company} Still a Good Investment?",
            "{company} Gains Market Share in Competitive {sector} Sector"
        ]
    },
    'energy': {
        sectors: ["Energy", "Utilities"],
        templates: [
            "{company} Announces Renewable Energy Initiative",
            "{company} Invests in Sustainable Energy Solutions",
            "Energy Crisis: How {company} is Adapting",
            "{company} Reduces Carbon Footprint with New Energy Strategy"
        ]
    }
};

// Helper functions
const generateFakeId = () => {
    return `${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`;
};

const generateFakeDate = (daysAgoMax = 30) => {
    const daysAgo = Math.floor(Math.random() * daysAgoMax);
    return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
};

const generateFakeHeadline = (keyword = null, company = null) => {
    let template;
    let selectedCompany = company || companies[Math.floor(Math.random() * companies.length)];
    let selectedSector = sectors[Math.floor(Math.random() * sectors.length)];
    
    // Use keyword-specific templates if available
    if (keyword && keywordMappings[keyword]) {
        const mapping = keywordMappings[keyword];
        
        // Use keyword-related companies if specified and no company was forced
        if (mapping.companies && !company) {
            selectedCompany = mapping.companies[Math.floor(Math.random() * mapping.companies.length)];
        }
        
        // Use keyword-related sectors if specified
        if (mapping.sectors) {
            selectedSector = mapping.sectors[Math.floor(Math.random() * mapping.sectors.length)];
        }
        
        // Use keyword-specific headline templates
        if (mapping.templates) {
            template = mapping.templates[Math.floor(Math.random() * mapping.templates.length)];
        } else {
            template = headlineTemplates[Math.floor(Math.random() * headlineTemplates.length)];
        }
    } else {
        template = headlineTemplates[Math.floor(Math.random() * headlineTemplates.length)];
    }
    
    const company2 = companies.filter(c => c !== selectedCompany)[Math.floor(Math.random() * (companies.length - 1))];
    const region = ["US", "Europe", "Asia", "Global"][Math.floor(Math.random() * 4)];
    const movement = ["Surges", "Drops", "Rises", "Falls", "Stabilizes"][Math.floor(Math.random() * 5)];
    const productType = ["Consumer", "Enterprise", "Cloud", "AI", "IoT", "Mobile"][Math.floor(Math.random() * 6)];
    const announcementType = ["Earnings Report", "Product Launch", "Strategic Plan", "Restructuring"][Math.floor(Math.random() * 4)];
    const quarter = Math.floor(Math.random() * 4) + 1;
    const beatMiss = ["Beats", "Misses", "Meets"][Math.floor(Math.random() * 3)];
    const earningsChange = ["Significant Increase", "Modest Growth", "Slight Decline", "Unexpected Drop"][Math.floor(Math.random() * 4)];
    const aiField = ["Natural Language", "Computer Vision", "Predictive Analytics", "Robotics"][Math.floor(Math.random() * 4)];
    
    // Replace all placeholders in the template
    return template
        .replace('{company}', selectedCompany)
        .replace('{company2}', company2)
        .replace('{sector}', selectedSector)
        .replace('{region}', region)
        .replace('{movement}', movement)
        .replace('{product_type}', productType)
        .replace('{announcement_type}', announcementType)
        .replace('{quarter}', quarter)
        .replace('{beat_miss}', beatMiss)
        .replace('{earnings_change}', earningsChange)
        .replace('{ai_field}', aiField);
};

// Generate relevant content based on headline and sentiment
const generateRelevantContent = (headline, company, sentiment) => {
    // Base content length
    const contentLength = Math.floor(Math.random() * 300) + 200;
    
    // Sentiment-specific phrases
    const sentimentPhrases = {
        positive: [
            "exceeding expectations", 
            "strong growth", 
            "positive outlook", 
            "market leader", 
            "impressive results", 
            "bullish forecast"
        ],
        negative: [
            "falling short of expectations", 
            "concerning trend", 
            "bearish outlook", 
            "facing challenges", 
            "disappointing results", 
            "market pressure"
        ],
        neutral: [
            "as expected", 
            "steady performance", 
            "mixed results", 
            "ongoing development", 
            "stable outlook", 
            "measured approach"
        ]
    };
    
    // Select phrases based on sentiment
    const phrases = sentimentPhrases[sentiment] || sentimentPhrases.neutral;
    const phrase1 = phrases[Math.floor(Math.random() * phrases.length)];
    const phrase2 = phrases.filter(p => p !== phrase1)[Math.floor(Math.random() * (phrases.length - 1))];
    
    // Create a more realistic content based on the headline and sentiment
    return `This article discusses ${company}'s recent developments. The company has been ${phrase1} in the ${sectors[Math.floor(Math.random() * sectors.length)]} sector. Analysts note that ${company} is ${phrase2} compared to its competitors. ${headline} This news comes as the industry faces rapid changes and evolving consumer demands. Investors are closely monitoring the situation to determine long-term implications for the company's market position.`;
};

const generateFakeArticle = (keyword = null, forceCompany = null, forceSentiment = null) => {
    // Determine company - either forced or random
    const company = forceCompany || companies[Math.floor(Math.random() * companies.length)];
    
    // Generate appropriate sentiment (biased if keyword/company specific pattern exists)
    let sentiment;
    if (forceSentiment) {
        sentiment = forceSentiment;
    } else if (keyword === 'earnings' && Math.random() > 0.6) {
        // Earnings news tends to have stronger sentiment
        sentiment = Math.random() > 0.5 ? "positive" : "negative";
    } else {
        sentiment = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];
    }
    
    // Generate a realistic sentiment score based on the sentiment label
    let sentimentScore;
    switch(sentiment) {
        case "positive":
            sentimentScore = 0.3 + (Math.random() * 0.7); // Range 0.3 to 1.0
            break;
        case "negative":
            sentimentScore = -1.0 + (Math.random() * 0.7); // Range -1.0 to -0.3
            break;
        default: // neutral
            sentimentScore = -0.3 + (Math.random() * 0.6); // Range -0.3 to 0.3
    }
    
    // Generate an appropriate headline
    const headline = generateFakeHeadline(keyword, company);
    
    // Generate more realistic content based on the headline and sentiment
    const content = generateRelevantContent(headline, company, sentiment);
    
    // Create snippet from content
    const snippet = content.substring(0, 120) + "...";
    
    // Generate publication date (more recent for trending topics)
    const publishedDate = keyword === 'market' || keyword === 'ai' 
        ? generateFakeDate(10) // More recent for trending topics
        : generateFakeDate(30);
    
    // Determine source, making some sources more likely for certain topics
    let source;
    if (keyword === 'ai') {
        // Tech-focused sources more likely for AI news
        source = Math.random() > 0.4 
            ? ["CNBC", "Bloomberg", "Wall Street Journal"][Math.floor(Math.random() * 3)]
            : sources[Math.floor(Math.random() * sources.length)];
    } else if (keyword === 'energy') {
        // Financial sources more likely for energy news
        source = Math.random() > 0.4 
            ? ["Bloomberg", "Financial Times", "Reuters"][Math.floor(Math.random() * 3)]
            : sources[Math.floor(Math.random() * sources.length)];
    } else {
        source = sources[Math.floor(Math.random() * sources.length)];
    }
    
    // Determine categories/sectors
    let articleSectors;
    if (keyword === 'ai') {
        articleSectors = [Math.random() > 0.7 ? "Technology" : "Communications"];
    } else if (keyword === 'energy') {
        articleSectors = [Math.random() > 0.3 ? "Energy" : "Utilities"];
    } else {
        // Find appropriate sector based on company
        if (["Apple", "Microsoft", "Google", "IBM", "Intel", "AMD", "Nvidia"].includes(company)) {
            articleSectors = ["Technology"];
        } else if (["Meta"].includes(company)) {
            articleSectors = ["Communications"];
        } else if (["Amazon"].includes(company)) {
            articleSectors = ["Consumer Goods"];
        } else if (["Tesla"].includes(company)) {
            articleSectors = [Math.random() > 0.5 ? "Technology" : "Consumer Goods"];
        } else {
            articleSectors = [sectors[Math.floor(Math.random() * sectors.length)]];
        }
    }
    
    return {
        "_id": generateFakeId(),
        "_source": {
            "headline": headline,
            "url": `http://example.com/article/${generateFakeId()}`,
            "published_at": publishedDate,
            "source": source,
            "content": content,
            "snippet": snippet,
            "sentiment": sentiment,
            "sentiment_score": sentimentScore,
            "companies": [
                {
                    "name": company,
                    "ticker": company.substring(0, 3).toUpperCase(),
                    "sentiment": sentiment,
                    "mentions": Math.floor(Math.random() * 10) + 1
                }
            ],
            "categories": articleSectors,
            "relevance_score": Math.random() * 0.5 + 0.5 // Range from 0.5 to 1.0
        }
    };
};

const generateFakeArticles = (count = 10, keyword = null) => {
    const articles = [];
    for (let i = 0; i < count; i++) {
        articles.push(generateFakeArticle(keyword));
    }
    return articles;
};

// AWS-specific optimization - pregenerate a set of articles for production
// to avoid excessive computation on each request in production
const CACHED_ARTICLES = IS_AWS ? generateFakeArticles(30) : null;

// Extract keywords from query for smarter search results
const extractKeywords = (query) => {
    if (!query) return [];
    
    const keywords = [];
    const queryLower = query.toLowerCase();
    
    // Check for known keywords
    Object.keys(keywordMappings).forEach(key => {
        if (queryLower.includes(key)) {
            keywords.push(key);
        }
    });
    
    // Check for companies
    companies.forEach(company => {
        if (queryLower.includes(company.toLowerCase())) {
            keywords.push(company);
        }
    });
    
    // Check for sectors
    sectors.forEach(sector => {
        if (queryLower.includes(sector.toLowerCase())) {
            keywords.push(sector);
        }
    });
    
    return keywords;
};

// Main mock API functions
export const searchArticles = async (query, source, timeRange, sentiment) => {
    // Simulate network delay (shorter in production)
    await new Promise(resolve => setTimeout(resolve, IS_AWS ? 200 : 500));
    
    // Extract keywords for smarter search
    const keywords = extractKeywords(query);
    
    // Generate more relevant articles based on query keywords
    let fakeArticles = [];
    
    if (IS_AWS) {
        // In production, use cached articles but filter them
        fakeArticles = [...CACHED_ARTICLES];
    } else {
        // In development, generate articles based on the query
        const articleCount = Math.floor(Math.random() * 11) + 10; // Generate 10-20 articles
        
        if (keywords.length > 0) {
            // If we have keywords, generate more relevant results
            const primaryKeyword = keywords[0];
            
            if (keywordMappings[primaryKeyword]) {
                // If it's a known keyword (not a company or sector), use that
                fakeArticles = generateFakeArticles(articleCount, primaryKeyword);
            } else if (companies.includes(primaryKeyword)) {
                // If it's a company, ensure most articles are about that company
                for (let i = 0; i < articleCount; i++) {
                    // 70% chance of articles about the searched company
                    if (i < articleCount * 0.7) {
                        fakeArticles.push(generateFakeArticle(null, primaryKeyword));
                    } else {
                        fakeArticles.push(generateFakeArticle());
                    }
                }
            } else if (sectors.includes(primaryKeyword)) {
                // If it's a sector, generate sector-specific articles
                for (let i = 0; i < articleCount; i++) {
                    const article = generateFakeArticle();
                    if (i < articleCount * 0.7) {
                        // 70% chance of setting the sector to the searched sector
                        article._source.categories = [primaryKeyword];
                    }
                    fakeArticles.push(article);
                }
            } else {
                // Default case - just generate random articles
                fakeArticles = generateFakeArticles(articleCount);
            }
        } else {
            // No specific keywords found, generate random articles
            fakeArticles = generateFakeArticles(articleCount);
        }
    }
    
    // Apply source filter if specified
    if (source) {
        fakeArticles = fakeArticles.filter(article => article._source.source === source);
    }
    
    // Apply time range filter if specified
    if (timeRange && timeRange !== 'all') {
        const now = new Date();
        let cutoffDate;
        
        switch (timeRange) {
            case 'day':
                cutoffDate = new Date(now.setDate(now.getDate() - 1));
                break;
            case 'week':
                cutoffDate = new Date(now.setDate(now.getDate() - 7));
                break;
            case 'month':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
                break;
            case 'year':
                cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                cutoffDate = null;
        }
        
        if (cutoffDate) {
            fakeArticles = fakeArticles.filter(article => {
                const articleDate = new Date(article._source.published_at);
                return articleDate >= cutoffDate;
            });
        }
    }
    
    // Apply sentiment filter if specified
    if (sentiment && sentiment !== 'all') {
        fakeArticles = fakeArticles.filter(article => 
            article._source.sentiment?.toLowerCase() === sentiment.toLowerCase()
        );
    }
    
    // Make sure we always have some results even after filtering
    if (fakeArticles.length === 0) {
        const minResults = Math.floor(Math.random() * 3) + 3; // 3-5 results
        
        // Generate articles that match all filters
        for (let i = 0; i < minResults; i++) {
            const keyword = keywords.length > 0 ? keywords[0] : null;
            const company = companies.find(c => query?.toLowerCase().includes(c.toLowerCase())) || null;
            
            fakeArticles.push(generateFakeArticle(
                keyword, 
                company,
                sentiment !== 'all' ? sentiment : null
            ));
        }
        
        // Apply source filter again if specified
        if (source) {
            fakeArticles = fakeArticles.map(article => {
                article._source.source = source;
                return article;
            });
        }
    }
    
    // Randomize order slightly to simulate real search behavior
    fakeArticles.sort(() => Math.random() - 0.5);
    
    // Return in Elasticsearch response format (similar to the backend)
    return fakeArticles;
};

// Export additional mock API functions as needed
export const getArticleById = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const article = generateFakeArticle();
    article._id = id;
    return article._source;
}; 