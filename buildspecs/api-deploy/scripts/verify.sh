#!/bin/bash
# verify.sh - Verification script for checking if the deployment was successful

set -e

APP_DIR="/opt/financial-news-engine"
SERVICE_NAME="financial-news"
MAX_RETRY=10
RETRY_INTERVAL=5

echo "Starting application verification..."

# Check if the service is running
check_service() {
    echo "Checking if $SERVICE_NAME service is running..."
    
    if systemctl is-active --quiet $SERVICE_NAME; then
        echo "✅ Service $SERVICE_NAME is running."
        return 0
    else
        echo "❌ Service $SERVICE_NAME is not running."
        
        # Print service status and logs for debugging
        echo "Service status:"
        sudo systemctl status $SERVICE_NAME || true
        
        echo "Service logs:"
        sudo journalctl -u $SERVICE_NAME -n 20 || true
        
        return 1
    fi
}

# Check if the application is responding
check_application() {
    echo "Checking if application is responding to requests..."
    
    # Try to access the health endpoint
    local response=""
    local retry_count=0
    local success=false
    
    while [ $retry_count -lt $MAX_RETRY ]; do
        if response=$(curl -s http://localhost:5000/health 2>/dev/null); then
            if [[ "$response" == *"healthy"* ]]; then
                echo "✅ Application is responding correctly."
                success=true
                break
            fi
        fi
        
        echo "Application not responding yet, retrying in $RETRY_INTERVAL seconds... (attempt $((retry_count + 1))/$MAX_RETRY)"
        sleep $RETRY_INTERVAL
        retry_count=$((retry_count + 1))
    done
    
    if [ "$success" = false ]; then
        echo "❌ Application is not responding properly after $MAX_RETRY attempts."
        return 1
    fi
    
    return 0
}

# Check application files
check_files() {
    echo "Checking if required application files exist..."
    
    if [ -f "$APP_DIR/app.py" ]; then
        echo "✅ app.py exists."
    else
        echo "❌ app.py is missing."
        return 1
    fi
    
    if [ -f "$APP_DIR/requirements.txt" ]; then
        echo "✅ requirements.txt exists."
    else
        echo "❌ requirements.txt is missing."
        return 1
    fi
    
    return 0
}

# Main verification function
main() {
    local errors=0
    
    # Run all checks
    check_files || errors=$((errors + 1))
    check_service || errors=$((errors + 1))
    check_application || errors=$((errors + 1))
    
    # Report results
    if [ $errors -eq 0 ]; then
        echo "✅ All verification checks passed! Application is running correctly."
        return 0
    else
        echo "❌ $errors verification checks failed. Please check the logs for details."
        return 1
    fi
}

# Run the main function
main
exit $? 