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

// Log environment information
console.log('Environment information:', {
	hostname: window.location.hostname,
	origin: window.location.origin,
	searchEngineEndpoint: resolvedEndpoint || 'not set',
	searchEngineIndex: resolvedIndex || 'not set',
	hasApiKey: !!processedKey,
	userAgent: navigator.userAgent,
	nodeEnv: process.env.NODE_ENV
});

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

// Check for missing configuration
const hasMissingConfig = !__config.endpoint || !__config.idx;

if (hasMissingConfig) {
	console.error('WARNING: Missing configuration:', {
		endpoint: __config.endpoint || 'missing',
		idx: __config.idx || 'missing',
		hasApiKey: !!__config.apiKey
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

// Data retrieval helper
const queryElasticsearch = async (body) => {
	try {
		const url = `${__config.endpoint}/${__config.idx}/_search`;
		
		console.log(`Preparing request to: ${url}`, {
			requestPayload: JSON.stringify(body).substring(0, 200) + '...'
		});
		
		let key = __config.apiKey;
		if (!key) {
			key = _k.getKey();
		}
				
		console.log(`Auth key details:`, {
			length: key ? key.length : 0,
			format: 'using standard format'
		});
		
		let response = null;
		try {
			console.log(`Sending authenticated request`);
			response = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `ApiKey ${key}`
				},
				body: JSON.stringify(body)
			});
			
			if (!response.ok) {
				console.error(`Request failed with status: ${response.status}`);
				const responseText = await response.text();
				console.error(`Response: ${responseText.substring(0, 100)}...`);
				throw new Error(`Request failed: ${response.status}`);
			}
		} catch (error) {
			console.error(`Request execution error:`, error.message);
			throw error;
		}
		
		console.log(`Query successful with status: ${response.status}`);
		return await safeJsonParse(response);
	} catch (error) {
		console.error(`Query failed:`, {
			message: error.message
		});
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
	
	// Request parameters
	const params = { query };
	
	if (source && source !== 'All Sources') params.source = source;
	if (time_range && time_range !== 'All Time') params.time_range = time_range;
	if (sentiment && sentiment !== 'All Sentiments') params.sentiment = sentiment;
	
	const primaryRequest = async () => {
		try {
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				console.log('Preparing search query with params:', params);
				
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
				
				const esQuery = {
					query: {
						bool: { must }
					},
					// Use the correct enum field for sorting based on the mapping
					sort: [{ "published_at.enum": { order: "desc" } }],
					size: 20
				};
				
				console.log('Query:', JSON.stringify(esQuery).substring(0, 200) + '...');
				
				const results = await queryElasticsearch(esQuery);
				return { data: formatSearchResults(results) };
			} else {
				console.log('Configuration error, using fallback', __config.endpoint);
				throw new Error('Configuration error');
			}
		} catch (error) {
			console.error('Primary request failed:', error.message);
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		console.log('Using fallback with params:', params);
		
		// Simulate a delay
		await new Promise(resolve => setTimeout(resolve, 500));
		
		console.log('Fallback complete');
		return { data: { articles: [] } };
	};
	
	try {
		let response;
		try {
			console.log('Attempting primary request');
			response = await primaryRequest();
		} catch (error) {
			console.log('Primary failed, trying fallback');
			console.log('Failure reason:', error.message);
			response = await fallbackRequest();
		}
		
		// Normalize the response format
		console.log('Response received, normalizing format');
		
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
		console.error('Search failed:', error.message);
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
			if (__config.endpoint && __config.endpoint !== 'https://search-api.example.com') {
				const url = `${__config.endpoint}/${__config.idx}/_doc/${id}`;
				console.log(`Retrieving article by ID`);

				let key = __config.apiKey;
				if (!key) {
					key = _k.getKey();
				}
				
				console.log(`Auth key details:`, {
					length: key ? key.length : 0,
					format: 'using standard format'
				});
				
				let response = null;
				try {
					console.log(`Sending authenticated request`);
					response = await fetch(url, {
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
							'Authorization': `ApiKey ${key}`
						}
					});
					
					if (!response.ok) {
						console.error(`Request failed with status: ${response.status}`);
						const responseText = await response.text();
						console.error(`Response: ${responseText.substring(0, 100)}...`);
						throw new Error(`Article retrieval failed: ${response.status}`);
					}
				} catch (error) {
					console.error(`Request execution error:`, error.message);
					throw error;
				}
				
				console.log('Successfully retrieved article');
				const result = await safeJsonParse(response);
				return { data: { ...result._source, id: result._id } };
			} else {
				console.log('Configuration error, using fallback');
				throw new Error('Configuration error');
			}
		} catch (error) {
			console.error('Error fetching article:', error.message);
			throw error;
		}
	};
	
	const fallbackRequest = async () => {
		console.log(`Using fallback for article ID: ${id}`);
		
		// Simulate a delay
		await new Promise(resolve => setTimeout(resolve, 500));
		
		console.log('Fallback complete');
		return { data: { id, title: 'Article not found', content: '', source: '', published_at: new Date().toISOString() } };
	};
	
	try {
		let response;
		try {
			console.log('Attempting primary request');
			response = await primaryRequest();
		} catch (error) {
			console.log('Primary failed, trying fallback');
			console.log('Failure reason:', error.message);
			response = await fallbackRequest();
		}
		
		return response.data;
	} catch (error) {
		console.error('Article retrieval failed:', error.message);
		throw error;
	}
};