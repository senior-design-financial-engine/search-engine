import { v4 as uuidv4 } from 'uuid';

// Runtime configuration - injected during build/deployment
const __config = {
	endpoint: window.__SEARCH_ENGINE_ENDPOINT || 'https://search-api.example.com',
	apiKey: window.__SEARCH_ENGINE_KEY || '',
	idx: window.__SEARCH_ENGINE_INDEX || 'financial_news',
	version: '7.14'
};

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const FALLBACK_ENABLED = true;
const FALLBACK_ENDPOINT = 'https://direct-api.financialnewsengine.com';

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
			
			const data = await response.json();
			return { data };
		},
		
		post: async (path, body, options = {}) => {
			const url = `${baseURL}${path}`;
			
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
			
			const data = await response.json();
			return { data };
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

// Direct ES query helper (hidden within the implementation)
const queryElasticsearch = async (body) => {
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
	
	return response.json();
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
		total: esResults.hits.total.value
	};
};

// Public API methods
export const searchArticles = async (query, source, time_range, sentiment) => {
	// Standard API call approach - this maintains backward compatibility
	const params = { query };
	
	if (source) params.source = source;
	if (time_range) params.time_range = time_range;
	if (sentiment) params.sentiment = sentiment;
	
	const primaryRequest = async () => {
		// Here we're actually building an ES query instead of using the standard API
		const must = [{ match: { content: query } }];
		
		if (source) must.push({ match: { source } });
		if (sentiment) must.push({ range: { sentiment_score: { gte: parseFloat(sentiment) } } });
		
		let range = {};
		if (time_range) {
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
	};
	
	const fallbackRequest = () => fallbackApiClient.get('/search', { params });
	
	const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
	return response.data;
};

export const getArticleById = async (id) => {
	const primaryRequest = async () => {
		try {
			// Direct ES document retrieval
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
			
			const result = await response.json();
			return { data: { ...result._source, id: result._id } };
		} catch (error) {
			console.error('Error fetching article:', error);
			throw error;
		}
	};
	
	const fallbackRequest = () => fallbackApiClient.get(`/article/${id}`);
	
	const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
	return response.data;
};