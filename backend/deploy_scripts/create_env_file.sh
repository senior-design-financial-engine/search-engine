#!/bin/bash

# Script to create environment file for the financial news engine
ENV_FILE="/opt/financial-news-engine/.env"
LOG_FILE="/opt/financial-news-engine/logs/env_setup.log"
AWS_REGION="us-east-1"  # Set default region

# Ensure log directory exists
mkdir -p "/opt/financial-news-engine/logs"

echo "$(date) - Starting environment setup" > $LOG_FILE
echo "Using AWS region: $AWS_REGION" >> $LOG_FILE

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
  
  # Try to fetch the parameter with region explicitly set
  value=$(aws ssm get-parameter --region $AWS_REGION --name "$param_name" --with-decryption --query "Parameter.Value" --output text 2>> $LOG_FILE)
  
  # Check if the fetch was successful
  if [ $? -ne 0 ] || [ -z "$value" ] || [ "$value" = "None" ]; then
    echo "Failed to fetch parameter $param_name, using default value" >> $LOG_FILE
    echo "$default_value"
  else
    echo "Successfully fetched $param_name" >> $LOG_FILE
    echo "$value"
  fi
}

# Check for instance metadata to get region
get_instance_region() {
  if command -v curl &> /dev/null; then
    # Try to get region from instance metadata
    local metadata_token=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null)
    if [ -n "$metadata_token" ]; then
      local region=$(curl -s -H "X-aws-ec2-metadata-token: $metadata_token" http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null)
      if [ -n "$region" ]; then
        echo "Detected region from instance metadata: $region" >> $LOG_FILE
        AWS_REGION=$region
      fi
    fi
  fi
}

# Try to get the region from instance metadata
get_instance_region

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
AWS_REGION=$AWS_REGION
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