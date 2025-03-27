#!/bin/bash

# This script injects the Elasticsearch configuration values into the built HTML files
# It should be run after the frontend build and before deployment to S3

set -e

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Default locations
BUILD_DIR="frontend/build"
INDEX_FILE="$BUILD_DIR/index.html"

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

echo "Injecting configuration values into $INDEX_FILE"

# Replace placeholder values in the index.html file
# Using sed with different syntax for macOS and Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|PLACEHOLDER_ENDPOINT|$ES_ENDPOINT|g" "$INDEX_FILE"
  sed -i '' "s|PLACEHOLDER_KEY|$ES_API_KEY|g" "$INDEX_FILE"
  sed -i '' "s|PLACEHOLDER_INDEX|$ES_INDEX|g" "$INDEX_FILE"
else
  # Linux
  sed -i "s|PLACEHOLDER_ENDPOINT|$ES_ENDPOINT|g" "$INDEX_FILE"
  sed -i "s|PLACEHOLDER_KEY|$ES_API_KEY|g" "$INDEX_FILE"
  sed -i "s|PLACEHOLDER_INDEX|$ES_INDEX|g" "$INDEX_FILE"
fi

echo "Configuration values successfully injected into $INDEX_FILE" 