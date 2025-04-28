#!/bin/bash
# Script to create a Lambda layer for the CloudFormation custom resource handler

set -e

echo "Creating Lambda layer for CloudFormation custom resource handler..."

# Create a temporary directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Create the Python directory structure
mkdir -p $TEMP_DIR/python

# Create the cfnresponse module
cat > $TEMP_DIR/python/cfnresponse.py << 'EOF'
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: MIT-0

import json
import logging
import urllib.request

SUCCESS = "SUCCESS"
FAILED = "FAILED"

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def send(event, context, response_status, response_data, physical_resource_id=None, no_echo=False):
    """Send response to CloudFormation custom resource"""
    response_url = event['ResponseURL']

    logger.info(f"ResponseURL: {response_url}")

    response_body = {}
    response_body['Status'] = response_status
    response_body['Reason'] = f"See the details in CloudWatch Log Stream: {context.log_stream_name}"
    response_body['PhysicalResourceId'] = physical_resource_id or context.log_stream_name
    response_body['StackId'] = event['StackId']
    response_body['RequestId'] = event['RequestId']
    response_body['LogicalResourceId'] = event['LogicalResourceId']
    response_body['NoEcho'] = no_echo
    response_body['Data'] = response_data

    json_response = json.dumps(response_body)
    logger.info(f"Response body: {json_response}")

    headers = {
        'content-type': '',
        'content-length': str(len(json_response))
    }

    try:
        req = urllib.request.Request(response_url, json_response.encode('utf-8'), headers)
        with urllib.request.urlopen(req) as response:
            logger.info(f"Status code: {response.getcode()}")
            return True
    except Exception as e:
        logger.error(f"Error sending response: {str(e)}")
        return False
EOF

# Change to the temp directory
cd $TEMP_DIR

# Create the ZIP file
zip -r cfnresponse_layer.zip python/

# Move the ZIP file back to the original directory
mv cfnresponse_layer.zip $(dirname $0)/

echo "Lambda layer created at $(dirname $0)/cfnresponse_layer.zip" 