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

test('renders App structure correctly', () => {
  render(<App />);
  const homeComponent = screen.getByText(/Home Component/i);
  expect(homeComponent).toBeInTheDocument();
});

test('renders main wrapper elements', () => {
  render(<App />);
  const mainElement = screen.getByRole('main');
  expect(mainElement).toBeInTheDocument();
  expect(mainElement).toHaveClass('flex-grow-1');
});
