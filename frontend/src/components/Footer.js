import React from 'react';
import { Container } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-light py-3 mt-5">
      <Container className="text-center">
        <div className="mb-2">
          <small className="text-muted">
            Financial Search Engine Demo - Enhanced with advanced filtering and search capabilities
          </small>
        </div>
        <div>
          <small>
            <Link to="/diagnostics" className="text-secondary">
              <i className="bi bi-tools me-1"></i>
              Troubleshooting & Diagnostics
            </Link>
          </small>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 