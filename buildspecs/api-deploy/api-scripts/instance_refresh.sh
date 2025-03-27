#!/bin/bash

# Script to trigger an instance refresh in Auto Scaling Group
# This will ensure all EC2 instances are using the latest configuration

# Configuration
ASG_NAME=${1:-""}  # Auto Scaling Group name passed as argument or set via environment
AWS_REGION=${2:-$(aws configure get region)}  # Use configured region if not specified
REFRESH_MIN_HEALTHY=${REFRESH_MIN_HEALTHY:-90}  # Percentage of instances that must be healthy during refresh
REFRESH_TIMEOUT=${REFRESH_TIMEOUT:-600}  # Maximum time in seconds to wait for refresh to complete
LOG_FILE="/var/log/asg-refresh.log"  # Log file

# If ASG_NAME not provided as argument, try to get it from CloudFormation
if [ -z "$ASG_NAME" ] && [ -n "$BACKEND_STACK_NAME" ]; then
    echo "ASG name not provided, getting from CloudFormation stack $BACKEND_STACK_NAME"
    ASG_NAME=$(aws cloudformation describe-stacks --stack-name $BACKEND_STACK_NAME --region $AWS_REGION \
        --query "Stacks[0].Outputs[?OutputKey=='BackendAutoScalingGroupName'].OutputValue" --output text)
fi

if [ -z "$ASG_NAME" ]; then
    echo "ERROR: Auto Scaling Group name not provided and could not be determined from CloudFormation"
    exit 1
fi

echo "$(date) - Starting ASG instance refresh for $ASG_NAME in $AWS_REGION"

# Check if ASG exists
if ! aws autoscaling describe-auto-scaling-groups --region $AWS_REGION --auto-scaling-group-names $ASG_NAME &> /dev/null; then
    echo "ERROR: Auto Scaling Group $ASG_NAME not found in region $AWS_REGION"
    exit 1
fi

# Check for ongoing instance refreshes
ONGOING_REFRESH=$(aws autoscaling describe-instance-refreshes --region $AWS_REGION \
    --auto-scaling-group-name $ASG_NAME \
    --query "InstanceRefreshes[?Status=='Pending' || Status=='InProgress'].InstanceRefreshId" \
    --output text)

if [ -n "$ONGOING_REFRESH" ]; then
    echo "WARNING: There is already an ongoing instance refresh with ID: $ONGOING_REFRESH"
    echo "Cancelling existing refresh before starting a new one"
    aws autoscaling cancel-instance-refresh --region $AWS_REGION --auto-scaling-group-name $ASG_NAME
    sleep 10  # Wait for cancellation to take effect
fi

# Start instance refresh
REFRESH_ID=$(aws autoscaling start-instance-refresh \
    --region $AWS_REGION \
    --auto-scaling-group-name $ASG_NAME \
    --preferences "MinHealthyPercentage=$REFRESH_MIN_HEALTHY,InstanceWarmup=300" \
    --query "InstanceRefreshId" \
    --output text)

if [ -z "$REFRESH_ID" ]; then
    echo "ERROR: Failed to start instance refresh"
    exit 1
fi

echo "Instance refresh started with ID: $REFRESH_ID"

# In CI/CD environment, we may not want to wait for the refresh to complete
if [ "$WAIT_FOR_REFRESH" == "true" ]; then
    # Monitor refresh status
    echo "Monitoring refresh status..."
    ELAPSED=0
    STATUS="Pending"

    while [ "$STATUS" = "Pending" ] || [ "$STATUS" = "InProgress" ]; do
        if [ $ELAPSED -ge $REFRESH_TIMEOUT ]; then
            echo "TIMEOUT: Instance refresh taking too long, exiting monitoring"
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
        
        echo "Status: $STATUS, Percentage complete: $PERCENTAGE%, Elapsed time: $ELAPSED seconds"
    done

    # Final status check
    if [ "$STATUS" = "Successful" ]; then
        echo "Instance refresh completed successfully!"
        exit 0
    elif [ "$STATUS" = "Cancelled" ]; then
        echo "WARNING: Instance refresh was cancelled"
        exit 1
    elif [ "$STATUS" = "Failed" ]; then
        echo "ERROR: Instance refresh failed"
        
        # Get failure reason
        FAILURE_REASON=$(aws autoscaling describe-instance-refreshes \
            --region $AWS_REGION \
            --auto-scaling-group-name $ASG_NAME \
            --instance-refresh-ids $REFRESH_ID \
            --query "InstanceRefreshes[0].StatusReason" \
            --output text)
        
        echo "Failure reason: $FAILURE_REASON"
        exit 1
    else
        echo "Instance refresh ended with status: $STATUS"
        exit 0
    fi
else
    echo "Instance refresh initiated. Not waiting for completion as WAIT_FOR_REFRESH is not set to 'true'"
    echo "To check status later, run:"
    echo "aws autoscaling describe-instance-refreshes --region $AWS_REGION --auto-scaling-group-name $ASG_NAME --instance-refresh-ids $REFRESH_ID"
    exit 0
fi 