#!/bin/bash

echo "Verifying API deployment"

# Define constants
SERVICE_NAME="financial-news"
APP_DIR="/opt/financial-news"
MAX_RETRIES=5
RETRY_DELAY=10
STATUS_PORT=8000

# Check if service is running
echo "Checking service status"
if ! systemctl is-active --quiet $SERVICE_NAME; then
  echo "ERROR: Service $SERVICE_NAME is not running"
  systemctl status $SERVICE_NAME
  exit 1
fi

echo "Service is running"

# Check if application process is running
PID=$(pgrep -f "python.*app.py" || echo "")
if [ -z "$PID" ]; then
  echo "ERROR: No Python process found for the API"
  exit 1
fi

echo "API process is running with PID: $PID"

# Wait for API to be responsive
echo "Checking API health endpoint..."
for i in $(seq 1 $MAX_RETRIES); do
  echo "Attempt $i of $MAX_RETRIES..."
  
  # Try a local request to health or status endpoint
  if curl -s "http://localhost:$STATUS_PORT/health" | grep -q "ok"; then
    echo "SUCCESS: API health check passed"
    break
  fi
  
  if [ $i -eq $MAX_RETRIES ]; then
    echo "ERROR: API health check failed after $MAX_RETRIES attempts"
    exit 1
  fi
  
  echo "Waiting $RETRY_DELAY seconds before next attempt..."
  sleep $RETRY_DELAY
done

echo "API verification completed successfully"
exit 0 