# Financial News Engine CI/CD Architecture

This document provides an overview of the CI/CD architecture implemented for the Financial News Engine project.

## CI/CD Pipeline Workflow

```
                                      +-------------+
                                      |             |
                                      |   GitHub    |
                                      | Repository  |
                                      |             |
                                      +------+------+
                                             |
                                             | Webhook Trigger
                                             |
                                             v
+----------------------------------------------------------------------------------------------------------+
|                                        CodePipeline                                                       |
|                                                                                                          |
|  +-----------------+     +-------------------------+     +-----------------------------+                  |
|  |                 |     |                         |     |                             |                  |
|  |  Source Stage   +---->|  Build and Test Stage   +---->|       Deploy Stage          |                  |
|  |                 |     |                         |     |                             |                  |
|  +-----------------+     +-------------------------+     +-----------------------------+                  |
|                                                                                                          |
+----------------------------------------------------------------------------------------------------------+
                                             |
                                             |
             +-----------------------------+-------------------------------+
             |                                                            |
             v                                                            v
+----------------------------+                               +----------------------------+
|                            |                               |                            |
|   Frontend Pipeline        |                               |   Backend Pipeline         |
|                            |                               |                            |
+----------------------------+                               +----------------------------+
|                            |                               |                            |
| 1. Install Dependencies    |                               | 1. Install Dependencies    |
| 2. Run Tests               |                               | 2. Run Tests & Linting     |
| 3. Build React App         |                               | 3. Build Deployment Package|
| 4. Upload to S3            |                               | 4. Deploy to EC2 Instances |
| 5. Invalidate CloudFront   |                               | 5. Restart Application     |
|                            |                               |                            |
+-------------+--------------+                               +-------------+--------------+
              |                                                            |
              v                                                            v
+----------------------------+                               +----------------------------+
|                            |                               |                            |
|   Frontend Infrastructure  |                               |   Backend Infrastructure   |
|                            |                               |                            |
| - S3 Bucket                |                               | - EC2 Instances (ASG)      |
| - CloudFront Distribution  |                               | - Application Load Balancer|
| - Route 53 Records         |                               | - Security Groups          |
|                            |                               |                            |
+----------------------------+                               +----------------------------+
```

## Detailed Flow Description

### 1. Source Stage

- Developer pushes code to the GitHub repository
- GitHub webhook triggers the CodePipeline execution
- Source code is downloaded and stored in S3 as an artifact

### 2. Build and Test Stage

The pipeline has parallel build processes for frontend and backend:

#### Frontend Build
- CodeBuild uses `frontend/buildspec.yml` to:
  - Install Node.js dependencies
  - Run automated tests
  - Build the React application
  - Store build artifacts for deployment

#### Backend Build
- CodeBuild uses `backend/buildspec.yml` to:
  - Install Python dependencies
  - Run linting checks (flake8)
  - Run unit tests with code coverage
  - Create a deployment package
  - Store the package for deployment

### 3. Deploy Stage

#### Frontend Deployment
- CodeBuild uses `frontend/deployspec.yml` to:
  - Retrieve S3 bucket name and CloudFront distribution ID from the frontend stack
  - Upload built files to S3
  - Create a CloudFront invalidation to refresh the cache
  - Report deployment status

#### Backend Deployment
- CodeBuild uses `backend/deployspec.yml` to:
  - Retrieve Auto Scaling Group name from the backend stack
  - Get the list of EC2 instance IDs
  - Use AWS Systems Manager (SSM) Run Command to:
    - Upload deployment package to each instance
    - Execute deployment scripts
    - Restart the application service
  - Report deployment status

## Security Considerations

The CI/CD pipeline is designed with security in mind:

1. **Least Privilege Principle**: IAM roles are configured with minimal necessary permissions
2. **Secure Storage**:
   - Source code and artifacts are stored in private S3 buckets
   - Credentials are stored in AWS Secrets Manager
3. **Secure Deployments**:
   - Frontend deployment uses IAM-restricted S3 access
   - Backend deployment uses SSM Run Command for secure shell execution
4. **Secure Communication**:
   - All AWS API calls use HTTPS
   - GitHub webhook uses HMAC authentication

## Monitoring and Notifications

The pipeline includes:

1. **Build Logs**: All build and deployment logs are stored in CloudWatch Logs
2. **Pipeline Status**: Visible in AWS CodePipeline console
3. **Alerting**: Potential to add SNS notifications for pipeline events

## Scaling Considerations

The CI/CD pipeline is designed to scale with your application:

1. **Multiple Environments**: Can be deployed for development, staging, and production
2. **Multiple Instances**: Backend deployment handles any number of EC2 instances
3. **Parallel Builds**: Frontend and backend build in parallel for faster pipeline execution 