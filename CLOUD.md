# Deployment of Financial News Engine on AWS with Elastic Cloud Integration

This document outlines the cloud architecture, design decisions, and deployment steps for the Financial News Engine on AWS with Elastic Cloud as the search engine backend.

## Architecture Overview

The Financial News Engine is deployed as a modern, scalable cloud application with the following key components:

```
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  End Users    │      │   Amazon      │      │  Route 53     │
│  (Browser)    │─────▶│  CloudFront   │─────▶│  DNS          │
└───────────────┘      └───────────────┘      └───────────────┘
                              │
                              ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  S3 Website   │      │  CloudFront   │      │  Lambda@Edge  │
│  Bucket       │◀────▶│  Distribution │─────▶│  (CORS)       │
└───────────────┘      └───────────────┘      └───────────────┘
                              │
                              ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Application  │      │  Elastic      │      │  EC2 Auto     │
│  Load Balancer│◀────▶│  Load         │◀────▶│  Scaling      │
└───────────────┘      │  Balancer     │      │  Group        │
                       └───────────────┘      └───────────────┘
                              │                      │
                              │                      │
                              ▼                      ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  Elastic      │      │  Flask API    │      │  AWS Systems  │
│  Cloud        │◀────▶│  Backend      │─────▶│  Manager      │
│  Search       │      │  (EC2)        │      │  Parameter    │
└───────────────┘      └───────────────┘      │  Store        │
                              │               └───────────────┘
                              │
                              ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│  CloudWatch   │      │  CI/CD        │      │  CodePipeline │
│  Monitoring   │◀────▶│  Pipeline     │─────▶│  & CodeBuild  │
└───────────────┘      └───────────────┘      └───────────────┘
                              │
                              ▼
┌───────────────┐      ┌───────────────┐
│  VPC with     │      │  IAM &        │
│  Public/Private│◀────▶│  Security    │
│  Subnets      │      │  Controls     │
└───────────────┘      └───────────────┘
```

## Implementation Details

### Infrastructure Components

1. **VPC & Networking**
   - Custom VPC with public and private subnets across multiple availability zones
   - NAT Gateway for private subnet internet access
   - Internet Gateway for public subnet access
   - Security groups for traffic control
   - Network ACLs for additional security

2. **Frontend**
   - React.js application hosted in S3
   - CloudFront distribution for global content delivery
   - Lambda@Edge for CORS handling
   - Route 53 for DNS management
   - SSL/TLS certificate from AWS Certificate Manager

3. **Backend**
   - Flask API deployed on EC2 instances
   - Auto Scaling Group for handling varying loads
   - Application Load Balancer for traffic distribution
   - Systemd service for application management
   - SSM Parameter Store for configuration management

4. **Search Engine**
   - Elastic Cloud (Elasticsearch from Elastic.co)
   - Secure API key-based authentication
   - Index configuration for financial news data
   - Custom mappings and analyzers for financial terminology

5. **CI/CD Pipeline**
   - AWS CodePipeline for orchestration
   - CodeBuild for building and testing
   - S3 for artifact storage
   - CloudFormation for infrastructure-as-code deployment
   - GitHub integration for source control

6. **Monitoring & Security**
   - CloudWatch for metrics and logs
   - IAM for access control
   - SSM for secure parameter management
   - CloudFront for edge security
   - VPC security groups for network isolation

### Deployment Templates

The deployment is managed through several CloudFormation templates:

1. **VPC Template** (`vpc-template.yaml`)
   - Defines the network infrastructure
   - Sets up public and private subnets
   - Configures NAT Gateway and routing

2. **Backend Template** (`backend-template.yaml`)
   - Defines EC2 instances and Auto Scaling Group
   - Configures Application Load Balancer
   - Sets up IAM roles and security groups
   - Configures Parameter Store integration

3. **Frontend Template** (`frontend-template.yaml`)
   - Defines S3 bucket for static website
   - Configures CloudFront distribution
   - Sets up Lambda@Edge for CORS handling
   - Manages Route 53 DNS records

4. **CI/CD Template** (`cicd-template.yaml`)
   - Defines CodePipeline and CodeBuild projects
   - Configures GitHub integration
   - Sets up artifact storage
   - Defines deployment workflows

## Deployment Process

### Prerequisites

1. AWS account with appropriate permissions
2. Elastic Cloud account or self-managed Elasticsearch cluster
3. Domain name (optional, but recommended for production)
4. GitHub repository with source code

### Deployment Steps

1. **Set Up Elastic Cloud**
   - Create an Elasticsearch cluster in Elastic Cloud
   - Configure security and access controls
   - Generate API keys for the application

2. **Deploy VPC Infrastructure**
   ```bash
   aws cloudformation deploy \
     --template-file vpc-template.yaml \
     --stack-name financial-news-vpc \
     --parameter-overrides EnvironmentName=production
   ```

3. **Deploy Backend Infrastructure**
   ```bash
   aws cloudformation deploy \
     --template-file backend-template.yaml \
     --stack-name financial-news-backend \
     --parameter-overrides \
       EnvironmentName=production \
       VpcStackName=financial-news-vpc \
       ElasticsearchEndpoint=your-elastic-endpoint \
       ElasticsearchApiKey=your-api-key
   ```

4. **Deploy Frontend Infrastructure**
   ```bash
   aws cloudformation deploy \
     --template-file frontend-template.yaml \
     --stack-name financial-news-frontend \
     --parameter-overrides \
       EnvironmentName=production \
       BackendStackName=financial-news-backend \
       DomainName=financialnewsengine.com
   ```

5. **Deploy CI/CD Pipeline**
   ```bash
   aws cloudformation deploy \
     --template-file cicd-template.yaml \
     --stack-name financial-news-cicd \
     --parameter-overrides \
       EnvironmentName=production \
       GitHubOwner=your-github-username \
       GitHubRepo=search-engine \
       GitHubToken=your-github-token \
       BackendStackName=financial-news-backend \
       FrontendStackName=financial-news-frontend
   ```

6. **Initialize the Application**
   - Push code to the GitHub repository
   - Monitor the CI/CD pipeline for deployment progress
   - Verify the application is running correctly

### Maintenance and Operations

1. **Scaling**
   - Adjust Auto Scaling Group parameters as needed
   - Monitor CloudWatch metrics for capacity planning
   - Upgrade Elasticsearch cluster size as data grows

2. **Monitoring**
   - Set up CloudWatch dashboards for key metrics
   - Configure alarms for critical thresholds
   - Review logs for errors and performance issues

3. **Security**
   - Regularly rotate API keys and credentials
   - Apply security patches to EC2 instances
   - Review IAM permissions and security groups

4. **Cost Optimization**
   - Use AWS Cost Explorer to analyze usage patterns
   - Implement AWS Budgets for cost control
   - Consider reserved instances for stable workloads

## Additional Resources

- [Deployment Instructions](deployment-instructions.md)
- [CORS Troubleshooting Guide](cors-troubleshooting-guide.md)
- [VPC Setup Guide](vpc-setup-readme.md)
- [CI/CD Setup Guide](cicd-setup-readme.md)
- [Backend Setup Guide](backend-setup-readme.md)
- [Frontend Setup Guide](frontend-setup-readme.md)