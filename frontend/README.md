# Financial News Engine Frontend

This directory contains the React.js frontend application for the Financial News Engine project.

## Features

- **Responsive search interface** for real-time financial news
- **Advanced filtering** by source, time range, and categories
- **Search results visualization** with metadata display
- **Sentiment analysis** visualization of news articles
- **Mobile-responsive** design using Bootstrap components

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

## Environment Configuration

The application uses environment variables for configuration:

### Development
Create a `.env.development` file with:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_USE_MOCK_API=false
```

### Production
Create a `.env.production` file with:
```
REACT_APP_API_URL=[your-backend-url]
REACT_APP_USE_MOCK_API=false
```

## Mock API Mode

For development without a backend, set `REACT_APP_USE_MOCK_API=true`. This generates realistic financial news data for testing the UI.

## Project Structure

```
src/
├── components/       # React components
├── services/         # API and data services
├── styles/           # CSS and styling
└── assets/           # Static assets
```

## AWS Deployment

This frontend is designed to be deployed to AWS S3 and CloudFront using the provided CloudFormation templates.

For detailed deployment instructions, see the [frontend-setup-readme.md](../frontend-setup-readme.md) file.

## CI/CD Pipeline

The application is automatically built and deployed through AWS CodePipeline when changes are pushed to the specified GitHub branch.

For CI/CD setup details, see the [cicd-setup-readme.md](../cicd-setup-readme.md) file.

## Testing

Run tests with:
```bash
npm test
```

The project uses Jest and React Testing Library for component testing.

## Troubleshooting

### Common Issues

- **API Connection Errors**: Check that backend URL is correct in `.env` files
- **Missing Dependencies**: Run `npm install` to ensure all packages are installed
- **Build Failures**: Check for syntax errors in the code
- **Deployment Issues**: Check AWS CloudFormation outputs for endpoint URLs
