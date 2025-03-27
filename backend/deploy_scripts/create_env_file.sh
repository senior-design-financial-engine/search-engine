#!/bin/bash

# Script to create environment file for the financial news engine
ENV_FILE="/opt/financial-news-engine/.env"
LOG_FILE="/opt/financial-news-engine/logs/env_setup.log"

# Ensure log directory exists
mkdir -p "/opt/financial-news-engine/logs"

echo "$(date) - Starting environment setup" > $LOG_FILE

# Fetch parameters from AWS SSM Parameter Store with fallback
fetch_param() {
  local param_name=$1
  local default_value=$2
  local value=""
  
  echo "Fetching parameter: $param_name" >> $LOG_FILE
  
  # Check if AWS CLI is available
  if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found, using default value for $param_name" >> $LOG_FILE
    echo "$default_value"
    return
  fi
  
  # Try to fetch the parameter
  value=$(aws ssm get-parameter --name "$param_name" --with-decryption --query "Parameter.Value" --output text 2>> $LOG_FILE)
  
  # Check if the fetch was successful
  if [ $? -ne 0 ] || [ -z "$value" ] || [ "$value" = "None" ]; then
    echo "Failed to fetch parameter $param_name, using default value" >> $LOG_FILE
    echo "$default_value"
  else
    echo "Successfully fetched $param_name" >> $LOG_FILE
    echo "$value"
  fi
}

# Create env file
echo "Creating environment file at $ENV_FILE" | tee -a $LOG_FILE

# Set default values for local development if parameters can't be fetched
ES_ENDPOINT=$(fetch_param "/financial-news/elasticsearch/endpoint" "http://localhost:9200")
ES_API_KEY=$(fetch_param "/financial-news/elasticsearch/api_key" "default-dev-key")
ES_INDEX=$(fetch_param "/financial-news/elasticsearch/index" "financial_news")
ES_SHARDS=$(fetch_param "/financial-news/elasticsearch/shards" "1")
ES_REPLICAS=$(fetch_param "/financial-news/elasticsearch/replicas" "0")
ENVIRONMENT=$(fetch_param "/financial-news/environment" "development")

cat > $ENV_FILE << EOL
# Environment variables for Financial News Engine
ELASTICSEARCH_URL=$ES_ENDPOINT
ELASTICSEARCH_ENDPOINT=$ES_ENDPOINT
ELASTICSEARCH_API_KEY=$ES_API_KEY
ELASTICSEARCH_INDEX=$ES_INDEX
ES_NUMBER_OF_SHARDS=$ES_SHARDS
ES_NUMBER_OF_REPLICAS=$ES_REPLICAS
ENVIRONMENT=$ENVIRONMENT
CORS_ALLOWED_ORIGINS="https://financialnewsengine.com,https://www.financialnewsengine.com,http://localhost:3000"
EOL

# Set readable permissions for app
chmod 644 $ENV_FILE

echo "Environment file created successfully. Contents (redacted):" | tee -a $LOG_FILE
grep -v "API_KEY" $ENV_FILE | tee -a $LOG_FILE

# Verify the file was created
if [ -f "$ENV_FILE" ]; then
  echo "SUCCESS: Environment file created at $ENV_FILE" | tee -a $LOG_FILE
else
  echo "ERROR: Failed to create environment file" | tee -a $LOG_FILE
fi 