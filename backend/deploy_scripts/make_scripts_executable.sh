#!/bin/bash

# Make all deployment scripts executable
echo "Making all deployment scripts executable..."

# Set the application directory
APP_DIR="/opt/financial-news-engine"
SCRIPT_DIR="${APP_DIR}/deploy_scripts"

# Make scripts executable
chmod +x ${SCRIPT_DIR}/*.sh
echo "Made scripts in ${SCRIPT_DIR} executable"

# Create __init__.py files in all subdirectories to fix Python imports
find ${APP_DIR} -type d -not -path "*/\.*" -exec touch {}/__init__.py \;
echo "Created __init__.py files in all subdirectories"

# Fix permissions
chmod 644 ${APP_DIR}/*.py
chmod 644 ${APP_DIR}/*/*.py
chmod 755 ${APP_DIR}/deploy_scripts/*.sh
echo "Fixed file permissions"

# Run verify_deployment.sh to check if everything is working
${SCRIPT_DIR}/verify_deployment.sh
echo "Verification complete" 