import axios from 'axios';
// Import search client with a generic name
import elasticsearch from 'elasticsearch-browser';
const searchClient = elasticsearch; 

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
		host: parsedHost,
		log: 'error', // Only log errors
		requestTimeout: 30000 // 30 seconds timeout
	};
	
	// Add authentication in order of preference: API key, then basic auth from URL
	if (apiKey) {
		clientConfig.apiKey = apiKey;
		clientConfig.headers = {
			'Authorization': `ApiKey ${apiKey}`
		};
	} else if (authFromUrl) {
		clientConfig.httpAuth = `${authFromUrl.username}:${authFromUrl.password}`;
	}
	
	// Return the client with appropriate auth
	return new searchClient.Client(clientConfig);
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
const enhancedApiClient = createDataProvider(API_BASE_URL);

// Create fallback API client
const fallbackApiClient = createApiClient(API_FALLBACK_URL);
// Create fallback search client
const fallbackEnhancedClient = createDataProvider(API_FALLBACK_URL);

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
		index: 'articles',
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
	
	// Use enhanced search client for more efficient data retrieval
	const primaryRequest = async () => {
		try {
			// Perform search
			const response = await enhancedApiClient.search(searchQuery);
			
			// Format the response to match expected API structure
			return {
				data: response.hits.hits.map(hit => ({
					_id: hit._id,
					_source: {
						...hit._source,
						relevance_score: hit._score / 10, // Normalize score
					},
					highlight: hit.highlight || {}
				}))
			};
		} catch (error) {
			// Check for authentication errors
			if (error.status === 401 || error.status === 403 || 
				(error.message && (error.message.includes('unauthorized') || error.message.includes('forbidden')))) {
				console.error('Authentication error with search client', error);
				
				// Create a sanitized error for logging
				const authError = new Error('Search provider authentication failed');
				authError.status = error.status || 401;
				throw authError;
			}
			
			// Convert technical errors to generic ones
			if (error.toString().includes('elasticsearch')) {
				const genericError = new Error('Search provider error');
				genericError.status = error.status || 500;
				throw genericError;
			}
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		// Use standard API as fallback
		const params = { query };
		if (source) params.source = source;
		if (time_range) params.time_range = time_range;
		if (sentiment) params.sentiment = sentiment;
		
		// Transform API response to normalized format
		const response = await fallbackApiClient.get('/search', { params });
		
		// Check if we need to transform the data
		if (response.data && Array.isArray(response.data) && response.data.length > 0 && !response.data[0]._source) {
			return {
				data: response.data.map(item => ({
					_id: item.id || Math.random().toString(36).substring(2, 15),
					_source: { ...item },
					highlight: {}
				}))
			};
		}
		
		return response;
	};
	
	try {
		const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
		
		// Add compatibility layer for the frontend
		// This ensures consistent data format
		if (response && response.data) {
			// Return array structure expected by Results.js
			return response.data;
		}
		
		return [];
	} catch (error) {
		console.error('Error in searchArticles:', error);
		throw error;
	}
};

export const getArticleById = async (id) => {
	// Define article fetch functions
	const primaryRequest = async () => {
		try {
			// Use enhanced client for data retrieval
			const response = await enhancedApiClient.get({
				index: 'articles',
				id: id
			});
			
			// Format response to match API
			return { 
				data: { 
					...response._source,
					id: response._id
				} 
			};
		} catch (error) {
			// Sanitize error messages
			if (error.toString().includes('elasticsearch')) {
				// If it's a 404, just pass through to try the regular API
				if (error.status === 404) {
					// Fall through to regular API
				} else {
					// For other errors, create a sanitized version
					const genericError = new Error('Data provider error');
					genericError.status = error.status || 500;
					throw genericError;
				}
			}
			
			// If not found with enhanced client, try regular API
			const apiResponse = await apiClient.get(`/article/${id}`);
			
			// Make sure the response format is consistent
			if (apiResponse.data) {
				// Ensure the id field is present
				if (!apiResponse.data.id) {
					apiResponse.data.id = id;
				}
			}
			
			return apiResponse;
		}
	};
	
	const fallbackRequest = async () => {
		const fallbackResponse = await fallbackApiClient.get(`/article/${id}`);
		
		// Make sure the response format is consistent
		if (fallbackResponse.data && !fallbackResponse.data.id) {
			fallbackResponse.data.id = id;
		}
		
		return fallbackResponse;
	};
	
	try {
		const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
		return response.data;
	} catch (error) {
		// Clean up error message
		if (error.toString().includes('elasticsearch')) {
			throw new Error(`Failed to retrieve article ${id}`);
		}
		throw error;
	}
};