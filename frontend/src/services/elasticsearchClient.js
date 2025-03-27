import { Client } from '@elastic/elasticsearch';

// Environment variables with fallbacks
const ELASTICSEARCH_URL = process.env.REACT_APP_ELASTICSEARCH_URL;
const ELASTICSEARCH_API_KEY = process.env.REACT_APP_ELASTICSEARCH_API_KEY;
const ELASTICSEARCH_INDEX = process.env.REACT_APP_ELASTICSEARCH_INDEX || 'financial_news';

// Create and configure Elasticsearch client
const createElasticsearchClient = () => {
  // Check for required configuration
  if (!ELASTICSEARCH_URL) {
    console.error('Elasticsearch URL not provided. Elasticsearch client cannot be initialized.');
    throw new Error('REACT_APP_ELASTICSEARCH_URL environment variable is required. Ensure the CI/CD pipeline provides this value.');
  }
  
  if (!ELASTICSEARCH_API_KEY) {
    console.error('Elasticsearch API Key not provided. Elasticsearch client cannot be initialized.');
    throw new Error('REACT_APP_ELASTICSEARCH_API_KEY environment variable is required. Ensure the CI/CD pipeline provides this value.');
  }
  
  const config = {
    node: ELASTICSEARCH_URL,
    auth: {
      apiKey: ELASTICSEARCH_API_KEY
    }
  };
  
  console.log(`Initializing Elasticsearch client for index: ${ELASTICSEARCH_INDEX}`);
  return new Client(config);
};

// Create the client instance - wrapped in try/catch to provide better error messages
let esClient;
try {
  esClient = createElasticsearchClient();
  console.log('Elasticsearch client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Elasticsearch client:', error.message);
  // Create a mock client that throws helpful errors when methods are called
  esClient = {
    search: () => {
      throw new Error('Elasticsearch client not properly initialized. Check browser console for details.');
    },
    get: () => {
      throw new Error('Elasticsearch client not properly initialized. Check browser console for details.');
    }
  };
}

// Elasticsearch API Functions
export const searchArticles = async (query, source, timeRange, sentiment) => {
  try {
    // Build Elasticsearch query based on parameters
    const esQuery = {
      bool: {
        must: [
          {
            multi_match: {
              query: query || '',
              fields: ['headline^2', 'content', 'summary^1.5'],
              fuzziness: 'AUTO'
            }
          }
        ]
      }
    };
    
    // Add source filter if specified
    if (source) {
      esQuery.bool.must.push({
        term: { source: source }
      });
    }
    
    // Add time range filter if specified
    if (timeRange) {
      const timeRangeMapping = {
        '1d': 'now-1d',
        'day': 'now-1d',
        '7d': 'now-7d',
        'week': 'now-7d',
        '30d': 'now-30d',
        'month': 'now-30d',
        '90d': 'now-90d',
        'year': 'now-365d'
      };
      
      const range = timeRangeMapping[timeRange] || 'now-30d';
      
      esQuery.bool.must.push({
        range: {
          published_at: {
            gte: range,
            lte: 'now'
          }
        }
      });
    }
    
    // Add sentiment filter if specified
    if (sentiment) {
      const sentimentMapping = {
        'positive': { gte: 0.6 },
        'neutral': { gte: 0.4, lte: 0.6 },
        'negative': { lte: 0.4 }
      };
      
      const sentimentRange = sentimentMapping[sentiment];
      
      if (sentimentRange) {
        esQuery.bool.must.push({
          range: {
            sentiment_score: sentimentRange
          }
        });
      }
    }
    
    // Execute the Elasticsearch search
    const response = await esClient.search({
      index: ELASTICSEARCH_INDEX,
      body: {
        query: esQuery,
        size: 20,
        sort: [
          { published_at: { order: 'desc' } }
        ]
      }
    });
    
    // Transform response to match API format
    return response.hits.hits.map(hit => ({
      id: hit._id,
      ...hit._source
    }));
  } catch (error) {
    console.error('Elasticsearch search error:', error);
    throw error;
  }
};

export const getArticleById = async (id) => {
  try {
    const response = await esClient.get({
      index: ELASTICSEARCH_INDEX,
      id: id
    });
    
    return {
      ...response._source,
      id: response._id
    };
  } catch (error) {
    console.error('Elasticsearch get error:', error);
    throw error;
  }
};

export default {
  searchArticles,
  getArticleById
}; 