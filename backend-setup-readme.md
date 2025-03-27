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

```powershell
python -m awscli cloudformation validate-template --template-body file://backend-template.yaml
```

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
| MinSize | Minimum number of EC2 instances | 2 | No |
| MaxSize | Maximum number of EC2 instances | 6 | No |
| DesiredCapacity | Desired number of EC2 instances | 2 | No |
| SSHLocation | CIDR block for SSH access | 0.0.0.0/0 | No | 