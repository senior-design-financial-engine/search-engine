#!/bin/bash

# Cleanup script to document which scripts have been consolidated
# These scripts can be safely removed after the CI/CD pipeline has been updated

echo "=== Duplicate Scripts Cleanup Guide ==="
echo ""
echo "The following scripts have been consolidated into buildspecs/api-deploy/scripts:"
echo ""
echo "1. /scripts/create_env_file.sh - Consolidated with more robust get-parameters-by-path approach"
echo "2. /scripts/before_install.sh - Consolidated with standardized paths" 
echo "3. /scripts/after_install.sh - Consolidated into deploy.sh with improved extraction"
echo "4. /backend/scripts/deploy.sh - Consolidated with standardized paths"
echo "5. /backend/scripts/before_install.sh - Consolidated with standardized paths"
echo ""
echo "The consolidated versions use consistent paths and handle parameter retrieval better:"
echo "- All application files go to /opt/financial-news-engine"
echo "- All logs go to /opt/financial-news-engine/logs"
echo "- All deployment scripts go to /opt/financial-news-engine/deploy_scripts"
echo "- Environment file is at /opt/financial-news-engine/.env"
echo "- Service file is at /etc/systemd/system/financial-news.service"
echo ""
echo "Please update any references in your local development environment"
echo "to use the consolidated paths before deleting these files."
echo ""
echo "=== End of Cleanup Guide ===" 