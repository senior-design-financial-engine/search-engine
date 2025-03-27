#!/bin/bash

# Output all commands for debugging
set -x

# Define log file
DEPLOY_LOG="/opt/financial-news-engine/logs/deployment.log"
echo "=== Deployment execution started at $(date) ===" >> $DEPLOY_LOG

# Stop the current service if it exists
if systemctl is-active --quiet financial-news.service; then
  echo "Stopping existing service" >> $DEPLOY_LOG
  systemctl stop financial-news.service
  sleep 2
fi

# Extract the deployment package
echo "Extracting deployment package" >> $DEPLOY_LOG
cd /opt/financial-news-engine
if [ -f "/tmp/backend.zip" ]; then
  unzip -o /tmp/backend.zip -d . >> $DEPLOY_LOG 2>&1
  echo "Extracted backend.zip" >> $DEPLOY_LOG
else
  echo "ERROR: backend.zip not found" >> $DEPLOY_LOG
  exit 1
fi

# Verify critical files exist
if [ ! -f "/opt/financial-news-engine/app.py" ]; then
  echo "ERROR: app.py not found after extraction" >> $DEPLOY_LOG
  exit 1
fi

# Create utils directory if it doesn't exist
mkdir -p /opt/financial-news-engine/utils
chmod 755 /opt/financial-news-engine/utils

# Copy logger.py to utils if it's not in the zip
if [ ! -f "/opt/financial-news-engine/utils/logger.py" ] && [ -f "/opt/financial-news-engine/logger.py" ]; then
  cp /opt/financial-news-engine/logger.py /opt/financial-news-engine/utils/
  echo "Copied logger.py to utils directory" >> $DEPLOY_LOG
fi

# Create empty __init__.py in utils if needed for imports
touch /opt/financial-news-engine/utils/__init__.py

# Install dependencies
echo "Installing dependencies" >> $DEPLOY_LOG
pip3 install -r requirements.txt >> $DEPLOY_LOG 2>&1

# Ensure gunicorn is installed
if ! command -v gunicorn &> /dev/null; then
  echo "Installing gunicorn" >> $DEPLOY_LOG
  pip3 install gunicorn >> $DEPLOY_LOG 2>&1
fi

# Set permissions on critical directories
chmod -R 777 /opt/financial-news-engine/logs
chmod 755 /opt/financial-news-engine/app.py

# Test app.py directly to check for syntax errors
echo "Performing Python syntax check" >> $DEPLOY_LOG
python3 -m py_compile /opt/financial-news-engine/app.py >> $DEPLOY_LOG 2>&1
if [ $? -ne 0 ]; then
  echo "WARNING: app.py has syntax errors" >> $DEPLOY_LOG
else
  echo "app.py syntax check passed" >> $DEPLOY_LOG
fi

# Restart the service
echo "Restarting service" >> $DEPLOY_LOG
systemctl daemon-reload
systemctl start financial-news.service

# Wait for service to start
sleep 5

# Check status
systemctl status financial-news.service >> $DEPLOY_LOG 2>&1
STATUS=$?

if [ $STATUS -eq 0 ]; then
  echo "Service started successfully" >> $DEPLOY_LOG
else
  echo "WARNING: Service failed to start properly. Checking logs..." >> $DEPLOY_LOG
  
  # Try to get error logs
  tail -n 50 /opt/financial-news-engine/logs/*.log >> $DEPLOY_LOG 2>&1
  
  # Attempt to start in fallback mode if service failed
  if [ -f "/opt/financial-news-engine/app.py" ]; then
    echo "Attempting to start application directly" >> $DEPLOY_LOG
    nohup python3 /opt/financial-news-engine/app.py > /opt/financial-news-engine/logs/direct-output.log 2> /opt/financial-news-engine/logs/direct-error.log &
    echo "Started application directly with PID $!" >> $DEPLOY_LOG
  fi
fi

echo "=== Deployment completed at $(date) ===" >> $DEPLOY_LOG 