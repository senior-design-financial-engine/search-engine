#!/bin/bash
set -e

# Create directory if it does not exist
mkdir -p /opt/financial-news-engine
mkdir -p /opt/financial-news-engine/logs

# Copy files
cp app.py /opt/financial-news-engine/
cp requirements.txt /opt/financial-news-engine/
cp financial-news.service /etc/systemd/system/

# Fetch parameters from SSM
echo "Fetching credentials from SSM Parameter Store..."
ES_URL=$(aws ssm get-parameter --name "/financial-news/elasticsearch-url" --with-decryption --query "Parameter.Value" --output text)
ES_API_KEY=$(aws ssm get-parameter --name "/financial-news/elasticsearch-api-key" --with-decryption --query "Parameter.Value" --output text)
ES_INDEX=$(aws ssm get-parameter --name "/financial-news/elasticsearch-index" --with-decryption --query "Parameter.Value" --output text)

# Create .env file with environment variables
cat > /opt/financial-news-engine/.env << EOLENV
ELASTICSEARCH_URL=$ES_URL
ELASTICSEARCH_API_KEY=$ES_API_KEY
ELASTICSEARCH_INDEX=$ES_INDEX
EOLENV
chmod 600 /opt/financial-news-engine/.env
echo "Created .env file with credentials from SSM Parameter Store"

# Install dependencies
cd /opt/financial-news-engine
pip3 install -r requirements.txt

# Set permissions
chmod 755 /opt/financial-news-engine

# Reload and start service
systemctl daemon-reload
systemctl enable financial-news.service
systemctl restart financial-news.service

echo "API deployment completed" 