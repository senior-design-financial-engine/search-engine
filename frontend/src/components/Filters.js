import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Filters() {
  const [region, setRegion] = useState('');
  const [source, setSource] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  // Companies, Industries, Sentiment
  const navigate = useNavigate();

  const handleApplyFilters = (e) => {
    e.preventDefault();
    navigate(`/results?region=${region}&source=${source}&startDate=${startDate}&endDate=${endDate}`);
  };

  return (
    <div style={styles.container}>
      <h1>Apply Filters</h1>
      <form onSubmit={handleApplyFilters}>
        <div style={styles.filterRow}>
          <label style={styles.label}>Region:</label>
          <input
            type="text"
            placeholder="Enter region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.filterRow}>
          <label style={styles.label}>Source:</label>
          <input
            type="text"
            placeholder="Enter source (e.g., Bloomberg)"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.filterRow}>
          <label style={styles.label}>Start Date:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <div style={styles.filterRow}>
          <label style={styles.label}>End Date:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <button type="submit" style={styles.button}>Apply Filters</button>
      </form>
    </div>
  );
}

const styles = {
  container: { textAlign: 'center', marginTop: '50px' },
  filterRow: { display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '10px 0' },
  label: { marginRight: '10px' },
  input: { padding: '10px', width: '200px' },
  button: { padding: '10px 20px', marginTop: '20px' },
};

export default Filters;
