# Financial News Search Engine Frontend

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

### API Configuration
This application requires connection to an Elasticsearch instance to function properly. Configuration is provided through environment variables.

#### Development Setup

1. Create a `.env.api` file in the frontend directory with these values:
```
REACT_APP_SEARCH_ENGINE_ENDPOINT=your-elasticsearch-endpoint 
REACT_APP_SEARCH_ENGINE_KEY=your-api-key
REACT_APP_SEARCH_ENGINE_INDEX=your-index-name
REACT_APP_USE_ENV_API=true
```

2. Run the application with the API configuration:
```
npm run start:api
```

#### Handling CORS Issues

If you encounter CORS errors when connecting to Elasticsearch, you should:

1. Configure your Elasticsearch server to allow CORS requests from your application domain
2. Set up a reverse proxy in production to forward requests to Elasticsearch
3. Use a browser extension like CORS Unblock for development

#### CI/CD Environment Setup

For automated deployments, the application uses a CI/CD script that automatically generates environment variables from deployment settings.

The CI/CD pipeline should set these environment variables:
- `ELASTICSEARCH_URL`: The Elasticsearch endpoint
- `ELASTICSEARCH_API_KEY`: The API key for authentication
- `ELASTICSEARCH_INDEX`: The name of the index to use

These will be automatically mapped to the corresponding React environment variables during the build process.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

### `npm run start:api`

Runs the app using the configuration from `.env.api`

### `npm test`

Launches the test runner in the interactive watch mode.

### `npm run build`

Builds the app for production to the `build` folder.

### `npm run build:api`

Builds the app using the configuration from `.env.api`

## How Environment Variables Work

This project uses React's built-in environment variable system, which requires variables to be prefixed with `REACT_APP_` to be accessible in the frontend code.

The application accesses these variables directly using `process.env.REACT_APP_*` in the source code, which are substituted at build time.

No environment variables are injected at runtime - all environment values are baked into the build when you run `npm run build` or `npm run build:api`.

## Mock API Mode

For development without a backend, set `REACT_APP_USE_MOCK_API=true`. This generates realistic financial news data for testing the UI.

## Project Structure

```
src/
├── components/            # React components
│   ├── Article.js         # Article display component
│   ├── AnalyticsSideMenu.js # Analytics menu component
│   ├── Filters.js         # Search filters component
│   ├── Home.js            # Homepage component
│   ├── Results.js         # Search results component
│   └── unused/            # Archived components
├── services/              # API and data services
│   └── api.js             # API interaction service
├── styles/                # CSS and styling files
├── App.js                 # Main application component
├── App.css                # Main application styles
├── App.test.js            # Application tests
├── index.js               # Application entry point
└── index.css              # Global CSS styles
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
