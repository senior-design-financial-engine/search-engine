import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form } from 'react-bootstrap';
import '../styles/Results.css';

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
  const [activeFilters, setActiveFilters] = useState({
    source,
    timeRange,
    sentiment
  });
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
  
  const handleFilterChange = (filterType, value) => {
    const newParams = new URLSearchParams(location.search);
    
    if (value && value !== 'all') {
      newParams.set(filterType, value);
    } else {
      newParams.delete(filterType);
    }
    
    navigate(`/results?${newParams.toString()}`);
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  const getSentimentBadgeVariant = (sentiment) => {
    switch (sentiment && sentiment.toLowerCase()) {
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
  
  const formatRelevanceScore = (score) => {
    if (!score && score !== 0) return 'N/A';
    
    // Convert to percentage with one decimal place
    const percentage = (score * 100).toFixed(1);
    return `${percentage}%`;
  };

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <Button 
            variant="outline-secondary" 
            onClick={handleBack} 
            className="mb-3 rounded-pill"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Search
          </Button>
          
          <div className="d-flex flex-wrap align-items-center">
            <h1 className="me-3 mb-0 fw-bold">
              <i className="bi bi-search text-primary me-2"></i>
              Results for "{query}"
            </h1>
            
            {/* Display filters as badges if present */}
            <div className="d-flex flex-wrap mt-2">
              {source && (
                <Badge bg="info" className="me-2 mb-2 rounded-pill py-2 px-3">
                  <i className="bi bi-newspaper me-1"></i>
                  Source: {source}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-white p-0 ms-2" 
                    onClick={() => handleFilterChange('source', null)}
                  >
                    <i className="bi bi-x-circle"></i>
                  </Button>
                </Badge>
              )}
              
              {timeRange && timeRange !== 'all' && (
                <Badge bg="secondary" className="me-2 mb-2 rounded-pill py-2 px-3">
                  <i className="bi bi-calendar me-1"></i>
                  Time: {timeRange === 'day' ? 'Last 24h' : 
                         timeRange === 'week' ? 'Last Week' : 
                         timeRange === 'month' ? 'Last Month' : 
                         timeRange === 'year' ? 'Last Year' : timeRange}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-white p-0 ms-2" 
                    onClick={() => handleFilterChange('time_range', null)}
                  >
                    <i className="bi bi-x-circle"></i>
                  </Button>
                </Badge>
              )}
              
              {sentiment && sentiment !== 'all' && (
                <Badge 
                  bg={getSentimentBadgeVariant(sentiment)} 
                  className="me-2 mb-2 rounded-pill py-2 px-3"
                >
                  <i className="bi bi-emoji-smile me-1"></i>
                  Sentiment: {sentiment}
                  <Button 
                    variant="link" 
                    size="sm" 
                    className="text-white p-0 ms-2" 
                    onClick={() => handleFilterChange('sentiment', null)}
                  >
                    <i className="bi bi-x-circle"></i>
                  </Button>
                </Badge>
              )}
            </div>
          </div>
          
          <p className="text-muted mt-2">
            Found {results.length} results
          </p>
        </Col>
      </Row>
      
      {/* Error message */}
      {error && (
        <Row>
          <Col>
            <Card className="mb-4 border-0 shadow-sm rounded-3 bg-light">
              <Card.Body className="text-center py-5">
                <i className="bi bi-exclamation-triangle-fill text-warning display-1 mb-3"></i>
                <h3 className="text-danger">{error}</h3>
                <p>Please try again or modify your search query.</p>
                <Button 
                  variant="primary" 
                  onClick={handleBack}
                  className="mt-3 rounded-pill"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Return to Search
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
      
      {/* Loading spinner */}
      {loading && (
        <Row>
          <Col className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
            <p className="mt-3">Searching for results...</p>
          </Col>
        </Row>
      )}
      
      {/* Results list */}
      {!loading && !error && results.length > 0 && (
        <Row>
          <Col md={12}>
            {results.map((article, index) => (
              <Card key={index} className="mb-4 border-0 shadow-sm rounded-3 hover-lift">
                <Card.Body className="p-4">
                  <Row>
                    <Col xs={12} md={9}>
                      <h3 className="mb-2 fw-bold">
                        <a 
                          href={article.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary text-decoration-none"
                        >
                          {article.headline}
                        </a>
                      </h3>
                      
                      <p className="text-secondary mb-3">
                        {article.summary || article.snippet}
                      </p>
                      
                      <div className="mb-2">
                        <Badge 
                          bg={getSentimentBadgeVariant(article.sentiment)} 
                          className="me-2 rounded-pill"
                        >
                          {article.sentiment || 'Unknown Sentiment'}
                        </Badge>
                        
                        {article.source && (
                          <Badge bg="secondary" className="me-2 rounded-pill">
                            {article.source}
                          </Badge>
                        )}
                        
                        {article.category && (
                          <Badge bg="info" className="me-2 rounded-pill">
                            {article.category}
                          </Badge>
                        )}
                      </div>
                    </Col>
                    
                    <Col xs={12} md={3} className="text-md-end mt-3 mt-md-0">
                      <div className="d-flex flex-column align-items-md-end">
                        <div className="text-muted mb-2 small">
                          <i className="bi bi-calendar-date me-1"></i>
                          {formatDate(article.published_at)}
                        </div>
                        
                        <div className="text-muted mb-3 small">
                          <i className="bi bi-graph-up me-1"></i>
                          Relevance: {formatRelevanceScore(article.relevance)}
                        </div>
                        
                        <Button 
                          variant="outline-primary" 
                          size="sm"
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-pill px-3"
                        >
                          <i className="bi bi-box-arrow-up-right me-1"></i>
                          Read Article
                        </Button>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            ))}
          </Col>
        </Row>
      )}
      
      {/* No results found */}
      {!loading && !error && results.length === 0 && (
        <Row>
          <Col>
            <Card className="mb-4 border-0 shadow-sm rounded-3 bg-light">
              <Card.Body className="text-center py-5">
                <i className="bi bi-search display-1 text-secondary mb-3"></i>
                <h3>No results found for "{query}"</h3>
                <p className="text-muted">Try modifying your search terms or filters.</p>
                <Button 
                  variant="primary" 
                  onClick={handleBack}
                  className="mt-3 rounded-pill"
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Back to Search
                </Button>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}
    </Container>
  );
}

export default Results;
