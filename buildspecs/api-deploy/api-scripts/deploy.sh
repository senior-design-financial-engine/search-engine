#!/bin/bash
# deploy.sh - Script to deploy the application to the EC2 instance

set -e
set -o pipefail

APP_DIR="/opt/financial-news-engine"
LOG_DIR="$APP_DIR/logs"
DEPLOY_SCRIPTS_DIR="$APP_DIR/deploy_scripts"
SERVICE_NAME="financial-news"
USER=$(whoami)

echo "Starting deployment process as user: $USER"

# Create application directory and log directory
sudo mkdir -p $APP_DIR
sudo mkdir -p $LOG_DIR
sudo mkdir -p $DEPLOY_SCRIPTS_DIR

# Copy files from temp directory
echo "Copying application files to $APP_DIR"
sudo cp /tmp/api-deploy/app.py $APP_DIR/app.py
sudo cp /tmp/api-deploy/requirements.txt $APP_DIR/requirements.txt

# Copy deployment scripts if they exist
if [ -d "/tmp/api-deploy/deploy_scripts" ]; then
    echo "Copying deployment scripts"
    sudo cp -r /tmp/api-deploy/deploy_scripts/* $DEPLOY_SCRIPTS_DIR/
fi

# Set correct permissions
echo "Setting permissions"
sudo chown -R ubuntu:ubuntu $APP_DIR
sudo chmod -R 755 $APP_DIR

# Install dependencies
echo "Installing Python dependencies"
sudo pip3 install -r $APP_DIR/requirements.txt

# Create systemd service
echo "Creating systemd service"
sudo bash -c 'cat > /etc/systemd/system/financial-news.service << EOF
[Unit]
Description=Financial News API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/financial-news-engine
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /opt/financial-news-engine/app.py
Restart=on-failure
RestartSec=5
StandardOutput=append:/opt/financial-news-engine/logs/service-output.log
StandardError=append:/opt/financial-news-engine/logs/service-error.log
SyslogIdentifier=financial-news

[Install]
WantedBy=multi-user.target
EOF'

# Reload systemd and restart service
echo "Reloading systemd and starting service"
sudo systemctl daemon-reload
sudo systemctl enable financial-news.service
sudo systemctl restart financial-news.service

echo "Deployment completed successfully"
exit 0
