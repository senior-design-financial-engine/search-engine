#!/bin/bash
# Create .env file with environment variables by fetching from SSM Parameter Store
set -e  # Exit immediately if a command exits with a non-zero status
set -o pipefail  # Return value of a pipeline is the status of the last command

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "Financial News Engine - Environment Setup"
echo "================================================"
echo "$(date)"
echo "Fetching credentials from SSM Parameter Store..."

APP_DIR="/opt/financial-news-engine"
ENV_FILE="$APP_DIR/.env"
PARAM_PATH="/financial-news"
AWS_REGION=${AWS_DEFAULT_REGION:-"us-east-1"}  # Use AWS_DEFAULT_REGION if set, otherwise default to us-east-1
LOG_FILE="/opt/financial-news-engine/logs/env_setup.log"

echo "Starting environment file creation..."
echo "Target .env file: $ENV_FILE"
echo "Parameter path: $PARAM_PATH"
echo "AWS Region: $AWS_REGION"

# First check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Installing..."
    
    if command -v apt-get &> /dev/null; then
        sudo apt-get update -y
        sudo apt-get install -y awscli
    elif command -v yum &> /dev/null; then
        sudo yum update -y
        sudo yum install -y awscli
    else
        echo "ERROR: Package manager not found. Cannot install AWS CLI."
        exit 1
    fi
fi

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
  
  # Try to fetch the parameter with region explicitly set
  value=$(aws ssm get-parameter --region $AWS_REGION --name "$param_name" --with-decryption --query "Parameter.Value" --output text 2>> $LOG_FILE)
  
  # Check if the fetch was successful
  if [ $? -ne 0 ] || [ -z "$value" ] || [ "$value" = "None" ]; then
    echo "Failed to fetch parameter $param_name, using default value: $default_value" >> $LOG_FILE
    echo "$default_value"
  else
    echo "Successfully fetched $param_name" >> $LOG_FILE
    echo "$value"
  fi
}

# Create env file
echo "Creating environment file at $ENV_FILE" | tee -a $LOG_FILE
echo "Using AWS region: $AWS_REGION" | tee -a $LOG_FILE

# Set default values for local development if parameters can't be fetched
ES_ENDPOINT=$(fetch_param "/financial-news/elasticsearch/endpoint" "http://localhost:9200")
ES_API_KEY=$(fetch_param "/financial-news/elasticsearch/api_key" "default-dev-key")
ES_INDEX=$(fetch_param "/financial-news/elasticsearch/index" "financial_news")
ES_SHARDS=$(fetch_param "/financial-news/elasticsearch/shards" "1")
ES_REPLICAS=$(fetch_param "/financial-news/elasticsearch/replicas" "0")
ENVIRONMENT=$(fetch_param "/financial-news/environment" "development")

# Create the env file with the AWS region explicitly set
cat > $ENV_FILE << EOL
# Environment variables for Financial News Engine
AWS_REGION=$AWS_REGION
AWS_DEFAULT_REGION=$AWS_REGION
ELASTICSEARCH_URL=$ES_ENDPOINT
ELASTICSEARCH_ENDPOINT=$ES_ENDPOINT
ELASTICSEARCH_API_KEY=$ES_API_KEY
ELASTICSEARCH_INDEX=$ES_INDEX
ES_NUMBER_OF_SHARDS=$ES_SHARDS
ES_NUMBER_OF_REPLICAS=$ES_REPLICAS
ENVIRONMENT=$ENVIRONMENT
CORS_ALLOWED_ORIGINS="https://financialnewsengine.com,https://www.financialnewsengine.com,http://localhost:3000"
APP_VERSION="1.0.0"
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

# Create a cron job to update the .env file daily if script is run on a server
if [ -d "/etc/cron.daily" ]; then
    cat > /etc/cron.daily/update_env_file << EOL
#!/bin/bash
/opt/financial-news-engine/deploy_scripts/create_env_file.sh
if systemctl is-active --quiet financial-news.service; then
  systemctl restart financial-news.service
fi
EOL
    chmod +x /etc/cron.daily/update_env_file
    echo -e "${GREEN}Created daily cron job to update environment variables${NC}"
fi

echo "================================================"
echo "Environment setup completed at $(date)"
echo "================================================" 