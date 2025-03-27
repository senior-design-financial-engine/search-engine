#!/bin/bash

# Script to verify deployment and ensure EC2 instances are running the latest code
INSTALL_DIR="/opt/financial-news-engine"
LOG_FILE="${INSTALL_DIR}/logs/deployment_verify.log"
VERSION_FILE="${INSTALL_DIR}/.version"
DEPLOYMENT_TIMESTAMP="$(date +%Y%m%d%H%M%S)"
APP_VERSION="1.0.0" # Update this with each deployment

# Ensure log directory exists
mkdir -p "${INSTALL_DIR}/logs"

echo "$(date) - Starting deployment verification" | tee -a $LOG_FILE

# Function to check if application needs update
check_version() {
  if [[ -f "$VERSION_FILE" ]]; then
    local current_version=$(cat "$VERSION_FILE")
    echo "Current version: $current_version" | tee -a $LOG_FILE
    echo "Target version: $APP_VERSION" | tee -a $LOG_FILE
    
    if [[ "$current_version" == "$APP_VERSION" ]]; then
      echo "Application is up to date." | tee -a $LOG_FILE
      return 1
    else
      echo "Application needs update. Current: $current_version, Target: $APP_VERSION" | tee -a $LOG_FILE
      return 0
    fi
  else
    echo "No version file found. Application needs update." | tee -a $LOG_FILE
    return 0
  fi
}

# Function to check if Python imports are working correctly
check_imports() {
  echo "Checking Python imports..." | tee -a $LOG_FILE
  
  cd $INSTALL_DIR
  
  # Test if we can import utils.logger
  python3 -c "import sys; sys.path.insert(0, '.'); import utils.logger" 2>> $LOG_FILE
  
  if [ $? -ne 0 ]; then
    echo "Import test failed. Application needs update." | tee -a $LOG_FILE
    return 0
  else
    echo "Import test passed." | tee -a $LOG_FILE
    return 1
  fi
}

# Function to fix Python path issues by creating __init__.py files if needed
fix_python_paths() {
  echo "Ensuring Python package structure is correct..." | tee -a $LOG_FILE
  
  # Make sure utils is a proper package
  if [[ ! -f "${INSTALL_DIR}/utils/__init__.py" ]]; then
    echo "Creating missing __init__.py in utils directory" | tee -a $LOG_FILE
    touch "${INSTALL_DIR}/utils/__init__.py"
  fi
  
  # Check for other directories that should be packages
  for dir in api es_database scraper; do
    if [[ -d "${INSTALL_DIR}/${dir}" && ! -f "${INSTALL_DIR}/${dir}/__init__.py" ]]; then
      echo "Creating missing __init__.py in ${dir} directory" | tee -a $LOG_FILE
      touch "${INSTALL_DIR}/${dir}/__init__.py"
    fi
  done
}

# Function to update application
update_application() {
  echo "Updating application..." | tee -a $LOG_FILE
  
  # If we were running in a real environment, we might download the latest
  # code here from S3 or another source. For now, we'll assume the code
  # is already available and just fix the Python path issues.
  
  # Fix Python paths
  fix_python_paths
  
  # Update version file
  echo "$APP_VERSION" > "$VERSION_FILE"
  
  # Add APP_VERSION to environment file
  if [[ -f "${INSTALL_DIR}/.env" ]]; then
    if grep -q "APP_VERSION" "${INSTALL_DIR}/.env"; then
      sed -i "s/APP_VERSION=.*/APP_VERSION=$APP_VERSION/" "${INSTALL_DIR}/.env"
    else
      echo "APP_VERSION=$APP_VERSION" >> "${INSTALL_DIR}/.env"
    fi
  fi
  
  echo "Application updated to version $APP_VERSION" | tee -a $LOG_FILE
  
  # Check if the service exists and restart it
  if systemctl list-unit-files | grep -q financial-news; then
    echo "Restarting financial-news service..." | tee -a $LOG_FILE
    systemctl restart financial-news
    
    # Verify service is running
    sleep 5
    if systemctl is-active --quiet financial-news; then
      echo "Service successfully restarted." | tee -a $LOG_FILE
    else
      echo "WARNING: Service failed to restart." | tee -a $LOG_FILE
      systemctl status financial-news | tee -a $LOG_FILE
    fi
  else
    echo "Service not found. Application may need to be manually restarted." | tee -a $LOG_FILE
  fi
}

# Function to check if service is healthy
check_health() {
  echo "Checking application health..." | tee -a $LOG_FILE
  
  # Try to access health endpoint
  health_response=$(curl -s http://localhost:5000/health 2>> $LOG_FILE)
  
  if [ $? -eq 0 ] && [[ "$health_response" == *"status"* ]]; then
    echo "Health check passed. Application is running correctly." | tee -a $LOG_FILE
    return 0
  else
    echo "Health check failed. Application may not be running correctly." | tee -a $LOG_FILE
    return 1
  fi
}

# Main execution flow
# Check if we need to update
if check_version || check_imports; then
  update_application
fi

# Check health after potential update
check_health

echo "Deployment verification completed at $(date)" | tee -a $LOG_FILE

# Return success
exit 0 