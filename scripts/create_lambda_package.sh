#!/bin/bash
# Script to create a Lambda function deployment package

set -e

SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

echo "Creating Lambda function package..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy the Lambda function code
cp init_ssm_parameters_lambda.py $TEMP_DIR/lambda_function.py

# Change to the temp directory
cd $TEMP_DIR

# Create the ZIP file
zip -r lambda_function.zip lambda_function.py

# Move the ZIP file back to the original directory
mv lambda_function.zip $SCRIPT_DIR/

echo "Lambda function package created at $SCRIPT_DIR/lambda_function.zip" 