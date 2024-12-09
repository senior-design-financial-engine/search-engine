import React, { useState, useEffect } from 'react';

// Can also be recent articles or articles with high sentiment
function TrendingNews() {
  const [trendingArticles, setTrendingArticles] = useState([]);

  useEffect(() => {
    // Mocking the trending news articles data
    const articles = [
      { url: 'https://example.com/trending1', snippet: 'Trending News 1...' },
      { url: 'https://example.com/trending2', snippet: 'Trending News 2...' },
      { url: 'https://example.com/trending3', snippet: 'Trending News 3...' },
    ];
    setTrendingArticles(articles);
  }, []);

  return (
    <div style={styles.container}>
      <h1>Trending News</h1>
      {trendingArticles.map((article, index) => (
        <div key={index} style={styles.article}>
          <a href={article.url} target="_blank" rel="noopener noreferrer">{article.url}</a>
          <p>{article.snippet}</p>
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px' },
  article: { border: '1px solid #ddd', margin: '10px', padding: '10px' },
};

export default TrendingNews;
