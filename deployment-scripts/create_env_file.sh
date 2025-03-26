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

# Function to get parameters from SSM with proper error handling
function get_parameter() {
    local param_name=$1
    local default_value=$2
    
    echo "Fetching parameter: $param_name"
    
    # Check if AWS CLI is installed
    if ! command -v aws &> /dev/null; then
        echo -e "${RED}ERROR: AWS CLI is not installed. Cannot fetch parameters.${NC}"
        echo "Using default value: $default_value"
        echo "$default_value"
        return 1
    fi
    
    # Try to get the parameter with exponential backoff retry
    local max_attempts=3
    local attempt=1
    local value=""
    local exit_code=1
    
    while [ $attempt -le $max_attempts ]; do
        # Capture both the value and any error messages
        value=$(aws ssm get-parameter --name "$param_name" --with-decryption --query "Parameter.Value" --output text 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 0 ] && [ -n "$value" ] && [ "$value" != "None" ]; then
            echo -e "${GREEN}Successfully retrieved parameter: $param_name (Attempt $attempt)${NC}"
            echo "$value"
            return 0
        else
            if [ $attempt -lt $max_attempts ]; then
                local sleep_time=$((2 ** (attempt - 1) * 3))
                echo -e "${YELLOW}Attempt $attempt failed. Retrying in $sleep_time seconds...${NC}"
                sleep $sleep_time
            else
                echo -e "${RED}WARNING: Failed to retrieve parameter after $max_attempts attempts: $param_name${NC}"
                echo -e "${YELLOW}Error message: $value${NC}"
                echo -e "${YELLOW}Using default value: $default_value${NC}"
                echo "$default_value"
                return 1
            fi
        fi
        
        attempt=$((attempt + 1))
    done
}

# Create the target directory if it doesn't exist
mkdir -p /opt/financial-news-engine

# Get parameters with default fallbacks
ES_URL=$(get_parameter "/financial-news/elasticsearch-url" "https://your-elasticsearch-endpoint.es.amazonaws.com")
ES_API_KEY=$(get_parameter "/financial-news/elasticsearch-api-key" "default-api-key")
ES_INDEX=$(get_parameter "/financial-news/elasticsearch-index" "financial_news")
ES_SHARDS=$(get_parameter "/financial-news/es-number-of-shards" "3")
ES_REPLICAS=$(get_parameter "/financial-news/es-number-of-replicas" "2")
ENV=$(get_parameter "/financial-news/environment" "development")

# Create the .env file
cat > /opt/financial-news-engine/.env << EOL
ELASTICSEARCH_URL=$ES_URL
ELASTICSEARCH_API_KEY=$ES_API_KEY
ELASTICSEARCH_INDEX=$ES_INDEX
ES_NUMBER_OF_SHARDS=$ES_SHARDS
ES_NUMBER_OF_REPLICAS=$ES_REPLICAS
ENVIRONMENT=$ENV
CORS_ALLOWED_ORIGINS=https://financialnewsengine.com,https://www.financialnewsengine.com,http://localhost:3000
EOL

# Set secure permissions
chmod 600 /opt/financial-news-engine/.env
echo -e "${GREEN}Created .env file with environment variables from SSM Parameter Store${NC}"

# Output parameters retrieved (with API key redacted)
echo -e "${GREEN}Environment loaded with the following parameters:${NC}"
echo "ELASTICSEARCH_URL=$ES_URL"
echo "ELASTICSEARCH_API_KEY=****REDACTED****"
echo "ELASTICSEARCH_INDEX=$ES_INDEX"
echo "ES_NUMBER_OF_SHARDS=$ES_SHARDS"
echo "ES_NUMBER_OF_REPLICAS=$ES_REPLICAS"
echo "ENVIRONMENT=$ENV"

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