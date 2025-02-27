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
      day: 'numeric'
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
      <Button 
        variant="outline-secondary" 
        onClick={handleBack} 
        className="mb-3 rounded-pill"
      >
        <i className="bi bi-arrow-left me-2"></i>
        Back to Search
      </Button>

      <Card className="mb-4 shadow-sm border-0 rounded-3">
        <Card.Body className="p-4">
          <h2 className="mb-3 fw-bold">
            <i className="bi bi-search text-primary me-2"></i>
            Results for "<span className="text-primary">{query}</span>"
          </h2>
          
          <Row className="mt-4">
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Source</Form.Label>
                <Form.Select 
                  value={source || ''}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="rounded-3"
                >
                  <option value="">All Sources</option>
                  <option value="Bloomberg">Bloomberg</option>
                  <option value="Reuters">Reuters</option>
                  <option value="CNBC">CNBC</option>
                  <option value="Financial Times">Financial Times</option>
                  <option value="Wall Street Journal">Wall Street Journal</option>
                  <option value="MarketWatch">MarketWatch</option>
                  <option value="Barron's">Barron's</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Time Range</Form.Label>
                <Form.Select 
                  value={timeRange || 'all'}
                  onChange={(e) => handleFilterChange('time_range', e.target.value)}
                  className="rounded-3"
                >
                  <option value="all">All Time</option>
                  <option value="day">Last 24 Hours</option>
                  <option value="week">Last Week</option>
                  <option value="month">Last Month</option>
                  <option value="year">Last Year</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Sentiment</Form.Label>
                <Form.Select 
                  value={sentiment || 'all'}
                  onChange={(e) => handleFilterChange('sentiment', e.target.value)}
                  className="rounded-3"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="negative">Negative</option>
                  <option value="neutral">Neutral</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
          
          {/* Active filters */}
          <div className="mt-2 d-flex flex-wrap">
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
        </Card.Body>
      </Card>
      
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
      
      {/* Results stats */}
      {!loading && !error && results.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">
            <i className="bi bi-journal-text me-2 text-primary"></i>
            Found {results.length} results
          </h4>
          <div>
            <span className="me-2 text-muted">Sort by:</span>
            <Button variant="outline-primary" size="sm" className="me-2 rounded-pill">
              <i className="bi bi-sort-down me-1"></i>Relevance
            </Button>
            <Button variant="outline-secondary" size="sm" className="me-2 rounded-pill">
              <i className="bi bi-calendar-date me-1"></i>Date
            </Button>
            <Button variant="outline-secondary" size="sm" className="rounded-pill">
              <i className="bi bi-emoji-smile me-1"></i>Sentiment
            </Button>
          </div>
        </div>
      )}
      
      {/* Results grid */}
      {!loading && !error && results.length > 0 && (
        <Row>
          {results.map((article, index) => (
            <Col md={4} key={index} className="mb-4">
              <Card className="h-100 shadow-sm border-0 rounded-3 hover-lift">
                <Card.Header className="bg-white border-bottom-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center">
                  <Badge bg="secondary" pill className="px-3 py-2">
                    {article.source || 'Unknown Source'}
                  </Badge>
                  <small className="text-muted">
                    <i className="bi bi-calendar-date me-1"></i>
                    {formatDate(article.published_at)}
                  </small>
                </Card.Header>
                <Card.Body className="p-3">
                  <Card.Title className="mb-3 fs-5 fw-bold">
                    <a 
                      href={article.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none text-primary stretched-link"
                    >
                      {article.headline}
                    </a>
                  </Card.Title>
                  <Card.Text className="text-secondary mb-3 small">
                    {article.summary || article.snippet || (article.content && `${article.content.substring(0, 150)}...`)}
                  </Card.Text>
                  
                  <div className="mt-auto pt-2">
                    {article.companies && article.companies.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Companies:</small>
                        {article.companies.map((company, idx) => (
                          <Badge 
                            key={idx} 
                            bg="light" 
                            text="dark" 
                            className="me-1 mb-1 border rounded-pill"
                          >
                            {company.name} {company.ticker && `(${company.ticker})`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {article.categories && article.categories.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Categories:</small>
                        {article.categories.map((category, idx) => (
                          <Badge 
                            key={idx} 
                            bg="info" 
                            className="me-1 mb-1 rounded-pill"
                          >
                            {category}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card.Body>
                <Card.Footer className="bg-white pt-0 pb-3 px-3 border-0">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Badge 
                      bg={getSentimentBadgeVariant(article.sentiment)} 
                      className="px-3 py-2 rounded-pill"
                    >
                      <i className={`bi bi-${
                        article.sentiment === 'positive' ? 'emoji-smile' : 
                        article.sentiment === 'negative' ? 'emoji-frown' : 
                        'emoji-neutral'
                      } me-1`}></i>
                      {article.sentiment || 'Unknown'}
                    </Badge>
                    <small className="text-muted">
                      <i className="bi bi-graph-up me-1"></i>
                      Relevance: {formatRelevanceScore(article.relevance)}
                    </small>
                  </div>
                  <div className="mt-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 rounded-pill"
                    >
                      <i className="bi bi-box-arrow-up-right me-1"></i>
                      Read Article
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
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
