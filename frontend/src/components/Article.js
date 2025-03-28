import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import { Helmet } from 'react-helmet';
import { getArticleById } from '../services/api';
import '../styles/Article.css';

const Article = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        setLoading(true);
        const data = await getArticleById(id);
        setArticle(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching article:', err);
        setError('Failed to load article. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchArticle();
    }
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown Date';
    
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
          <div className="d-flex justify-content-end">
            <Button as={Link} to="/" variant="outline-danger">
              Return to Search
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!article) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <Alert.Heading>Article Not Found</Alert.Heading>
          <p>The article you're looking for doesn't exist or has been removed.</p>
          <div className="d-flex justify-content-end">
            <Button as={Link} to="/" variant="outline-warning">
              Return to Search
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  return (
    <div className="article-page">
      <Helmet>
        <title>{article?.title || 'Loading Article'} | Advanced Search Engine</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      </Helmet>
      
      <Container className="py-4">
        <Button as={Link} to="/results" variant="outline-primary" className="mb-4">
          &larr; Back to Results
        </Button>
        
        <Card className="shadow-sm">
          <Card.Header className="bg-primary text-white py-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Badge bg="light" text="dark">
                {article.source || 'Unknown Source'}
              </Badge>
              <small className="text-white">
                Published: {formatDate(article.published_at)}
              </small>
            </div>
            <h2 className="mb-0">{article.headline || 'Untitled Article'}</h2>
          </Card.Header>
          
          <Card.Body>
            {article.summary && (
              <div className="mb-4">
                <h5 className="text-muted">Summary</h5>
                <p className="lead">{article.summary}</p>
              </div>
            )}
            
            {article.content && (
              <div className="mb-4">
                <h5 className="text-muted">Content</h5>
                <div className="article-content">
                  {article.content.split('\n').map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </div>
            )}
            
            {article.url && (
              <div className="mb-4">
                <Button 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  variant="primary"
                >
                  Read Original Article
                </Button>
              </div>
            )}
            
            <hr />
            
            <div className="d-flex flex-wrap">
              {article.companies && article.companies.length > 0 && (
                <div className="me-4 mb-3">
                  <h6 className="text-muted">Companies</h6>
                  <div>
                    {Array.isArray(article.companies) ? (
                      article.companies.map((company, index) => (
                        <Badge 
                          key={index} 
                          bg="light" 
                          text="dark" 
                          className="me-1 mb-1 border"
                        >
                          {typeof company === 'string' ? company : company.name}
                          {company.ticker && ` (${company.ticker})`}
                        </Badge>
                      ))
                    ) : (
                      <Badge bg="light" text="dark" className="me-1 mb-1 border">
                        {typeof article.companies === 'string' ? article.companies : article.companies.name}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {article.categories && article.categories.length > 0 && (
                <div className="me-4 mb-3">
                  <h6 className="text-muted">Categories</h6>
                  <div>
                    {Array.isArray(article.categories) ? (
                      article.categories.map((category, index) => (
                        <Badge 
                          key={index} 
                          bg="info" 
                          className="me-1 mb-1"
                        >
                          {category}
                        </Badge>
                      ))
                    ) : (
                      <Badge bg="info" className="me-1 mb-1">
                        {article.categories}
                      </Badge>
                    )}
                  </div>
                </div>
              )}
              
              {article.sentiment && (
                <div className="me-4 mb-3">
                  <h6 className="text-muted">Sentiment</h6>
                  <Badge 
                    bg={
                      article.sentiment.toLowerCase() === 'positive' ? 'success' :
                      article.sentiment.toLowerCase() === 'negative' ? 'danger' : 'info'
                    }
                  >
                    {article.sentiment}
                    {article.sentiment_score && ` (${parseFloat(article.sentiment_score).toFixed(2)})`}
                  </Badge>
                </div>
              )}
            </div>
          </Card.Body>
        </Card>
      </Container>
    </div>
  );
};

export default Article; 