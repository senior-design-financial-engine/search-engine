import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Navbar, Container, Nav, Button, NavDropdown } from 'react-bootstrap';

const Header = () => {
  return (
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
            
            <NavDropdown 
              title={<i className="bi bi-gear-fill"></i>} 
              id="tools-dropdown" 
              align="end"
            >
              <NavDropdown.Item as={Link} to="/diagnostics">
                <i className="bi bi-tools me-2"></i>
                Diagnostics
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default Header; 