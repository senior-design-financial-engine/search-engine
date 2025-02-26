# Financial News Engine CI/CD Pipeline Setup

This document guides you through setting up the CI/CD pipeline for the Financial News Engine project using AWS CloudFormation.

## Pipeline Architecture Overview

The CloudFormation template (`cicd-template.yaml`) creates a comprehensive CI/CD pipeline with the following components:

- **AWS CodePipeline**: Orchestrates the entire CI/CD workflow
- **AWS CodeBuild**: Executes build, test, and deployment tasks
- **S3 Bucket**: Stores pipeline artifacts
- **IAM Roles and Policies**: Provides necessary permissions
- **GitHub Webhook**: Triggers the pipeline when code is pushed

The pipeline is designed to handle both frontend and backend deployments:

- **Frontend Pipeline**: Builds, tests, and deploys the React application to S3 and invalidates CloudFront
- **Backend Pipeline**: Builds, tests, and deploys the Flask application to EC2 instances via SSM Run Command

## Prerequisites

1. Python and AWS CLI installed (via pip with `pip install --user awscli`)
2. AWS account with permissions to create CloudFormation stacks
3. GitHub repository with your project code
4. GitHub personal access token with repo and admin:repo_hook permissions
5. Deployed infrastructure stacks:
   - VPC stack (created with `vpc-template.yaml`)
   - Backend stack (created with `backend-template.yaml`)
   - Frontend stack (created with `frontend-template.yaml`)

## Deployment Steps

### 1. Configure AWS CLI

If you haven't already configured AWS CLI, run:

```powershell
python -m awscli configure
```

Provide your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (same region where your infrastructure is deployed)
- Default output format (json)

### 2. Validate the CloudFormation Template

```powershell
python -m awscli cloudformation validate-template --template-body file://cicd-template.yaml
```

### 3. Create the Stack

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-cicd `
  --template-body file://cicd-template.yaml `
  --parameters ParameterKey=EnvironmentName,ParameterValue=production `
              ParameterKey=GitHubOwner,ParameterValue=your-github-username `
              ParameterKey=GitHubRepo,ParameterValue=financial-news-engine `
              ParameterKey=GitHubBranch,ParameterValue=main `
              ParameterKey=GitHubToken,ParameterValue=your-github-token `
              ParameterKey=FrontendStackName,ParameterValue=financial-news-frontend `
              ParameterKey=BackendStackName,ParameterValue=financial-news-backend `
  --capabilities CAPABILITY_IAM
```

> **IMPORTANT:** The `--capabilities CAPABILITY_IAM` flag is required because the template creates IAM resources.

### 4. Monitor Stack Creation

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-cicd
```

### 5. Get Stack Outputs

After the stack is created, retrieve the outputs (including the pipeline URL):

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-cicd --query "Stacks[0].Outputs"
```

## Required Repository Structure

To use this CI/CD pipeline, your repository should have the following structure:

```
financial-news-engine/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── buildspec.yml    # CodeBuild spec for frontend build
│   └── deployspec.yml   # CodeBuild spec for frontend deployment
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── buildspec.yml    # CodeBuild spec for backend build
│   └── deployspec.yml   # CodeBuild spec for backend deployment
├── cicd-template.yaml   # CloudFormation template for CI/CD pipeline
└── README.md
```

The `buildspec.yml` and `deployspec.yml` files are used by CodeBuild to know how to build and deploy your code. These have been created as part of this setup.

## How the Pipeline Works

The CI/CD pipeline has the following workflow:

1. **Source Stage**: 
   - Triggered when code is pushed to the specified GitHub branch
   - Downloads the source code

2. **Build and Test Stage**:
   - **Frontend**: 
     - Installs Node.js dependencies
     - Runs tests
     - Builds the React application
   - **Backend**: 
     - Installs Python dependencies
     - Runs linting and tests
     - Creates a deployment package

3. **Deploy Stage**:
   - **Frontend**: 
     - Retrieves S3 and CloudFront information from the frontend stack
     - Uploads the built files to S3
     - Creates a CloudFront invalidation
   - **Backend**: 
     - Retrieves Auto Scaling Group information from the backend stack
     - Deploys to each EC2 instance using SSM Run Command
     - Restarts the application service

## Troubleshooting

### Pipeline Fails at Source Stage

- Verify that the GitHub token is valid and has the necessary permissions
- Check if the webhook was created successfully in your GitHub repository

### Frontend Build Fails

- Check the CodeBuild logs for errors
- Verify that the frontend code builds locally
- Ensure you have the correct Node.js version specified in the buildspec.yml

### Backend Build Fails

- Check the CodeBuild logs for errors
- Verify that the backend code passes tests locally
- Ensure you have the correct dependencies in requirements.txt

### Deployment Fails

- **Frontend**:
  - Verify that the S3 bucket and CloudFront distribution exist
  - Check that the CodeBuild role has permissions to access these resources
  
- **Backend**:
  - Verify that the EC2 instances are running
  - Check that the SSM agent is installed and running on the instances
  - Ensure the CodeBuild role has permissions to use SSM Run Command

## Updating the Pipeline

To update the CI/CD pipeline with new parameters or template changes:

```powershell
python -m awscli cloudformation update-stack `
  --stack-name financial-news-cicd `
  --template-body file://cicd-template.yaml `
  --parameters ParameterKey=GitHubBranch,ParameterValue=develop `
  --capabilities CAPABILITY_IAM
```

## Security Considerations

1. The GitHub token is stored as a NoEcho parameter in CloudFormation and is not displayed in outputs
2. IAM roles follow the principle of least privilege
3. All S3 buckets block public access
4. The backend deployment uses SSM Run Command for secure deployment to EC2 instances

## Next Steps

After setting up the CI/CD pipeline:

1. Configure monitoring and alerting for the pipeline
2. Implement quality gates such as code coverage and security scans
3. Consider implementing blue-green deployments for the backend
4. Add manual approval stages for production deployments

## Deleting the Stack

Before deleting the stack, ensure that you:

1. Disconnect the GitHub webhook from your repository if needed
2. Empty the artifacts S3 bucket:

```powershell
python -m awscli s3 rm s3://your-artifact-bucket-name/ --recursive
```

Then delete the stack:

```powershell
python -m awscli cloudformation delete-stack --stack-name financial-news-cicd
```

If you see command not found errors with `aws`, remember to use `python -m awscli` as shown above. 