#!/bin/bash

# Stop the current service if it exists
if systemctl is-active --quiet financial-news.service; then
  systemctl stop financial-news.service
fi

# Extract the deployment package
cd /opt/financial-news-engine
unzip -o /tmp/backend.zip -d .

# Install dependencies
pip3 install -r requirements.txt

# Restart the service
systemctl daemon-reload
systemctl start financial-news.service

# Check status
systemctl status financial-news.service 