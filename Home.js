// Home.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/results?query=${query}`);
  };

  return (
    <div style={styles.container}>
      <h1>Financial Search Engine</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter your search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={styles.input}
        />
        <button type="submit" style={styles.button}>Search</button>
      </form>

      <div style={styles.advancedQuery}>
        <h2>Advanced Query</h2>
        <div style={styles.queryRow}>
          <input type="text" placeholder="Criterion" style={styles.queryInput} />
          <input type="text" placeholder="Value" style={styles.queryInput} />
        </div>
        <div style={styles.queryRow}>
          <input type="text" placeholder="Criterion" style={styles.queryInput} />
          <input type="text" placeholder="Value" style={styles.queryInput} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px' },
  input: { width: '300px', padding: '10px', margin: '10px' },
  button: { padding: '10px 20px', margin: '10px' },
  advancedQuery: { marginTop: '20px' },
  queryRow: { display: 'flex', justifyContent: 'center', margin: '10px 0' },
  queryInput: { margin: '0 5px', padding: '10px', width: '150px' }
};

export default Home;
