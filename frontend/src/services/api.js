import axios from 'axios';

// Use environment variables with fallbacks
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const IS_PRODUCTION = process.env.REACT_APP_ENV === 'production';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // ms

// Create a custom logger
const apiLogger = {
	log: (message, data) => {
		if (!IS_PRODUCTION) {
			console.log(`[API] ${message}`, data || '');
		}
	},
	error: (message, error) => {
		// Always log errors, even in production
		console.error(`[API ERROR] ${message}`, error);
		
		// Save error details to localStorage for troubleshooting
		try {
			const errorLog = JSON.parse(localStorage.getItem('api_error_log') || '[]');
			errorLog.push({
				timestamp: new Date().toISOString(),
				message,
				error: {
					message: error?.message,
					status: error?.response?.status,
					data: error?.response?.data,
					url: error?.config?.url,
					method: error?.config?.method,
				}
			});
			// Keep only the last 20 errors
			if (errorLog.length > 20) {
				errorLog.shift();
			}
			localStorage.setItem('api_error_log', JSON.stringify(errorLog));
		} catch (e) {
			console.error('Failed to save error log:', e);
		}
	},
	warn: (message, data) => {
		console.warn(`[API WARNING] ${message}`, data || '');
	}
};

// Log API configuration
apiLogger.log('API Configuration:', {
	endpoint: API_BASE_URL,
	environment: IS_PRODUCTION ? 'production' : 'development'
});

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
apiClient.interceptors.request.use(
	(config) => {
		apiLogger.log(`Request: ${config.method?.toUpperCase()} ${config.url}`, 
			config.params ? { params: config.params } : null
		);
		
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
		apiLogger.error('Request configuration error:', error);
		return Promise.reject(error);
	}
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
	(response) => {
		apiLogger.log(`Response from ${response.config.url}:`, { 
			status: response.status,
			data: response.data ? 'Data received' : 'No data'
		});
		return response;
	},
	(error) => {
		if (error.response) {
			// Server responded with error status
			apiLogger.error(`API error (${error.response.status}):`, error);
			
			// Log specific error types
			if (error.response.status === 401 || error.response.status === 403) {
				apiLogger.error('Authentication/authorization error', error.response.data);
			} else if (error.response.status >= 500) {
				apiLogger.error('Server error', error.response.data);
			}
		} else if (error.request) {
			// Request was made but no response received
			apiLogger.error('API request error (no response):', error);
			
			// Check network status
			if (!navigator.onLine) {
				apiLogger.warn('Network is offline. Request failed:', error.config?.url);
			} else {
				// Could be CORS, timeout, or server down
				apiLogger.error('Network request failed (possibly CORS or server down):', {
					url: error.config?.url,
					method: error.config?.method,
					message: error.message
				});
			}
		} else {
			// Something else happened while setting up the request
			apiLogger.error('API setup error:', error);
		}
		return Promise.reject(error);
	}
);

// Helper function to retry failed requests
const retryRequest = async (fn, maxRetries = MAX_RETRIES, delay = RETRY_DELAY) => {
	let lastError = null;
	
	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			if (attempt > 1) {
				apiLogger.log(`Retry attempt ${attempt}/${maxRetries}`);
				// Wait before retrying
				await new Promise(resolve => setTimeout(resolve, delay * (attempt - 1)));
			}
			
			return await fn();
		} catch (error) {
			lastError = error;
			apiLogger.warn(`Request failed (attempt ${attempt}/${maxRetries}):`, error.message);
			
			// Don't retry for certain error types
			if (error.response && (error.response.status === 401 || 
				error.response.status === 403 || 
				error.response.status === 404)) {
				apiLogger.log('Not retrying request due to error type');
				throw error;
			}
		}
	}
	
	// All retries failed
	apiLogger.error(`All ${maxRetries} retry attempts failed.`, lastError);
	throw lastError;
};

// Health check function
export const checkApiHealth = async () => {
	try {
		apiLogger.log('Checking API health');
		// First try the enhanced diagnostic endpoint
		try {
			const response = await apiClient.get('/diagnostic/health');
			return {
				status: response.data.status || 'ok',
				details: response.data
			};
		} catch (error) {
			// Fall back to the basic health endpoint if diagnostic endpoints aren't available
			apiLogger.log('Advanced health check failed, trying basic endpoint');
			const response = await apiClient.get('/health');
			return {
				status: response.data.status || 'ok',
				details: response.data
			};
		}
	} catch (error) {
		apiLogger.error('Health check failed:', error);
		return {
			status: 'error',
			error: error.message,
			online: navigator.onLine
		};
	}
};

export const searchArticles = async (query, source, time_range, sentiment) => {
	try {
		apiLogger.log('Searching articles with query:', { query, source, time_range, sentiment });
		
		// Use the retry mechanism
		const data = await retryRequest(async () => {
			const response = await apiClient.get('/query', {
				params: {
					query,
					source,
					time_range,
					sentiment
				}
			});
			return response.data;
		});
		
		// Log response stats
		apiLogger.log(`Search results received: ${Array.isArray(data) ? data.length : 0} items`);
		
		return data;
	} catch (error) {
		apiLogger.error('Error searching articles:', error);
		throw error;
	}
};

// Add more API functions as needed
export const getArticleById = async (id) => {
	try {
		apiLogger.log(`Fetching article by ID: ${id}`);
		
		const data = await retryRequest(async () => {
			const response = await apiClient.get(`/article/${id}`);
			return response.data;
		});
		
		apiLogger.log('Article fetched successfully');
		return data;
	} catch (error) {
		apiLogger.error(`Error fetching article by ID ${id}:`, error);
		throw error;
	}
};

// Function to get the error logs for debugging
export const getApiErrorLogs = () => {
	try {
		return JSON.parse(localStorage.getItem('api_error_log') || '[]');
	} catch (e) {
		console.error('Failed to retrieve error logs:', e);
		return [];
	}
};

// Function to clear the error logs
export const clearApiErrorLogs = () => {
	try {
		localStorage.removeItem('api_error_log');
		apiLogger.log('API error logs cleared');
	} catch (e) {
		console.error('Failed to clear error logs:', e);
	}
};

// New diagnostic API functions
export const getDiagnosticNetworkInfo = async () => {
	try {
		apiLogger.log('Fetching diagnostic network information');
		const response = await retryRequest(async () => {
			return await apiClient.get('/diagnostic/network');
		});
		return response.data;
	} catch (error) {
		apiLogger.error('Error fetching diagnostic network info:', error);
		throw error;
	}
};

export const getDiagnosticSystemInfo = async () => {
	try {
		apiLogger.log('Fetching diagnostic system information');
		const response = await retryRequest(async () => {
			return await apiClient.get('/diagnostic/system');
		});
		return response.data;
	} catch (error) {
		apiLogger.error('Error fetching diagnostic system info:', error);
		throw error;
	}
};

export const getDiagnosticElasticsearchInfo = async () => {
	try {
		apiLogger.log('Fetching diagnostic Elasticsearch information');
		const response = await retryRequest(async () => {
			return await apiClient.get('/diagnostic/elasticsearch');
		});
		return response.data;
	} catch (error) {
		apiLogger.error('Error fetching diagnostic Elasticsearch info:', error);
		throw error;
	}
};

export const getDiagnosticErrorLogs = async () => {
	try {
		apiLogger.log('Fetching diagnostic error logs');
		const response = await retryRequest(async () => {
			return await apiClient.get('/diagnostic/errors');
		});
		return response.data;
	} catch (error) {
		apiLogger.error('Error fetching diagnostic error logs:', error);
		throw error;
	}
};

export const getFullDiagnosticReport = async () => {
	try {
		apiLogger.log('Fetching full diagnostic report');
		try {
			const response = await retryRequest(async () => {
				return await apiClient.get('/diagnostic/report');
			});
			return response.data;
		} catch (error) {
			apiLogger.warn('Real diagnostic endpoint failed, returning mock data for development:', error);
			
			// Return mock data for development/testing when the real endpoint fails
			// This helps with debugging the UI when the backend is not available
			return {
				timestamp: new Date().toISOString(),
				system: {
					hostname: 'development-host',
					platform: 'mock-os',
					platform_version: '1.0',
					python_version: '3.9.0',
					cpu: {
						percent: 45,
						count: 4
					},
					memory: {
						total: 8000000000,
						used: 4000000000,
						percent_used: 50
					},
					disk: {
						total: 100000000000,
						used: 60000000000,
						percent_used: 60
					},
					uptime: {
						system: 3600,
						process: 1800
					}
				},
				elasticsearch: {
					success: false,
					error: "Mock error: Could not connect to Elasticsearch",
					elasticsearch_url: "http://localhost:9200",
					ping: {
						success: false,
						packets_sent: 5,
						packets_received: 0,
						packet_loss_percent: 100
					},
					connection: {
						success: false,
						status_code: null,
						dns_resolved: true,
						ip_address: "127.0.0.1",
						total_latency_ms: null,
						error: "Connection refused"
					},
					query: {
						success: false,
						status_code: null,
						hit_count: null,
						error: "Could not execute query due to connection failure"
					}
				},
				recent_errors: [
					{
						timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
						level: "ERROR",
						message: "Mock error: Failed to connect to Elasticsearch",
						exception: {
							type: "ConnectionError",
							value: "Connection refused",
							traceback: [
								"Traceback (most recent call last):",
								"  File \"app/backend.py\", line 120, in _test_elasticsearch_connection",
								"    self.es.ping()",
								"  File \"elasticsearch/client/utils.py\", line 152, in _wrapped",
								"    return func(*args, **kwargs)",
								"  File \"elasticsearch/client/__init__.py\", line 350, in ping",
								"    return self.transport.perform_request(",
								"  File \"elasticsearch/transport.py\", line 415, in perform_request",
								"    raise ConnectionError(\"N/A\", str(e), e)"
							]
						}
					},
					{
						timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
						level: "WARNING",
						message: "Mock warning: High memory usage detected",
						raw: "Memory usage above 80%"
					}
				],
				network: {
					tests: {
						"elasticsearch:9200": {
							ping: {
								success: false,
								packet_loss_percent: 100,
								error: "Host unreachable"
							},
							http: {
								success: false,
								status_code: null,
								total_latency_ms: null,
								error: "Connection refused"
							}
						},
						"api.example.com": {
							ping: {
								success: true,
								packet_loss_percent: 0,
								avg_latency_ms: 45.2,
								min_latency_ms: 42.1,
								max_latency_ms: 50.3
							},
							http: {
								success: true,
								status_code: 200,
								total_latency_ms: 120.5
							},
							traceroute: {
								success: true,
								reached_destination: true
							}
						}
					}
				}
			};
		}
	} catch (error) {
		apiLogger.error('Error fetching full diagnostic report:', error);
		throw error;
	}
};