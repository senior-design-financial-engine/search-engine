#!/bin/bash

set -e

echo "Starting API deployment"

# Define constants - standardized path
APP_DIR="/opt/financial-news-engine"
SERVICE_NAME="financial-news"
DEPLOY_SCRIPTS_DIR="$APP_DIR/deploy_scripts"
LOGS_DIR="$APP_DIR/logs"

# Create directories if they don't exist
echo "Creating application directories"
sudo mkdir -p $APP_DIR
sudo mkdir -p $LOGS_DIR
sudo mkdir -p $DEPLOY_SCRIPTS_DIR

# Install dependencies
echo "Installing dependencies"
sudo apt-get update -y || sudo yum update -y
sudo apt-get install -y python3-pip jq unzip || sudo yum install -y python3-pip jq unzip

# Create updated get-parameters script
cat > $DEPLOY_SCRIPTS_DIR/create_env_file.sh << 'EOL'
#!/bin/bash
# Fetch environment variables from SSM Parameter Store using get-parameters-by-path
echo "Fetching credentials from SSM Parameter Store using get-parameters-by-path"

# Use get-parameters-by-path to get all parameters at once
echo "Retrieving all parameters at once"
PARAMS=$(aws ssm get-parameters-by-path --path "/financial-news/" --recursive --with-decryption --query "Parameters[*].[Name,Value]" --output json)

# Check if parameters were retrieved successfully
if [ -z "$PARAMS" ] || [ "$PARAMS" == "[]" ]; then
    echo "WARNING: No parameters found at path /financial-news/"
    # Fall back to individual parameter retrieval
    function get_parameter() {
        local param_name=$1
        local default_value=$2
        
        echo "Fetching parameter: $param_name"
        local value=$(aws ssm get-parameter --name "$param_name" --with-decryption --query "Parameter.Value" --output text 2>/dev/null)
        local exit_code=$?
        
        if [ $exit_code -eq 0 ] && [ -n "$value" ] && [ "$value" != "None" ]; then
            echo "Successfully retrieved parameter: $param_name"
            echo "$value"
        else
            echo "WARNING: Failed to retrieve parameter: $param_name - using default value: $default_value"
            echo "$default_value"
        fi
    }
    
    # Get parameters with default fallbacks
    ES_URL=$(get_parameter "/financial-news/elasticsearch-url" "https://fc9fa0b183414ca28ea4c7288ad74e23.us-east-1.aws.found.io:443")
    ES_API_KEY=$(get_parameter "/financial-news/elasticsearch-api-key" "default-api-key")
    ES_INDEX=$(get_parameter "/financial-news/elasticsearch-index" "financial_news")
    ES_SHARDS=$(get_parameter "/financial-news/es-number-of-shards" "1")
    ES_REPLICAS=$(get_parameter "/financial-news/es-number-of-replicas" "0")
    ENV=$(get_parameter "/financial-news/environment" "development")
else
    # Extract each parameter value from the JSON response
    echo "Parameters retrieved successfully, extracting values"
    ES_URL=$(echo $PARAMS | jq -r '.[] | select(.[0]=="/financial-news/elasticsearch-url") | .[1]')
    ES_API_KEY=$(echo $PARAMS | jq -r '.[] | select(.[0]=="/financial-news/elasticsearch-api-key") | .[1]')
    ES_INDEX=$(echo $PARAMS | jq -r '.[] | select(.[0]=="/financial-news/elasticsearch-index") | .[1]')
    ES_SHARDS=$(echo $PARAMS | jq -r '.[] | select(.[0]=="/financial-news/es-number-of-shards") | .[1]')
    ES_REPLICAS=$(echo $PARAMS | jq -r '.[] | select(.[0]=="/financial-news/es-number-of-replicas") | .[1]')
    ENV=$(echo $PARAMS | jq -r '.[] | select(.[0]=="/financial-news/environment") | .[1]')
fi

# Fallback to defaults if values are empty
ES_URL=${ES_URL:-"https://fc9fa0b183414ca28ea4c7288ad74e23.us-east-1.aws.found.io:443"}
ES_API_KEY=${ES_API_KEY:-"default-api-key"}
ES_INDEX=${ES_INDEX:-"financial_news"}
ES_SHARDS=${ES_SHARDS:-"1"}
ES_REPLICAS=${ES_REPLICAS:-"0"}
ENV=${ENV:-"development"}

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

chmod 600 /opt/financial-news-engine/.env
echo "Created .env file with environment variables from SSM Parameter Store"
EOL

chmod +x $DEPLOY_SCRIPTS_DIR/create_env_file.sh

# Extract app code from backend-api.yaml if it exists in S3
echo "Checking for backend-api.yaml in S3"
BUCKET_NAME=$(aws cloudformation describe-stacks --query "Stacks[?contains(StackName, 'financial-news')].Outputs[?OutputKey=='AssetsBucketName'].OutputValue" --output text)

if [ -n "$BUCKET_NAME" ]; then
    echo "Found assets bucket: $BUCKET_NAME"
    aws s3 cp s3://$BUCKET_NAME/api/backend-api.yaml /tmp/backend-api.yaml 2>/dev/null || echo "backend-api.yaml not found in S3"
    
    if [ -f "/tmp/backend-api.yaml" ]; then
        echo "Extracting app code from backend-api.yaml"
        grep -A10000 "app_code: |" /tmp/backend-api.yaml | tail -n +2 | sed '/^[a-zA-Z]/,$d' | sed 's/^  //' > $APP_DIR/app.py
        chmod +x $APP_DIR/app.py
        
        echo "Extracting requirements from backend-api.yaml"
        grep -A10000 "requirements: |" /tmp/backend-api.yaml | tail -n +2 | sed '/^[a-zA-Z]/,$d' | sed 's/^  //' > $APP_DIR/requirements.txt
    fi
fi

# If app.py not found from S3, check if it was passed directly
if [ ! -f "$APP_DIR/app.py" ] && [ -f "app.py" ]; then
    echo "Using provided app.py file"
    sudo cp app.py $APP_DIR/
fi

if [ ! -f "$APP_DIR/requirements.txt" ] && [ -f "requirements.txt" ]; then
    echo "Using provided requirements.txt file"
    sudo cp requirements.txt $APP_DIR/
fi

# Install Python requirements
echo "Installing Python requirements"
if [ -f "$APP_DIR/requirements.txt" ]; then
    sudo pip3 install -r $APP_DIR/requirements.txt
else
    echo "No requirements.txt found, installing default requirements"
    sudo pip3 install flask flask-cors elasticsearch boto3 requests psutil
fi

# Set up service file
echo "Setting up systemd service"
cat > /etc/systemd/system/financial-news.service << EOL
[Unit]
Description=Financial News API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=$APP_DIR
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 $APP_DIR/app.py
Restart=on-failure
RestartSec=5
StandardOutput=append:$LOGS_DIR/service-output.log
StandardError=append:$LOGS_DIR/service-error.log
SyslogIdentifier=financial-news

[Install]
WantedBy=multi-user.target
EOL

# Run environment file creation script
echo "Creating environment file"
sudo $DEPLOY_SCRIPTS_DIR/create_env_file.sh

# Reload and restart service
echo "Restarting service"
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

if [ -f "$APP_DIR/app.py" ]; then
    sudo systemctl restart $SERVICE_NAME
    echo "API deployment completed successfully"
else
    echo "ERROR: app.py not found! Service not started."
    exit 1
fi 