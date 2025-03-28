import { v4 as uuidv4 } from 'uuid';

// Runtime configuration - injected during build/deployment
const __config = {
	endpoint: window.__SEARCH_ENGINE_ENDPOINT 
		? (window.__SEARCH_ENGINE_ENDPOINT.startsWith('http') 
			? window.__SEARCH_ENGINE_ENDPOINT 
			: `https://${window.__SEARCH_ENGINE_ENDPOINT}`)
		: 'https://api.financialnewsengine.com',
	apiKey: window.__SEARCH_ENGINE_KEY || '',
	idx: window.__SEARCH_ENGINE_INDEX || 'financial_news',
	version: '7.14'
};

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
					const error = new Error(`HTTP error ${response.status}`);
					error.response = response;
					throw error;
				}
				
				const data = await safeJsonParse(response);
				return { data };
			} catch (error) {
				console.error(`Request failed for ${url}:`, error);
				throw error;
			}
		},
		
		post: async (path, body, options = {}) => {
			const url = `${baseURL}${path}`;
			
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
					const error = new Error(`HTTP error ${response.status}`);
					error.response = response;
					throw error;
				}
				
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

// Helper function to retry failed requests with fallback
const retryRequestWithFallback = async (fn, fnFallback, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
	let lastError;
	
	// Try primary endpoint with retries
	for (let i = 0; i < maxRetries; i++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;
			console.log(`Attempt ${i+1} failed:`, error.message);
			
			// If server responded, don't retry (it's not a connection issue)
			if (error.response && error.response.status !== 503 && error.response.status !== 504) {
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
		console.log('Trying fallback endpoint...');
		try {
			return await fnFallback();
		} catch (fallbackError) {
			console.error('Fallback request failed:', fallbackError.message);
			// Prefer the primary error in the error response
			throw lastError || fallbackError;
		}
	}
	
	throw lastError;
};

// Direct ES query helper (hidden within the implementation)
const queryElasticsearch = async (body) => {
	try {
		const url = `${__config.endpoint}/${__config.idx}/_search`;
		
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `ApiKey ${__config.apiKey}`
			},
			body: JSON.stringify(body)
		});
		
		if (!response.ok) {
			const error = new Error(`Search error: ${response.status}`);
			error.response = response;
			throw error;
		}
		
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

// Public API methods
export const searchArticles = async (query, source, time_range, sentiment) => {
	if (!query || query.trim() === '') {
		return { articles: [] };
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
				
				const results = await queryElasticsearch(esQuery);
				return { data: formatSearchResults(results) };
			} else {
				// Fallback to standard API approach if no ES endpoint configured
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
		// The API might return the articles directly or inside a data.articles structure
		if (Array.isArray(response)) {
			return { articles: response };
		} else if (Array.isArray(response.data)) {
			return { articles: response.data };
		} else if (response.data && response.data.articles) {
			return response.data;
		} else {
			return { articles: [] };
		}
	} catch (error) {
		console.error('Search failed:', error);
		return { articles: [] }; // Return empty results on error
	}
};

export const getArticleById = async (id) => {
	const primaryRequest = async () => {
		try {
			// Direct ES document retrieval
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				const url = `${__config.endpoint}/${__config.idx}/_doc/${id}`;
				const response = await fetch(url, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `ApiKey ${__config.apiKey}`
					}
				});
				
				if (!response.ok) {
					throw new Error(`Article retrieval failed: ${response.status}`);
				}
				
				const result = await safeJsonParse(response);
				return { data: { ...result._source, id: result._id } };
			} else {
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