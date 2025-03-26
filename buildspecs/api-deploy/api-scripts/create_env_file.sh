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
REGION=$(curl -s http://169.254.169.254/latest/meta-data/placement/region || echo "us-east-1")

echo "Starting environment file creation..."
echo "Target .env file: $ENV_FILE"
echo "Parameter path: $PARAM_PATH"
echo "AWS Region: $REGION"

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

# Create empty .env file
sudo mkdir -p $APP_DIR
sudo touch $ENV_FILE
sudo chmod 666 $ENV_FILE
echo "# Financial News Engine Environment File" > $ENV_FILE
echo "# Generated at $(date)" >> $ENV_FILE
echo "" >> $ENV_FILE

# Function to get parameter with error handling
get_parameter() {
    local param_name=$1
    local default_value=$2
    local value

    # Try to get parameter directly first
    value=$(aws ssm get-parameter --name "$PARAM_PATH/$param_name" --with-decryption --region $REGION --query "Parameter.Value" --output text 2>/dev/null || echo "")

    # If parameter not found, check if default value provided
    if [ -z "$value" ] && [ ! -z "$default_value" ]; then
        echo "Parameter $param_name not found. Using default value."
        value=$default_value
    elif [ -z "$value" ]; then
        echo "WARNING: Parameter $param_name not found and no default provided."
        return 1
    fi

    # Add parameter to .env file
    echo "$param_name=$value" >> $ENV_FILE
    echo "Added $param_name to environment file."
    return 0
}

# Try getting all parameters by path first (more efficient)
echo "Attempting to get all parameters by path..."
param_json=$(aws ssm get-parameters-by-path --path "$PARAM_PATH" --with-decryption --region $REGION --output json 2>/dev/null || echo "")

if [ ! -z "$param_json" ]; then
    # Extract parameters from JSON if successful
    echo "Got parameters by path. Extracting..."
    
    # Parse the parameters and add to .env file
    echo "$param_json" | jq -r '.Parameters[] | .Name + "=" + .Value' | while read -r line; do
        # Extract just the parameter name without the path
        param_name=$(echo "$line" | cut -d'/' -f3 | cut -d'=' -f1)
        param_value=$(echo "$line" | cut -d'=' -f2-)
        
        echo "${param_name}=${param_value}" >> $ENV_FILE
        echo "Added $param_name to environment file."
    done
else
    echo "Could not get parameters by path. Falling back to individual parameter retrieval."
    
    # Fallback to individual parameter retrieval
    get_parameter "elasticsearch-url" "http://localhost:9200"
    get_parameter "elasticsearch-api-key" "placeholder-api-key"
    get_parameter "elasticsearch-index" "financial-news"
    get_parameter "es-number-of-shards" "1"
    get_parameter "es-number-of-replicas" "0"
    get_parameter "environment" "development"
    
    # Add additional parameters as needed
    get_parameter "api-port" "5000"
    get_parameter "log-level" "INFO"
fi

# Set correct permissions on .env file
sudo chmod 644 $ENV_FILE
sudo chown ubuntu:ubuntu $ENV_FILE

echo "Environment file created successfully at $ENV_FILE"
exit 0

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