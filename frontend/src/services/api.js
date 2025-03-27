import axios from 'axios';

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

// Create fallback API client
const fallbackApiClient = createApiClient(API_FALLBACK_URL);

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
	const params = { query };
	
	if (source) params.source = source;
	if (time_range) params.time_range = time_range;
	if (sentiment) params.sentiment = sentiment;
	
	const primaryRequest = () => apiClient.get('/search', { params });
	const fallbackRequest = () => fallbackApiClient.get('/search', { params });
	
	const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
	return response.data;
};

export const getArticleById = async (id) => {
	const primaryRequest = () => apiClient.get(`/article/${id}`);
	const fallbackRequest = () => fallbackApiClient.get(`/article/${id}`);
	
	const response = await retryRequestWithFallback(primaryRequest, fallbackRequest);
	return response.data;
};