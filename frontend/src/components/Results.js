import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/elasticsearchClient';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Alert } from 'react-bootstrap';
import AnalyticsSideMenu from './AnalyticsSideMenu';
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
  // Add sorting state
  const [sortBy, setSortBy] = useState('relevance');
  // Add side menu state
  const [isSideMenuOpen, setIsSideMenuOpen] = useState(false);
  const navigate = useNavigate();

  // Toggle side menu function
  const toggleSideMenu = () => {
    setIsSideMenuOpen(!isSideMenuOpen);
  };

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (query) {
          // Direct Elasticsearch search - the response is already in the format we need
          const articlesData = await searchArticles(query, source, timeRange, sentiment);
          
          // Log the results for debugging
          console.log('Search results:', articlesData);
          
          setResults(articlesData);
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
    if (!sentiment) return 'secondary';
    
    switch (sentiment.toLowerCase()) {
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
    if (score === undefined || score === null) return 'N/A';
    
    // Convert to percentage with one decimal place
    const percentage = (parseFloat(score) * 100).toFixed(1);
    return isNaN(percentage) ? 'N/A' : `${percentage}%`;
  };

  // Add a function to format sentiment score
  const formatSentimentScore = (score) => {
    if (score === undefined || score === null) return '';
    
    // Format with one decimal place
    const formattedScore = parseFloat(score).toFixed(1);
    return isNaN(formattedScore) ? '' : ` (${formattedScore})`;
  };

  // Helper function to safely get company data
  const getCompanyData = (article) => {
    if (!article) return [];
    if (Array.isArray(article.companies)) return article.companies;
    
    // If we have a single company object, wrap it in an array
    if (article.companies && typeof article.companies === 'object') {
      return [article.companies];
    }
    
    return [];
  };

  // Helper function to safely get categories
  const getCategories = (article) => {
    if (!article) return [];
    if (Array.isArray(article.categories)) return article.categories;
    
    // If we have a string, split it by commas
    if (typeof article.categories === 'string') {
      return article.categories.split(',').map(c => c.trim());
    }
    
    return [];
  };

  // Add sorting function
  const handleSort = (sortType) => {
    setSortBy(sortType);
  };

  // Get sorted results based on current sort setting
  const getSortedResults = () => {
    if (!results || results.length === 0) return [];
    
    const sortedResults = [...results];
    
    switch (sortBy) {
      case 'date':
        return sortedResults.sort((a, b) => {
          const dateA = new Date(a.published_at || 0);
          const dateB = new Date(b.published_at || 0);
          return dateB - dateA; // Most recent first
        });
      case 'sentiment':
        return sortedResults.sort((a, b) => {
          const sentimentOrder = { positive: 3, neutral: 2, negative: 1, undefined: 0 };
          const sentimentA = sentimentOrder[a.sentiment?.toLowerCase()] || 0;
          const sentimentB = sentimentOrder[b.sentiment?.toLowerCase()] || 0;
          return sentimentB - sentimentA;
        });
      case 'relevance':
      default:
        return sortedResults.sort((a, b) => {
          const scoreA = parseFloat(a.relevance_score || a.relevance || 0);
          const scoreB = parseFloat(b.relevance_score || b.relevance || 0);
          return scoreB - scoreA; // Highest relevance first
        });
    }
  };

  // Get the sorted results
  const sortedResults = getSortedResults();

  return (
    <Container className="py-4">
      {/* Analytics Side Menu */}
      <AnalyticsSideMenu 
        isOpen={isSideMenuOpen} 
        toggleMenu={toggleSideMenu} 
        results={results}
      />
      
      {/* Analytics toggle button */}
      <Button
        variant="primary"
        className="side-menu-toggle rounded-circle p-2 d-flex align-items-center justify-content-center"
        onClick={toggleSideMenu}
        style={{ width: '48px', height: '48px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' }}
        aria-label="Toggle Analytics"
      >
        <i className="bi bi-bar-chart-fill fs-5"></i>
      </Button>
      
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
            <Button 
              variant={sortBy === 'relevance' ? 'primary' : 'outline-primary'} 
              size="sm" 
              className="me-2 rounded-pill"
              onClick={() => handleSort('relevance')}
            >
              <i className="bi bi-sort-down me-1"></i>Relevance
            </Button>
            <Button 
              variant={sortBy === 'date' ? 'primary' : 'outline-secondary'} 
              size="sm" 
              className="me-2 rounded-pill"
              onClick={() => handleSort('date')}
            >
              <i className="bi bi-calendar-date me-1"></i>Date
            </Button>
            <Button 
              variant={sortBy === 'sentiment' ? 'primary' : 'outline-secondary'} 
              size="sm" 
              className="rounded-pill"
              onClick={() => handleSort('sentiment')}
            >
              <i className="bi bi-emoji-smile me-1"></i>Sentiment
            </Button>
          </div>
        </div>
      )}
      
      {/* Results grid */}
      {!loading && !error && results.length > 0 && (
        <Row>
          {sortedResults.map((article, index) => (
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
                      href={article.url || '#'} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none text-primary stretched-link"
                    >
                      {article.headline || 'Untitled Article'}
                    </a>
                  </Card.Title>
                  <Card.Text className="text-secondary mb-3 small">
                    {article.summary || article.snippet || (article.content && `${article.content.substring(0, 150)}...`) || 'No summary available'}
                  </Card.Text>
                  
                  <div className="mt-auto pt-2">
                    {getCompanyData(article).length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Companies:</small>
                        {getCompanyData(article).map((company, idx) => (
                          <Badge 
                            key={idx} 
                            bg="light" 
                            text="dark" 
                            className="me-1 mb-1 border rounded-pill"
                          >
                            {company.name || company} {company.ticker && `(${company.ticker})`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    {getCategories(article).length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted d-block mb-1">Categories:</small>
                        {getCategories(article).map((category, idx) => (
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
                      title={`Sentiment score: ${article.sentiment_score || 'N/A'} (Range: -1.0 to 1.0, where negative values indicate negative sentiment and positive values indicate positive sentiment)`}
                    >
                      <i className={`bi bi-${
                        article.sentiment === 'positive' ? 'emoji-smile' : 
                        article.sentiment === 'negative' ? 'emoji-frown' : 
                        'emoji-neutral'
                      } me-1`}></i>
                      {article.sentiment || 'Unknown'}
                      {formatSentimentScore(article.sentiment_score)}
                    </Badge>
                    <small className="text-muted">
                      <i className="bi bi-graph-up me-1"></i>
                      Relevance: {formatRelevanceScore(article.relevance_score || article.relevance)}
                    </small>
                  </div>
                  <div className="mt-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      href={article.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-100 rounded-pill"
                      disabled={!article.url}
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
