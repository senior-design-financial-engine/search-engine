// Results.js
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './../styles/Results.css'

function Results() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('query');
  const navigate = useNavigate();

  const mockResults = [
    { url: 'https://example.com/1', snippet: 'Result 1 summary...', sentiment: 'Positive' },
    { url: 'https://example.com/2', snippet: 'Result 2 summary...', sentiment: 'Neutral' },
    { url: 'https://example.com/3', snippet: 'Result 3 summary...', sentiment: 'Negative' },
  ];

  return (
    <div style={styles.container}>
      <h1>Results for: "{query}"</h1>
      {mockResults.map((result, index) => (
        <div key={index} style={styles.resultItem}>
          <a href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
          <p>{result.snippet}</p>
          <span>Sentiment: {result.sentiment}</span>
        </div>
      ))}
      <div style={styles.pagination}>
        <button onClick={() => navigate('/')}>Previous Page</button>
        <button>Next Page</button>
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px' },
  resultItem: { border: '1px solid #ddd', margin: '10px', padding: '10px' },
  pagination: { marginTop: '20px' },
};

export default Results;
