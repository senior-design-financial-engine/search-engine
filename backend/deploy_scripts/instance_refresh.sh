#!/bin/bash

# Script to trigger an instance refresh in Auto Scaling Group
# This will ensure all EC2 instances are using the latest configuration

# Configuration
ASG_NAME=${1:-"financial-news-asg"}  # Default ASG name, can be overridden as first parameter
AWS_REGION=${2:-"us-east-1"}         # Default region, can be overridden as second parameter
REFRESH_MIN_HEALTHY=90               # Percentage of instances that must be healthy during refresh
REFRESH_TIMEOUT=600                  # Maximum time in seconds to wait for refresh to complete
LOG_FILE="/var/log/asg-refresh.log"  # Log file

# Ensure we have AWS CLI
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed. Please install it first." | tee -a $LOG_FILE
    exit 1
fi

echo "$(date) - Starting ASG instance refresh for $ASG_NAME in $AWS_REGION" | tee -a $LOG_FILE

# Check if ASG exists
if ! aws autoscaling describe-auto-scaling-groups --region $AWS_REGION --auto-scaling-group-names $ASG_NAME &> /dev/null; then
    echo "ERROR: Auto Scaling Group $ASG_NAME not found in region $AWS_REGION" | tee -a $LOG_FILE
    exit 1
fi

# Start instance refresh
REFRESH_ID=$(aws autoscaling start-instance-refresh \
    --region $AWS_REGION \
    --auto-scaling-group-name $ASG_NAME \
    --preferences "MinHealthyPercentage=$REFRESH_MIN_HEALTHY,InstanceWarmup=300" \
    --query "InstanceRefreshId" \
    --output text)

if [ -z "$REFRESH_ID" ]; then
    echo "ERROR: Failed to start instance refresh" | tee -a $LOG_FILE
    exit 1
fi

echo "Instance refresh started with ID: $REFRESH_ID" | tee -a $LOG_FILE

# Monitor refresh status
echo "Monitoring refresh status..." | tee -a $LOG_FILE
ELAPSED=0
STATUS="Pending"

while [ "$STATUS" = "Pending" ] || [ "$STATUS" = "InProgress" ]; do
    if [ $ELAPSED -ge $REFRESH_TIMEOUT ]; then
        echo "TIMEOUT: Instance refresh taking too long, exiting monitoring" | tee -a $LOG_FILE
        break
    fi
    
    sleep 30
    ELAPSED=$((ELAPSED + 30))
    
    STATUS=$(aws autoscaling describe-instance-refreshes \
        --region $AWS_REGION \
        --auto-scaling-group-name $ASG_NAME \
        --instance-refresh-ids $REFRESH_ID \
        --query "InstanceRefreshes[0].Status" \
        --output text)
    
    PERCENTAGE=$(aws autoscaling describe-instance-refreshes \
        --region $AWS_REGION \
        --auto-scaling-group-name $ASG_NAME \
        --instance-refresh-ids $REFRESH_ID \
        --query "InstanceRefreshes[0].PercentageComplete" \
        --output text)
    
    echo "Status: $STATUS, Percentage complete: $PERCENTAGE%, Elapsed time: $ELAPSED seconds" | tee -a $LOG_FILE
done

# Final status check
if [ "$STATUS" = "Successful" ]; then
    echo "Instance refresh completed successfully!" | tee -a $LOG_FILE
    exit 0
elif [ "$STATUS" = "Cancelled" ]; then
    echo "WARNING: Instance refresh was cancelled" | tee -a $LOG_FILE
    exit 1
elif [ "$STATUS" = "Failed" ]; then
    echo "ERROR: Instance refresh failed" | tee -a $LOG_FILE
    
    # Get failure reason
    FAILURE_REASON=$(aws autoscaling describe-instance-refreshes \
        --region $AWS_REGION \
        --auto-scaling-group-name $ASG_NAME \
        --instance-refresh-ids $REFRESH_ID \
        --query "InstanceRefreshes[0].StatusReason" \
        --output text)
    
    echo "Failure reason: $FAILURE_REASON" | tee -a $LOG_FILE
    exit 1
else
    echo "Instance refresh ended with status: $STATUS" | tee -a $LOG_FILE
    exit 0
fi 