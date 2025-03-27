#!/bin/bash

# Script to create a CloudWatch scheduled task that runs our verification script
# This ensures all EC2 instances are periodically checked and updated to the latest version

# Configuration
AWS_REGION=${1:-"us-east-1"}                       # Default region
SCHEDULER_NAME="financial-news-update-checker"     # Name of the scheduled task
RULE_DESCRIPTION="Check and update Financial News Engine instances"
SCHEDULE_EXPRESSION="rate(1 hour)"                 # Run every hour
LOG_FILE="/var/log/scheduled-task-setup.log"       # Log file
LAMBDA_FUNCTION_NAME="financial-news-update-checker"
LAMBDA_EXECUTION_ROLE_NAME="financial-news-update-role"
LAMBDA_ZIP_FILE="/tmp/update_function.zip"

# Ensure log directory exists
mkdir -p $(dirname $LOG_FILE)

echo "$(date) - Starting setup of scheduled verification task" | tee -a $LOG_FILE

# Ensure AWS CLI is available
if ! command -v aws &> /dev/null; then
    echo "ERROR: AWS CLI is not installed" | tee -a $LOG_FILE
    exit 1
fi

# Create a Lambda function that will run our verification script
echo "Creating Lambda function for verification..." | tee -a $LOG_FILE

# Create temporary directory for function code
TEMP_DIR=$(mktemp -d)
cat > $TEMP_DIR/index.py << 'EOL'
import boto3
import json
import os
import logging
import time

# Set up logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Configure AWS clients
ec2 = boto3.client('ec2')
ssm = boto3.client('ssm')

def lambda_handler(event, context):
    """
    Lambda function to check all EC2 instances in the financial-news ASG
    and run verification script on each one
    """
    logger.info("Starting verification of Financial News Engine instances")
    
    try:
        # Find all instances with the financial-news tag
        response = ec2.describe_instances(
            Filters=[
                {
                    'Name': 'tag:Application',
                    'Values': ['financial-news-engine']
                },
                {
                    'Name': 'instance-state-name',
                    'Values': ['running']
                }
            ]
        )
        
        instances = []
        for reservation in response['Reservations']:
            for instance in reservation['Instances']:
                instances.append(instance['InstanceId'])
        
        if not instances:
            logger.info("No Financial News Engine instances found")
            return {
                'statusCode': 200,
                'body': json.dumps('No instances found to verify')
            }
        
        logger.info(f"Found {len(instances)} instances to verify")
        
        # Run the verification script on each instance using SSM Run Command
        ssm_response = ssm.send_command(
            InstanceIds=instances,
            DocumentName='AWS-RunShellScript',
            Parameters={
                'commands': [
                    'cd /opt/financial-news-engine',
                    'bash ./deploy_scripts/verify_deployment.sh'
                ]
            },
            Comment='Running Financial News Engine verification script'
        )
        
        command_id = ssm_response['Command']['CommandId']
        logger.info(f"Started SSM Command {command_id}")
        
        # Wait a bit for the command to start execution
        time.sleep(5)
        
        # Check command status
        status_response = ssm.list_command_invocations(
            CommandId=command_id,
            Details=True
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps(f"Verification started on {len(instances)} instances with command ID {command_id}")
        }
    
    except Exception as e:
        logger.error(f"Error during verification: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error: {str(e)}")
        }
EOL

# Create ZIP file with Python code
cd $TEMP_DIR
zip -r $LAMBDA_ZIP_FILE index.py
cd -

# Create IAM role for Lambda execution if it doesn't exist
role_arn=$(aws iam get-role --region $AWS_REGION --role-name $LAMBDA_EXECUTION_ROLE_NAME --query "Role.Arn" --output text 2>/dev/null || echo "")

if [ -z "$role_arn" ]; then
    echo "Creating IAM role for Lambda..." | tee -a $LOG_FILE
    
    # Create policy document file
    cat > /tmp/trust-policy.json << EOL
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOL

    # Create role
    role_response=$(aws iam create-role \
        --region $AWS_REGION \
        --role-name $LAMBDA_EXECUTION_ROLE_NAME \
        --assume-role-policy-document file:///tmp/trust-policy.json)
    
    role_arn=$(echo $role_response | jq -r '.Role.Arn')
    
    # Attach policies
    aws iam attach-role-policy \
        --region $AWS_REGION \
        --role-name $LAMBDA_EXECUTION_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
    
    aws iam attach-role-policy \
        --region $AWS_REGION \
        --role-name $LAMBDA_EXECUTION_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonSSMFullAccess
    
    aws iam attach-role-policy \
        --region $AWS_REGION \
        --role-name $LAMBDA_EXECUTION_ROLE_NAME \
        --policy-arn arn:aws:iam::aws:policy/AmazonEC2ReadOnlyAccess
    
    # Wait for role to propagate
    echo "Waiting for IAM role to propagate..." | tee -a $LOG_FILE
    sleep 10
fi

# Check if the Lambda function already exists
function_arn=$(aws lambda get-function \
    --region $AWS_REGION \
    --function-name $LAMBDA_FUNCTION_NAME \
    --query "Configuration.FunctionArn" \
    --output text 2>/dev/null || echo "")

if [ -z "$function_arn" ]; then
    # Create the Lambda function
    echo "Creating Lambda function..." | tee -a $LOG_FILE
    
    function_response=$(aws lambda create-function \
        --region $AWS_REGION \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://$LAMBDA_ZIP_FILE \
        --handler index.lambda_handler \
        --runtime python3.8 \
        --role $role_arn \
        --timeout 300 \
        --description "Verify and update Financial News Engine EC2 instances")
    
    function_arn=$(echo $function_response | jq -r '.FunctionArn')
else
    # Update the Lambda function
    echo "Updating existing Lambda function..." | tee -a $LOG_FILE
    
    aws lambda update-function-code \
        --region $AWS_REGION \
        --function-name $LAMBDA_FUNCTION_NAME \
        --zip-file fileb://$LAMBDA_ZIP_FILE
fi

# Create or update the CloudWatch Events rule
echo "Setting up CloudWatch Events scheduled rule..." | tee -a $LOG_FILE

rule_arn=$(aws events put-rule \
    --region $AWS_REGION \
    --name $SCHEDULER_NAME \
    --schedule-expression "$SCHEDULE_EXPRESSION" \
    --state ENABLED \
    --description "$RULE_DESCRIPTION" \
    --query "RuleArn" \
    --output text)

echo "Created/updated rule: $rule_arn" | tee -a $LOG_FILE

# Add Lambda as target for the rule
aws events put-targets \
    --region $AWS_REGION \
    --rule $SCHEDULER_NAME \
    --targets "Id"="1","Arn"="$function_arn"

# Add permission for CloudWatch Events to invoke Lambda if doesn't exist
aws lambda add-permission \
    --region $AWS_REGION \
    --function-name $LAMBDA_FUNCTION_NAME \
    --statement-id "financial-news-$SCHEDULER_NAME" \
    --action 'lambda:InvokeFunction' \
    --principal events.amazonaws.com \
    --source-arn "$rule_arn" 2>/dev/null || true

echo "CloudWatch Events rule setup complete!" | tee -a $LOG_FILE

# Clean up
rm -rf $TEMP_DIR
rm -f $LAMBDA_ZIP_FILE
rm -f /tmp/trust-policy.json

echo "Scheduled verification task setup complete!" | tee -a $LOG_FILE 