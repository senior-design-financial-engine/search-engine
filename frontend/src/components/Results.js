import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';

function Results() {
  const location = useLocation();
  const url_params = new URLSearchParams(location.search);
  const query = url_params.get('query');
  const source = url_params.get('source');
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (query) {
          const searchResults = await searchArticles(query, source);
          setResults(searchResults);
        } else {
          // Mock data for testing
          setResults([
            {
              _source: {
                url: 'https://example.com/article1',
                headline: 'Bitcoin Reaches New All-Time High',
                sentiment: 'positive',
                published_at: '2024-03-20'
              }
            },
            {
              _source: {
                url: 'https://example.com/article2',
                headline: 'Tech Stocks Show Strong Performance in Q1',
                sentiment: 'positive',
                published_at: '2024-03-19'
              }
            },
            {
              _source: {
                url: 'https://example.com/article3',
                headline: 'Global Markets Analysis: Economic Trends',
                sentiment: 'neutral',
                published_at: '2024-03-18'
              }
            }
          ]);
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
      }
    };

    fetchResults();
  }, [query, source]);

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Container className="mt-5">
      <Button variant="secondary" onClick={handleBack} className="mt-3">
        Back
      </Button>

      <h1>Results for: <b><i>{query || "Test Query"}</i></b></h1>

      <Row>
        {results.map((result, index) => (
          <Col md={4} key={index}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>
                  <a href={result._source.url} target="_blank" rel="noopener noreferrer">
                    {result._source.url}
                  </a>
                </Card.Title>
                <Card.Text>{result._source.headline}</Card.Text>
                <Card.Subtitle className="text-muted">
                  Sentiment: {result._source.sentiment} | Date: {result._source.published_at}
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
