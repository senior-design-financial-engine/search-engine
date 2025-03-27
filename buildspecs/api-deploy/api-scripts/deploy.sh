#!/bin/bash
# deploy.sh - Script to deploy the application to the EC2 instance

set -e
set -o pipefail

APP_DIR="/opt/financial-news-engine"
LOG_DIR="$APP_DIR/logs"
DEPLOY_SCRIPTS_DIR="$APP_DIR/deploy_scripts"
SERVICE_NAME="financial-news"
USER=$(whoami)

echo "Starting deployment process as user: $USER"

# Create application directory and log directory
sudo mkdir -p $APP_DIR
sudo mkdir -p $LOG_DIR
sudo mkdir -p $DEPLOY_SCRIPTS_DIR

# Copy files from temp directory
echo "Copying application files to $APP_DIR"
sudo cp /tmp/api-deploy/app.py $APP_DIR/app.py
sudo cp /tmp/api-deploy/requirements.txt $APP_DIR/requirements.txt

# Copy deployment scripts if they exist
if [ -d "/tmp/api-deploy/deploy_scripts" ]; then
    echo "Copying deployment scripts"
    sudo cp -r /tmp/api-deploy/deploy_scripts/* $DEPLOY_SCRIPTS_DIR/
    sudo chmod +x $DEPLOY_SCRIPTS_DIR/*.sh
fi

# Set correct permissions
echo "Setting permissions"
sudo chown -R ubuntu:ubuntu $APP_DIR
sudo chmod -R 755 $APP_DIR

# Ensure AWS region is set properly
echo "Setting up AWS region"
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-"us-east-1"}
echo "Using AWS region: $AWS_DEFAULT_REGION"

# Create/update environment file using our improved script
echo "Creating environment file"
if [ -f "$DEPLOY_SCRIPTS_DIR/create_env_file.sh" ]; then
    sudo -E bash $DEPLOY_SCRIPTS_DIR/create_env_file.sh
else
    echo "Warning: create_env_file.sh not found"
fi

# Install dependencies
echo "Installing Python dependencies"
sudo pip3 install -r $APP_DIR/requirements.txt

# Create systemd service for the API
echo "Creating API systemd service"
sudo bash -c 'cat > /etc/systemd/system/financial-news.service << EOF
[Unit]
Description=Financial News API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/financial-news-engine
Environment=PYTHONUNBUFFERED=1
ExecStart=/usr/bin/python3 /opt/financial-news-engine/app.py
Restart=on-failure
RestartSec=5
StandardOutput=append:/opt/financial-news-engine/logs/service-output.log
StandardError=append:/opt/financial-news-engine/logs/service-error.log
SyslogIdentifier=financial-news

[Install]
WantedBy=multi-user.target
EOF'

# Install environment fix service
echo "Installing environment fix service"
if [ -f "$DEPLOY_SCRIPTS_DIR/fix-environment.service" ]; then
    sudo cp $DEPLOY_SCRIPTS_DIR/fix-environment.service /etc/systemd/system/
else
    echo "Warning: fix-environment.service not found, creating it"
    sudo bash -c 'cat > /etc/systemd/system/fix-environment.service << EOF
[Unit]
Description=Financial News Environment Fix Service
After=network.target

[Service]
Type=oneshot
ExecStart=/opt/financial-news-engine/deploy_scripts/fix_environment.sh
RemainAfterExit=true
StandardOutput=journal

[Install]
WantedBy=multi-user.target
EOF'
fi

# Ensure Python modules can be imported 
echo "Creating Python package structure"
for dir in utils es_database api; do
    if [ -d "$APP_DIR/$dir" ]; then
        sudo touch "$APP_DIR/$dir/__init__.py"
    else
        sudo mkdir -p "$APP_DIR/$dir"
        sudo touch "$APP_DIR/$dir/__init__.py"
    fi
done

# Reload systemd and enable services
echo "Reloading systemd and starting services"
sudo systemctl daemon-reload
sudo systemctl enable financial-news.service
sudo systemctl enable fix-environment.service

# Run the environment fix first
echo "Running environment fix script"
if [ -f "$DEPLOY_SCRIPTS_DIR/fix_environment.sh" ]; then
    sudo bash $DEPLOY_SCRIPTS_DIR/fix_environment.sh
fi

# Now restart the main service
sudo systemctl restart financial-news.service

echo "Deployment completed successfully"
exit 0
