import axios from 'axios';
import * as mockApi from './mockApi';

// Use environment variables with fallbacks
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true';
const IS_PRODUCTION = process.env.REACT_APP_ENV === 'production';

// Log API configuration only in development
if (!IS_PRODUCTION) {
	console.log('API Configuration:', {
		endpoint: USE_MOCK_API ? 'MOCK API' : API_BASE_URL,
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
			if (error.response.status === 503 && USE_MOCK_API !== 'true') {
				// Service unavailable - could automatically fall back to mock data
				console.warn('API unavailable, falling back to mock data');
				return Promise.resolve({ data: [], mockFallback: true });
			}
		}
		return Promise.reject(error);
	}
);

export const searchArticles = async (query, source, time_range, sentiment) => {
	// If mock API is enabled, use it instead of the real API
	if (USE_MOCK_API) {
		return mockApi.searchArticles(query, source, time_range, sentiment);
	}
	
	// Otherwise use the real API
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
		
		// In production, if API fails, optionally fall back to mock data
		if (IS_PRODUCTION && error.message === 'Network Error') {
			console.warn('API network error, using mock data fallback');
			return mockApi.searchArticles(query, source, time_range, sentiment);
		}
		
		throw error;
	}
};

// Add more API functions as needed
export const getArticleById = async (id) => {
	if (USE_MOCK_API) {
		return mockApi.getArticleById(id);
	}
	
	try {
		const response = await apiClient.get(`/article/${id}`);
		return response.data;
	} catch (error) {
		console.error('Error fetching article by ID:', error);
		
		// In production, if API fails, fall back to mock data for that article
		if (IS_PRODUCTION && error.message === 'Network Error') {
			console.warn('API network error, using mock data fallback for article');
			return mockApi.getArticleById(id);
		}
		
		throw error;
	}
};