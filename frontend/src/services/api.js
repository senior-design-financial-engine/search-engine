import axios from 'axios';
// Import the official Elasticsearch client
import { Client } from '@elastic/elasticsearch';
// No need for searchClient assignment now

// Use environment variables with fallbacks
let API_BASE_URL = process.env.REACT_APP_API_URL;
const API_FALLBACK_URL = process.env.REACT_APP_API_FALLBACK_URL || 'https://direct-api.financialnewsengine.com';
if (!API_BASE_URL) {
	throw new Error('REACT_APP_API_URL environment variable is required');
}
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms
const FALLBACK_ENABLED = true; // Toggle fallback functionality

// Configure axios defaults
axios.defaults.timeout = 30000; // 30 seconds timeout

// Create advanced search client
const createDataProvider = (host) => {
	// Get API key from environment variables
	const apiKey = process.env.REACT_APP_ELASTICSEARCH_API_KEY;
	
	// Extract credentials from host if they're embedded in the URL (fallback)
	let authFromUrl = null;
	let parsedHost = host;
	
	// Check if URL contains embedded credentials
	if (host && host.includes('@')) {
		try {
			const url = new URL(host);
			if (url.username && url.password) {
				// Found embedded credentials
				authFromUrl = {
					username: url.username,
					password: url.password
				};
				// Remove credentials from host URL
				url.username = '';
				url.password = '';
				parsedHost = url.toString();
			}
		} catch (error) {
			console.debug('Error parsing URL, continuing with original host', error);
		}
	}
	
	// Configure the client with available authentication method
	const clientConfig = {
		node: parsedHost,
		requestTimeout: 30000 // 30 seconds timeout
	};
	
	// Add authentication in order of preference: API key, then basic auth from URL
	if (apiKey) {
		clientConfig.auth = {
			apiKey: apiKey
		};
	} else if (authFromUrl) {
		clientConfig.auth = {
			username: authFromUrl.username,
			password: authFromUrl.password
		};
	}
	
	// Return the client with appropriate auth
	return new Client(clientConfig);
};

// Function to create an API client with specified base URL
const createApiClient = (baseURL) => {
	return axios.create({
		baseURL,
		headers: {
			'Content-Type': 'application/json'
		},
		withCredentials: false, // Don't send credentials for cross-origin requests
		timeout: 30000 // 30 seconds timeout
	});
};

// Create primary API client
const apiClient = createApiClient(API_BASE_URL);
// Create enhanced search client
const enhancedApiClient = createDataProvider(process.env.REACT_APP_ELASTICSEARCH_URL || API_BASE_URL);

// Create fallback API client
const fallbackApiClient = createApiClient(API_FALLBACK_URL);
// Create fallback search client
const fallbackEnhancedClient = createDataProvider(process.env.REACT_APP_ELASTICSEARCH_URL || API_FALLBACK_URL);

// Request interceptor
apiClient.interceptors.request.use(
	(config) => {
		// Add a timestamp to bust cache if needed
		if (config.method === 'get') {
			config.params = {
				...config.params,
				_t: new Date().getTime()
			};
		}
		
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Also add request interceptor to fallback client
fallbackApiClient.interceptors.request.use(
	(config) => {
		// Add a timestamp to bust cache if needed
		if (config.method === 'get') {
			config.params = {
				...config.params,
				_t: new Date().getTime()
			};
		}
		
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Response interceptor
apiClient.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Add response interceptor to fallback client too
fallbackApiClient.interceptors.response.use(
	(response) => {
		return response;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Helper function to retry failed requests with fallback
const retryRequestWithFallback = async (fn, fnFallback, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
	let lastError;
	
	// Try primary endpoint with retries
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			
			// If server responded, don't retry (it's not a connection issue)
			if (error.response) {
				break;
			}
			
			// Wait before retry
			if (i < maxRetries - 1) {
				await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
			}
		}
	}
	
	// If primary endpoint failed and fallback is enabled, try fallback
	if (FALLBACK_ENABLED && fnFallback) {
		try {
			return await fnFallback();
		} catch (fallbackError) {
			// Prefer the primary error in the error response
			throw lastError || fallbackError;
		}
	}
	
	throw lastError;
};

// Main API functions
export const searchArticles = async (query, source, time_range, sentiment) => {
	// Build advanced query with filters
	const searchQuery = {
		index: process.env.REACT_APP_ELASTICSEARCH_INDEX || 'articles',
		body: {
			// Standard query format
			query: {
				bool: {
					must: [
						{
							multi_match: {
								query: query,
								fields: ['headline^3', 'content^2', 'summary', 'snippet']
							}
						}
					],
					filter: []
				}
			},
			highlight: {
				fields: {
					headline: {},
					content: {},
					summary: {}
				},
				pre_tags: ['<em>'],
				post_tags: ['</em>']
			},
			size: 50
		}
	};
	
	// Add filters if specified
	if (source) {
		searchQuery.body.query.bool.filter.push({
			term: { source: source }
		});
	}
	
	if (time_range) {
		const rangeFilter = { range: { published_at: {} } };
		
		switch (time_range) {
			case 'day':
				rangeFilter.range.published_at.gte = 'now-1d/d';
				break;
			case 'week':
				rangeFilter.range.published_at.gte = 'now-1w/d';
				break;
			case 'month':
				rangeFilter.range.published_at.gte = 'now-1M/d';
				break;
			case 'year':
				rangeFilter.range.published_at.gte = 'now-1y/d';
				break;
			default:
				// No range filter for 'all' or unknown values
				break;
		}
		
		if (rangeFilter.range.published_at.gte) {
			searchQuery.body.query.bool.filter.push(rangeFilter);
		}
	}
	
	if (sentiment) {
		searchQuery.body.query.bool.filter.push({
			term: { sentiment: sentiment }
		});
	}
	
	const primaryRequest = async () => {
		try {
			// Using the new Elasticsearch client API
			const response = await enhancedApiClient.search(searchQuery);
			
			// Process response in new client format
			const hits = response.hits?.hits || [];
			return {
				data: {
					results: hits.map(hit => ({
						id: hit._id,
						score: hit._score,
						...hit._source,
						highlight: hit.highlight || {}
					})),
					total: response.hits?.total?.value || hits.length,
					max_score: response.hits?.max_score || 0
				}
			};
		} catch (error) {
			console.error('Error searching articles:', error);
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		try {
			// Using the new Elasticsearch client API for fallback
			const response = await fallbackEnhancedClient.search(searchQuery);
			
			// Process response in new client format
			const hits = response.hits?.hits || [];
			return {
				data: {
					results: hits.map(hit => ({
						id: hit._id,
						score: hit._score,
						...hit._source,
						highlight: hit.highlight || {}
					})),
					total: response.hits?.total?.value || hits.length,
					max_score: response.hits?.max_score || 0
				}
			};
		} catch (error) {
			console.error('Fallback: Error searching articles:', error);
			throw error;
		}
	};
	
	return retryRequestWithFallback(primaryRequest, fallbackRequest);
};

export const getArticleById = async (id) => {
	const primaryRequest = async () => {
		try {
			// Using the new Elasticsearch client API
			const response = await enhancedApiClient.get({
				index: process.env.REACT_APP_ELASTICSEARCH_INDEX || 'articles',
				id: id
			});
			
			// Process response in new client format
			return {
				data: {
					...response._source,
					id: response._id
				}
			};
		} catch (error) {
			console.error('Error getting article by ID:', error);
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		try {
			// Using the new Elasticsearch client API for fallback
			const response = await fallbackEnhancedClient.get({
				index: process.env.REACT_APP_ELASTICSEARCH_INDEX || 'articles',
				id: id
			});
			
			// Process response in new client format
			return {
				data: {
					...response._source,
					id: response._id
				}
			};
		} catch (error) {
			console.error('Fallback: Error getting article by ID:', error);
			throw error;
		}
	};
	
	return retryRequestWithFallback(primaryRequest, fallbackRequest);
};