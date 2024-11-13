// Favorites.js
import React, { useState } from 'react';

function Favorites() {
  const [favorites, setFavorites] = useState([]);

  // Sample list of favorite articles for now
  React.useEffect(() => {
    const savedFavorites = JSON.parse(localStorage.getItem('favorites')) || [];
    setFavorites(savedFavorites);
  }, []);

  return (
    <div style={styles.container}>
      <h1>Your Favorite Articles</h1>
      {favorites.length === 0 ? (
        <p>No favorite articles yet.</p>
      ) : (
        favorites.map((article, index) => (
          <div key={index} style={styles.article}>
            <a href={article.url} target="_blank" rel="noopener noreferrer">{article.url}</a>
            <p>{article.snippet}</p>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px' },
  article: { border: '1px solid #ddd', margin: '10px', padding: '10px' },
};

export default Favorites;
