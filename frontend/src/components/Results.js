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
  
  // Format relevance score as percentage
  const formatRelevanceScore = (score) => {
    if (!score && score !== 0) return '';
    return `${Math.round(score * 100)}%`;
  };

  return (
    <Container className="mt-5">
      <Button variant="secondary" onClick={handleBack} className="mt-3 mb-4">
        Back
      </Button>

      <Card className="mb-4 shadow-sm">
        <Card.Body>
          <h2>Results for: <span className="fw-bold fst-italic text-primary">"{query}"</span></h2>
          
          <Row className="mt-4">
            <Col md={4}>
              <Form.Group className="mb-3">
                <Form.Label><strong>Source</strong></Form.Label>
                <Form.Select 
                  value={source || ''}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
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
                <Form.Label><strong>Time Range</strong></Form.Label>
                <Form.Select 
                  value={timeRange || 'all'}
                  onChange={(e) => handleFilterChange('time_range', e.target.value)}
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
                <Form.Label><strong>Sentiment</strong></Form.Label>
                <Form.Select 
                  value={sentiment || 'all'}
                  onChange={(e) => handleFilterChange('sentiment', e.target.value)}
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
          <div className="mt-2">
            {source && (
              <Badge bg="primary" className="me-2 p-2">
                Source: {source} <span className="ms-1 cursor-pointer" onClick={() => handleFilterChange('source', '')}>&times;</span>
              </Badge>
            )}
            {timeRange && timeRange !== 'all' && (
              <Badge bg="info" className="me-2 p-2">
                Time: {timeRange === 'day' ? 'Last 24h' : 
                       timeRange === 'week' ? 'Last Week' : 
                       timeRange === 'month' ? 'Last Month' : 'Last Year'} 
                <span className="ms-1 cursor-pointer" onClick={() => handleFilterChange('time_range', 'all')}>&times;</span>
              </Badge>
            )}
            {sentiment && sentiment !== 'all' && (
              <Badge bg={getSentimentBadgeVariant(sentiment)} className="me-2 p-2">
                Sentiment: {sentiment} <span className="ms-1 cursor-pointer" onClick={() => handleFilterChange('sentiment', 'all')}>&times;</span>
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h4>Found {results.length} results</h4>
            <div>
              <span className="me-2">Sort by:</span>
              <Button variant="outline-secondary" size="sm" className="me-2">Relevance</Button>
              <Button variant="outline-secondary" size="sm" className="me-2">Date</Button>
              <Button variant="outline-secondary" size="sm">Sentiment</Button>
            </div>
          </div>
          <Row>
            {results.map((result, index) => (
              <Col md={4} key={index} className="mb-4">
                <Card className="h-100 shadow-sm">
                  <Card.Header className="bg-white border-bottom-0 pb-0">
                    <div className="d-flex align-items-center justify-content-between">
                      <small className="text-muted">{result._source.source}</small>
                      <small className="text-muted">{formatDate(result._source.published_at)}</small>
                    </div>
                  </Card.Header>
                  <Card.Body>
                    <Card.Title className="mb-3 fw-bold">
                      {result._source.headline}
                    </Card.Title>
                    <Card.Text>
                      {result._source.snippet || result._source.content?.substring(0, 150) + '...'}
                    </Card.Text>
                    
                    <div className="mt-auto pt-2">
                      {result._source.companies && result._source.companies.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">Companies:</small>
                          {result._source.companies.map((company, idx) => (
                            <Badge 
                              key={idx} 
                              bg="light" 
                              text="dark" 
                              className="me-1 border"
                            >
                              {company.name} ({company.ticker})
                            </Badge>
                          ))}
                        </div>
                      )}
                      
                      {result._source.categories && result._source.categories.length > 0 && (
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">Categories:</small>
                          {result._source.categories.map((category, idx) => (
                            <Badge 
                              key={idx} 
                              bg="secondary" 
                              className="me-1"
                            >
                              {category}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </Card.Body>
                  <Card.Footer className="bg-white">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <Badge bg={getSentimentBadgeVariant(result._source.sentiment)} className="px-3 py-2">
                        {result._source.sentiment || 'Unknown'} 
                        {result._source.sentiment_score !== undefined && (
                          <small> ({(result._source.sentiment_score > 0 ? '+' : '') + result._source.sentiment_score.toFixed(2)})</small>
                        )}
                      </Badge>
                      {result._source.relevance_score && (
                        <small className="text-muted">
                          Relevance: {formatRelevanceScore(result._source.relevance_score)}
                        </small>
                      )}
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
