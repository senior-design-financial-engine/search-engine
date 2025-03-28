import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { searchArticles } from '../services/api';
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Alert } from 'react-bootstrap';
import AnalyticsSideMenu from './AnalyticsSideMenu';
import '../styles/Results.css';
import { Helmet } from 'react-helmet';

// Available filter options
const availableSources = ['Bloomberg', 'Reuters', 'CNBC', 'Financial Times', 'WSJ', 'MarketWatch'];

const timeRanges = [
  { value: 'all', label: 'All Time' },
  { value: 'day', label: 'Last 24 Hours' },
  { value: 'week', label: 'Last Week' },
  { value: 'month', label: 'Last Month' },
  { value: 'year', label: 'Last Year' }
];

const sentiments = [
  { value: 'all', label: 'All Sentiments' },
  { value: 'positive', label: 'Positive' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'negative', label: 'Negative' }
];

function Results() {
  const location = useLocation();
  const navigate = useNavigate();
  const url_params = new URLSearchParams(location.search);

  // get query info
  const query = url_params.get('query');
  
  // get all filters
  const source = url_params.get('source') || '';
  const timeRange = url_params.get('time_range') || 'all';
  const sentiment = url_params.get('sentiment') || 'all';
  
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
  const [tooltipText, setTooltipText] = useState('Open Analytics (Alt+A)');

  // Update activeFilters when URL params change
  useEffect(() => {
    setActiveFilters({
      source: url_params.get('source') || '',
      timeRange: url_params.get('time_range') || 'all',
      sentiment: url_params.get('sentiment') || 'all'
    });
  }, [location.search]);
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newParams = new URLSearchParams(location.search);
    
    if (value && value !== '' && value !== 'all') {
      newParams.set(filterType, value);
    } else {
      newParams.delete(filterType);
    }
    
    // Make sure query is preserved
    if (query) {
      newParams.set('query', query);
    }
    
    navigate(`/results?${newParams.toString()}`);
  };

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);
      
      try {
        if (query) {
          const searchResults = await searchArticles(query, source, timeRange, sentiment);
          
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
  }, [query, source, timeRange, sentiment]);

  const handleBack = () => {
    navigate(-1); // Navigate back to the previous page
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
    
    // Format score to one decimal place
    const formattedScore = parseFloat(score).toFixed(1);
    return isNaN(formattedScore) ? 'N/A' : formattedScore;
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
          const scoreA = parseFloat(a.score || a.relevance_score || a.relevance || 0);
          const scoreB = parseFloat(b.score || b.relevance_score || b.relevance || 0);
          return scoreB - scoreA; // Highest relevance first
        });
    }
  };

  // Add a function to display the main content
  const renderResults = () => {
    // If loading, show spinner
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" className="mb-3" style={{ width: '3rem', height: '3rem' }} />
          <div className="mt-3 text-secondary">Searching for results...</div>
        </div>
      );
    }
    
    // If error, show alert
    if (error) {
      return (
        <Alert variant="danger" className="text-center my-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      );
    }
    
    // If no results, show message
    if (!results || results.length === 0) {
      return (
        <div className="no-results">
          <i className="bi bi-search mb-3 text-secondary"></i>
          <h3>No results found</h3>
          <p className="text-secondary">
            Try adjusting your search terms or filters to find more results.
          </p>
          <Button 
            variant="primary" 
            onClick={handleBack}
            className="mt-3"
          >
            <i className="bi bi-arrow-left me-2"></i>
            Back to Search
          </Button>
        </div>
      );
    }
    
    // If we have results, show them in a grid
    return (
      <div className="results-grid">
        {getSortedResults().map((article, index) => (
          <Card key={index} className="result-card">
            {article.image_url && (
              <div className="card-img-container">
                <Card.Img 
                  variant="top" 
                  src={article.image_url} 
                  alt={article.title} 
                  onError={(e) => e.target.style.display = 'none'} 
                />
                {article.source && (
                  <Badge bg="dark" className="source-badge" pill>
                    {article.source}
                  </Badge>
                )}
              </div>
            )}
            <Card.Body>
              <Card.Title>
                <a 
                  href={`/article/${article.id}`} 
                  className="text-reset text-decoration-none"
                >
                  {article.title}
                </a>
              </Card.Title>
              
              <Card.Text>{article.summary || article.snippet || article.description}</Card.Text>
              
              <div className="article-meta mb-3">
                <div className="date-author">
                  <small className="text-muted">
                    <i className="bi bi-calendar me-1"></i> 
                    {formatDate(article.published_at)}
                  </small>
                  
                  {article.author && (
                    <small className="text-muted ms-3">
                      <i className="bi bi-person me-1"></i>
                      {article.author}
                    </small>
                  )}
                </div>
                
                {article.sentiment && (
                  <Badge 
                    bg={getSentimentBadgeVariant(article.sentiment)} 
                    className="mt-2"
                    pill
                  >
                    {article.sentiment}
                    {formatSentimentScore(article.sentiment_score)}
                  </Badge>
                )}
              </div>
              
              {/* Company and category tags */}
              <div className="article-tags">
                {getCompanyData(article).length > 0 && (
                  <div className="mb-2">
                    {getCompanyData(article).slice(0, 3).map((company, idx) => {
                      const companyName = typeof company === 'string' ? company : company.name;
                      return (
                        <Badge 
                          key={idx} 
                          bg="light" 
                          text="dark" 
                          className="me-1 mb-1 border"
                        >
                          <i className="bi bi-building me-1 text-secondary"></i>
                          {companyName}
                        </Badge>
                      );
                    })}
                  </div>
                )}
                
                {getCategories(article).length > 0 && (
                  <div>
                    {getCategories(article).slice(0, 3).map((category, idx) => (
                      <Badge 
                        key={idx} 
                        bg="light" 
                        text="dark" 
                        className="me-1 mb-1 border"
                      >
                        <i className="bi bi-tag me-1 text-secondary"></i>
                        {category}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </Card.Body>
            <Card.Footer>
              <div className="d-flex justify-content-between align-items-center">
                <small className="text-muted">
                  <i className="bi bi-bar-chart-fill me-1"></i>
                  Relevance: {formatRelevanceScore(article.score || article.relevance_score || article.relevance)}
                </small>
                
                <Button 
                  variant="outline-primary" 
                  size="sm" 
                  as="a" 
                  href={`/article/${article.id}`}
                >
                  Read More
                </Button>
              </div>
            </Card.Footer>
          </Card>
        ))}
      </div>
    );
  };

  // Toggle side menu function
  const toggleSideMenu = () => {
    setIsSideMenuOpen(!isSideMenuOpen);
    setTooltipText(isSideMenuOpen ? 'Open Analytics (Alt+A)' : 'Close Analytics (Alt+A)');
  };

  return (
    <div className="results-page">
      <Helmet>
        <title>Search Results | Advanced Search Engine</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>
      <header className="search-header">
        <Container>
          <div className="d-flex align-items-center mb-3">
            <Button 
              variant="link" 
              onClick={handleBack} 
              className="back-button"
            >
              <i className="bi bi-arrow-left"></i>
              Back
            </Button>
            
            <h1 className="results-title m-0">
              Results for <span>"{query}"</span>
            </h1>
          </div>
          
          <div className="filter-row">
            <Col xs={12} sm={6} md={3} lg={2} className="filter-col">
              <Form.Select
                size="sm"
                value={activeFilters.source || ''}
                onChange={(e) => handleFilterChange('source', e.target.value)}
                className="filter-select"
                aria-label="Filter by source"
              >
                <option value="">All Sources</option>
                {availableSources.map((source, index) => (
                  <option key={index} value={source}>{source}</option>
                ))}
              </Form.Select>
            </Col>
            
            <Col xs={12} sm={6} md={3} lg={2} className="filter-col">
              <Form.Select
                size="sm"
                value={activeFilters.timeRange || 'all'}
                onChange={(e) => handleFilterChange('time_range', e.target.value)}
                className="filter-select"
                aria-label="Filter by time range"
              >
                {timeRanges.map((range, index) => (
                  <option key={index} value={range.value}>{range.label}</option>
                ))}
              </Form.Select>
            </Col>
            
            <Col xs={12} sm={6} md={3} lg={2} className="filter-col">
              <Form.Select
                size="sm"
                value={activeFilters.sentiment || 'all'}
                onChange={(e) => handleFilterChange('sentiment', e.target.value)}
                className="filter-select"
                aria-label="Filter by sentiment"
              >
                {sentiments.map((sentiment, index) => (
                  <option key={index} value={sentiment.value}>{sentiment.label}</option>
                ))}
              </Form.Select>
            </Col>
            
            <Col xs={12} sm={6} md={3} lg={2} className="filter-col">
              <Form.Select
                size="sm"
                value={sortBy}
                onChange={(e) => handleSort(e.target.value)}
                className="filter-select"
                aria-label="Sort results"
              >
                <option value="relevance">Sort by Relevance</option>
                <option value="date">Sort by Date</option>
                <option value="sentiment">Sort by Sentiment</option>
              </Form.Select>
            </Col>
          </div>
          
          {/* Display applied filters as badges */}
          <div className="d-flex flex-wrap mt-2">
            {activeFilters.source && (
              <Badge 
                bg="primary" 
                className="me-2 mb-2 filter-badge" 
                pill
              >
                Source: {activeFilters.source}
                <span 
                  className="ms-2 cursor-pointer" 
                  onClick={() => handleFilterChange('source', '')}
                  aria-label="Remove source filter"
                >
                  &times;
                </span>
              </Badge>
            )}
            
            {activeFilters.timeRange && activeFilters.timeRange !== 'all' && (
              <Badge 
                bg="info" 
                className="me-2 mb-2 filter-badge" 
                pill
              >
                Time: {timeRanges.find(t => t.value === activeFilters.timeRange)?.label}
                <span 
                  className="ms-2 cursor-pointer" 
                  onClick={() => handleFilterChange('time_range', 'all')}
                  aria-label="Remove time range filter"
                >
                  &times;
                </span>
              </Badge>
            )}
            
            {activeFilters.sentiment && activeFilters.sentiment !== 'all' && (
              <Badge 
                bg={getSentimentBadgeVariant(activeFilters.sentiment)} 
                className="me-2 mb-2 filter-badge" 
                pill
              >
                Sentiment: {activeFilters.sentiment}
                <span 
                  className="ms-2 cursor-pointer" 
                  onClick={() => handleFilterChange('sentiment', 'all')}
                  aria-label="Remove sentiment filter"
                >
                  &times;
                </span>
              </Badge>
            )}
          </div>
        </Container>
      </header>
      
      <Container className="main-results-area">
        {renderResults()}
      </Container>
      
      {/* Analytics Toggle Button */}
      <Button
        variant="primary"
        className={`analytics-toggle ${isSideMenuOpen ? 'open' : ''}`}
        onClick={toggleSideMenu}
        aria-expanded={isSideMenuOpen}
        aria-controls="analytics-side-menu"
      >
        <div className="toggle-content" data-tooltip={tooltipText}>
          <i className={`bi ${isSideMenuOpen ? 'bi-chevron-right' : 'bi-graph-up'}`}></i>
          <span className="visually-hidden">
            {isSideMenuOpen ? 'Close Analytics' : 'Open Analytics'}
          </span>
        </div>
      </Button>
      
      {/* Analytics Side Menu */}
      <AnalyticsSideMenu 
        isOpen={isSideMenuOpen} 
        toggleMenu={toggleSideMenu} 
        results={results}
      />
    </div>
  );
}

export default Results;
