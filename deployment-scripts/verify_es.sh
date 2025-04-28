#!/bin/bash
# Elasticsearch Connection Verification Script
# This script is used during CI/CD deployment to verify Elasticsearch connectivity

set -e  # Exit immediately if a command exits with a non-zero status
set -o pipefail  # Return value of a pipeline is the status of the last command

# Set colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

# Log file
LOG_FILE="/var/log/es_connection_check.log"

echo "================================================"
echo "Elasticsearch Connection Verification Script"
echo "================================================"
echo "$(date)"

# First, ensure psutil is installed (required for disk space checks)
echo "Checking if psutil is installed..."
if ! python3 -c "import psutil" &>/dev/null; then
    echo -e "${YELLOW}psutil not found. Installing...${NC}"
    pip3 install psutil==5.9.5
    
    # Verify installation
    if ! python3 -c "import psutil" &>/dev/null; then
        echo -e "${YELLOW}Warning: Failed to import psutil after installation. Installing system dependencies and trying again...${NC}"
        # Try to install system dependencies that might be needed for psutil
        if command -v apt-get &>/dev/null; then
            apt-get update -y
            apt-get install -y python3-dev gcc
        elif command -v yum &>/dev/null; then
            yum update -y
            yum install -y python3-devel gcc
        fi
        
        # Try reinstalling with force
        pip3 install --no-cache-dir --force-reinstall psutil==5.9.5
        
        # Final verification
        if ! python3 -c "import psutil" &>/dev/null; then
            echo -e "${YELLOW}Warning: psutil could not be installed. Disk space checks may fail.${NC}"
        else
            echo -e "${GREEN}psutil installed successfully on second attempt.${NC}"
        fi
    else
        echo -e "${GREEN}psutil installed successfully.${NC}"
    fi
else
    echo -e "${GREEN}psutil is already installed.${NC}"
fi

echo "Running check_es_connection.py..."

# Load environment variables
if [ -f /opt/financial-news-engine/.env ]; then
    source /opt/financial-news-engine/.env
    echo "Loaded environment variables from .env file"
else
    echo -e "${YELLOW}Warning: .env file not found, using system environment variables${NC}"
fi

# Check if the script exists
if [ ! -f /opt/financial-news-engine/backend/check_es_connection.py ]; then
    echo -e "${RED}Error: check_es_connection.py script not found${NC}"
    echo "Looked for script at: /opt/financial-news-engine/backend/check_es_connection.py"
    echo "Script not found. Deployment may be incomplete."
    exit 1
fi

# Make sure script is executable
chmod +x /opt/financial-news-engine/backend/check_es_connection.py

# Run the connection check script with no-prompt option for CI/CD environments
/usr/bin/python3 /opt/financial-news-engine/backend/check_es_connection.py --no-prompt | tee -a ${LOG_FILE}

# Capture the exit code
EXIT_CODE=$?

# Interpret the exit code
case $EXIT_CODE in
    0)
        echo -e "${GREEN}SUCCESS: Elasticsearch connection verified successfully!${NC}"
        exit 0
        ;;
    1)
        echo -e "${RED}CRITICAL ERROR: Basic network connectivity to Elasticsearch failed${NC}"
        echo "Please check network connectivity, firewall settings, and VPC configuration."
        exit 1
        ;;
    2)
        echo -e "${RED}CRITICAL ERROR: HTTP connectivity to Elasticsearch failed${NC}"
        echo "Please check SSL/TLS configuration and API Gateway settings."
        exit 1
        ;;
    3)
        echo -e "${RED}CRITICAL ERROR: Elasticsearch client connection failed${NC}"
        echo "Please check API key validity and Elasticsearch service health."
        exit 1
        ;;
    4)
        echo -e "${YELLOW}WARNING: Index operations failed${NC}"
        echo "The Elasticsearch service is reachable but index operations failed."
        echo "This may be acceptable for initial deployment. Continuing..."
        exit 0
        ;;
    *)
        echo -e "${RED}UNKNOWN ERROR: The connection check script returned an unexpected exit code: $EXIT_CODE${NC}"
        exit 1
        ;;
esac 