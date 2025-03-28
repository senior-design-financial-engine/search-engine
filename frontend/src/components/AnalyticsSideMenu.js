import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, ProgressBar, Badge } from 'react-bootstrap';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import '../styles/SideMenu.css';

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
  const [activeTab, setActiveTab] = useState('overview');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const sideMenuRef = useRef(null);
  const [tooltipText, setTooltipText] = useState('Open Analytics');
  
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

  // Handle window resize for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  // Close menu when clicking outside on mobile
  useEffect(() => {
    if (isMobile && isOpen) {
      const handleClickOutside = (e) => {
        if (!e.target.closest('.side-menu') && !e.target.closest('.side-menu-toggle')) {
          toggleMenu();
        }
      };
      
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isMobile, isOpen, toggleMenu]);

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
  
  // Prepare chart options with more accessible colors and reduced padding
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        enabled: true,
        intersect: false,
        mode: 'index',
        padding: 10,
        cornerRadius: 8,
        caretSize: 6,
        boxPadding: 4,
        titleFont: {
          size: 13,
          weight: 'bold'
        },
        bodyFont: {
          size: 12
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y;
            }
            return label;
          }
        }
      }
    },
    layout: {
      padding: 10
    },
    borderColor: '#e9ecef',
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    }
  };
  
  // Pie chart options specific
  const pieOptions = {
    ...chartOptions,
    cutout: '65%',
    plugins: {
      ...chartOptions.plugins,
      legend: {
        ...chartOptions.plugins.legend,
        position: 'bottom',
      }
    }
  };

  // Line chart options specific
  const lineOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  // Bar chart options specific
  const barOptions = {
    ...chartOptions,
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    }
  };

  // Chart colors with better accessibility
  const chartColors = {
    positive: 'rgba(43, 138, 62, 0.8)',
    negative: 'rgba(224, 49, 49, 0.8)',
    neutral: 'rgba(25, 113, 194, 0.8)',
    background: {
      positive: 'rgba(43, 138, 62, 0.15)',
      negative: 'rgba(224, 49, 49, 0.15)',
      neutral: 'rgba(25, 113, 194, 0.15)'
    },
    border: {
      positive: 'rgba(43, 138, 62, 1)',
      negative: 'rgba(224, 49, 49, 1)',
      neutral: 'rgba(25, 113, 194, 1)'
    }
  };
  
  // Prepare chart data with accessible colors
  const sentimentChartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
        backgroundColor: ['rgba(40, 167, 69, 0.8)', 'rgba(23, 162, 184, 0.8)', 'rgba(220, 53, 69, 0.8)'],
        borderColor: ['rgba(40, 167, 69, 1)', 'rgba(23, 162, 184, 1)', 'rgba(220, 53, 69, 1)'],
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
        backgroundColor: 'rgba(67, 97, 238, 0.7)',
        borderColor: 'rgba(67, 97, 238, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const timelineChartData = {
    labels: Object.keys(monthlyTrends),
    datasets: [
      {
        label: 'Articles',
        data: Object.values(monthlyTrends).map(month => month.articles),
        borderColor: 'rgba(108, 117, 125, 1)',
        backgroundColor: 'rgba(108, 117, 125, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };
  
  const sentimentTrendChartData = {
    labels: Object.keys(monthlyTrends),
    datasets: [
      {
        label: 'Positive',
        data: Object.values(monthlyTrends).map(month => month.positive),
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Neutral',
        data: Object.values(monthlyTrends).map(month => month.neutral),
        borderColor: 'rgba(23, 162, 184, 1)',
        backgroundColor: 'rgba(23, 162, 184, 0.1)',
        tension: 0.3,
      },
      {
        label: 'Negative',
        data: Object.values(monthlyTrends).map(month => month.negative),
        borderColor: 'rgba(220, 53, 69, 1)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        tension: 0.3,
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
        id="analytics-side-menu"
        role="complementary"
        aria-label="Analytics"
      >
        <div className="side-menu-resize-handle" title="Drag to resize"></div>
        <div className="side-menu-header">
          <h3>Analytics Dashboard</h3>
          <button 
            className="close-button" 
            onClick={toggleMenu}
            aria-label="Close analytics panel"
          >
            <i className="bi bi-x-lg"></i>
          </button>
        </div>
        
        <div className="side-menu-content">
          {/* Display one chart per row */}
          <div className="analytics-row">
            <div className="analytics-card">
              <h4>Sentiment Distribution</h4>
              <div className="chart-container">
                <Pie 
                  data={{
                    labels: ['Positive', 'Neutral', 'Negative'],
                    datasets: [
                      {
                        data: [
                          sentimentCounts.positive || 0,
                          sentimentCounts.neutral || 0,
                          sentimentCounts.negative || 0
                        ],
                        backgroundColor: [
                          chartColors.positive,
                          chartColors.neutral,
                          chartColors.negative
                        ],
                        borderColor: [
                          chartColors.border.positive,
                          chartColors.border.neutral,
                          chartColors.border.negative
                        ],
                        borderWidth: 1
                      }
                    ]
                  }}
                  options={pieOptions}
                />
              </div>
            </div>
          </div>

          <div className="analytics-row">
            <div className="analytics-card">
              <h4>Source Distribution</h4>
              <div className="chart-container">
                <Bar 
                  data={{
                    labels: Object.keys(sourceCounts).slice(0, 5),
                    datasets: [
                      {
                        label: 'Articles',
                        data: Object.values(sourceCounts).slice(0, 5),
                        backgroundColor: 'rgba(59, 91, 219, 0.7)',
                        borderColor: 'rgba(59, 91, 219, 1)',
                        borderWidth: 1,
                        borderRadius: 4
                      }
                    ]
                  }}
                  options={barOptions}
                />
              </div>
            </div>
          </div>

          <div className="analytics-row">
            <div className="analytics-card">
              <h4>Publication Timeline</h4>
              <div className="chart-container">
                <Line 
                  data={{
                    labels: Object.keys(monthlyTrends),
                    datasets: [
                      {
                        label: 'All Articles',
                        data: Object.values(monthlyTrends).map(m => m.articles),
                        borderColor: 'rgba(59, 91, 219, 1)',
                        backgroundColor: 'rgba(59, 91, 219, 0.1)',
                        fill: true,
                        tension: 0.3,
                        borderWidth: 2,
                        pointBackgroundColor: 'rgba(59, 91, 219, 1)'
                      },
                      {
                        label: 'Positive',
                        data: Object.values(monthlyTrends).map(m => m.positive),
                        borderColor: chartColors.border.positive,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointBackgroundColor: chartColors.border.positive
                      },
                      {
                        label: 'Negative',
                        data: Object.values(monthlyTrends).map(m => m.negative),
                        borderColor: chartColors.border.negative,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        tension: 0.3,
                        pointBackgroundColor: chartColors.border.negative
                      }
                    ]
                  }}
                  options={lineOptions}
                />
              </div>
            </div>
          </div>

          <div className="analytics-row">
            <div className="analytics-card">
              <h4>Sentiment Trends</h4>
              <div className="chart-container">
                <Line 
                  data={{
                    labels: Object.keys(monthlyTrends),
                    datasets: [
                      {
                        label: 'Positive',
                        data: Object.values(monthlyTrends).map(month => month.positive),
                        borderColor: 'rgba(40, 167, 69, 1)',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.3,
                      },
                      {
                        label: 'Neutral',
                        data: Object.values(monthlyTrends).map(month => month.neutral),
                        borderColor: 'rgba(23, 162, 184, 1)',
                        backgroundColor: 'rgba(23, 162, 184, 0.1)',
                        tension: 0.3,
                      },
                      {
                        label: 'Negative',
                        data: Object.values(monthlyTrends).map(month => month.negative),
                        borderColor: 'rgba(220, 53, 69, 1)',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.3,
                      },
                    ]
                  }}
                  options={lineOptions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {isMobile && isOpen && <div className="menu-backdrop" onClick={() => toggleMenu()}></div>}
    </>
  );
};

export default AnalyticsSideMenu; 