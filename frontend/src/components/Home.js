// src/components/Home.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './../styles/Home.css';

function Home() {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();
  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/results?query=${query}`);
  };
  return (
    <div className="container">
      <h1>Financial Search Engine</h1>
      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter your search query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="input"
        />
        <button type="submit" className="button">Search</button>
      </form>
      <div className="advancedQuery">
        <h2>Advanced Query</h2>
        <div className="queryRow">
          <input type="text" placeholder="Criterion" className="queryInput" />
          <input type="text" placeholder="Value" className="queryInput" />
        </div>
        <div className="queryRow">
          <input type="text" placeholder="Criterion" className="queryInput" />
          <input type="text" placeholder="Value" className="queryInput" />
        </div>
      </div>
    </div>
  );
}

export default Home;