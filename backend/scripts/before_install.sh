#!/bin/bash

# Create app directory if it doesn't exist
mkdir -p /opt/financial-news-engine

# Backup existing application
if [ -d "/opt/financial-news-engine/backup" ]; then
  rm -rf /opt/financial-news-engine/backup
fi

if [ -f "/opt/financial-news-engine/app.py" ]; then
  mkdir -p /opt/financial-news-engine/backup
  cp -r /opt/financial-news-engine/* /opt/financial-news-engine/backup/
fi 