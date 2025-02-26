#!/bin/bash
# CodeDeploy BeforeInstall script for frontend deployment
set -e  # Exit immediately if a command exits with a non-zero status

echo "Before install script running at $(date)"

# Install necessary dependencies
echo "Checking OS type and installing Node.js dependencies..."
if [ -f "/etc/debian_version" ]; then
  echo "Debian/Ubuntu detected"
  apt-get update
  apt-get install -y nodejs npm
elif [ -f "/etc/redhat-release" ]; then
  echo "RedHat/CentOS/Amazon Linux detected"
  yum update -y
  yum install -y nodejs npm
else
  echo "Unknown OS, attempting to continue without installing Node.js..."
fi

# Clean destination directory if it exists
if [ -d "/var/www/html" ]; then
  echo "Cleaning destination directory..."
  rm -rf /var/www/html/*
else
  echo "Creating /var/www/html directory..."
  mkdir -p /var/www/html
fi

echo "Before install completed successfully at $(date)"
exit 0 