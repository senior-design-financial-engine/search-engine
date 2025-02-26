import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the components used in App
jest.mock('./components/Home', () => () => <div>Home Component</div>);
jest.mock('./components/Results', () => () => <div>Results Component</div>);

test('renders Financial Search Engine navbar', () => {
  render(<App />);
  const titleElement = screen.getByText(/Financial Search Engine/i);
  expect(titleElement).toBeInTheDocument();
});
