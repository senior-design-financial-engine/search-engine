#!/bin/bash

# This script injects the Elasticsearch configuration values into the built HTML files
# It can also generate a .env.api file for environment-based configuration
# It should be run after the frontend build and before deployment to S3

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Default locations
BUILD_DIR="frontend/build"
INDEX_FILE="$BUILD_DIR/index.html"
ENV_API_FILE="frontend/.env.api"

# Check if custom build directory is provided
if [ $# -ge 1 ]; then
  BUILD_DIR="$1"
  INDEX_FILE="$BUILD_DIR/index.html"
fi

# Check if the index file exists
if [ ! -f "$INDEX_FILE" ]; then
  echo "Error: Index file not found at $INDEX_FILE"
  exit 1
fi

# Get configuration from parameters or environment variables
ES_ENDPOINT=${ES_ENDPOINT:-${2:-""}}
ES_API_KEY=${ES_API_KEY:-${3:-""}}
ES_INDEX=${ES_INDEX:-${4:-"financial_news"}}

# If no endpoint provided, try to get from CloudFormation
if [ -z "$ES_ENDPOINT" ] && [ -n "$BACKEND_STACK_NAME" ]; then
  echo "Getting Elasticsearch endpoint from CloudFormation stack $BACKEND_STACK_NAME"
  ES_ENDPOINT=$(aws cloudformation describe-stacks --stack-name $BACKEND_STACK_NAME --query "Stacks[0].Outputs[?OutputKey=='ElasticsearchEndpoint'].OutputValue" --output text)
  
  if [ -z "$ES_ENDPOINT" ]; then
    echo "Warning: Could not retrieve Elasticsearch endpoint from CloudFormation stack"
  else
    echo "Retrieved Elasticsearch endpoint: $ES_ENDPOINT"
  fi
fi

# Validate required values
if [ -z "$ES_ENDPOINT" ]; then
  echo "Error: Elasticsearch endpoint not provided"
  exit 1
fi

if [ -z "$ES_API_KEY" ]; then
  echo "Warning: Elasticsearch API key not provided, using empty key"
  ES_API_KEY=""
fi

# Create a .env.api file for environment-based configuration (preferred method)
echo "Creating .env.api file at $ENV_API_FILE"
mkdir -p $(dirname "$ENV_API_FILE")
cat > "$ENV_API_FILE" << EOL
# Elasticsearch configuration
REACT_APP_SEARCH_ENGINE_ENDPOINT=$ES_ENDPOINT
REACT_APP_SEARCH_ENGINE_KEY=$ES_API_KEY
REACT_APP_SEARCH_ENGINE_INDEX=$ES_INDEX
EOL

# Also inject values into index.html for backward compatibility
if [ -f "$INDEX_FILE" ]; then
  echo "Also injecting configuration values into $INDEX_FILE (for backward compatibility)"

  # Replace placeholder values in the index.html file
  # Using sed with different syntax for macOS and Linux
  if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s|%REACT_APP_SEARCH_ENGINE_ENDPOINT%|$ES_ENDPOINT|g" "$INDEX_FILE"
    sed -i '' "s|%REACT_APP_SEARCH_ENGINE_KEY%|$ES_API_KEY|g" "$INDEX_FILE"
    sed -i '' "s|%REACT_APP_SEARCH_ENGINE_INDEX%|$ES_INDEX|g" "$INDEX_FILE"
  else
    # Linux
    sed -i "s|%REACT_APP_SEARCH_ENGINE_ENDPOINT%|$ES_ENDPOINT|g" "$INDEX_FILE"
    sed -i "s|%REACT_APP_SEARCH_ENGINE_KEY%|$ES_API_KEY|g" "$INDEX_FILE"
    sed -i "s|%REACT_APP_SEARCH_ENGINE_INDEX%|$ES_INDEX|g" "$INDEX_FILE"
  fi

  echo "Configuration values successfully injected into $INDEX_FILE"
else
  echo "Index file not found at $INDEX_FILE, skipping HTML injection"
fi

echo "Configuration setup completed" 