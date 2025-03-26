# API Deployment Scripts

This directory contains scripts used for deploying the Financial News API to EC2 instances.

## Script Overview

- **deploy.sh**: Main deployment script that installs the application on the EC2 instance
- **verify.sh**: Verifies the deployment was successful by checking the service and application status
- **extract_app.py**: Python utility to extract application code from source files
- **financial-news.service**: Systemd service definition file for running the API as a service

## Usage

These scripts are primarily used by the CI/CD pipeline during the API deployment process. They are copied to the target EC2 instances and executed as part of the deployment process defined in `buildspecs/api-deploy.yml`.

## Deployment Process

1. The build pipeline packages the application code and these scripts
2. The files are uploaded to S3
3. The target EC2 instances download the files from S3
4. The `deploy.sh` script is executed to install the application
5. The `verify.sh` script is executed to verify the deployment

## Manual Deployment

If you need to deploy manually:

```bash
# Copy scripts to target instance
scp -r scripts/ ubuntu@<instance-ip>:/tmp/api-deploy/

# SSH to instance
ssh ubuntu@<instance-ip>

# Run deployment
cd /tmp/api-deploy
chmod +x deploy.sh verify.sh
sudo ./deploy.sh
./verify.sh
``` 