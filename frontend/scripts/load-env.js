/**
 * This script loads environment variables from .env.api file
 * and creates a .env file for React's environment variable system
 */
const fs = require('fs');
const path = require('path');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const envApiPath = path.join(rootDir, '.env.api');
const envPath = path.join(rootDir, '.env');

console.log('Loading environment variables from .env.api file...');

try {
  // Check if .env.api exists
  if (!fs.existsSync(envApiPath)) {
    console.error('ERROR: .env.api file not found at', envApiPath);
    console.log('Please create a .env.api file with your Elasticsearch configuration');
    console.log('Example:');
    console.log('REACT_APP_SEARCH_ENGINE_ENDPOINT=https://your-elasticsearch-endpoint');
    console.log('REACT_APP_SEARCH_ENGINE_KEY=your-api-key');
    console.log('REACT_APP_SEARCH_ENGINE_INDEX=your-index-name');
    process.exit(1);
  }

  // Read .env.api file
  const envApiContent = fs.readFileSync(envApiPath, 'utf8');
  
  // Create or overwrite .env file with .env.api content
  fs.writeFileSync(envPath, envApiContent);
  
  console.log('Environment variables successfully loaded from .env.api');
  console.log('Created .env file with the following variables:');

  // Log variables without showing actual values
  const vars = envApiContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key] = line.split('=');
      return key;
    });

  console.log(vars.join('\n'));
  
} catch (error) {
  console.error('Error loading environment variables:', error.message);
  process.exit(1);
} 