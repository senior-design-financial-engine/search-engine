import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Dropdown } from 'react-bootstrap';

function Results() {
  const location = useLocation();
  const url_params = new URLSearchParams(location.search)
  const query = url_params.get('query');
  const filters = url_params.get('filters');
  const time_range = url_params.get('time_range');
  const [sortBy, setSortBy] = useState('Relevance');
  const [results, setResults] = useState([]);
  // const navigate = useNavigate();

  // FAKED RESULTS 
  // const mockResults = [
  //   { url: 'https://example.com/1', snippet: 'Result 1 summary...', sentiment: 'Positive', date: '2024-11-01' },
  //   { url: 'https://example.com/2', snippet: 'Result 2 summary...', sentiment: 'Neutral', date: '2024-11-02' },
  //   { url: 'https://example.com/3', snippet: 'Result 3 summary...', sentiment: 'Negative', date: '2024-11-03' },
  // ];

  console.log("FETCHING RESULTS")
  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (query) {
          const searchResults = await searchArticles(query, filters, time_range);
          setResults(searchResults);
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
      }
    };

    fetchResults();
  }, [query, filters, time_range]);


  const handleSortChange = (value) => setSortBy(value);

  return (
    <Container className="mt-5">
      <h1>Results for: "{query}"</h1>

      <Dropdown className="mb-3">
        <Dropdown.Toggle variant="secondary">Sort by: {sortBy}</Dropdown.Toggle>
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => handleSortChange('Relevance')}>Relevance</Dropdown.Item>
          <Dropdown.Item onClick={() => handleSortChange('Date')}>Date</Dropdown.Item>
          <Dropdown.Item onClick={() => handleSortChange('Sentiment')}>Sentiment</Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>

      <Row>
        {results.map((result, index) => (
          <Col md={4} key={index}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>
                  <a href={result.url} target="_blank" rel="noopener noreferrer">{result.url}</a>
                </Card.Title>
                <Card.Text>{result.snippet}</Card.Text>
                <Card.Subtitle className="text-muted">
                  Sentiment: {result.sentiment} | Date: {result.date}
                </Card.Subtitle>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default Results;
