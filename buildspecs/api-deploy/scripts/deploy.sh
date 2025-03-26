#!/bin/bash

set -e

echo "Starting API deployment"

# Define constants
APP_DIR="/opt/financial-news"
SERVICE_NAME="financial-news"
CONFIG_DIR="/etc/financial-news"

# Create directories if they don't exist
echo "Creating application directories"
sudo mkdir -p $APP_DIR
sudo mkdir -p $CONFIG_DIR

# Install dependencies
echo "Installing dependencies"
sudo apt-get update -y || sudo yum update -y
sudo apt-get install -y python3-pip python3-venv || sudo yum install -y python3-pip python3-virtualenv

# Create and activate virtual environment
echo "Setting up Python virtual environment"
sudo python3 -m venv $APP_DIR/venv
source $APP_DIR/venv/bin/activate

# Copy application files
echo "Copying application files"
sudo cp app.py $APP_DIR/
sudo cp requirements.txt $APP_DIR/

# Install Python requirements
echo "Installing Python requirements"
sudo $APP_DIR/venv/bin/pip install -r $APP_DIR/requirements.txt

# Set up service
echo "Setting up systemd service"
sudo cp financial-news.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE_NAME

# Restart service
echo "Restarting service"
sudo systemctl restart $SERVICE_NAME

echo "API deployment completed successfully" 