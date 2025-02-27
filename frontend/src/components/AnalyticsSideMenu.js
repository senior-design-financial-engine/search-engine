import React, { useState, useEffect } from 'react';
import { Card, Button, ProgressBar, Badge } from 'react-bootstrap';
import '../styles/SideMenu.css';

const AnalyticsSideMenu = ({ isOpen, toggleMenu, results }) => {
  const [sentimentCounts, setSentimentCounts] = useState({ positive: 0, negative: 0, neutral: 0 });
  const [sourceCounts, setSourceCounts] = useState({});
  const [timeDistribution, setTimeDistribution] = useState({});
  const [topCompanies, setTopCompanies] = useState([]);
  const [topCategories, setTopCategories] = useState([]);

  useEffect(() => {
    if (results && results.length > 0) {
      // Calculate sentiment distribution
      const sentiments = { positive: 0, negative: 0, neutral: 0 };
      results.forEach(article => {
        if (article.sentiment) {
          sentiments[article.sentiment.toLowerCase()] = (sentiments[article.sentiment.toLowerCase()] || 0) + 1;
        } else {
          sentiments.neutral = (sentiments.neutral || 0) + 1;
        }
      });
      setSentimentCounts(sentiments);

      // Calculate source distribution
      const sources = {};
      results.forEach(article => {
        if (article.source) {
          sources[article.source] = (sources[article.source] || 0) + 1;
        }
      });
      setSourceCounts(sources);

      // Calculate time distribution
      const times = {};
      results.forEach(article => {
        if (article.published_at) {
          const date = new Date(article.published_at);
          const month = date.toLocaleString('default', { month: 'short' });
          times[month] = (times[month] || 0) + 1;
        }
      });
      setTimeDistribution(times);

      // Find top companies mentioned
      const companies = {};
      results.forEach(article => {
        const articleCompanies = getCompanyData(article);
        articleCompanies.forEach(company => {
          const companyName = typeof company === 'string' ? company : company.name;
          if (companyName) {
            companies[companyName] = (companies[companyName] || 0) + 1;
          }
        });
      });
      
      const sortedCompanies = Object.entries(companies)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      setTopCompanies(sortedCompanies);

      // Find top categories
      const categories = {};
      results.forEach(article => {
        const articleCategories = getCategories(article);
        articleCategories.forEach(category => {
          if (category) {
            categories[category] = (categories[category] || 0) + 1;
          }
        });
      });
      
      const sortedCategories = Object.entries(categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      
      setTopCategories(sortedCategories);
    }
  }, [results]);

  // Helper function to extract company data from an article
  const getCompanyData = (article) => {
    if (article.companies && Array.isArray(article.companies)) {
      return article.companies;
    } else if (article.company_mentions && Array.isArray(article.company_mentions)) {
      return article.company_mentions;
    } else if (article.entities && Array.isArray(article.entities)) {
      return article.entities.filter(entity => entity.type === 'ORGANIZATION');
    }
    return [];
  };

  // Helper function to extract categories from an article
  const getCategories = (article) => {
    if (article.categories && Array.isArray(article.categories)) {
      return article.categories;
    } else if (article.topics && Array.isArray(article.topics)) {
      return article.topics;
    } else if (article.tags && Array.isArray(article.tags)) {
      return article.tags;
    }
    return [];
  };

  // Calculate total for percentages
  const totalSentiments = Object.values(sentimentCounts).reduce((acc, count) => acc + count, 0);

  return (
    <>
      <Button 
        variant="primary" 
        className={`side-menu-toggle rounded-circle shadow ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle Analytics Menu"
      >
        <i className={`bi ${isOpen ? 'bi-x-lg' : 'bi-bar-chart-fill'}`}></i>
      </Button>

      <div className={`side-menu ${isOpen ? 'open' : ''}`}>
        <div className="side-menu-header">
          <h4 className="mb-0">
            <i className="bi bi-graph-up-arrow me-2 text-primary"></i>
            Results Analytics
          </h4>
          <button 
            className="side-menu-close" 
            onClick={toggleMenu}
            aria-label="Close Analytics Menu"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>

        {results && results.length > 0 ? (
          <>
            {/* Sentiment Distribution */}
            <Card className="analytics-card shadow-sm mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-emoji-smile me-2 text-primary"></i>
                  Sentiment Distribution
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  <div className="d-flex justify-content-between mb-1">
                    <span>Positive</span>
                    <span>{sentimentCounts.positive} ({Math.round((sentimentCounts.positive / totalSentiments) * 100)}%)</span>
                  </div>
                  <ProgressBar 
                    variant="success" 
                    now={(sentimentCounts.positive / totalSentiments) * 100} 
                    className="mb-2"
                  />
                  
                  <div className="d-flex justify-content-between mb-1">
                    <span>Neutral</span>
                    <span>{sentimentCounts.neutral} ({Math.round((sentimentCounts.neutral / totalSentiments) * 100)}%)</span>
                  </div>
                  <ProgressBar 
                    variant="info" 
                    now={(sentimentCounts.neutral / totalSentiments) * 100} 
                    className="mb-2"
                  />
                  
                  <div className="d-flex justify-content-between mb-1">
                    <span>Negative</span>
                    <span>{sentimentCounts.negative} ({Math.round((sentimentCounts.negative / totalSentiments) * 100)}%)</span>
                  </div>
                  <ProgressBar 
                    variant="danger" 
                    now={(sentimentCounts.negative / totalSentiments) * 100} 
                    className="mb-2"
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Source Distribution */}
            <Card className="analytics-card shadow-sm mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-newspaper me-2 text-primary"></i>
                  Top Sources
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  {Object.entries(sourceCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([source, count], index) => (
                      <div key={index} className="mb-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span>{source}</span>
                          <span>{count} ({Math.round((count / results.length) * 100)}%)</span>
                        </div>
                        <ProgressBar 
                          variant="primary" 
                          now={(count / results.length) * 100} 
                          className="mb-2"
                        />
                      </div>
                    ))
                  }
                </div>
              </Card.Body>
            </Card>

            {/* Top Companies */}
            <Card className="analytics-card shadow-sm mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-building me-2 text-primary"></i>
                  Top Companies Mentioned
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-wrap">
                  {topCompanies.length > 0 ? (
                    topCompanies.map((company, index) => (
                      <Badge 
                        key={index} 
                        bg="light" 
                        text="dark" 
                        className="me-2 mb-2 border rounded-pill py-2 px-3"
                      >
                        {company.name} ({company.count})
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted">No company data available</p>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Top Categories */}
            <Card className="analytics-card shadow-sm mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-tags me-2 text-primary"></i>
                  Top Categories
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="d-flex flex-wrap">
                  {topCategories.length > 0 ? (
                    topCategories.map((category, index) => (
                      <Badge 
                        key={index} 
                        bg="info" 
                        className="me-2 mb-2 rounded-pill py-2 px-3"
                      >
                        {category.name} ({category.count})
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted">No category data available</p>
                  )}
                </div>
              </Card.Body>
            </Card>

            {/* Time Distribution */}
            <Card className="analytics-card shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-calendar-date me-2 text-primary"></i>
                  Publication Timeline
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="mb-3">
                  {Object.entries(timeDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([month, count], index) => (
                      <div key={index} className="mb-2">
                        <div className="d-flex justify-content-between mb-1">
                          <span>{month}</span>
                          <span>{count} articles</span>
                        </div>
                        <ProgressBar 
                          variant="secondary" 
                          now={(count / results.length) * 100} 
                          className="mb-2"
                        />
                      </div>
                    ))
                  }
                </div>
              </Card.Body>
            </Card>
          </>
        ) : (
          <div className="text-center py-5">
            <i className="bi bi-bar-chart text-muted display-1"></i>
            <p className="mt-3 text-muted">No data available for analytics</p>
          </div>
        )}
      </div>
    </>
  );
};

export default AnalyticsSideMenu; 