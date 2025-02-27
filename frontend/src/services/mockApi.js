// Mock API service for development
import { format, subDays } from 'date-fns';

// Get environment settings
const IS_AWS = process.env.REACT_APP_ENV === 'production';

// Sample data for generating fake articles
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

// Helper functions
const generateFakeId = () => {
    return `${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}-${Math.floor(Math.random() * 9000) + 1000}`;
};

const generateFakeDate = (daysAgoMax = 30) => {
    const daysAgo = Math.floor(Math.random() * daysAgoMax);
    return format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
};

const generateFakeHeadline = () => {
    const template = headlineTemplates[Math.floor(Math.random() * headlineTemplates.length)];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const company2 = companies.filter(c => c !== company)[Math.floor(Math.random() * (companies.length - 1))];
    const sector = sectors[Math.floor(Math.random() * sectors.length)];
    const region = ["US", "Europe", "Asia", "Global"][Math.floor(Math.random() * 4)];
    const movement = ["Surges", "Drops", "Rises", "Falls", "Stabilizes"][Math.floor(Math.random() * 5)];
    const productType = ["Consumer", "Enterprise", "Cloud", "AI", "IoT", "Mobile"][Math.floor(Math.random() * 6)];
    const announcementType = ["Earnings Report", "Product Launch", "Strategic Plan", "Restructuring"][Math.floor(Math.random() * 4)];
    
    return template
        .replace('{company}', company)
        .replace('{company2}', company2)
        .replace('{sector}', sector)
        .replace('{region}', region)
        .replace('{movement}', movement)
        .replace('{product_type}', productType)
        .replace('{announcement_type}', announcementType);
};

const generateFakeArticle = () => {
    const company = companies[Math.floor(Math.random() * companies.length)];
    const publishedDate = generateFakeDate();
    const sentiment = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];
    
    return {
        "_id": generateFakeId(),
        "_source": {
            "headline": generateFakeHeadline(),
            "url": `http://example.com/article/${generateFakeId()}`,
            "published_at": publishedDate,
            "source": sources[Math.floor(Math.random() * sources.length)],
            "content": `This is a placeholder article about ${company}. It contains sample text for frontend debugging purposes.`,
            "snippet": `Sample article snippet about ${company} for testing the frontend interface...`,
            "sentiment": sentiment,
            "sentiment_score": Math.random() * 2 - 1, // Range from -1.0 to 1.0
            "companies": [
                {
                    "name": company,
                    "ticker": company.substring(0, 3).toUpperCase(),
                    "sentiment": sentiment,
                    "mentions": Math.floor(Math.random() * 10) + 1
                }
            ],
            "categories": [sectors[Math.floor(Math.random() * sectors.length)]],
            "relevance_score": Math.random() * 0.5 + 0.5 // Range from 0.5 to 1.0
        }
    };
};

const generateFakeArticles = (count = 10) => {
    const articles = [];
    for (let i = 0; i < count; i++) {
        articles.push(generateFakeArticle());
    }
    return articles;
};

// AWS-specific optimization - pregenerate a set of articles for production
// to avoid excessive computation on each request in production
const CACHED_ARTICLES = IS_AWS ? generateFakeArticles(30) : null;

// Main mock API functions
export const searchArticles = async (query, source, timeRange, sentiment) => {
    // Simulate network delay (shorter in production)
    await new Promise(resolve => setTimeout(resolve, IS_AWS ? 200 : 500));
    
    // In AWS production, use cached articles for better performance
    // In development, generate new articles on each request
    let fakeArticles = IS_AWS 
        ? [...CACHED_ARTICLES] // Use cached articles in AWS
        : generateFakeArticles(Math.floor(Math.random() * 11) + 5); // Generate fresh ones in development
    
    // Apply filters
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
    
    // If query contains a company name, bias results toward that company
    companies.forEach(company => {
        if (query && query.toLowerCase().includes(company.toLowerCase())) {
            // Modify first few results to include the company
            for (let i = 0; i < Math.min(3, fakeArticles.length); i++) {
                const article = fakeArticles[i];
                const randomCompany = companies[Math.floor(Math.random() * companies.length)];
                article._source.headline = article._source.headline.replace(randomCompany, company);
                article._source.companies[0].name = company;
                article._source.companies[0].ticker = company.substring(0, 3).toUpperCase();
            }
        }
    });
    
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