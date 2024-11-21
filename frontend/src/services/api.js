import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Replace with your backend URL

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