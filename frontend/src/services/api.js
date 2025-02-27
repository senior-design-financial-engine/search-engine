import axios from 'axios';

// Use environment variable with fallback to development URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

console.log('Using API endpoint:', API_BASE_URL);

export const searchArticles = async (query, source, time_range) => {
	try {
		const response = await axios.get(`${API_BASE_URL}/query`, {
				params: {
					query,
					source,
					time_range
				}
			}
		);
		return response.data;
	} catch (error) {
		console.error('Error searching articles:', error);
		throw error;
	}
};