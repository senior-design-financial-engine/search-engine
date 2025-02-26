#!/bin/bash
echo "Before install script running..."

# Install necessary dependencies
if [ -f "/etc/debian_version" ]; then
  apt-get update
  apt-get install -y nodejs npm
elif [ -f "/etc/redhat-release" ]; then
  yum update -y
  yum install -y nodejs npm
fi

# Clean destination directory if it exists
if [ -d "/var/www/html" ]; then
  echo "Cleaning destination directory..."
  rm -rf /var/www/html/*
fi

echo "Before install completed" 