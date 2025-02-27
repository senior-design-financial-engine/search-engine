import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link, NavLink } from 'react-router-dom';
import Home from './components/Home';
import Results from './components/Results';
import { Navbar, Container, Nav, Button } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Navbar bg="dark" variant="dark" expand="lg" className="shadow-sm">
        <Container>
          <Navbar.Brand as={Link} to="/">
            <i className="bi bi-search me-2"></i>
            Financial Search Engine
          </Navbar.Brand>
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Nav className="me-auto">
              <Nav.Link as={NavLink} to="/" end>Home</Nav.Link>
              <Nav.Link href="https://github.com/yourusername/search-engine" target="_blank">GitHub</Nav.Link>
            </Nav>
            <Nav>
              <Button 
                variant="outline-light" 
                size="sm" 
                as={Link} 
                to="/" 
                className="me-2"
              >
                New Search
              </Button>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      <div className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
        </Routes>
      </div>
      
      <footer className="bg-light py-3 mt-5">
        <Container className="text-center">
          <small className="text-muted">
            Financial Search Engine Demo - Enhanced with advanced filtering and search capabilities
          </small>
        </Container>
      </footer>
    </Router>
  );
}

export default App;
