import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the components used in App
jest.mock('./components/Home', () => () => <div>Home Component</div>);
jest.mock('./components/Results', () => () => <div>Results Component</div>);
jest.mock('./components/Article', () => () => <div>Article Component</div>);
jest.mock('./components/DiagnosticTool', () => () => <div>DiagnosticTool Component</div>);
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }) => <div>{children}</div>,
  Routes: ({ children }) => <div>{children}</div>,
  Route: () => <div />,
  Navigate: () => <div>Navigate Component</div>,
  Link: ({ children }) => <div>{children}</div>
}));

test('renders search engine app', () => {
  render(<App />);
  // Look for the app container instead of specific text
  const appElement = document.querySelector('.app');
  expect(appElement).toBeInTheDocument();
});

test('renders main content area', () => {
  render(<App />);
  // Look for the main content element
  const mainElement = document.querySelector('main');
  expect(mainElement).toBeInTheDocument();
  expect(mainElement).toHaveClass('d-flex');
});
