import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Button, Badge, Spinner } from 'react-bootstrap';

function Results() {
  const location = useLocation();
  const url_params = new URLSearchParams(location.search)

  // get query info
  const query = url_params.get('query');
  url_params.delete('query')

  // get all filters
  const source = url_params.get('source')
  const timeRange = url_params.get('time_range')
  const sentiment = url_params.get('sentiment')
  
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (query) {
          const searchResults = await searchArticles(query, source, timeRange, sentiment);
          setResults(searchResults);
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
        setError('Failed to fetch search results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, source, timeRange, sentiment]);

  const handleBack = () => {
    navigate(-1); // Navigate back to the previous page
  };

  // Helper function to format date
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return dateString;
    }
  };

  // Helper function to determine badge color based on sentiment
  const getSentimentBadgeVariant = (sentiment) => {
    if (!sentiment) return 'secondary';
    
    switch(sentiment.toLowerCase()) {
      case 'positive':
        return 'success';
      case 'negative':
        return 'danger';
      case 'neutral':
        return 'info';
      default:
        return 'secondary';
    }
  };

  return (
    <Container className="mt-5">
      <Button variant="secondary" onClick={handleBack} className="mt-3 mb-4">
        Back
      </Button>

      <h1>Results for: <b><i>"{query}"</i></b></h1>
      {source && <h4>Source: {source}</h4>}

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Fetching search results...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger mt-4">{error}</div>
      ) : results.length === 0 ? (
        <div className="alert alert-info mt-4">No results found for your search.</div>
      ) : (
        <>
          <p className="mb-4">Found {results.length} results</p>
          <Row>
            {results.map((result, index) => (
              <Col md={4} key={index} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Body>
                    <Card.Title className="mb-3">
                      {result._source.headline}
                    </Card.Title>
                    <Card.Text>
                      {result._source.snippet || result._source.content?.substring(0, 150) + '...'}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer className="bg-white">
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        {result._source.source} | {formatDate(result._source.published_at)}
                      </small>
                      <Badge bg={getSentimentBadgeVariant(result._source.sentiment)}>
                        {result._source.sentiment || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        href={result._source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="w-100"
                      >
                        Read Article
                      </Button>
                    </div>
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
        </>
      )}
    </Container>
  );
}

export default Results;
