# Financial News Engine Backend Setup

This document guides you through setting up the backend infrastructure for the Financial News Engine project using AWS CloudFormation.

## Backend Architecture Overview

The CloudFormation template (`backend-template.yaml`) creates a robust and scalable backend infrastructure with the following components:

- **EC2 Instances**: Deployed in private subnets with Auto Scaling for high availability and performance.
- **Launch Template**: Defines the configuration for EC2 instances, including AMI, instance type, and user data script.
- **Auto Scaling Group**: Automatically adjusts capacity based on load, maintaining optimal performance and cost efficiency.
- **Application Load Balancer**: Distributes incoming traffic across multiple EC2 instances in multiple Availability Zones.
- **IAM Roles and Instance Profile**: Provides necessary permissions for EC2 instances to access other AWS services.
- **Security Groups**:
  - Backend Security Group: Controls access to the EC2 instances
  - Load Balancer Security Group: Controls access to the Application Load Balancer
- **CloudWatch Alarms**: Monitors system metrics and triggers alerts for potential issues.
- **SNS Topic**: Publishes notifications for system alerts and events.

The Flask application is automatically deployed with Elasticsearch integration, enabling search functionality for the Financial News Engine.

## Prerequisites

1. Python and AWS CLI installed via pip (installed with `pip install --user awscli`)
2. AWS account with permissions to create CloudFormation stacks
3. VPC infrastructure deployed using the `vpc-template.yaml` template
4. An EC2 key pair for SSH access to instances
5. Elasticsearch endpoint URL (from Elastic Cloud or AWS OpenSearch)

## Stack Naming Conventions

When deploying to multiple environments (development, staging, production), it's important to include the environment name in the stack name itself, not just as a parameter. This ensures proper cross-stack references and prevents conflicts.

**Recommended naming pattern:**
```
financial-news-backend-{environment}
```

For example:
- `financial-news-backend-development`
- `financial-news-backend-staging`
- `financial-news-backend-production`

When referencing the VPC stack, ensure its name also includes the environment:
- `financial-news-vpc-development`
- `financial-news-vpc-staging`
- `financial-news-vpc-production`

Using just the EnvironmentName parameter without including it in the stack name will cause conflicts, as CloudFormation doesn't allow multiple stacks with the same name regardless of parameter values.

## Deployment Steps

### 1. Configure AWS CLI

If you haven't already configured AWS CLI, run:

```powershell
python -m awscli configure
```

Provide your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (same region where your VPC is deployed)
- Default output format (json)

### 2. Validate the CloudFormation Template

First, use our custom validation script to check for common issues:

```powershell
python validate_yaml.py
```

This script will detect common CloudFormation validation issues that might not be caught by the AWS validator, such as unresolved `${aws:InstanceId}` references. For detailed information about the validator, see [Template Validation Guide](validate_template_readme.md).

Then, validate the template with AWS CloudFormation:

```powershell
python -m awscli cloudformation validate-template --template-body file://backend-template.yaml
```

If both validators pass, your template should be ready for deployment. For troubleshooting validation errors, see the [CloudFormation Template Validation Troubleshooting](#cloudformation-template-validation-troubleshooting) section.

### 3. Create the Stack

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-backend-{environment} `
  --template-body file://backend-template.yaml `
  --parameters `
    ParameterKey=EnvironmentName,ParameterValue={environment} `
    ParameterKey=VpcStackName,ParameterValue=financial-news-vpc-{environment} `
    ParameterKey=InstanceType,ParameterValue=t3.micro `
    ParameterKey=KeyName,ParameterValue=your-key-pair-name `
    ParameterKey=ElasticsearchEndpoint,ParameterValue=https://your-elasticsearch-endpoint.es.amazonaws.com `
    ParameterKey=SSHLocation,ParameterValue=0.0.0.0/0 `
  --capabilities CAPABILITY_IAM
```

Replace `{environment}` with your target environment (e.g., `development`, `staging`, or `production`).

Parameters explanation:
- `EnvironmentName`: Deployment environment (development, staging, or production)
- `VpcStackName`: The name of the VPC CloudFormation stack (used to import VPC resources)
- `InstanceType`: EC2 instance type for the backend servers
- `KeyName`: EC2 key pair for SSH access
- `ElasticsearchEndpoint`: Endpoint URL for Elasticsearch service
- `SSHLocation`: CIDR block that can SSH to the EC2 instances (restrict this in production)

### 4. Monitor Stack Creation

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-backend-{environment}
```

### 5. Get Stack Outputs

After the stack is created, retrieve the outputs (including the ALB DNS name):

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-backend-{environment} --query "Stacks[0].Outputs"
```

### 6. Test the Deployment

Once the stack is created, test the deployment by accessing the Application Load Balancer URL:

```
http://<ALB-DNS-Name>/health
```

This should return a JSON response with `{"status": "healthy"}`.

To test the Elasticsearch connection:

```
http://<ALB-DNS-Name>/search
```

This should return information about your Elasticsearch cluster if the connection is successful.

## Understanding the Deployment

### Flask Application

The template automatically deploys a simple Flask application that:
- Provides a `/health` endpoint for health checks
- Provides a `/search` endpoint that connects to Elasticsearch
- Is configured to start automatically on system boot
- Is managed by systemd for reliability

### Auto Scaling

The Auto Scaling Group will:
- Maintain a minimum of 2 instances (by default)
- Scale up to 6 instances (by default) based on CPU utilization
- Distribute instances across multiple Availability Zones
- Replace unhealthy instances automatically

### Load Balancer

The Application Load Balancer:
- Routes traffic to healthy instances only
- Distributes load across multiple Availability Zones
- Provides a single endpoint for accessing the application

### Monitoring and Alerting

The template sets up:
- CloudWatch metrics for CPU, memory, and disk usage
- CloudWatch Logs for system and application logs
- CloudWatch Alarm for high CPU utilization
- SNS Topic for receiving alarm notifications

## Security Considerations

1. The template creates a security group that allows SSH (port 22) from the IP range specified in `SSHLocation`. For production, restrict this to specific IP addresses.
2. All instances are deployed in private subnets, with internet access only through the NAT Gateway.
3. The Application Load Balancer is the only component exposed to the internet.
4. IAM roles use the principle of least privilege, granting only necessary permissions.

## Next Steps

After setting up the backend:

1. Deploy the frontend infrastructure (S3 and CloudFront)
2. Set up data ingestion pipelines (Kinesis and Lambda)
3. Configure CI/CD for application deployment
4. Implement custom domain with Route 53
5. Enable HTTPS on the load balancer with an SSL certificate

## Resource Management

### Updating the Stack

To update the stack with new parameters or template changes:

```powershell
python -m awscli cloudformation update-stack `
  --stack-name financial-news-backend-{environment} `
  --template-body file://backend-template.yaml `
  --parameters ParameterKey=InstanceType,ParameterValue=t3.medium `
  --capabilities CAPABILITY_IAM
```

### Checking Application Logs

To check application logs, you can:

1. SSH into an instance:
   ```powershell
   python -m awscli ec2-instance-connect ssh --instance-id i-1234567890abcdef0 --private-key-file your-key.pem
   ```

2. View CloudWatch Logs in the AWS Console or via CLI:
   ```powershell
   python -m awscli logs get-log-events --log-group-name /financial-news/application --log-stream-name i-1234567890abcdef0
   ```

### Connecting to Instances

To connect to backend instances:

1. Ensure your local machine can access the instances (e.g., via a bastion host or VPN)
2. Use SSH with your key pair:
   ```powershell
   ssh -i your-key.pem ec2-user@instance-private-ip
   ```

### Deleting the Stack

```powershell
python -m awscli cloudformation delete-stack --stack-name financial-news-backend-{environment}
```

## Troubleshooting

- If the stack creation fails, check the error in the CloudFormation console or using:
  ```powershell
  python -m awscli cloudformation describe-stack-events --stack-name financial-news-backend-{environment}
  ```

- If instances fail to start, check the user data execution by connecting to an instance and examining the logs:
  ```
  less /var/log/cloud-init-output.log
  ```

- If the health check fails, verify that:
  - The security groups allow traffic on port 5000 from the load balancer
  - The Flask application is running
  - The Elasticsearch endpoint is correct and accessible

- If Elasticsearch connection fails:
  - Verify that the VPC endpoint or network connection is correctly configured
  - Check that the security group rules allow outbound traffic to Elasticsearch
  - Verify the Elasticsearch credentials and endpoint URL

- If you see command not found errors with `aws`, remember to use `python -m awscli` as shown above 

## Parameters Reference

The backend template accepts the following parameters:

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| EnvironmentName | Deployment environment | production | No |
| VpcStackName | Name of the VPC CloudFormation stack | financial-news-vpc | No |
| InstanceType | EC2 instance type | t3.micro | No |
| KeyName | EC2 key pair name | | Yes |
| AMIId | AMI ID for EC2 instances | ami-0261755bbcb8c4a84 | No |
| ElasticsearchEndpoint | Elasticsearch endpoint URL | https://your-elasticsearch-endpoint.es.amazonaws.com | No |
| ApifyApiKey | API key for Apify Reddit scraper | | Yes |
| UpdateIntervalHours | How often to update the database (in hours) | 4 | No |
| MinSize | Minimum number of EC2 instances | 2 | No |
| MaxSize | Maximum number of EC2 instances | 6 | No |
| DesiredCapacity | Desired number of EC2 instances | 2 | No |
| SSHLocation | CIDR block for SSH access | 0.0.0.0/0 | No | 

## Reddit Scraper

The backend infrastructure includes a serverless Reddit scraper that collects finance-related posts and discussions from Reddit and indexes them in Elasticsearch alongside other news sources.

### Architecture

The Reddit scraper consists of:

1. **Lambda Function**: Executes the scraper code on a schedule
2. **EventBridge Rule**: Triggers the Lambda function at regular intervals
3. **S3 Bucket**: Stores the Lambda deployment package
4. **IAM Role**: Provides necessary permissions for the Lambda function
5. **VPC Integration**: Runs in the private subnets of your VPC for enhanced security

The scraper integrates with the [Apify Reddit Scraper](https://apify.com/apify/reddit-scraper) to efficiently collect data from financial subreddits.

### VPC Configuration

The Lambda function is configured to run inside your VPC with the following settings:

1. **Network Access**: 
   - Deployed in private subnets from your VPC stack
   - Custom security group (`LambdaSecurityGroup`) allowing outbound HTTPS traffic only
   - Access to Elasticsearch endpoint within the VPC
   - Configured with correct subnet references using the exact export names:
     ```yaml
     SubnetIds:
       - Fn::ImportValue: !Sub "${VpcStackName}-PrivateSubnet1ID"
       - Fn::ImportValue: !Sub "${VpcStackName}-PrivateSubnet2ID"
     ```

2. **Security Benefits**:
   - Isolated execution environment
   - Direct access to private Elasticsearch endpoints
   - No public internet exposure for your data pipeline
   - Egress traffic limited to HTTPS (port 443) only

3. **IAM Permissions**:
   - Includes `AWSLambdaVPCAccessExecutionRole` managed policy for network interface management
   - Secure access to Elasticsearch and CloudWatch logs
   - IAM managed policy handles permissions for:
     - Creating, describing, and deleting Elastic Network Interfaces
     - Describing security groups and subnets
     - CloudWatch logging permissions

4. **Performance Considerations**:
   - Cold start times may be slightly increased due to VPC integration
   - Lambda timeout is set to 300 seconds (5 minutes) to accommodate slower network operations
   - Memory allocation of 512MB optimizes performance for data processing tasks

5. **References**:
   - [AWS Lambda VPC Integration Guide](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html)
   - [Lambda Security Best Practices](https://docs.aws.amazon.com/lambda/latest/dg/security-best-practices.html)
   - [AWSLambdaVPCAccessExecutionRole Policy Documentation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html)

### Deployment

The Reddit scraper is automatically deployed as part of the backend CloudFormation stack and CI/CD pipeline. When you create or update the backend stack, make sure to provide:

- `ApifyApiKey`: Your API key for Apify (required for Reddit scraping)
- `UpdateIntervalHours`: How often to run the scraper (default: 4 hours)

Example deployment command including Reddit scraper parameters:

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-backend-{environment} `
  --template-body file://backend-template.yaml `
  --parameters `
    ParameterKey=EnvironmentName,ParameterValue={environment} `
    ParameterKey=VpcStackName,ParameterValue=financial-news-vpc-{environment} `
    ParameterKey=ElasticsearchEndpoint,ParameterValue=https://your-elasticsearch-endpoint.es.amazonaws.com `
    ParameterKey=ApifyApiKey,ParameterValue=your_apify_api_key `
    ParameterKey=UpdateIntervalHours,ParameterValue=4 `
    ParameterKey=InstanceType,ParameterValue=t3.micro `
    ParameterKey=KeyName,ParameterValue=your-key-pair-name `
    ParameterKey=SSHLocation,ParameterValue=0.0.0.0/0 `
  --capabilities CAPABILITY_IAM
```

### CI/CD Integration

The Reddit scraper is fully integrated into the CI/CD pipeline:

1. The Lambda deployment package is automatically built, packaged, and deployed during the backend CI/CD process
2. When changes are pushed to the repository, the pipeline will:
   - Build a new Lambda deployment package
   - Upload it to the S3 bucket
   - Update the Lambda function with the new code

You don't need to run any manual deployment scripts, as this is all handled by the CI/CD pipeline.

### Testing the Deployment

To verify that the Reddit scraper is working correctly:

1. Manually invoke the Lambda function:
   ```powershell
   python -m awscli lambda invoke `
     --function-name {environment}-financial-news-scraper `
     --payload '{"action": "update_database"}' `
     response.json
   ```

2. Check the CloudWatch Logs for the Lambda function:
   ```powershell
   python -m awscli logs filter-log-events `
     --log-group-name /aws/lambda/{environment}-financial-news-scraper `
     --limit 10
   ```

3. Verify that Reddit data is being indexed in Elasticsearch:
   ```powershell
   curl -X GET "https://your-elasticsearch-endpoint.com/financial_news/_count" `
     -H "Content-Type: application/json" `
     -d '{"query": {"term": {"source": {"value": "reddit"}}}}'
   ```

### Troubleshooting

If the Reddit scraper is not working correctly:

1. Check CloudWatch Logs for error messages
2. Verify that the Lambda function has the necessary permissions
3. Ensure that the Apify API key is valid
4. Confirm that the Elasticsearch endpoint is accessible from the Lambda function

### CloudFormation Template Validation Troubleshooting

If you encounter validation errors with the CloudFormation template, consider these common issues:

1. **Unresolved resource dependencies error**: 
   - If you see errors like `Unresolved resource dependencies [aws:InstanceId]`, this is typically caused by references to intrinsic functions that aren't properly escaped or aren't supported.
   - Our template has been updated to avoid these issues by:
     - Using proper CloudWatch agent configuration without problematic references
     - Correctly escaping any `${aws:*}` references
     - Using the CloudFormation `!Sub` function appropriately

2. **VPC Import Reference errors**:
   - Ensure all VPC-related import statements match the exact export names from your VPC stack
   - Common patterns include:
     - `VpcId` → `VPCID`  
     - `PrivateSubnet1` → `PrivateSubnet1ID`
     - `PublicSubnet1` → `PublicSubnet1ID`

3. **IAM role permission errors**:
   - When integrating with VPC, Lambda functions require the `AWSLambdaVPCAccessExecutionRole` managed policy
   - Verify that this policy is included in the IAM role for your Lambda function

4. **Validate template syntax**:
   - Always run the validation command before deployment:
   ```powershell
   python -m awscli cloudformation validate-template --template-body file://backend-template.yaml
   ```
   
5. **Custom validation script**:
   - For deeper validation that catches issues like `${aws:*}` references, use the provided Python validation script:
   ```powershell
   python validate_yaml.py
   ```

### Customization

To modify which subreddits or keywords are scraped, edit the `RedditScraper` class in `backend/scraper/reddit_scraper.py` and push the changes to your repository. The CI/CD pipeline will automatically deploy the updated code. 