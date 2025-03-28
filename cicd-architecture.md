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
- GitHub webhook triggers the CodePipeline execution via HMAC authentication
- Source code is downloaded and stored in S3 as an artifact

### 2. Build and Test Stage

The pipeline has parallel build processes for frontend and backend:

#### Frontend Build
- CodeBuild uses `buildspecs/frontend-build.yml` to:
  - Install Node.js dependencies
  - Run automated tests
  - Build the React application
  - Store build artifacts for deployment

#### Backend Build
- CodeBuild uses `buildspecs/backend-build.yml` to:
  - Install Python dependencies
  - Run linting checks (flake8)
  - Run unit tests with code coverage
  - Create a deployment package
  - Store the package for deployment

### 3. Deploy Stage

The deploy stage includes multiple parallel actions:

#### API Code Deployment
- CodeBuild uses `buildspecs/api-deploy.yml` to:
  - Deploy the API code directly to backend instances
  - Update the application without replacing infrastructure

#### Frontend Deployment
- CodeBuild uses `buildspecs/frontend-deploy.yml` to:
  - Retrieve S3 bucket name and CloudFront distribution ID from the frontend stack
  - Upload built files to S3
  - Create a CloudFront invalidation to refresh the cache
  - Report deployment status

#### Backend Deployment
- CodeBuild uses `buildspecs/backend-deploy.yml` to:
  - Retrieve Auto Scaling Group name from the backend stack
  - Get the list of EC2 instance IDs
  - Use AWS Systems Manager (SSM) Run Command to:
    - Upload deployment package to each instance
    - Execute deployment scripts
    - Restart the application service
  - Report deployment status

### 4. Post-Deploy Stage

- CodeBuild uses `buildspecs/deployment-notification.yml` to:
  - Publish deployment status to SNS topic
  - Monitor instance refresh progress
  - Report on deployment success or failure

## Component Details

### AWS CodePipeline

The `FinancialNewsPipeline` coordinates the entire CI/CD flow with the following stages:
- Source Stage: Retrieves code from GitHub
- BuildAndTest Stage: Builds and tests frontend and backend code in parallel
- Deploy Stage: Deploys API code, frontend, and backend components
- PostDeploy Stage: Sends deployment notifications

### AWS CodeBuild Projects

The CI/CD architecture includes the following CodeBuild projects:

1. **FrontendBuildProject**: Builds and tests the frontend React application
2. **BackendBuildProject**: Builds and tests the backend Python application
3. **FrontendDeployProject**: Deploys the React application to S3 and invalidates CloudFront
4. **BackendDeployProject**: Deploys the backend application to EC2 instances
5. **ApiCodeDeployProject**: Deploys API code directly to backend instances
6. **DeployNotificationProject**: Sends deployment notifications via SNS

### GitHub Integration

The pipeline uses a GitHub webhook for automated triggering:
- HMAC authentication for security
- Configured to trigger on pushes to the specified branch
- Webhook registered automatically via CloudFormation

### IAM Roles and Policies

The architecture includes two main IAM roles:

1. **CodePipelineServiceRole**: Allows CodePipeline to:
   - Interact with S3 buckets for artifacts
   - Create/update CloudFormation stacks
   - Trigger CodeBuild builds
   - Access CloudWatch
   - Manage AWS resources like Auto Scaling Groups, EC2, and Elastic Load Balancing

2. **CodeBuildServiceRole**: Allows CodeBuild to:
   - Access S3 buckets
   - Manage CloudFront distributions
   - Create CloudWatch logs
   - Manage EC2 network interfaces
   - Access SSM parameters
   - Access Secrets Manager
   - Describe CloudFormation stacks
   - Manage Auto Scaling Groups
   - Run SSM commands on EC2 instances
   - Describe EC2 instances
   - Publish to SNS topics

### Artifact Storage

The pipeline uses a dedicated S3 bucket (`ArtifactBucket`) with the following security features:
- Versioning enabled
- Server-side encryption with AES-256
- Public access blocked
- Tagged for environment identification

### Parameter Store Integration

The CI/CD architecture integrates with AWS Systems Manager Parameter Store to securely store and retrieve:
- Elasticsearch API key
- Elasticsearch URL
- Elasticsearch index name
- Number of shards for Elasticsearch index
- Number of replicas for Elasticsearch index

## Security Considerations

The CI/CD pipeline is designed with security in mind:

1. **Least Privilege Principle**: IAM roles are configured with minimal necessary permissions
2. **Secure Storage**:
   - Source code and artifacts are stored in private S3 buckets with server-side encryption
   - Credentials are stored in AWS Secrets Manager and SSM Parameter Store with restricted access
3. **Secure Deployments**:
   - Frontend deployment uses IAM-restricted S3 access
   - Backend deployment uses SSM Run Command for secure shell execution
4. **Secure Communication**:
   - All AWS API calls use HTTPS
   - GitHub webhook uses HMAC authentication
5. **Protection of Sensitive Data**:
   - GitHub tokens and API keys use the NoEcho property to prevent exposure
   - SSM Parameter Store is used to securely store environment variables

## Monitoring and Notifications

The pipeline includes:

1. **Build Logs**: All build and deployment logs are stored in CloudWatch Logs
2. **Pipeline Status**: Visible in AWS CodePipeline console
3. **SNS Notifications**: The `DeploymentNotificationTopic` provides:
   - Deployment start/completion notifications
   - Error alerts for failed deployments
   - Instance refresh status updates

## Scaling Considerations

The CI/CD pipeline is designed to scale with your application:

1. **Multiple Environments**: Can be deployed for development, staging, and production
   - Parameter-driven configuration for environment-specific settings
   - CloudFormation stack exports for cross-stack references
   
2. **Multiple Instances**: Backend deployment handles any number of EC2 instances
   - Auto Scaling Group integration
   - SSM Run Command for parallel deployment
   
3. **Parallel Builds**: Frontend and backend build in parallel for faster pipeline execution
   - Optimized for reducing deployment time
   - Separate build processes to avoid interference

4. **Pipeline Customization**:
   - Buildspec files in separate directory for easier maintenance
   - Environment variables passed to build projects
   - Cross-stack references for resource discovery

## Repository Organization

For the CI/CD pipeline to work correctly, maintain the following structure:

```
search-engine/
├── buildspecs/             # CodeBuild buildspec files
│   ├── frontend-build.yml
│   ├── frontend-deploy.yml
│   ├── backend-build.yml
│   ├── backend-deploy.yml
│   ├── api-deploy.yml
│   └── deployment-notification.yml
├── frontend/               # Frontend application code
├── backend/                # Backend application code
├── deployment-scripts/     # Deployment scripts
└── cicd-template.yaml      # CloudFormation template for CI/CD pipeline
```

## Adding Custom Build Steps

To add custom build steps to the pipeline:

1. Create a new buildspec file in the `buildspecs` directory
2. Add a new CodeBuild project to the `cicd-template.yaml` file
3. Add the new project to the appropriate stage in the pipeline definition 