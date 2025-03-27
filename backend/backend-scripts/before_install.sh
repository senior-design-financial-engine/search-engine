#!/bin/bash

# Output all commands for debugging
set -x

# Create app directory if it doesn't exist
mkdir -p /opt/financial-news-engine

# Create log directory with full permissions
mkdir -p /opt/financial-news-engine/logs
chmod -R 777 /opt/financial-news-engine/logs

# Create a deployment log
DEPLOY_LOG="/opt/financial-news-engine/logs/deployment.log"
echo "=== Deployment started at $(date) ===" > $DEPLOY_LOG

# Check if python3 is available and log version
if command -v python3 &> /dev/null; then
    python3 --version >> $DEPLOY_LOG 2>&1
else
    echo "ERROR: Python3 not found" >> $DEPLOY_LOG
fi

# Check if pip3 is available and log version
if command -v pip3 &> /dev/null; then
    pip3 --version >> $DEPLOY_LOG 2>&1
else
    echo "ERROR: pip3 not found" >> $DEPLOY_LOG
fi

# Log gunicorn availability
if command -v gunicorn &> /dev/null; then
    gunicorn --version >> $DEPLOY_LOG 2>&1
else
    echo "WARNING: gunicorn not found, will attempt to install" >> $DEPLOY_LOG
    pip3 install gunicorn >> $DEPLOY_LOG 2>&1
fi

# Log disk space
echo "Disk space information:" >> $DEPLOY_LOG
df -h >> $DEPLOY_LOG

# Check if .env file exists and log its presence
if [ -f "/opt/financial-news-engine/.env" ]; then
    echo ".env file exists" >> $DEPLOY_LOG
    # Count number of non-empty values in .env
    NON_EMPTY_VARS=$(grep -v "^#" /opt/financial-news-engine/.env | grep "=" | grep -v "=$" | wc -l)
    echo "Number of configured environment variables: $NON_EMPTY_VARS" >> $DEPLOY_LOG
else
    echo "WARNING: .env file not found" >> $DEPLOY_LOG
fi

# Backup existing application
if [ -d "/opt/financial-news-engine/backup" ]; then
  rm -rf /opt/financial-news-engine/backup
fi

if [ -f "/opt/financial-news-engine/app.py" ]; then
  mkdir -p /opt/financial-news-engine/backup
  cp -r /opt/financial-news-engine/* /opt/financial-news-engine/backup/
  echo "Backed up existing application" >> $DEPLOY_LOG
fi

# Create any missing directories
mkdir -p /opt/financial-news-engine/deploy_scripts
chmod 755 /opt/financial-news-engine/deploy_scripts

echo "=== Pre-installation steps completed at $(date) ===" >> $DEPLOY_LOG 