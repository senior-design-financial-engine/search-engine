import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, ProgressBar, Badge } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import '../styles/SideMenu.css';
import './AnalyticsSideMenu.css';

// Register Chart.js components
ChartJS.register(
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title,
  PointElement,
  LineElement
);

const AnalyticsSideMenu = ({ isOpen, toggleMenu, results }) => {
  const [sentimentCounts, setSentimentCounts] = useState({ positive: 0, negative: 0, neutral: 0 });
  const [sourceCounts, setSourceCounts] = useState({});
  const [timeDistribution, setTimeDistribution] = useState({});
  const [topCompanies, setTopCompanies] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [monthlyTrends, setMonthlyTrends] = useState({});

  const sideMenuRef = useRef(null);
  const [tooltipText, setTooltipText] = useState('Open Analytics');
  
  // Add mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Toggle sidebar with Alt+A
      if (e.altKey && e.key === 'a') {
        toggleMenu();
      }
      
      // Close sidebar with Escape key
      if (e.key === 'Escape' && isOpen) {
        toggleMenu();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, toggleMenu]);
  
  // Update tooltip text based on sidebar state
  useEffect(() => {
    setTooltipText(isOpen ? 'Close Analytics (Alt+A)' : 'Open Analytics (Alt+A)');
  }, [isOpen]);

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
      const monthlyData = {};
      
      // Initialize months array for the last 6 months
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthName = date.toLocaleString('default', { month: 'short' });
        months.push(monthName);
        monthlyData[monthName] = { articles: 0, positive: 0, negative: 0, neutral: 0 };
      }
      
      results.forEach(article => {
        if (article.published_at) {
          const date = new Date(article.published_at);
          const month = date.toLocaleString('default', { month: 'short' });
          times[month] = (times[month] || 0) + 1;
          
          // Add to monthly trends if within last 6 months
          if (monthlyData[month]) {
            monthlyData[month].articles += 1;
            
            if (article.sentiment) {
              const sentiment = article.sentiment.toLowerCase();
              if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral') {
                monthlyData[month][sentiment] += 1;
              }
            } else {
              monthlyData[month].neutral += 1;
            }
          }
        }
      });
      
      setTimeDistribution(times);
      setMonthlyTrends(monthlyData);

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
  
  // Update chart options with mobile configurations
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: isMobile ? 'bottom' : 'bottom',
        align: 'start',
        labels: {
          boxWidth: isMobile ? 8 : 10,
          padding: isMobile ? 4 : 8,
          font: {
            size: isMobile ? 10 : 11
          },
          color: '#495057',
          usePointStyle: true
        },
        maxItems: isMobile ? 3 : undefined,
        margin: 0
      },
      tooltip: {
        enabled: true,
        intersect: false,
        mode: 'index',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#495057',
        bodyColor: '#495057',
        borderColor: '#dee2e6',
        borderWidth: 1,
        titleFont: {
          size: isMobile ? 10 : 11
        },
        bodyFont: {
          size: isMobile ? 10 : 11
        },
        padding: isMobile ? 4 : 6,
        displayColors: true
      }
    },
    layout: {
      padding: {
        left: isMobile ? 0 : 0,
        right: isMobile ? 0 : 0,
        top: isMobile ? 2 : 4,
        bottom: isMobile ? 2 : 0
      },
      autoPadding: true
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: '#f0f0f0',
          drawBorder: false,
          display: !isMobile
        },
        ticks: {
          color: '#495057',
          font: {
            size: isMobile ? 9 : 10
          },
          padding: isMobile ? 2 : 4,
          maxTicksLimit: isMobile ? 4 : 5,
          display: true
        }
      },
      x: {
        grid: {
          display: false,
          drawBorder: false
        },
        ticks: {
          color: '#495057',
          font: {
            size: isMobile ? 9 : 10
          },
          padding: isMobile ? 2 : 4,
          maxRotation: isMobile ? 45 : 45,
          minRotation: isMobile ? 45 : 45,
          autoSkip: true,
          maxTicksLimit: isMobile ? 6 : 8
        }
      }
    }
  };
  
  // Prepare chart data with accessible colors and proper data handling
  const sentimentChartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [
          sentimentCounts.positive || 0,
          sentimentCounts.neutral || 0,
          sentimentCounts.negative || 0
        ],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(108, 117, 125, 0.8)',
          'rgba(220, 53, 69, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(108, 117, 125, 1)',
          'rgba(220, 53, 69, 1)'
        ],
        borderWidth: 1,
      },
    ],
  };
  
  const sourceChartData = {
    labels: Object.keys(sourceCounts).slice(0, 5),
    datasets: [
      {
        label: 'Articles',
        data: Object.values(sourceCounts).slice(0, 5),
        backgroundColor: Array(5).fill('rgba(67, 97, 238, 0.7)'),
        borderColor: Array(5).fill('rgba(67, 97, 238, 1)'),
        borderWidth: 1,
        barThickness: 'flex',
        maxBarThickness: 50
      },
    ],
  };
  
  const timelineChartData = {
    labels: Object.keys(monthlyTrends),
    datasets: [
      {
        label: 'Articles',
        data: Object.values(monthlyTrends).map(month => month.articles || 0),
        borderColor: 'rgba(67, 97, 238, 1)',
        backgroundColor: 'rgba(67, 97, 238, 0.1)',
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'rgba(67, 97, 238, 1)',
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 4 : 5
      },
    ],
  };
  
  const sentimentTrendChartData = {
    labels: Object.keys(monthlyTrends),
    datasets: [
      {
        label: 'Positive',
        data: Object.values(monthlyTrends).map(month => month.positive || 0),
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.3,
        pointBackgroundColor: 'rgba(40, 167, 69, 1)',
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 4 : 5
      },
      {
        label: 'Neutral',
        data: Object.values(monthlyTrends).map(month => month.neutral || 0),
        borderColor: 'rgba(108, 117, 125, 1)',
        backgroundColor: 'rgba(108, 117, 125, 0.1)',
        tension: 0.3,
        pointBackgroundColor: 'rgba(108, 117, 125, 1)',
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 4 : 5
      },
      {
        label: 'Negative',
        data: Object.values(monthlyTrends).map(month => month.negative || 0),
        borderColor: 'rgba(220, 53, 69, 1)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        tension: 0.3,
        pointBackgroundColor: 'rgba(220, 53, 69, 1)',
        pointRadius: isMobile ? 2 : 3,
        pointHoverRadius: isMobile ? 4 : 5
      },
    ],
  };

  // Empty state component
  const EmptyState = ({ icon, message }) => (
    <div className="empty-state">
      <i className={`bi ${icon}`} aria-hidden="true"></i>
      <p className="text-muted mb-0 text-center">{message}</p>
    </div>
  );
  
  // Function to render badge items
  const renderBadges = (items, colorClass) => {
    if (!items || items.length === 0) {
      return <EmptyState icon="bi-tag" message="No data available" />;
    }
    
    return (
      <div className="d-flex flex-wrap">
        {items.map((item, index) => (
          <Badge 
            key={index} 
            bg={colorClass} 
            text={colorClass === 'light' ? 'dark' : 'white'} 
            className="me-2 mb-2 border-0 rounded-pill py-1 px-2"
          >
            {item.name} <span className="opacity-75">({item.count})</span>
          </Badge>
        ))}
      </div>
    );
  };

  // Add mobile detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <Button 
        variant="primary" 
        className={`side-menu-toggle shadow ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label={`${isOpen ? 'Close' : 'Open'} Analytics Menu`}
        aria-expanded={isOpen}
      >
        <div className="toggle-content" data-tooltip={tooltipText}>
          {isOpen ? (
            <i className="bi bi-chevron-right" aria-hidden="true">
              <span className="visually-hidden">Close</span>
            </i>
          ) : (
            <i className="bi bi-graph-up" aria-hidden="true">
              <span className="visually-hidden">Open</span>
            </i>
          )}
        </div>
      </Button>

      <div 
        className={`side-menu ${isOpen ? 'open' : ''}`} 
        ref={sideMenuRef}
        role="complementary"
        aria-label="Analytics Sidebar"
        tabIndex={isOpen ? 0 : -1}
      >
        <div className="side-menu-header">
          <h4 className="mb-0 d-flex align-items-center">
            <i className="bi bi-graph-up-arrow me-2 text-primary" aria-hidden="true"></i>
            <span>Analytics</span>
          </h4>
          <div className="d-flex align-items-center">
            <small className="text-muted me-2 d-none d-md-block">ESC to close</small>
            <button 
              className="side-menu-close" 
              onClick={toggleMenu}
              aria-label="Close Analytics Menu"
            >
              <i className="bi bi-x-lg" aria-hidden="true"></i>
            </button>
          </div>
        </div>

        <div className="side-menu-content">
          {results && results.length > 0 ? (
            <>
              {/* Sentiment Distribution */}
              <Card className="analytics-card primary">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="bi bi-emoji-smile me-2 text-primary" aria-hidden="true"></i>
                    <span>Sentiment Distribution</span>
                  </h5>
                </Card.Header>
                <Card.Body>
                  {totalSentiments > 0 ? (
                    <div className="chart-container">
                      <Pie 
                        data={sentimentChartData} 
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }} 
                      />
                    </div>
                  ) : (
                    <EmptyState icon="bi-emoji-neutral" message="No sentiment data available" />
                  )}
                </Card.Body>
              </Card>

              {/* Source Distribution */}
              <Card className="analytics-card">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="bi bi-newspaper me-2 text-primary" aria-hidden="true"></i>
                    <span>Top Sources</span>
                  </h5>
                </Card.Header>
                <Card.Body>
                  {Object.keys(sourceCounts).length > 0 ? (
                    <div className="chart-container">
                      <Bar 
                        data={sourceChartData} 
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }} 
                      />
                    </div>
                  ) : (
                    <EmptyState icon="bi-newspaper" message="No source data available" />
                  )}
                </Card.Body>
              </Card>

              {/* Top Companies */}
              <Card className="analytics-card">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="bi bi-building me-2 text-primary" aria-hidden="true"></i>
                    <span>Top Companies</span>
                  </h5>
                </Card.Header>
                <Card.Body className="d-flex align-items-center">
                  {renderBadges(topCompanies, 'light')}
                </Card.Body>
              </Card>

              {/* Top Categories */}
              <Card className="analytics-card">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="bi bi-tags me-2 text-primary" aria-hidden="true"></i>
                    <span>Top Categories</span>
                  </h5>
                </Card.Header>
                <Card.Body className="d-flex align-items-center">
                  {renderBadges(topCategories, 'info')}
                </Card.Body>
              </Card>

              {/* Publication Timeline */}
              <Card className="analytics-card">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="bi bi-calendar-date me-2 text-primary" aria-hidden="true"></i>
                    <span>Publication Timeline</span>
                  </h5>
                </Card.Header>
                <Card.Body>
                  {Object.keys(timeDistribution).length > 0 ? (
                    <div className="chart-container">
                      <Line 
                        data={timelineChartData} 
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }} 
                      />
                    </div>
                  ) : (
                    <EmptyState icon="bi-calendar" message="No timeline data available" />
                  )}
                </Card.Body>
              </Card>
              
              {/* Sentiment Trends */}
              <Card className="analytics-card">
                <Card.Header>
                  <h5 className="mb-0">
                    <i className="bi bi-graph-up me-2 text-primary" aria-hidden="true"></i>
                    <span>Sentiment Trends</span>
                  </h5>
                </Card.Header>
                <Card.Body>
                  {Object.values(monthlyTrends).some(month => month.articles > 0) ? (
                    <div className="chart-container">
                      <Line 
                        data={sentimentTrendChartData} 
                        options={{
                          ...chartOptions,
                          maintainAspectRatio: false,
                          responsive: true
                        }} 
                      />
                    </div>
                  ) : (
                    <EmptyState icon="bi-graph-up" message="No trend data available" />
                  )}
                </Card.Body>
              </Card>
            </>
          ) : (
            <div className="text-center py-4">
              <i className="bi bi-bar-chart text-muted" style={{fontSize: "2.5rem", opacity: 0.4}} aria-hidden="true"></i>
              <p className="mt-2 text-muted">No data available for analytics</p>
              <small className="text-muted d-block">Search for results to see analysis</small>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default AnalyticsSideMenu; 