# AWS Services Viewing and Debugging Guide for Financial News Engine

This comprehensive guide explains how to view, monitor, and debug the various AWS services used in the Financial News Engine application. It covers CloudFormation for infrastructure management, CodePipeline for CI/CD, and guidance on debugging issues across different parts of the application.

## Table of Contents
1. [CloudFormation - Infrastructure as Code](#1-cloudformation---infrastructure-as-code)
2. [CodePipeline - CI/CD Pipeline](#2-codepipeline---cicd-pipeline)
3. [EC2 and Auto Scaling Groups](#3-ec2-and-auto-scaling-groups)
4. [Elastic Load Balancer](#4-elastic-load-balancer)
5. [S3 and CloudFront](#5-s3-and-cloudfront)
6. [Logging and Monitoring](#6-logging-and-monitoring)
7. [Debugging Common Issues](#7-debugging-common-issues)
8. [Elastic Cloud Integration](#8-elastic-cloud-integration)

## 1. CloudFormation - Infrastructure as Code

### Viewing CloudFormation Stacks
1. **Access the CloudFormation Console**:
   - Sign in to the AWS Management Console
   - Navigate to CloudFormation service
   - You'll see all stacks organized by environment (development, staging, production)

2. **Key Stacks to Monitor**:
   - `financial-news-vpc-{environment}`: Network infrastructure
   - `financial-news-backend-{environment}`: Backend EC2 instances, ALB, security groups
   - `financial-news-frontend-{environment}`: S3 bucket and CloudFront distribution
   - `financial-news-cicd-{environment}`: CI/CD pipeline configuration

3. **Stack Details and Resources**:
   - Click on a stack name to view details
   - The "Resources" tab shows all AWS resources created by that stack
   - The "Events" tab shows the history of stack creation and updates
   - The "Outputs" tab displays important values like endpoint URLs

4. **Troubleshooting CloudFormation Stacks**:
   - If a stack fails during creation or update, check the "Events" tab for error messages
   - Look for resources in "CREATE_FAILED" or "UPDATE_FAILED" status
   - Common issues include IAM permission problems, resource quotas, or invalid configurations

### Managing CloudFormation Stacks via CLI
```bash
# List all stacks
aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE

# Describe a specific stack
aws cloudformation describe-stacks --stack-name financial-news-backend-production

# Get stack resources
aws cloudformation list-stack-resources --stack-name financial-news-backend-production

# Get stack events
aws cloudformation describe-stack-events --stack-name financial-news-backend-production
```

## 2. CodePipeline - CI/CD Pipeline

### Viewing CI/CD Pipeline Status
1. **Access the CodePipeline Console**:
   - Navigate to AWS CodePipeline
   - Find your pipeline named `financial-news-pipeline-{environment}`

2. **Understanding Pipeline Stages**:
   - **Source Stage**: Shows the GitHub repository and branch
   - **Build & Test Stage**: Has parallel actions for frontend and backend
   - **Deploy Stage**: Has parallel deployment actions for frontend and backend

3. **Viewing Stage Details**:
   - Click on each stage to view details and status
   - For build stages, click "Details" to see the CodeBuild logs
   - For deployment stages, check execution details

4. **Troubleshooting Pipeline Failures**:
   - For failed actions, click "Details" to view logs
   - Common issues include:
     - Source: GitHub credentials, webhook configuration
     - Build: Dependencies, test failures, syntax errors
     - Deploy: IAM permissions, resource availability

### CodePipeline CLI Commands
```bash
# List pipelines
aws codepipeline list-pipelines

# Get pipeline details
aws codepipeline get-pipeline --name financial-news-pipeline-production

# View pipeline execution status
aws codepipeline list-pipeline-executions --pipeline-name financial-news-pipeline-production

# Manually start a pipeline execution
aws codepipeline start-pipeline-execution --name financial-news-pipeline-production
```

## 3. EC2 and Auto Scaling Groups

### Viewing EC2 Instances
1. **EC2 Console Overview**:
   - Navigate to EC2 Service
   - Check "Running Instances" for the backend application servers
   - Filter by tag "Environment" to see environment-specific instances

2. **Auto Scaling Groups**:
   - In EC2, go to "Auto Scaling Groups"
   - Select the ASG for the backend (`financial-news-backend-asg-{environment}`)
   - View current capacity, desired capacity, and instance health

3. **SSH Access to Instances**:
   - Use the keypair specified during stack creation
   ```bash
   ssh -i financial-news-keypair.pem ec2-user@instance-public-ip
   ```

4. **Troubleshooting EC2 Issues**:
   - Check instance status (system status, instance status)
   - View instance details for resource utilization
   - Check security groups for proper inbound/outbound rules
   - View system logs through "Actions" > "Monitor and troubleshoot" > "Get system log"

### EC2 CLI Commands
```bash
# List instances with specific tag
aws ec2 describe-instances --filters "Name=tag:Application,Values=financial-news"

# Get specific instance details
aws ec2 describe-instances --instance-ids i-1234567890abcdef0

# Get console output
aws ec2 get-console-output --instance-id i-1234567890abcdef0

# Describe Auto Scaling Groups
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names financial-news-backend-asg-production
```

## 4. Elastic Load Balancer

### Viewing Load Balancer Status
1. **ALB Console**:
   - In EC2, navigate to "Load Balancers"
   - Select your ALB (`financial-news-alb-{environment}`)

2. **Monitoring Targets**:
   - Select the "Target Groups" tab
   - Check instance health status (healthy/unhealthy)
   - View traffic distribution and request counts

3. **Troubleshooting Load Balancer Issues**:
   - Verify target health - unhealthy targets may indicate backend application issues
   - Check security groups for proper inbound/outbound rules
   - Verify health check path configuration
   - Check listener rules for correct routing

### ELB CLI Commands
```bash
# Describe load balancers
aws elbv2 describe-load-balancers --names financial-news-alb-production

# Describe target groups
aws elbv2 describe-target-groups --load-balancer-arn arn:aws:elasticloadbalancing:region:account-id:loadbalancer/app/financial-news-alb-production/1234567890

# Check target health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:region:account-id:targetgroup/financial-news-tg-production/1234567890
```

## 5. S3 and CloudFront

### Viewing S3 and CloudFront Resources
1. **S3 Console**:
   - Navigate to S3 Service
   - Find your frontend bucket (`financial-news-frontend-{environment}`)
   - Check bucket policy, static website hosting, and versioning

2. **CloudFront Console**:
   - Navigate to CloudFront
   - Select your distribution
   - View distribution status, domain name, and origin configuration

3. **Troubleshooting Frontend Deployment Issues**:
   - Verify S3 bucket permissions
   - Check CloudFront distribution status and cache behavior
   - Test the CloudFront URL directly
   - Create CloudFront invalidations for updated content

### S3 and CloudFront CLI Commands
```bash
# List objects in S3 bucket
aws s3 ls s3://financial-news-frontend-production

# Create CloudFront invalidation
aws cloudfront create-invalidation --distribution-id DISTRIBUTION_ID --paths "/*"

# Get CloudFront distribution config
aws cloudfront get-distribution-config --id DISTRIBUTION_ID
```

## 6. Logging and Monitoring

### CloudWatch Logs
1. **Accessing CloudWatch Logs**:
   - Navigate to CloudWatch service
   - Go to "Log groups"
   - Key log groups to check:
     - `/aws/codebuild/financial-news-backend-build`
     - `/aws/codebuild/financial-news-frontend-build`
     - `/aws/lambda/financial-news-*` (if using Lambda functions)
     - `/financial-news/backend/application` (if configured)

2. **Searching Logs**:
   - Use CloudWatch Logs Insights for advanced queries
   - Filter logs by time range or specific error text
   - Create metric filters for recurring patterns

### CloudWatch Metrics
1. **Key Metrics to Monitor**:
   - EC2: CPU utilization, memory, disk I/O
   - ALB: Request count, latency, 5XX errors
   - Auto Scaling: Group size, scaling activities
   - Lambda: Invocations, errors, duration

2. **Creating Dashboards**:
   - Create custom CloudWatch dashboards combining relevant metrics
   - Add widgets for each component of your application

3. **Setting Up Alarms**:
   - Create alarms for critical metrics (high CPU, error rates)
   - Configure notifications via SNS

### CloudWatch CLI Commands
```bash
# Get logs from a specific log group
aws logs get-log-events --log-group-name /aws/codebuild/financial-news-backend-build --log-stream-name stream-name

# Create a metric alarm
aws cloudwatch put-metric-alarm --alarm-name high-cpu-utilization --comparison-operator GreaterThanThreshold --evaluation-periods 1 --metric-name CPUUtilization --namespace AWS/EC2 --period 300 --statistic Average --threshold 80 --alarm-description "Alarm when CPU exceeds 80%" --dimensions Name=AutoScalingGroupName,Value=financial-news-backend-asg-production

# Describe alarms
aws cloudwatch describe-alarms --alarm-names high-cpu-utilization
```

## 7. Debugging Common Issues

### CI/CD Pipeline Failures
1. **GitHub Source Issues**:
   - Check GitHub token validity and permissions
   - Verify webhook configuration
   - Ensure repository access

2. **Build Stage Failures**:
   - Check dependency installation errors in CodeBuild logs
   - Verify test failures and code quality issues
   - Check for resource constraints (memory, timeout)

3. **Deployment Stage Failures**:
   - Verify IAM permissions for deployment actions
   - Check S3 bucket accessibility for frontend deployment
   - Verify EC2 instance connectivity for backend deployment

### Backend Application Issues
1. **Instance Health Problems**:
   - SSH into an instance to check application logs
   - Verify application service status
   ```bash
   sudo systemctl status financial-news-backend
   ```
   - Check for resource constraints (CPU, memory)
   ```bash
   top
   free -m
   df -h
   ```

2. **Database Connection Issues**:
   - Verify security group rules between EC2 and RDS
   - Check database credentials and connectivity
   - Test database connection from instance

3. **Elasticsearch Integration Issues**:
   - Verify Elastic Cloud endpoint configuration
   - Check API key validity
   - Test Elasticsearch connection from the instance

### Frontend Application Issues
1. **Static Content Delivery**:
   - Verify files in S3 bucket
   - Check CloudFront cache status
   - Create invalidations for updated content

2. **API Integration Issues**:
   - Use browser developer tools to check network requests
   - Verify API Gateway configuration
   - Check CORS settings

### Security and Access Issues
1. **IAM Permissions**:
   - Review IAM roles used by EC2, Lambda, and other services
   - Check IAM policy attachments
   - Use IAM Access Analyzer to identify potential security issues

2. **Security Groups and Network ACLs**:
   - Verify inbound/outbound rules for your VPC
   - Check security group associations
   - Test connectivity between components

## 8. Elastic Cloud Integration

### Viewing Elastic Cloud Resources
1. **Accessing Elastic Cloud Console**:
   - Log in to Elastic Cloud (https://cloud.elastic.co)
   - Navigate to your Elasticsearch deployment

2. **Monitoring Elasticsearch Cluster**:
   - Check cluster health (green, yellow, red)
   - Monitor shard allocation
   - View node metrics (CPU, memory, disk)

3. **Using Kibana**:
   - Access Kibana through Elastic Cloud console
   - Check indices and document counts
   - Create visualizations and dashboards
   - Use Dev Tools for direct Elasticsearch API access

4. **Troubleshooting Elasticsearch Issues**:
   - Check cluster logs for errors
   - Verify index settings and mappings
   - Monitor JVM heap usage
   - Check for rejected requests due to queue capacity

### Elastic Cloud API Commands
```bash
# Get cluster health
curl -X GET "https://your-elasticsearch-endpoint/_cluster/health?pretty" -H "Authorization: ApiKey YOUR_API_KEY"

# Check indices
curl -X GET "https://your-elasticsearch-endpoint/_cat/indices?v" -H "Authorization: ApiKey YOUR_API_KEY"

# View shards
curl -X GET "https://your-elasticsearch-endpoint/_cat/shards?v" -H "Authorization: ApiKey YOUR_API_KEY"
```

## Conclusion

This guide provides a comprehensive overview of viewing, monitoring, and debugging AWS services used in the Financial News Engine. By systematically checking each component and using the provided CLI commands, you can efficiently troubleshoot issues and maintain the health of your application infrastructure.

Remember to follow best practices:
- Always check logs first when troubleshooting
- Use CloudWatch dashboards for proactive monitoring
- Set up alerts for critical metrics
- Document any configuration changes
- Maintain infrastructure as code through CloudFormation templates 