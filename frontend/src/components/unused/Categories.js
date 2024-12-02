// Categories.js
import React from 'react';
import { useNavigate } from 'react-router-dom';

function Categories() {
  const navigate = useNavigate();

  const handleCategoryClick = (category) => {
    navigate(`/results?category=${category}`);
  };

  return (
    <div style={styles.container}>
      <h1>News Categories</h1>
      <div style={styles.categories}>
        {['Stock News', 'Economic Trends', 'Cryptocurrency', 'Global Markets', 'Startups'].map((category) => (
          <button key={category} onClick={() => handleCategoryClick(category)} style={styles.categoryButton}>
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px' },
  categories: { display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '10px' },
  categoryButton: { padding: '15px', fontSize: '16px', cursor: 'pointer' },
};

export default Categories;
