import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Dropdown } from 'react-bootstrap';

function Results() {
  const location = useLocation();
  const query = new URLSearchParams(location.search).get('query');
  const [sortBy, setSortBy] = useState('Relevance');
  const navigate = useNavigate();

  const mockResults = [
    { url: 'https://example.com/1', snippet: 'Result 1 summary...', sentiment: 'Positive', date: '2024-11-01' },
    { url: 'https://example.com/2', snippet: 'Result 2 summary...', sentiment: 'Neutral', date: '2024-11-02' },
    { url: 'https://example.com/3', snippet: 'Result 3 summary...', sentiment: 'Negative', date: '2024-11-03' },
  ];

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
        {mockResults.map((result, index) => (
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
