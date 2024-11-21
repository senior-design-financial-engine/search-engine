import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000'; // Replace with your backend URL

export const searchArticles = async (query, criterion) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/query`, {
            query,
            criterion
        });
        return response.data;
    } catch (error) {
        console.error('Error searching articles:', error);
        throw error;
    }
};