#!/bin/bash

set -e

echo "Starting API deployment"

# Define constants - standardized path
APP_DIR="/opt/financial-news-engine"
SERVICE_NAME="financial-news"
DEPLOY_SCRIPTS_DIR="/deploy_scripts"
LOGS_DIR="/logs"

# Create directories if they don't exist
echo "Creating application directories"
sudo mkdir -p 
sudo mkdir -p 
sudo mkdir -p 

# Install dependencies
echo "Installing dependencies"
sudo apt-get update -y || sudo yum update -y
sudo apt-get install -y python3-pip jq unzip || sudo yum install -y python3-pip jq unzip

# Run environment file creation script
echo "Creating environment file"
sudo cp create_env_file.sh /
sudo chmod +x /create_env_file.sh
sudo /create_env_file.sh

# Copy application files
echo "Copying application files"
sudo cp app.py /
sudo cp requirements.txt /

# Install Python requirements
echo "Installing Python requirements"
sudo pip3 install -r /requirements.txt

# Set up service file
echo "Setting up systemd service"
cat > /etc/systemd/system/financial-news.service << EOL
[Unit]
Description=Financial News API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /app.py
Restart=on-failure
RestartSec=5
StandardOutput=append:/service-output.log
StandardError=append:/service-error.log
SyslogIdentifier=financial-news

[Install]
WantedBy=multi-user.target
EOL

# Reload and restart service
echo "Restarting service"
sudo systemctl daemon-reload
sudo systemctl enable 

if [ -f "/app.py" ]; then
    sudo systemctl restart 
    echo "API deployment completed successfully"
else
    echo "ERROR: app.py not found! Service not started."
    exit 1
fi
