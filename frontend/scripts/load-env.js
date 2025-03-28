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
const envDevPath = path.join(rootDir, '.env.development');
const envProdPath = path.join(rootDir, '.env.production');

console.log('Loading environment variables from .env.api file...');

try {
  // Check if .env.api exists
  if (!fs.existsSync(envApiPath)) {
    console.error('ERROR: .env.api file not found');
    console.log('Please create a .env.api file with your Elasticsearch configuration');
    console.log('Example:');
    console.log('REACT_APP_SEARCH_ENGINE_ENDPOINT=<elasticsearch-endpoint>');
    console.log('REACT_APP_SEARCH_ENGINE_KEY=<api-key>');
    console.log('REACT_APP_SEARCH_ENGINE_INDEX=<index-name>');
    console.log('REACT_APP_USE_ENV_API=true');
    process.exit(1);
  }

  // Read .env.api file
  const envApiContent = fs.readFileSync(envApiPath, 'utf8');
  
  // List variable names only (not their values) for confirmation
  const vars = envApiContent.split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => {
      const [key] = line.split('=');
      return key?.trim();
    })
    .filter(Boolean);
  
  if (vars.length > 0) {
    console.log(`Found ${vars.length} environment variables`);
  } else {
    console.warn('WARNING: No environment variables found in .env.api file');
  }
  
  // Create or overwrite .env file with .env.api content
  fs.writeFileSync(envPath, envApiContent);
  
  // Also update .env.development and .env.production to ensure variables are available in all contexts
  fs.writeFileSync(envDevPath, `# Development environment with API settings\n${envApiContent}`);
  fs.writeFileSync(envProdPath, `# Production environment with API settings\n${envApiContent}`);
  
  console.log('Environment configuration successfully loaded and copied to .env files');
  
} catch (error) {
  console.error('Error loading environment variables:', error.message);
  process.exit(1);
} 