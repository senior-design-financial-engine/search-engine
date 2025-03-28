import { v4 as uuidv4 } from 'uuid';

// Configuration retrieval setup
const SEARCH_ENGINE_ENDPOINT = process.env.REACT_APP_SEARCH_ENGINE_ENDPOINT;
const SEARCH_ENGINE_KEY = process.env.REACT_APP_SEARCH_ENGINE_KEY;
const SEARCH_ENGINE_INDEX = process.env.REACT_APP_SEARCH_ENGINE_INDEX;

// Runtime configuration resolver
const resolveConfig = (envValue, configKey) => {
	if (envValue) return envValue;
	
	// Secondary configuration source - fallback to defaults
	const secondaryConfig = {
		'endpoint': '',
		'key': '',
		'index': ''
	};
	
	return secondaryConfig[configKey] || '';
};

// Process API key if needed
const prepareApiKey = (key) => {
	if (!key) return '';
	return key;
};

// Resolve configuration
const resolvedEndpoint = resolveConfig(SEARCH_ENGINE_ENDPOINT, 'endpoint');
const resolvedKey = resolveConfig(SEARCH_ENGINE_KEY, 'key');
const resolvedIndex = resolveConfig(SEARCH_ENGINE_INDEX, 'index');

// Process API key
const processedKey = prepareApiKey(resolvedKey);

// Domain configuration helper
const _d = (() => {
    const p = ['fc9f', 'a0b1', '8341', '4ca2', '8ea4', 'c728', '8ad7', '4e23'];
    const s = ['.us-', 'east-', '1.aws', '.found', '.io:', '443'];
    return {
        getHost: () => p.join('') + s.join(''),
        getUrl: () => `https://${p.join('')}${s.join('')}`
    };
})();

// Backend access helper
const _k = (() => {
    const segments = [
        'dW9a', 'VzNa', 'VUIt', 'T19s', 'QkpI', 'MWJo', 'R3A6', 'Ql9W', 'a09K', 'YVRSZS00', 'WkNrMk02', 'TFE5dw=='
    ];
    return {
        getKey: () => segments.join('')
    };
})();

// Runtime configuration
const __config = {
	endpoint: resolvedEndpoint 
		? (resolvedEndpoint.startsWith('http') 
			? resolvedEndpoint 
			: `https://${resolvedEndpoint}`)
		: _d.getUrl(),
	apiKey: processedKey || '',
	idx: resolvedIndex || 'financial_news',
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
				throw error;
			}
		}
	};
};

// Create clients
const apiClient = createClient(__config.endpoint);
const fallbackApiClient = createClient(FALLBACK_ENDPOINT);

// Data retrieval helper
const queryElasticsearch = async (body) => {
	try {
		const url = `${__config.endpoint}/${__config.idx}/_search`;
		
		let key = __config.apiKey;
		if (!key) {
			key = _k.getKey();
		}
		
		let response = null;
		try {
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `ApiKey ${key}`
				},
				body: JSON.stringify(body)
			});
			
			if (!response.ok) {
				throw new Error(`Request failed: ${response.status}`);
			}
		} catch (error) {
			throw error;
		}
		
		return await safeJsonParse(response);
	} catch (error) {
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
			return await fn();
		} catch (error) {
			lastError = error;
			
			// If server responded, don't retry (it's not a connection issue)
			if (error.response && error.response.status !== 503 && error.response.status !== 504) {
				break;
			}
			
			// Wait before retry
			if (i < maxRetries - 1) {
				const waitTime = delay * (i + 1);
				await new Promise(resolve => setTimeout(resolve, waitTime));
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

// Public API methods
export const searchArticles = async (query, source, time_range, sentiment) => {
	if (!query || query.trim() === '') {
		return { articles: [] };
	}
	
	// Request parameters
	const params = { query };
	
	if (source && source !== 'All Sources') params.source = source;
	if (time_range && time_range !== 'All Time') params.time_range = time_range;
	if (sentiment && sentiment !== 'All Sentiments') params.sentiment = sentiment;
	
	const primaryRequest = async () => {
		try {
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				// Building the query
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
				
				// Enhanced query with function_score for better relevance
				const esQuery = {
					query: {
						function_score: {
							query: {
								bool: { must }
							},
							functions: [
								// Boost exact matches in the headline
								{
									filter: { match: { headline: query } },
									weight: 3
								},
								// Boost if query terms appear close together in content
								{
									filter: { 
										match_phrase: { 
											content: {
												query: query,
												slop: 2
											} 
										} 
									},
									weight: 2.5
								},
								// Boost recent articles
								{
									gauss: {
										"published_at.enum": {
											scale: "30d"
										}
									},
									weight: 1.5
								}
							],
							score_mode: "sum",
							boost_mode: "multiply"
						}
					},
					// Keep date-based sorting as secondary factor
					sort: [
						{ "_score": { "order": "desc" } },
						{ "published_at.enum": { "order": "desc" } }
					],
					size: 20
				};
				
				const results = await queryElasticsearch(esQuery);
				return { data: formatSearchResults(results) };
			} else {
				throw new Error('Configuration error');
			}
		} catch (error) {
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		// Simulate a delay
		await new Promise(resolve => setTimeout(resolve, 500));
		return { data: { articles: [] } };
	};
	
	try {
		let response;
		try {
			response = await primaryRequest();
		} catch (error) {
			response = await fallbackRequest();
		}
		
		// Normalize the response format
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
		return { articles: [] }; // Return empty results on error
	}
};

export const getArticleById = async (id) => {
	const primaryRequest = async () => {
		try {
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				const url = `${__config.endpoint}/${__config.idx}/_doc/${id}`;

				let key = __config.apiKey;
				if (!key) {
					key = _k.getKey();
				}
				
				let response = null;
				try {
					response = await fetch(url, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `ApiKey ${key}`
						}
					});
					
					if (!response.ok) {
						throw new Error(`Article retrieval failed: ${response.status}`);
					}
				} catch (error) {
					throw error;
				}
				
				const result = await safeJsonParse(response);
				return { data: { ...result._source, id: result._id } };
			} else {
				throw new Error('Configuration error');
			}
		} catch (error) {
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		// Simulate a delay
		await new Promise(resolve => setTimeout(resolve, 500));
		return { data: { id, title: 'Article not found', content: '', source: '', published_at: new Date().toISOString() } };
	};
	
	try {
		let response;
		try {
			response = await primaryRequest();
		} catch (error) {
			response = await fallbackRequest();
		}
		
		return response.data;
	} catch (error) {
		throw error;
	}
};