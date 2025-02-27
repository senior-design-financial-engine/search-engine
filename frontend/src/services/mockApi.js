// Mock API service for development
import { format, subDays, subHours, subMinutes } from 'date-fns';

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

const generateFakeDate = (daysAgoMax = 90) => {
    // Create a more natural distribution where recent articles are more common
    // Use a weighted random approach where more recent days have higher probability
    // Power of 1.8 skews more toward recent dates while still allowing older ones
    const weightedRandom = Math.pow(Math.random(), 1.8); 
    const daysAgo = Math.floor(weightedRandom * daysAgoMax);
    
    // Generate a realistic time of day
    // News articles are more commonly published during business hours
    let baseDate = subDays(new Date(), daysAgo);
    
    // Determine if it's a business hour publication (higher probability)
    const isBusinessHours = Math.random() < 0.7;
    
    let hoursAgo;
    if (isBusinessHours) {
        // Business hours: 8am to 6pm (with higher frequency around market open/close)
        const businessHourDistribution = [
            8, 8, 9, 9, 9, 10, 10, 11, 11, 12, 12, 
            13, 13, 14, 14, 15, 15, 15, 16, 16, 16, 17, 17, 18
        ];
        const hour = businessHourDistribution[Math.floor(Math.random() * businessHourDistribution.length)];
        
        // Set the hour and randomize minutes
        baseDate.setHours(hour);
        baseDate.setMinutes(Math.floor(Math.random() * 60));
    } else {
        // Non-business hours: more random but still realistic
        const nonBusinessHour = Math.floor(Math.random() * 24);
        baseDate.setHours(nonBusinessHour);
        baseDate.setMinutes(Math.floor(Math.random() * 60));
    }
    
    // Add seconds for more realism
    baseDate.setSeconds(Math.floor(Math.random() * 60));
    
    // For very recent articles (last 24 hours), add more precise timing
    if (daysAgo === 0) {
        // Random hours ago within the day
        hoursAgo = Math.floor(Math.random() * 24);
        baseDate = subHours(baseDate, hoursAgo);
        
        // Random minutes for very recent articles
        const minutesAgo = Math.floor(Math.random() * 60);
        baseDate = subMinutes(baseDate, minutesAgo);
    }
    
    return format(baseDate, 'yyyy-MM-dd\'T\'HH:mm:ss');
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
const generateRelevantContent = (headline, primaryCompany, sentiment, additionalCompanies = []) => {
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
    let content = `This article discusses ${primaryCompany}'s recent developments. The company has been ${phrase1} in the ${sectors[Math.floor(Math.random() * sectors.length)]} sector. Analysts note that ${primaryCompany} is ${phrase2} compared to its competitors. ${headline}`;
    
    // Add references to additional companies if they exist
    if (additionalCompanies && additionalCompanies.length > 0) {
        // Relationship phrases between companies
        const relationshipPhrases = [
            "is partnering with",
            "is competing against",
            "faces competition from",
            "is outperforming",
            "is collaborating with",
            "shares market space with",
            "is challenging",
            "has similar market trends to"
        ];
        
        // Add content about each additional company
        additionalCompanies.forEach((company, index) => {
            const relationshipPhrase = relationshipPhrases[Math.floor(Math.random() * relationshipPhrases.length)];
            const companySentiment = sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)];
            const companyPhrase = sentimentPhrases[companySentiment][Math.floor(Math.random() * sentimentPhrases[companySentiment].length)];
            
            // Add a sentence about the relationship between the primary company and this one
            content += ` ${primaryCompany} ${relationshipPhrase} ${company} in the sector. ${company} has been ${companyPhrase} recently.`;
        });
    }
    
    content += ` This news comes as the industry faces rapid changes and evolving consumer demands. Investors are closely monitoring the situation to determine long-term implications for the ${additionalCompanies.length > 0 ? 'companies' : 'company'}'s market position.`;
    
    return content;
};

// Calculate a true relevance score based on how well the article matches the query
const calculateRelevanceScore = (article, queryTerms) => {
    if (!queryTerms || queryTerms.length === 0) {
        return 0.5; // Default moderate relevance when no query
    }
    
    let score = 0;
    const content = article._source.content.toLowerCase();
    const headline = article._source.headline.toLowerCase();
    const companies = article._source.companies?.map(c => c.name.toLowerCase()) || [];
    const categories = article._source.categories?.map(c => c.toLowerCase()) || [];
    
    // For debugging
    const scoreBreakdown = {
        headline: 0,
        companies: 0,
        categories: 0,
        content: 0,
        random: 0
    };
    
    // Check each query term for matches
    queryTerms.forEach(term => {
        const termLower = term.toLowerCase();
        
        // Headline match is most important (3x weight)
        if (headline.includes(termLower)) {
            score += 0.3;
            scoreBreakdown.headline += 0.3;
        }
        
        // Company name matches are very important (2x weight)
        // Check all companies in the article
        let companyMatchFound = false;
        companies.forEach(company => {
            if (company === termLower) {
                score += 0.25;
                scoreBreakdown.companies += 0.25;
                companyMatchFound = true;
            } else if (company.includes(termLower) && !companyMatchFound) {
                score += 0.15;
                scoreBreakdown.companies += 0.15;
                companyMatchFound = true;
            }
        });
        
        // Category/sector match is important
        let categoryMatchFound = false;
        categories.forEach(category => {
            if ((category === termLower || category.includes(termLower)) && !categoryMatchFound) {
                score += 0.15;
                scoreBreakdown.categories += 0.15;
                categoryMatchFound = true;
            }
        });
        
        // Content match
        if (content.includes(termLower)) {
            score += 0.1;
            scoreBreakdown.content += 0.1;
        }
    });
    
    // Normalize score between 0.1 and 1.0
    score = Math.min(1.0, Math.max(0.1, score));
    
    // Add a small random factor (max 10% of score) to prevent exact ties
    const randomFactor = (Math.random() * 0.1) * score;
    scoreBreakdown.random = randomFactor;
    score = Math.min(1.0, score + randomFactor);
    
    // Log the score calculation for debugging
    console.debug('Relevance score calculation:', {
        queryTerms,
        headline: article._source.headline,
        companies: article._source.companies?.map(c => c.name),
        categories: article._source.categories,
        scoreBreakdown,
        finalScore: score
    });
    
    return score;
};

// Generate an article with specific relevance to provided search terms
const generateFakeArticle = (queryTerms = [], keyword = null, forceCompany = null, forceSentiment = null) => {
    // Determine company - either forced, from query terms, or random
    let company = forceCompany;
    
    if (!company && queryTerms.length > 0) {
        // Try to use a company from the query terms
        const companyTerm = queryTerms.find(term => 
            companies.some(c => c.toLowerCase() === term.toLowerCase())
        );
        
        if (companyTerm) {
            company = companies.find(c => c.toLowerCase() === companyTerm.toLowerCase());
        }
    }
    
    if (!company) {
        // Find specific companies for specific keywords
        if (keyword === 'ai') {
            // For AI queries, bias toward tech companies
            const aiCompanies = ["Microsoft", "Google", "Nvidia", "Meta", "IBM"];
            company = aiCompanies[Math.floor(Math.random() * aiCompanies.length)];
        } else if (keyword === 'energy') {
            // Non-tech companies for energy
            company = companies.filter(c => !["Microsoft", "Google", "Apple", "Meta"].includes(c))[
                Math.floor(Math.random() * (companies.length - 4))
            ];
        } else {
            company = companies[Math.floor(Math.random() * companies.length)];
        }
    }
    
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
    
    // Determine if this article should have multiple companies (about 30% of articles)
    const hasMultipleCompanies = Math.random() < 0.3;
    
    // Create the companies array
    let articleCompanies = [];
    
    // Add the primary company
    articleCompanies.push({
        "name": company,
        "ticker": company.substring(0, 3).toUpperCase(),
        "sentiment": sentiment,
        "mentions": Math.floor(Math.random() * 10) + 1
    });
    
    // Add additional companies if needed
    if (hasMultipleCompanies) {
        // Determine how many additional companies (1-2)
        const additionalCompanyCount = Math.random() < 0.7 ? 1 : 2;
        
        // Get companies that are not the primary one
        const otherCompanies = companies.filter(c => c !== company);
        
        // Select random additional companies
        for (let i = 0; i < additionalCompanyCount; i++) {
            if (i < otherCompanies.length) {
                const randomIndex = Math.floor(Math.random() * otherCompanies.length);
                const additionalCompany = otherCompanies[randomIndex];
                
                // Remove the selected company to avoid duplicates
                otherCompanies.splice(randomIndex, 1);
                
                // Determine sentiment for this company (may differ from primary)
                const companySentiment = Math.random() < 0.3 ? 
                    sentimentOptions[Math.floor(Math.random() * sentimentOptions.length)] : 
                    sentiment;
                
                // Add to the companies array with fewer mentions than the primary company
                articleCompanies.push({
                    "name": additionalCompany,
                    "ticker": additionalCompany.substring(0, 3).toUpperCase(),
                    "sentiment": companySentiment,
                    "mentions": Math.floor(Math.random() * 5) + 1 // Fewer mentions than primary
                });
            }
        }
    }
    
    // Determine categories/sectors
    let articleSectors = [];
    
    // Add primary sector based on the main company
    if (keyword === 'ai') {
        articleSectors.push(Math.random() > 0.7 ? "Technology" : "Communications");
    } else if (keyword === 'energy') {
        articleSectors.push(Math.random() > 0.3 ? "Energy" : "Utilities");
    } else {
        // Find appropriate sector based on company
        if (["Apple", "Microsoft", "Google", "IBM", "Intel", "AMD", "Nvidia"].includes(company)) {
            articleSectors.push("Technology");
        } else if (["Meta"].includes(company)) {
            articleSectors.push("Communications");
        } else if (["Amazon"].includes(company)) {
            articleSectors.push("Consumer Goods");
        } else if (["Tesla"].includes(company)) {
            articleSectors.push(Math.random() > 0.5 ? "Technology" : "Consumer Goods");
        } else {
            articleSectors.push(sectors[Math.floor(Math.random() * sectors.length)]);
        }
    }
    
    // Add additional categories for multi-company articles or sometimes for single company articles
    if (hasMultipleCompanies || Math.random() < 0.2) {
        // Get sectors not already included
        const additionalSectors = sectors.filter(s => !articleSectors.includes(s));
        
        // Determine how many additional sectors (usually 1, occasionally 2)
        const additionalSectorCount = Math.random() < 0.8 ? 1 : 2;
        
        // Add additional sectors
        for (let i = 0; i < additionalSectorCount && i < additionalSectors.length; i++) {
            const randomIndex = Math.floor(Math.random() * additionalSectors.length);
            articleSectors.push(additionalSectors[randomIndex]);
            additionalSectors.splice(randomIndex, 1);
        }
    }
    
    // Generate an appropriate headline
    const headline = generateFakeHeadline(keyword, company);
    
    // Generate more realistic content based on the headline and sentiment
    const additionalCompanyNames = hasMultipleCompanies ? articleCompanies.slice(1).map(c => c.name) : [];
    const content = generateRelevantContent(headline, company, sentiment, additionalCompanyNames);
    
    // Create snippet from content
    const snippet = content.substring(0, 120) + "...";
    
    // Generate publication date (more recent for trending topics)
    const publishedDate = keyword === 'market' || keyword === 'ai' 
        ? generateFakeDate(30) // More recent for trending topics
        : generateFakeDate(90); // Regular topics can go back up to 3 months
    
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
    
    // Log sentiment calculation for debugging
    console.debug('Sentiment calculation:', {
        sentiment,
        sentimentScore,
        company,
        keyword
    });
    
    // Create the article object
    const article = {
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
            "companies": articleCompanies,
            "categories": articleSectors,
            "relevance_score": 0.5 // Will be calculated properly later
        }
    };
    
    // Calculate and set the proper relevance score
    article._source.relevance_score = calculateRelevanceScore(article, queryTerms);
    
    return article;
};

// Generate multiple articles with specific relevance to query
const generateRelevantArticles = (count, queryTerms, keyword = null) => {
    const articles = [];
    
    // Create a higher number of articles to allow for filtering irrelevant ones
    const targetCount = count * 1.5;
    
    // Ensure we have articles distributed across the time range
    // For about 20% of the articles, we'll explicitly set dates across the 3-month range
    const timeDistributedCount = Math.floor(targetCount * 0.2);
    
    if (timeDistributedCount > 0) {
        // Generate articles with specific time distributions
        generateTimeDistributedArticles(timeDistributedCount, queryTerms, keyword, articles);
    }
    
    // Generate the remaining articles with natural time distribution
    const remainingCount = targetCount - timeDistributedCount;
    for (let i = 0; i < remainingCount; i++) {
        articles.push(generateFakeArticle(queryTerms, keyword));
    }
    
    // Filter out articles with low relevance
    const relevantArticles = articles.filter(article => 
        article._source.relevance_score > 0.2
    );
    
    // Sort by relevance score (higher is better)
    relevantArticles.sort((a, b) => 
        b._source.relevance_score - a._source.relevance_score
    );
    
    // Return the requested count (or fewer if not enough relevant articles)
    return relevantArticles.slice(0, count);
};

// Generate articles distributed across the time range
const generateTimeDistributedArticles = (count, queryTerms, keyword, articlesArray) => {
    // Define time buckets (in days ago) to ensure distribution
    const timeBuckets = [
        { min: 0, max: 7 },      // Last week
        { min: 8, max: 30 },     // Last month
        { min: 31, max: 60 },    // 1-2 months ago
        { min: 61, max: 90 }     // 2-3 months ago
    ];
    
    // Distribute articles across time buckets
    let bucketIndex = 0;
    for (let i = 0; i < count; i++) {
        // Get the current bucket
        const bucket = timeBuckets[bucketIndex % timeBuckets.length];
        bucketIndex++;
        
        // Generate an article
        const article = generateFakeArticle(queryTerms, keyword);
        
        // Override the date to fit in this bucket
        const daysAgo = bucket.min + Math.floor(Math.random() * (bucket.max - bucket.min + 1));
        let baseDate = subDays(new Date(), daysAgo);
        
        // Add realistic time
        const hour = Math.floor(Math.random() * 24);
        const minute = Math.floor(Math.random() * 60);
        baseDate.setHours(hour);
        baseDate.setMinutes(minute);
        baseDate.setSeconds(Math.floor(Math.random() * 60));
        
        // Set the date
        article._source.published_at = format(baseDate, 'yyyy-MM-dd\'T\'HH:mm:ss');
        
        // Add to the articles array
        articlesArray.push(article);
    }
};

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

// Extract individual search terms from the query
const extractSearchTerms = (query) => {
    if (!query) return [];
    
    // Split the query into individual terms
    const terms = query.split(/\s+/)
        .map(term => term.toLowerCase())
        .filter(term => 
            // Filter out common stop words and very short terms
            term.length > 2 && 
            !['the', 'and', 'for', 'with', 'about', 'from', 'that', 'this'].includes(term)
        );
    
    // Add additional terms from our keyword mappings if applicable
    const additionalTerms = [];
    terms.forEach(term => {
        if (keywordMappings[term]) {
            // Add related companies for known keywords
            const mapping = keywordMappings[term];
            if (mapping.companies) {
                additionalTerms.push(...mapping.companies.map(c => c.toLowerCase()));
            }
            if (mapping.sectors) {
                additionalTerms.push(...mapping.sectors.map(s => s.toLowerCase()));
            }
        }
    });
    
    // Combine original terms with additional ones, removing duplicates
    return [...new Set([...terms, ...additionalTerms])];
};

// Main mock API functions
export const searchArticles = async (query, source, timeRange, sentiment) => {
    console.log('Mock API searchArticles called with:', { query, source, timeRange, sentiment });
    
    // Simulate network delay (shorter in production)
    await new Promise(resolve => setTimeout(resolve, IS_AWS ? 200 : 500));
    
    // If no query, return a diverse set of random articles
    if (!query || query.trim() === '') {
        const randomArticles = generateRelevantArticles(15, []);
        
        // Apply filters
        return applyFilters(randomArticles, source, timeRange, sentiment);
    }
    
    // Extract keywords and search terms for relevant article generation
    const keywords = extractKeywords(query);
    const searchTerms = extractSearchTerms(query);
    
    console.log('Extracted search information:', { keywords, searchTerms });
    
    // Generate relevant articles based on query terms
    const articleCount = Math.floor(Math.random() * 11) + 15; // Generate 15-25 articles
    let relevantArticles = [];
    
    if (keywords.length > 0) {
        // If we have specific keywords, generate articles based on them
        const primaryKeyword = keywords[0];
        
        // Generate company-specific, sector-specific, or keyword-specific articles
        if (companies.includes(primaryKeyword)) {
            // Company-specific search
            for (let i = 0; i < articleCount; i++) {
                relevantArticles.push(generateFakeArticle(searchTerms, null, primaryKeyword));
            }
        } else if (sectors.includes(primaryKeyword)) {
            // Sector-specific search
            for (let i = 0; i < articleCount; i++) {
                const article = generateFakeArticle(searchTerms);
                if (i < articleCount * 0.8) {
                    // 80% of articles match the sector
                    article._source.categories = [primaryKeyword];
                }
                relevantArticles.push(article);
            }
        } else {
            // Keyword-specific search (ai, earnings, etc.)
            relevantArticles = generateRelevantArticles(articleCount, searchTerms, primaryKeyword);
        }
    } else {
        // General search based on the terms
        relevantArticles = generateRelevantArticles(articleCount, searchTerms);
    }
    
    // Apply filters and sort by relevance
    const filteredArticles = applyFilters(relevantArticles, source, timeRange, sentiment);
    
    // Always sort by relevance score
    filteredArticles.sort((a, b) => b._source.relevance_score - a._source.relevance_score);
    
    console.log(`Returning ${filteredArticles.length} articles after filtering and sorting`);
    
    // Return in Elasticsearch response format
    return filteredArticles;
};

// Helper function to apply filters
const applyFilters = (articles, source, timeRange, sentiment) => {
    let filteredArticles = [...articles];
    
    // Apply source filter if specified
    if (source) {
        filteredArticles = filteredArticles.filter(article => article._source.source === source);
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
            case 'three_months':
                cutoffDate = new Date(now.setMonth(now.getMonth() - 3));
                break;
            case 'year':
                cutoffDate = new Date(now.setFullYear(now.getFullYear() - 1));
                break;
            default:
                cutoffDate = null;
        }
        
        if (cutoffDate) {
            filteredArticles = filteredArticles.filter(article => {
                const articleDate = new Date(article._source.published_at);
                return articleDate >= cutoffDate;
            });
        }
    }
    
    // Apply sentiment filter if specified
    if (sentiment && sentiment !== 'all') {
        filteredArticles = filteredArticles.filter(article => 
            article._source.sentiment?.toLowerCase() === sentiment.toLowerCase()
        );
    }
    
    // Ensure minimum number of results after filtering (if possible)
    if (filteredArticles.length < 3 && articles.length > 0) {
        // Generate a few articles that match all filters
        const minResults = Math.floor(Math.random() * 3) + 3; // 3-5 results
        const searchTerms = articles[0]._source.headline.split(' ');
        
        for (let i = 0; i < minResults; i++) {
            const newArticle = generateFakeArticle(searchTerms);
            
            // Apply source filter if specified
            if (source) {
                newArticle._source.source = source;
            }
            
            // Apply sentiment filter if specified
            if (sentiment && sentiment !== 'all') {
                newArticle._source.sentiment = sentiment;
            }
            
            // Apply time range filter if specified
            if (timeRange && timeRange !== 'all') {
                // Generate a date within the specified time range
                let maxDaysAgo;
                switch (timeRange) {
                    case 'day':
                        maxDaysAgo = 1;
                        break;
                    case 'week':
                        maxDaysAgo = 7;
                        break;
                    case 'month':
                        maxDaysAgo = 30;
                        break;
                    case 'three_months':
                        maxDaysAgo = 90;
                        break;
                    case 'year':
                        maxDaysAgo = 365;
                        break;
                    default:
                        maxDaysAgo = 90;
                }
                
                // Generate a date within the specified range
                newArticle._source.published_at = generateFakeDate(maxDaysAgo);
            }
            
            filteredArticles.push(newArticle);
        }
    }
    
    return filteredArticles;
};

// Export additional mock API functions as needed
export const getArticleById = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const article = generateFakeArticle();
    article._id = id;
    return article._source;
}; 