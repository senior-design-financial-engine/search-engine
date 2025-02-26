import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the components used in App
jest.mock('./components/Home', () => () => <div>Home Component</div>);
jest.mock('./components/Results', () => () => <div>Results Component</div>);
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: () => <div />,
}));

test('renders Financial Search Engine navbar', () => {
  render(<App />);
  const titleElement = screen.getByText(/Financial Search Engine/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders Bootstrap Navbar', () => {
  render(<App />);
  const navbarBrand = screen.getByText(/Financial Search Engine/i);
  expect(navbarBrand).toBeInTheDocument();
  expect(navbarBrand.tagName.toLowerCase()).toBe('a');
});
