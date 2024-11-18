import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';

function Home() {
  const [query, setQuery] = useState('');
  const [advancedQueries, setAdvancedQueries] = useState({ criterion: '', value: '' });
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/results?query=${query}&criterion=${advancedQueries.criterion}&value=${advancedQueries.value}`);
  };

  const handleAdvancedChange = (field, value) => {
    setAdvancedQueries({ ...advancedQueries, [field]: value });
  };

  return (
    <Container className="text-center mt-5">
      <h1>Financial Search Engine</h1>
      <Form onSubmit={handleSearch}>
        <Row className="justify-content-center mb-4">
          <Col md={6}>
            <Form.Control
              type="text"
              placeholder="Enter your search query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </Col>
          <Col md="auto">
            <Button type="submit" variant="primary">
              Search
            </Button>
          </Col>
        </Row>

        <h3 className="mb-3">Advanced Query</h3>
        <Row className="justify-content-center mb-3">
          <Col md={3}>
            <Form.Control
              type="text"
              placeholder="Criterion"
              value={advancedQueries.criterion}
              onChange={(e) => handleAdvancedChange('criterion', e.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              type="text"
              placeholder="Value"
              value={advancedQueries.value}
              onChange={(e) => handleAdvancedChange('value', e.target.value)}
            />
          </Col>
        </Row>
        <Row className="justify-content-center">
          <Col md={3}>
            <Form.Control type="text" placeholder="Region (e.g., North America)" />
          </Col>
          <Col md={3}>
            <Form.Control type="text" placeholder="Source (e.g., Bloomberg)" />
          </Col>
        </Row>
      </Form>
    </Container>
  );
}

export default Home;
