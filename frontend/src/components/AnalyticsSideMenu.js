import React, { useState, useEffect } from 'react';
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
  
  // Prepare chart data
  const sentimentChartData = {
    labels: ['Positive', 'Neutral', 'Negative'],
    datasets: [
      {
        data: [sentimentCounts.positive, sentimentCounts.neutral, sentimentCounts.negative],
        backgroundColor: ['rgba(40, 167, 69, 0.7)', 'rgba(23, 162, 184, 0.7)', 'rgba(220, 53, 69, 0.7)'],
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
        backgroundColor: 'rgba(13, 110, 253, 0.7)',
        borderColor: 'rgba(13, 110, 253, 1)',
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
  
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

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
                <div className="chart-container mb-3">
                  <Pie data={sentimentChartData} options={chartOptions} />
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
                <div className="chart-container mb-3">
                  <Bar data={sourceChartData} options={chartOptions} />
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

            {/* Publication Timeline */}
            <Card className="analytics-card shadow-sm mb-4">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-calendar-date me-2 text-primary"></i>
                  Publication Timeline
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="chart-container mb-3">
                  <Line data={timelineChartData} options={chartOptions} />
                </div>
              </Card.Body>
            </Card>
            
            {/* Sentiment Trends */}
            <Card className="analytics-card shadow-sm">
              <Card.Header className="bg-white">
                <h5 className="mb-0">
                  <i className="bi bi-graph-up me-2 text-primary"></i>
                  Sentiment Trends
                </h5>
              </Card.Header>
              <Card.Body>
                <div className="chart-container mb-3">
                  <Line data={sentimentTrendChartData} options={chartOptions} />
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