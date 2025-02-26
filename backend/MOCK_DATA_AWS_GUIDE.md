# Using Mock Data Generator in AWS Deployment

This guide explains how to use the mock data generator functionality in your AWS deployment. This feature allows you to run your frontend with realistic fake article data without requiring a full Elasticsearch setup.

## Overview

The mock data generator provides:
- Realistic financial news article data with company mentions, sentiment, and other metadata
- API-compatible responses that match the format of the real Elasticsearch engine
- Configurable behavior through environment variables
- Full compatibility with existing deployment pipelines

## Deployment Steps

### 1. Configure the Environment Variable

To enable the mock data generator, you need to set the `USE_MOCK_DATA` environment variable to `true`. This can be done in several ways depending on your AWS deployment method.

#### Option A: For Elastic Beanstalk Deployments

1. In the AWS Management Console, navigate to your Elastic Beanstalk environment
2. Go to Configuration > Software
3. Under "Environment properties", add:
   - Name: `USE_MOCK_DATA`
   - Value: `true`
4. Click "Apply" to update the environment

#### Option B: For EC2 Deployments with SystemD

1. Edit your service file at `/etc/systemd/system/financial-news.service`
2. Add the environment variable to the `[Service]` section:
   ```
   [Service]
   ...
   Environment="USE_MOCK_DATA=true"
   ```
3. Reload the SystemD daemon and restart the service:
   ```
   sudo systemctl daemon-reload
   sudo systemctl restart financial-news.service
   ```

#### Option C: Using the AWS Parameter Store

1. Store the configuration in AWS Parameter Store:
   ```
   aws ssm put-parameter --name "/financial-news/USE_MOCK_DATA" --type "String" --value "true"
   ```

2. Update your deployment script (`deploy.sh`) to load from Parameter Store:
   ```bash
   # Add this to your deploy.sh
   USE_MOCK_DATA=$(aws ssm get-parameter --name "/financial-news/USE_MOCK_DATA" --query "Parameter.Value" --output text)
   echo "USE_MOCK_DATA=$USE_MOCK_DATA" >> .env
   ```

### 2. Update CloudFormation Template (Optional)

If you're using CloudFormation for deployment, you can add the environment variable to your template:

```yaml
Resources:
  FinancialNewsInstance:
    Type: AWS::EC2::Instance
    Properties:
      # ... other properties ...
      UserData:
        Fn::Base64: !Sub |
          #!/bin/bash -xe
          echo "USE_MOCK_DATA=true" >> /opt/financial-news-engine/.env
          # ... rest of your user data ...
```

### 3. Testing the Deployment

After deploying with the mock data configuration:

1. Check that the application logs show: "Backend initialized with MOCK Elasticsearch engine"
2. Test the API endpoint by making a query: `http://your-api-url/query?query=Apple`
3. Verify that you receive realistic financial news data in the response

### 4. Toggling Between Mock and Real Data

You can easily switch between mock and real data by changing the `USE_MOCK_DATA` environment variable:

- For development and testing: Set to `true`
- For production with real Elasticsearch: Set to `false`

## Troubleshooting

If you encounter issues with the mock data generator:

1. Check the application logs for any error messages
2. Verify that the `USE_MOCK_DATA` environment variable is correctly set
3. Ensure that the `mock_data_generator.py` file is included in your deployment package
4. Make sure the permissions allow the application to read the environment variables

## Notes for CI/CD Pipeline

When using the mock data generator in your CI/CD pipeline:

1. You can set different values for different environments:
   - Dev: `USE_MOCK_DATA=true`
   - Staging: `USE_MOCK_DATA=true` or `false` depending on your needs
   - Production: `USE_MOCK_DATA=false`

2. You can conditionally run Elasticsearch-dependent tests based on this variable

3. The mock data generator allows frontend development to proceed independently of the Elasticsearch backend 