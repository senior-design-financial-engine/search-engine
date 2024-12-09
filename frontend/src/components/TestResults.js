import React from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function TestResults() {
  const navigate = useNavigate();
  
  const mockResults = [
    {
      _source: {
        url: 'https://example.com/article1',
        headline: 'Bitcoin Reaches All-Time High',
        sentiment: 'positive',
        published_at: '2024-03-20'
      }
    },
    {
      _source: {
        url: 'https://example.com/article2',
        headline: 'Tech Stocks Show Strong Performance',
        sentiment: 'positive',
        published_at: '2024-03-19'
      }
    },
    {
      _source: {
        url: 'https://example.com/article3',
        headline: 'Market Analysis: Economic Trends',
        sentiment: 'neutral',
        published_at: '2024-03-18'
      }
    }
  ];

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <Container className="mt-5">
      <Button variant="secondary" onClick={handleBack} className="mt-3">
        Back
      </Button>

      <h1>Results for: <b><i>"test query"</i></b></h1>

      <Row>
        {mockResults.map((result, index) => (
          <Col md={4} key={index}>
            <Card className="mb-4">
              <Card.Body>
                <Card.Title>
                  <a href={result._source.url} target="_blank" rel="noopener noreferrer">
                    {result._source.url}
                  </a>
                </Card.Title>
                <Card.Text>{result._source.headline}</Card.Text>
                <Card.Subtitle className="text-muted">
                  Sentiment: {result._source.sentiment} | Date: {result._source.published_at}
                </Card.Subtitle>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}

export default TestResults;