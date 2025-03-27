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
    local max_attempts=5 # Increased from 3
    local attempt=1
    local value=""
    local exit_code=1
    
    while [ $attempt -le $max_attempts ]; do
        # Capture only the value, redirect error messages to stderr
        value=$(aws ssm get-parameter --name "$param_name" --with-decryption --query "Parameter.Value" --output text 2>/dev/null)
        exit_code=$?
        
        if [ $exit_code -eq 0 ] && [ -n "$value" ] && [ "$value" != "None" ]; then
            echo -e "${GREEN}Successfully retrieved parameter: $param_name (Attempt $attempt)${NC}" >&2
            # Only output the clean value, no debug messages
            echo "$value"
            return 0
        else
            if [ $attempt -lt $max_attempts ]; then
                local sleep_time=$((2 ** (attempt - 1) * 3))
                echo -e "${YELLOW}Attempt $attempt failed. Retrying in $sleep_time seconds...${NC}" >&2
                sleep $sleep_time
            else
                echo -e "${RED}WARNING: Failed to retrieve parameter after $max_attempts attempts: $param_name${NC}" >&2
                echo -e "${YELLOW}Using default value: $default_value${NC}" >&2
                # Only output the clean value, no debug messages
                echo "$default_value"
                return 1
            fi
        fi
        
        attempt=$((attempt + 1))
    done
}

# Ensure the target directory exists
echo "Verifying application directories exist..."
# Check if directory exists and create if needed
if [ ! -d "/opt/financial-news-engine" ]; then
    echo -e "${YELLOW}WARNING: /opt/financial-news-engine doesn't exist. Creating it now.${NC}"
    mkdir -p /opt/financial-news-engine
    chmod 755 /opt/financial-news-engine
else
    echo -e "${GREEN}/opt/financial-news-engine directory exists${NC}"
fi

# Check for logs directory
if [ ! -d "/opt/financial-news-engine/logs" ]; then
    echo -e "${YELLOW}Creating logs directory${NC}"
    mkdir -p /opt/financial-news-engine/logs
    chmod 777 /opt/financial-news-engine/logs
fi

# Check for deploy_scripts directory
if [ ! -d "/opt/financial-news-engine/deploy_scripts" ]; then
    echo -e "${YELLOW}Creating deploy_scripts directory${NC}"
    mkdir -p /opt/financial-news-engine/deploy_scripts
    chmod 755 /opt/financial-news-engine/deploy_scripts
fi

# Check available disk space and log it
df -h /opt/financial-news-engine | tee -a /var/log/disk-space.log

# Get parameters with default fallbacks
ES_URL=$(get_parameter "/financial-news/elasticsearch/endpoint" "https://your-elasticsearch-endpoint.es.amazonaws.com")
ES_API_KEY=$(get_parameter "/financial-news/elasticsearch/api_key" "default-api-key")
ES_INDEX=$(get_parameter "/financial-news/elasticsearch/index" "financial_news")
ES_SHARDS=$(get_parameter "/financial-news/elasticsearch/shards" "3")
ES_REPLICAS=$(get_parameter "/financial-news/elasticsearch/replicas" "2")
ENV=$(get_parameter "/financial-news/environment" "development")

# Create the .env file
cat > /opt/financial-news-engine/.env << EOL
# Environment variables for Financial News Engine
ELASTICSEARCH_URL=$ES_URL
ELASTICSEARCH_ENDPOINT=$ES_URL
ELASTICSEARCH_API_KEY=$ES_API_KEY
ELASTICSEARCH_INDEX=$ES_INDEX
ES_NUMBER_OF_SHARDS=$ES_SHARDS
ES_NUMBER_OF_REPLICAS=$ES_REPLICAS
ENVIRONMENT=$ENV
CORS_ALLOWED_ORIGINS="https://financialnewsengine.com,https://www.financialnewsengine.com,http://localhost:3000"
EOL

# Set secure permissions
chmod 644 /opt/financial-news-engine/.env
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