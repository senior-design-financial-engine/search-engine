import axios from 'axios';

// Use environment variables with fallbacks
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const IS_PRODUCTION = process.env.REACT_APP_ENV === 'production';

// Log API configuration only in development
if (!IS_PRODUCTION) {
	console.log('API Configuration:', {
		endpoint: API_BASE_URL,
		environment: IS_PRODUCTION ? 'production' : 'development'
	});
}

// Configure axios defaults
axios.defaults.timeout = 15000; // 15 seconds timeout

// Create axios instance with proper configuration for production
const apiClient = axios.create({
	baseURL: API_BASE_URL,
	headers: {
		'Content-Type': 'application/json'
	}
});

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		if (error.response) {
			// Server responded with error status
			if (error.response.status === 503) {
				// Service unavailable
				console.warn('API unavailable');
				return Promise.reject(error);
			}
		}
		return Promise.reject(error);
	}
);

export const searchArticles = async (query, source, time_range, sentiment) => {
	try {
		const response = await apiClient.get('/query', {
			params: {
				query,
				source,
				time_range,
				sentiment
			}
		});
		return response.data;
	} catch (error) {
		console.error('Error searching articles:', error);
		throw error;
	}
};

// Add more API functions as needed
export const getArticleById = async (id) => {
	try {
		const response = await apiClient.get(`/article/${id}`);
		return response.data;
	} catch (error) {
		console.error('Error fetching article by ID:', error);
		throw error;
	}
};