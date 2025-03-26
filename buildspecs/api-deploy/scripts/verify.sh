#!/bin/bash

set -e

echo "Running API verification"

# Define constants - use standardized paths
APP_DIR="/opt/financial-news-engine"
LOGS_DIR="$APP_DIR/logs"
SERVICE_NAME="financial-news"

# Function to check if service is running
check_service() {
    local status=$(systemctl is-active $SERVICE_NAME)
    if [ "$status" == "active" ]; then
        echo "Service $SERVICE_NAME is running"
        return 0
    else
        echo "Service $SERVICE_NAME is NOT running (status: $status)"
        return 1
    fi
}

# Check service status
echo "Checking service status..."
check_service

# Check for log files
echo "Checking log files..."
if [ -f "$LOGS_DIR/service-output.log" ]; then
    echo "Service output log exists"
    tail -n 10 "$LOGS_DIR/service-output.log"
else
    echo "WARNING: Service output log not found at $LOGS_DIR/service-output.log"
fi

if [ -f "$LOGS_DIR/service-error.log" ]; then
    echo "Service error log exists"
    if [ -s "$LOGS_DIR/service-error.log" ]; then
        echo "WARNING: Error log contains data:"
        tail -n 10 "$LOGS_DIR/service-error.log"
    else
        echo "Error log is empty (good)"
    fi
else
    echo "WARNING: Service error log not found at $LOGS_DIR/service-error.log"
fi

# Check if app.py exists
echo "Checking app.py..."
if [ -f "$APP_DIR/app.py" ]; then
    echo "app.py exists at $APP_DIR/app.py"
else
    echo "ERROR: app.py not found at $APP_DIR/app.py"
    exit 1
fi

# Check if service is accessible
echo "Testing API health endpoint..."
HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health || echo "Failed")
if [ "$HTTP_RESPONSE" == "200" ]; then
    echo "API health endpoint responded with 200 OK"
    curl -s http://localhost:5000/health
else
    echo "WARNING: API health endpoint returned $HTTP_RESPONSE"
fi

echo "API verification completed" 