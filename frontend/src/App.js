import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Home from './components/Home';
import Results from './components/Results';
import Article from './components/Article';
import './styles/App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Helmet>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
          <meta name="theme-color" content="#1a1a2e" />
        </Helmet>
        <main className="d-flex flex-column min-vh-100">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/results" element={<Results />} />
            <Route path="/article/:id" element={<Article />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
