#!/bin/bash

# Script to configure AWS on EC2 instance
LOG_FILE="/opt/financial-news-engine/logs/aws_setup.log"

# Ensure log directory exists
mkdir -p "/opt/financial-news-engine/logs"
echo "$(date) - Starting AWS configuration" > $LOG_FILE

# Function to detect region from EC2 metadata
get_instance_region() {
  local region="us-east-1"  # Default region
  
  if command -v curl &> /dev/null; then
    # Try to get region from instance metadata
    local metadata_token=$(curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600" 2>/dev/null)
    if [ -n "$metadata_token" ]; then
      local detected_region=$(curl -s -H "X-aws-ec2-metadata-token: $metadata_token" http://169.254.169.254/latest/meta-data/placement/region 2>/dev/null)
      if [ -n "$detected_region" ]; then
        echo "Detected region from instance metadata: $detected_region" | tee -a $LOG_FILE
        region=$detected_region
      else
        echo "Could not detect region from metadata, using default: $region" | tee -a $LOG_FILE
      fi
    else
      echo "Could not get metadata token, using default region: $region" | tee -a $LOG_FILE
    fi
  else
    echo "curl not found, using default region: $region" | tee -a $LOG_FILE
  fi
  
  echo $region
}

# Configure AWS CLI
configure_aws_cli() {
  local region=$(get_instance_region)
  
  # Check if AWS CLI is installed
  if ! command -v aws &> /dev/null; then
    echo "AWS CLI not found. Attempting to install..." | tee -a $LOG_FILE
    if command -v apt-get &> /dev/null; then
      apt-get update && apt-get install -y awscli | tee -a $LOG_FILE
    elif command -v yum &> /dev/null; then
      yum install -y awscli | tee -a $LOG_FILE
    else
      echo "Could not install AWS CLI. No supported package manager found." | tee -a $LOG_FILE
      return 1
    fi
  fi
  
  # Create AWS config directory if it doesn't exist
  mkdir -p ~/.aws
  
  # Set the region in config
  cat > ~/.aws/config << EOL
[default]
region = $region
output = json
EOL
  
  # Check for instance profile
  local role_name=$(curl -s -X GET -H "X-aws-ec2-metadata-token: $metadata_token" http://169.254.169.254/latest/meta-data/iam/security-credentials/ 2>/dev/null)
  
  if [ -n "$role_name" ]; then
    echo "Instance has IAM role: $role_name" | tee -a $LOG_FILE
    echo "AWS CLI will use instance profile credentials automatically" | tee -a $LOG_FILE
  else
    echo "WARNING: No IAM role found for this instance." | tee -a $LOG_FILE
    echo "SSM Parameter Store access will likely fail." | tee -a $LOG_FILE
  fi
  
  # Test AWS CLI configuration
  aws sts get-caller-identity > /tmp/aws_identity 2>> $LOG_FILE
  if [ $? -eq 0 ]; then
    echo "AWS CLI configured successfully:" | tee -a $LOG_FILE
    cat /tmp/aws_identity | tee -a $LOG_FILE
    return 0
  else
    echo "AWS CLI configuration test failed." | tee -a $LOG_FILE
    return 1
  fi
}

# Create a file to ensure AWS region is set in environment
create_aws_env() {
  local region=$(get_instance_region)
  
  # Create environment file for AWS region
  mkdir -p /etc/profile.d
  cat > /etc/profile.d/aws-env.sh << EOL
#!/bin/bash
export AWS_REGION=$region
export AWS_DEFAULT_REGION=$region
EOL
  
  chmod +x /etc/profile.d/aws-env.sh
  
  # Also set for current session
  export AWS_REGION=$region
  export AWS_DEFAULT_REGION=$region
  
  echo "Set AWS_REGION=$region for system environment" | tee -a $LOG_FILE
}

echo "Configuring AWS CLI..." | tee -a $LOG_FILE
configure_aws_cli

echo "Setting up AWS environment variables..." | tee -a $LOG_FILE
create_aws_env

echo "AWS configuration completed at $(date)" | tee -a $LOG_FILE 