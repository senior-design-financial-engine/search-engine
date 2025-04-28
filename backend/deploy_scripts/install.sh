#!/bin/bash

# Deployment installation script for Financial News Engine
LOG_FILE="/opt/financial-news-engine/logs/install.log"

# Ensure directories exist
mkdir -p /opt/financial-news-engine/logs
mkdir -p /opt/financial-news-engine/deploy_scripts
mkdir -p /opt/financial-news-engine/utils

# Start logging
echo "=== Installation started at $(date) ===" > $LOG_FILE

# Copy scripts
cp -f /tmp/deploy_scripts/* /opt/financial-news-engine/deploy_scripts/ 2>/dev/null || echo "No scripts to copy from /tmp/deploy_scripts" >> $LOG_FILE
cp -f deploy_scripts/* /opt/financial-news-engine/deploy_scripts/ 2>/dev/null || echo "No scripts to copy from deploy_scripts" >> $LOG_FILE

# Fix permissions
chmod -R 755 /opt/financial-news-engine/deploy_scripts/
chmod -R 777 /opt/financial-news-engine/logs/

# Run AWS configuration script
if [ -f "/opt/financial-news-engine/deploy_scripts/configure_aws.sh" ]; then
  echo "Running AWS configuration script" | tee -a $LOG_FILE
  bash /opt/financial-news-engine/deploy_scripts/configure_aws.sh | tee -a $LOG_FILE
else
  echo "WARNING: AWS configuration script not found" | tee -a $LOG_FILE
fi

# Create temporary AWS config to ensure region is set
mkdir -p ~/.aws
cat > ~/.aws/config << EOL
[default]
region = us-east-1
output = json
EOL

# Create .env file
if [ -f "/opt/financial-news-engine/deploy_scripts/create_env_file.sh" ]; then
  echo "Creating environment file" | tee -a $LOG_FILE
  bash /opt/financial-news-engine/deploy_scripts/create_env_file.sh | tee -a $LOG_FILE
else
  echo "WARNING: Environment setup script not found" | tee -a $LOG_FILE
  
  # Create a basic .env file with default values
  cat > /opt/financial-news-engine/.env << EOL
# Environment variables for Financial News Engine
AWS_REGION=us-east-1
AWS_DEFAULT_REGION=us-east-1
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_ENDPOINT=http://localhost:9200
ELASTICSEARCH_API_KEY=default-dev-key
ELASTICSEARCH_INDEX=financial_news
ES_NUMBER_OF_SHARDS=1
ES_NUMBER_OF_REPLICAS=0
ENVIRONMENT=development
CORS_ALLOWED_ORIGINS="https://financialnewsengine.com,https://www.financialnewsengine.com,http://localhost:3000"
EOL
  chmod 644 /opt/financial-news-engine/.env
  echo "Created default .env file" | tee -a $LOG_FILE
fi

# Ensure the service file is copied 
if [ -f "/tmp/financial-news.service" ]; then
  cp -f /tmp/financial-news.service /etc/systemd/system/
  chmod 644 /etc/systemd/system/financial-news.service
  echo "Copied service file from /tmp" | tee -a $LOG_FILE
fi

# Reload systemd 
systemctl daemon-reload
echo "Reloaded systemd" | tee -a $LOG_FILE

# Install required Python packages
if [ -f "/opt/financial-news-engine/requirements.txt" ]; then
  echo "Installing Python dependencies" | tee -a $LOG_FILE
  pip3 install -r /opt/financial-news-engine/requirements.txt | tee -a $LOG_FILE
else
  echo "WARNING: requirements.txt not found" | tee -a $LOG_FILE
  # Install minimum requirements
  pip3 install Flask==2.0.1 flask-cors==3.0.10 gunicorn==20.1.0 elasticsearch==7.14.0 python-dotenv==0.19.0 requests==2.31.0 | tee -a $LOG_FILE
  echo "Installed minimum Python dependencies" | tee -a $LOG_FILE
fi

# Start the service
echo "Starting financial-news service" | tee -a $LOG_FILE
systemctl enable financial-news
systemctl restart financial-news

# Check service status
sleep 5
systemctl status financial-news | tee -a $LOG_FILE

echo "=== Installation completed at $(date) ===" | tee -a $LOG_FILE 