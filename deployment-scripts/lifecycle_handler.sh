#!/bin/bash
# lifecycle_handler.sh - Handler for Auto Scaling Group lifecycle events
# This script manages the ASG lifecycle hooks for graceful instance termination

set -e
set -o pipefail

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

LOG_FILE="/var/log/asg-lifecycle.log"
APP_NAME="financial-news"
LIFECYCLE_STATE_FILE="/var/run/financial-news-lifecycle-hook-state"
APP_DIR="/opt/financial-news-engine"

function log_message() {
    local message="$1"
    local timestamp=$(date "+%Y-%m-%d %H:%M:%S")
    echo -e "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"

log_message "${GREEN}Starting lifecycle handler script${NC}"

# Get the EC2 instance ID
INSTANCE_ID=$(curl -s http://169.254.169.254/latest/meta-data/instance-id)
if [ -z "$INSTANCE_ID" ]; then
    log_message "${RED}ERROR: Could not retrieve instance ID from metadata service${NC}"
    exit 1
fi
log_message "Instance ID: $INSTANCE_ID"

# Get the Auto Scaling Group name
ASG_NAME=$(aws autoscaling describe-auto-scaling-instances \
    --instance-ids "$INSTANCE_ID" \
    --query "AutoScalingInstances[0].AutoScalingGroupName" \
    --output text 2>/dev/null)
    
if [ -z "$ASG_NAME" ] || [ "$ASG_NAME" == "None" ]; then
    log_message "${YELLOW}WARNING: Could not retrieve Auto Scaling Group name for instance $INSTANCE_ID${NC}"
    # Not running in an ASG, nothing to do
    exit 0
fi
log_message "Auto Scaling Group: $ASG_NAME"

# Verify application directory exists and has correct permissions
function verify_app_directory() {
    log_message "Verifying application directory structure"
    
    # Check if the main application directory exists
    if [ ! -d "$APP_DIR" ]; then
        log_message "${YELLOW}WARNING: Application directory $APP_DIR does not exist. Creating it now...${NC}"
        mkdir -p "$APP_DIR"
        chmod 755 "$APP_DIR"
    fi
    
    # Check for nested directories
    for dir in logs deploy_scripts; do
        if [ ! -d "$APP_DIR/$dir" ]; then
            log_message "${YELLOW}Creating $APP_DIR/$dir directory${NC}"
            mkdir -p "$APP_DIR/$dir"
            chmod 755 "$APP_DIR/$dir"
        fi
    done
    
    # Check disk space
    log_message "Checking disk space for $APP_DIR"
    df -h "$APP_DIR" | tee -a "$LOG_FILE"
    
    # Verify disk space is sufficient (at least 1GB free)
    AVAILABLE_SPACE=$(df -m "$APP_DIR" | awk 'NR==2 {print $4}')
    if [ "$AVAILABLE_SPACE" -lt 1024 ]; then
        log_message "${RED}WARNING: Less than 1GB of free space available in $APP_DIR ($AVAILABLE_SPACE MB)${NC}"
        # Log to CloudWatch for monitoring
        if command -v aws &> /dev/null; then
            aws cloudwatch put-metric-data \
                --namespace "FinancialNewsEngine" \
                --metric-name "LowDiskSpace" \
                --dimensions "InstanceId=$INSTANCE_ID" \
                --value 1 \
                --unit "Count"
        fi
    else
        log_message "${GREEN}Disk space check passed: $AVAILABLE_SPACE MB available${NC}"
    fi
}

function handle_pending_termination() {
    log_message "${YELLOW}Received termination notification for instance $INSTANCE_ID${NC}"
    
    # Gracefully stop the application to prevent disruptions
    if systemctl is-active --quiet $APP_NAME; then
        log_message "Stopping $APP_NAME service"
        systemctl stop $APP_NAME
    else
        log_message "${YELLOW}$APP_NAME service is not running${NC}"
    fi
    
    # Perform any cleanup needed
    log_message "Performing cleanup operations"
    
    # Wait a moment to ensure the service has stopped
    sleep 5
    
    # Complete the lifecycle action
    log_message "${GREEN}Completing lifecycle action${NC}"
    aws autoscaling complete-lifecycle-action \
        --lifecycle-hook-name "$1" \
        --auto-scaling-group-name "$ASG_NAME" \
        --lifecycle-action-result CONTINUE \
        --instance-id "$INSTANCE_ID"
    
    # Write state file to indicate we've handled termination
    echo "TERMINATION_HANDLED" > "$LIFECYCLE_STATE_FILE"
    
    log_message "${GREEN}Lifecycle action completed, instance ready for termination${NC}"
}

function register_with_load_balancer() {
    log_message "Registering instance with load balancer"
    
    # First, verify the application directory is properly set up
    verify_app_directory
    
    # Ensure environment file exists
    if [ ! -f "$APP_DIR/.env" ]; then
        log_message "${YELLOW}Environment file not found. Attempting to create it...${NC}"
        if [ -f "$APP_DIR/deploy_scripts/create_env_file.sh" ]; then
            "$APP_DIR/deploy_scripts/create_env_file.sh"
        else
            log_message "${RED}Cannot create environment file: create_env_file.sh not found${NC}"
            # Copy the script if possible
            if [ -f "/deployment-scripts/create_env_file.sh" ]; then
                mkdir -p "$APP_DIR/deploy_scripts"
                cp "/deployment-scripts/create_env_file.sh" "$APP_DIR/deploy_scripts/"
                chmod +x "$APP_DIR/deploy_scripts/create_env_file.sh"
                "$APP_DIR/deploy_scripts/create_env_file.sh"
            fi
        fi
    fi
    
    # Start the application service
    if [ -f "/etc/systemd/system/$APP_NAME.service" ]; then
        log_message "Starting $APP_NAME service"
        systemctl start $APP_NAME
    else
        log_message "${YELLOW}$APP_NAME service definition not found${NC}"
    fi
}

# Check if we're running as part of an instance termination
if [ "$1" = "TERMINATING" ]; then
    handle_pending_termination "$2"
    exit 0
fi

# Otherwise, assume we're starting up
log_message "Instance startup detected"
register_with_load_balancer
log_message "${GREEN}Lifecycle handler completed startup tasks${NC}"

exit 0 