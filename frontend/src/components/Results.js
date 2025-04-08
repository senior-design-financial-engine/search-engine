import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Alert } from 'react-bootstrap';
import AnalyticsSideMenu from './AnalyticsSideMenu';
import { availableSources } from '../constants';
import '../styles/Results.css';

function Results() {
  const location = useLocation();
  const url_params = new URLSearchParams(location.search);
  const query = url_params.get('query') || '';
  const source = url_params.get('source') || '';
  const timeRange = url_params.get('time_range') || '';
  const sentiment = url_params.get('sentiment') || '';

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    source: source.toLowerCase(),
    timeRange: timeRange.toLowerCase(),
    sentiment: sentiment.toLowerCase()
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
          const searchResults = await searchArticles(
            query,
            activeFilters.source || undefined,
            activeFilters.timeRange || undefined,
            activeFilters.sentiment || undefined
          );
          
          // Transform results to ensure consistent structure
          const normalizedResults = Array.isArray(searchResults) ? searchResults : 
            (searchResults.articles || []);
          
          setResults(normalizedResults);
        }
      } catch (error) {
        console.error('Error fetching search results:', error);
        setError('Failed to fetch search results. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, activeFilters.source, activeFilters.timeRange, activeFilters.sentiment]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setActiveFilters({
      source: params.get('source')?.toLowerCase() || '',
      timeRange: params.get('time_range')?.toLowerCase() || '',
      sentiment: params.get('sentiment')?.toLowerCase() || ''
    });
  }, [location.search]);

  const handleBack = () => {
    navigate('/'); // Navigate to homepage instead of previous page
  };
  
  const handleFilterChange = (filterType, value) => {
    const newParams = new URLSearchParams(location.search);
    
    // Preserve the query parameter
    newParams.set('query', query);
    
    if (value && value !== 'all') {
      if (filterType === 'time_range') {
        // Ensure proper parameter name for time range
        newParams.set('time_range', value);
      } else {
        newParams.set(filterType, value);
      }
    } else {
      newParams.delete(filterType);
    }
    
    // Update active filters state
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value === 'all' ? null : value
    }));
    
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
    if (!score) return '';
    return ` (${score}%)`;
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
    
    let sortedResults = [...results];
    
    switch (sortBy) {
      case 'date':
        sortedResults.sort((a, b) => {
          const dateA = new Date(a.published_at || 0);
          const dateB = new Date(b.published_at || 0);
          return dateB - dateA;
        });
        break;
      case 'relevance':
        sortedResults.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
        break;
      case 'sentiment':
        sortedResults.sort((a, b) => (b.sentiment_score || 0) - (a.sentiment_score || 0));
        break;
      default:
        break;
    }
    
    return sortedResults;
  };

  // Add a function to display the main content
  const renderResults = () => {
    // If loading, show spinner
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">Searching for results...</div>
        </div>
      );
    }

    // If error, show error message  
    if (error) {
      return (
        <Alert variant="danger" className="my-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      );
    }

    // If no results, show message
    if (results.length === 0) {
      return (
        <div className="text-center py-5">
          <i className="bi bi-search fs-1 text-muted mb-3 d-block"></i>
          <h4>No results found</h4>
          <p className="text-muted">Try adjusting your search terms or filters</p>
        </div>
      );
    }

    // Otherwise show sorted results
    const sortedResults = getSortedResults();
    
    return sortedResults.map((article, index) => (
      <Col md={4} key={index} className="mb-4">
        <Card className="h-100 shadow hover-lift border-0 rounded-3" style={{
          backgroundColor: '#ffffff',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          transition: 'all 0.2s ease-in-out'
        }}>
          <Card.Header className="bg-white border-bottom-0 pt-3 px-3 pb-0 d-flex justify-content-between align-items-center">
            <Badge bg="light" text="dark" className="me-1 mb-1 border source-pill">
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
                className="text-decoration-none text-dark stretched-link hover-primary"
                style={{ transition: 'color 0.2s ease-in-out' }}
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
                Relevance{formatRelevanceScore(article.relevance_score)}
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
    ));
  };

  return (
    <div className={`results-page ${isSideMenuOpen ? 'menu-open' : ''}`}>
      {/* Search header */}
      <div className="search-header">
        <Container>
          {/* Back button */}
          <Button 
            variant="outline-secondary" 
            onClick={handleBack} 
            className="back-button rounded-pill"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Search
          </Button>
          
          {/* Results title */}
          <h2 className="results-title fw-bold">
            <i className="bi bi-search text-primary me-2"></i>
            Results for "<span className="text-primary">{query}</span>"
          </h2>
          
          {/* Filters row */}
          <div className="filter-row">
            <div className="filter-col">
              <Form.Group>
                <Form.Label className="fw-bold">Source</Form.Label>
                <Form.Select 
                  value={activeFilters.source || ''}
                  onChange={(e) => handleFilterChange('source', e.target.value)}
                  className="rounded-3"
                >
                  <option value="">All Sources</option>
                  {availableSources.map(src => (
                    <option key={src} value={src}>{src}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </div>
            
            <div className="filter-col">
              <Form.Group>
                <Form.Label className="fw-bold">Time Range</Form.Label>
                <Form.Select 
                  value={activeFilters.timeRange || ''}
                  onChange={(e) => handleFilterChange('time_range', e.target.value)}
                  className="rounded-3"
                >
                  <option value="all">All Time</option>
                  <option value="1d">Last 24 Hours</option>
                  <option value="7d">Last Week</option>
                  <option value="30d">Last Month</option>
                  <option value="90d">Last 3 Months</option>
                </Form.Select>
              </Form.Group>
            </div>
            
            <div className="filter-col">
              <Form.Group>
                <Form.Label className="fw-bold">Sentiment</Form.Label>
                <Form.Select 
                  value={activeFilters.sentiment || ''}
                  onChange={(e) => handleFilterChange('sentiment', e.target.value)}
                  className="rounded-3"
                >
                  <option value="all">All Sentiments</option>
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </Form.Select>
              </Form.Group>
            </div>
            
            <div className="filter-col">
              <Form.Group>
                <Form.Label className="fw-bold">Sort By</Form.Label>
                <Form.Select 
                  value={sortBy}
                  onChange={(e) => handleSort(e.target.value)}
                  className="rounded-3"
                >
                  <option value="relevance">Relevance</option>
                  <option value="date">Date (Newest)</option>
                  <option value="sentiment">Sentiment</option>
                </Form.Select>
              </Form.Group>
            </div>
          </div>
        </Container>
      </div>

      {/* Main content */}
      <Container className="py-4 main-results-area">
        <Row>
          {renderResults()}
        </Row>
      </Container>
      
      {/* Analytics side menu */}
      <AnalyticsSideMenu 
        isOpen={isSideMenuOpen} 
        toggleMenu={toggleSideMenu} 
        results={results} 
      />
    </div>
  );
}

export default Results;
