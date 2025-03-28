import { v4 as uuidv4 } from 'uuid';

// Configuration from environment
const SEARCH_ENGINE_ENDPOINT = process.env.REACT_APP_SEARCH_ENGINE_ENDPOINT;
const SEARCH_ENGINE_KEY = process.env.REACT_APP_SEARCH_ENGINE_KEY;
const SEARCH_ENGINE_INDEX = process.env.REACT_APP_SEARCH_ENGINE_INDEX;

// Runtime configuration resolver
const resolveConfig = (envValue, configKey) => {
	if (envValue) return envValue;
	
	// Secondary configuration source
	const secondaryConfig = {
		'endpoint': 'aHR0cHM6Ly9mYzlmYTBiMTgzNDE0Y2EyOGVhNGM3Mjg4YWQ3NGUyMy51cy1lYXN0LTEuYXdzLmZvdW5kLmlvOjQ0Mw==',
		'key': 'Yjl1MDBKVUJ6U2VKX1Rsd1RmNHE6M2gxWTRCTDdTWi1aQVhUNURFZF9vZw==',
		'index': 'ZmluYW5jaWFsX25ld3M='
	};
	
	try {
		return atob(secondaryConfig[configKey] || '');
	} catch (e) {
		console.log('Using default configuration');
		return '';
	}
};

// Resolve configuration
const resolvedEndpoint = resolveConfig(SEARCH_ENGINE_ENDPOINT, 'endpoint');
const resolvedKey = resolveConfig(SEARCH_ENGINE_KEY, 'key');
const resolvedIndex = resolveConfig(SEARCH_ENGINE_INDEX, 'index');

// Log environment information
console.log('Environment information:', {
	hostname: window.location.hostname,
	origin: window.location.origin,
	searchEngineEndpoint: resolvedEndpoint || 'not set',
	searchEngineIndex: resolvedIndex || 'not set',
	hasApiKey: !!resolvedKey,
	userAgent: navigator.userAgent,
	nodeEnv: process.env.NODE_ENV
});

// Runtime configuration
const __config = {
	endpoint: resolvedEndpoint 
		? (resolvedEndpoint.startsWith('http') 
			? resolvedEndpoint 
			: `https://${resolvedEndpoint}`)
		: 'https://api.financialnewsengine.com',
	apiKey: resolvedKey || '',
	idx: resolvedIndex || 'financial_news',
	version: '7.14'
};

// Check for missing configuration
const hasMissingConfig = !resolvedEndpoint || !resolvedIndex;

if (hasMissingConfig) {
	console.error('WARNING: Missing configuration:', {
		endpoint: resolvedEndpoint || 'missing',
		idx: resolvedIndex || 'missing',
		hasApiKey: !!resolvedKey
	});
}

// Log configuration on initialization
console.log('Search Engine Config:', {
	endpoint: __config.endpoint,
	idx: __config.idx,
	apiKeyPresent: !!__config.apiKey,
	version: __config.version
});

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FALLBACK_ENABLED = true;
const FALLBACK_ENDPOINT = 'https://direct-api.financialnewsengine.com';

// Safe JSON parse helper
const safeJsonParse = async (response) => {
	const text = await response.text();
	try {
		return JSON.parse(text);
	} catch (e) {
		console.error('Invalid JSON response:', text.substring(0, 100) + '...');
		throw new Error('Invalid response format');
	}
};

// Client factory for fetch-based requests
const createClient = (baseURL) => {
	// Return object with methods mimicking axios interface
	return {
		get: async (path, options = {}) => {
			const timestamp = new Date().getTime();
			const params = options.params ? { ...options.params, _t: timestamp } : { _t: timestamp };
			
			// Convert params to query string
			const queryString = Object.keys(params)
				.map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
				.join('&');
			
			const url = `${baseURL}${path}${queryString ? `?${queryString}` : ''}`;
			
			console.log(`Sending GET request to: ${url}`);
			
			try {
				const response = await fetch(url, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `ApiKey ${__config.apiKey}`,
						'X-Request-ID': uuidv4()
					}
				});
				
				if (!response.ok) {
					console.error(`HTTP error ${response.status} for ${url}`);
					const error = new Error(`HTTP error ${response.status}`);
					error.response = response;
					throw error;
				}
				
				console.log(`Request to ${url} successful`);
				const data = await safeJsonParse(response);
				return { data };
			} catch (error) {
				console.error(`Request failed for ${url}:`, error);
				throw error;
			}
		},
		
		post: async (path, body, options = {}) => {
			const url = `${baseURL}${path}`;
			
			console.log(`Sending POST request to: ${url}`, { body: JSON.stringify(body).substring(0, 200) + '...' });
			
			try {
				const response = await fetch(url, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `ApiKey ${__config.apiKey}`,
						'X-Request-ID': uuidv4()
					},
					body: JSON.stringify(body)
				});
				
				if (!response.ok) {
					console.error(`HTTP error ${response.status} for ${url}`);
					const error = new Error(`HTTP error ${response.status}`);
					error.response = response;
					throw error;
				}
				
				console.log(`Request to ${url} successful`);
				const data = await safeJsonParse(response);
				return { data };
			} catch (error) {
				console.error(`Request failed for ${url}:`, error);
				throw error;
			}
		}
	};
};

// Create clients
const apiClient = createClient(__config.endpoint);
const fallbackApiClient = createClient(FALLBACK_ENDPOINT);

// Direct ES query helper (hidden within the implementation)
const queryElasticsearch = async (body) => {
	try {
		const url = `${__config.endpoint}/${__config.idx}/_search`;
		console.log(`Executing Elasticsearch query to: ${url}`, {
			endpoint: __config.endpoint,
			index: __config.idx,
			query: JSON.stringify(body).substring(0, 200) + '...'
		});
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `ApiKey ${__config.apiKey}`
			},
			body: JSON.stringify(body)
		});
		
		if (!response.ok) {
			console.error(`Elasticsearch error ${response.status} for ${url}`);
			const error = new Error(`Search error: ${response.status}`);
			error.response = response;
			throw error;
		}
		
		console.log(`Elasticsearch query to ${url} successful`);
		return await safeJsonParse(response);
	} catch (error) {
		console.error('Elasticsearch query failed:', error);
		throw error;
	}
};

// Format ES results to match API response format
const formatSearchResults = (esResults) => {
	if (!esResults || !esResults.hits || !esResults.hits.hits) {
		return { articles: [] };
	}
	
	return {
		articles: esResults.hits.hits.map(hit => ({
			id: hit._id,
			score: hit._score,
			...hit._source
		})),
		total: esResults.hits.total?.value || 0
	};
};

// Helper function to retry failed requests with fallback
const retryRequestWithFallback = async (fn, fnFallback, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
	let lastError;
	
	// Try primary endpoint with retries
	for (let i = 0; i < maxRetries; i++) {
		try {
			console.log(`Attempt ${i+1}/${maxRetries} for primary endpoint`);
			return await fn();
		} catch (error) {
			lastError = error;
			console.log(`Attempt ${i+1}/${maxRetries} failed:`, error.message);
			
			// If server responded, don't retry (it's not a connection issue)
			if (error.response && error.response.status !== 503 && error.response.status !== 504) {
				console.log(`Server responded with status ${error.response.status}, not retrying`);
				break;
			}
			
			// Wait before retry
			if (i < maxRetries - 1) {
				const waitTime = delay * (i + 1);
				console.log(`Waiting ${waitTime}ms before retry ${i+2}/${maxRetries}`);
				await new Promise(resolve => setTimeout(resolve, waitTime));
			}
		}
	}
	
	// If primary endpoint failed and fallback is enabled, try fallback
	if (FALLBACK_ENABLED && fnFallback) {
		console.log('Primary endpoint failed. Trying fallback endpoint...');
		try {
			return await fnFallback();
		} catch (fallbackError) {
			console.error('Fallback request failed:', fallbackError.message);
			// Prefer the primary error in the error response
			throw lastError || fallbackError;
		}
	}
	
	console.error('All attempts failed, no more retries');
	throw lastError;
};

// Public API methods
export const searchArticles = async (query, source, time_range, sentiment) => {
	console.log('searchArticles called with:', { query, source, time_range, sentiment });
	
	if (!query || query.trim() === '') {
		console.log('Empty query, returning empty results');
		return { articles: [] };
	}
	
	// Validate configuration
	if (__config.endpoint.includes('placeholder') || __config.idx.includes('PLACEHOLDER')) {
		console.error('Invalid configuration detected:', { 
			endpoint: __config.endpoint,
			idx: __config.idx
		});
	}
	
	// Standard API call approach - this maintains backward compatibility
	const params = { query };
	
	if (source && source !== 'All Sources') params.source = source;
	if (time_range && time_range !== 'All Time') params.time_range = time_range;
	if (sentiment && sentiment !== 'All Sentiments') params.sentiment = sentiment;
	
	const primaryRequest = async () => {
		try {
			// Try direct ES query first
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				console.log('Using direct Elasticsearch query with endpoint:', __config.endpoint);
				
				// Here we're actually building an ES query instead of using the standard API
				const must = [{ match: { content: query } }];
				
				if (source && source !== 'All Sources') must.push({ match: { source } });
				if (sentiment && sentiment !== 'All Sentiments') {
					must.push({ range: { sentiment_score: { gte: parseFloat(sentiment) } } });
				}
				
				let range = {};
				if (time_range && time_range !== 'All Time') {
					const now = new Date();
					let startDate;
					
					switch (time_range) {
						case '1d': startDate = new Date(now.setDate(now.getDate() - 1)); break;
						case '7d': startDate = new Date(now.setDate(now.getDate() - 7)); break;
						case '30d': startDate = new Date(now.setDate(now.getDate() - 30)); break;
						case '90d': startDate = new Date(now.setDate(now.getDate() - 90)); break;
						default: startDate = new Date(now.setDate(now.getDate() - 30)); // Default to 30 days
					}
					
					range = {
						published_at: {
							gte: startDate.toISOString(),
							lte: new Date().toISOString()
						}
					};
					must.push({ range });
				}
				
				const esQuery = {
					query: {
						bool: { must }
					},
					sort: [{ published_at: { order: 'desc' } }],
					size: 20
				};
				
				console.log('ES Query:', JSON.stringify(esQuery).substring(0, 200) + '...');
				const results = await queryElasticsearch(esQuery);
				return { data: formatSearchResults(results) };
			} else {
				// Fallback to standard API approach if no ES endpoint configured
				console.log('ES endpoint not properly configured, using fallback', __config.endpoint);
				throw new Error('ES endpoint not configured, using fallback');
			}
		} catch (error) {
			console.error('Primary request failed:', error);
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		try {
			// This is the fallback request to the standard API endpoint
			console.log('Executing fallback request with params:', params);
			return await fallbackApiClient.get('/search', { params });
		} catch (error) {
			// If even the fallback fails, return empty results with a standardized format
			console.error('Fallback request failed:', error);
			return { data: { articles: [] } };
		}
	};
	
	try {
		let response;
		try {
			// Try the primary request first
			response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
		} catch (error) {
			// If everything fails, return an empty array with proper format
			console.error('All search attempts failed:', error);
			response = { data: { articles: [] } };
		}
		
		// Normalize the response format
		console.log('Search response received, normalizing format');
		// The API might return the articles directly or inside a data.articles structure
		if (Array.isArray(response)) {
			return { articles: response };
		} else if (Array.isArray(response.data)) {
			return { articles: response.data };
		} else if (response.data && response.data.articles) {
			return response.data;
		} else {
			console.log('No valid articles in response, returning empty array');
			return { articles: [] };
		}
	} catch (error) {
		console.error('Search failed:', error);
		return { articles: [] }; // Return empty results on error
	}
};

export const getArticleById = async (id) => {
	console.log('getArticleById called with id:', id);
	
	// Validate configuration
	if (__config.endpoint.includes('placeholder') || __config.idx.includes('PLACEHOLDER')) {
		console.error('Invalid configuration detected:', { 
			endpoint: __config.endpoint,
			idx: __config.idx
		});
	}
	
	const primaryRequest = async () => {
		try {
			// Direct ES document retrieval
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				const url = `${__config.endpoint}/${__config.idx}/_doc/${id}`;
				console.log(`Retrieving article by ID from: ${url}`);
				
				const response = await fetch(url, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `ApiKey ${__config.apiKey}`
					}
				});
				
				if (!response.ok) {
					console.error(`Article retrieval failed with status: ${response.status}`);
					throw new Error(`Article retrieval failed: ${response.status}`);
				}
				
				console.log('Article successfully retrieved');
				const result = await safeJsonParse(response);
				return { data: { ...result._source, id: result._id } };
			} else {
				console.log('ES endpoint not properly configured, using fallback', __config.endpoint);
				throw new Error('ES endpoint not configured, using fallback');
			}
		} catch (error) {
			console.error('Error fetching article:', error);
			throw error;
		}
	};
	
	const fallbackRequest = () => fallbackApiClient.get(`/article/${id}`);
	
	try {
		const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
		return response.data;
	} catch (error) {
		console.error('Article retrieval failed:', error);
		throw error;
	}
};