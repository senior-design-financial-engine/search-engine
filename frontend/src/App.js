import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './components/Home';
import Results from './components/Results';
// import Filters from './components/Filters'; // Remove for demo functionality
import { Navbar, Container, Nav } from 'react-bootstrap';

function App() {
  return (
    <Router>
      <Navbar bg="dark" variant="dark" expand="lg">
        <Container>
          <Navbar.Brand href="/">Financial Search Engine</Navbar.Brand>
          <Nav className="me-auto">
            {/* <Nav.Link href="/">Home</Nav.Link> */}
            {/* <Nav.Link href="/filters">Filters</Nav.Link> */}
          </Nav>
        </Container>
      </Navbar>
      <Container className="mt-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/results" element={<Results />} />
          {/* <Route path="/filters" element={<Filters />} /> */}
        </Routes>
      </Container>
    </Router>
  );
}

export default App;
