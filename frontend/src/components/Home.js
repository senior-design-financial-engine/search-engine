import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Button, Container, Row, Col } from 'react-bootstrap';

function Home() {
  const [query, setQuery] = useState('');
  const [advancedQueries, setAdvancedQueries] = useState({ filters: '', time_range: '' });
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/results?query=${query}&filters=${advancedQueries.filters}&time_range=${advancedQueries.time_range}`);
  };

  // const handleAdvancedChange = (field, value) => {
  //   setAdvancedQueries({ ...advancedQueries, [field]: value });
  // };

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

        {/* <h3 className="mb-3">Advanced Query</h3>
        <Row className="justify-content-center mb-3">
          <Col md={3}>
            <Form.Control
              type="text"
              placeholder="Criterion"
              value={advancedQueries.filters}
              onChange={(e) => handleAdvancedChange('filters', e.target.value)}
            />
          </Col>
          <Col md={3}>
            <Form.Control
              type="text"
              placeholder="Value"
              value={advancedQueries.time}
              onChange={(e) => handleAdvancedChange('value', e.target.value)}
            />
          </Col>
        </Row> */}
      </Form>
    </Container>
  );
}

export default Home;
