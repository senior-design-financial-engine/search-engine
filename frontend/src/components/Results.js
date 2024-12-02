import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Button, Dropdown } from 'react-bootstrap';

function Results() {
  const location = useLocation();
  const url_params = new URLSearchParams(location.search)

  // get query info
  const query = url_params.get('query');
  url_params.delete('query')

  // get all filters
  const source = url_params.get('source')
  
  const [results, setResults] = useState([]);
  const navigate = useNavigate();


  console.log("FETCHING RESULTS")
  useEffect(() => {
    const fetchResults = async () => {
      try {
        if (query) {
          const searchResults = await searchArticles(query, source);
          setResults(searchResults);
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
      }
    };

    fetchResults();
  }, [query, source]);

  const handleBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  return (
    <Container className="mt-5">
      <Button variant="secondary" onClick={handleBack} className="mt-3">
        Back
      </Button>

      <h1>Results for: <b><i>"{query}</i></b>"</h1>

      <Row>
        {results.map((result, index) => (
          <Col md={4} key={index}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>
                  <a href={result._source.url} target="_blank" rel="noopener noreferrer">{result._source.url}</a>
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
