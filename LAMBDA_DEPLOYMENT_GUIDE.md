# Lambda Function Deployment Guide

This guide explains how the Lambda function for the Financial News Engine is deployed.

## Overview

The Financial News Engine uses an AWS Lambda function to scrape Reddit and other news sources on a schedule. The Lambda function code is packaged and deployed automatically through the CI/CD pipeline.

## Deployment Method

The Lambda function is deployed automatically through the CI/CD pipeline:

1. When code is pushed to the repository, the pipeline builds and packages the Lambda code
2. The package is uploaded to the S3 bucket specified in the CloudFormation stack
3. The Lambda function is updated with the new code

This process is fully automated and requires no manual intervention.

## Initial Deployment

During the initial deployment of the backend stack, the Lambda function references an S3 bucket that will be created as part of the stack. The S3 bucket will initially be empty, but the CI/CD pipeline will populate it with the Lambda code on the first run.

### First-time Setup Steps

1. Deploy the backend CloudFormation stack:
   ```bash
   aws cloudformation deploy --template-file backend-template.yaml --stack-name production-financial-news-backend --capabilities CAPABILITY_NAMED_IAM
   ```

2. Trigger the CI/CD pipeline to build and deploy the Lambda code, either:
   - Push a change to the repository, or
   - Manually start the pipeline from the AWS console

## Lambda Function Code Structure

The Lambda function uses the following files:

- `lambda_handler.py`: Main entry point for the Lambda function
- `update_database.py`: Core functionality to update the database
- `scraper/`: Directory containing scraper modules
- `es_database/`: Directory containing Elasticsearch database code

## Testing the Lambda Function

You can test the Lambda function by manually invoking it:

```bash
aws lambda invoke --function-name YOUR_LAMBDA_FUNCTION --payload '{"action":"update_database"}' output.txt
cat output.txt
```

Replace `YOUR_LAMBDA_FUNCTION` with the actual function name from the CloudFormation stack outputs.

## Troubleshooting

If you encounter issues with the Lambda function:

1. Check the CloudWatch logs for the Lambda function
2. Verify that the Lambda function has the correct permissions
3. Make sure the Lambda function has access to Elasticsearch
4. Check the CI/CD pipeline logs for any errors during packaging or deployment
5. Confirm that all required dependencies are included in the Lambda package

## Additional Resources

- [AWS Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)
- [AWS CloudFormation User Guide](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/Welcome.html)
- [AWS S3 User Guide](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html) 