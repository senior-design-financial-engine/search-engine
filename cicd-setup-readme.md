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

## Stack Naming Conventions

When deploying to multiple environments (development, staging, production), it's important to include the environment name in the stack name itself, not just as a parameter. This ensures proper cross-stack references and prevents conflicts.

**Recommended naming pattern:**
```
financial-news-cicd-{environment}
```

For example:
- `financial-news-cicd-development`
- `financial-news-cicd-staging`
- `financial-news-cicd-production`

When referencing other stacks, ensure their names also include the environment:
- `financial-news-vpc-{environment}`
- `financial-news-backend-{environment}`
- `financial-news-frontend-{environment}`

This would be reflected in your stack creation command:

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-cicd-staging `
  --template-body file://cicd-template.yaml `
  --parameters `
    ParameterKey=EnvironmentName,ParameterValue=staging `
    ParameterKey=VpcStackName,ParameterValue=financial-news-vpc-staging `
    ParameterKey=BackendStackName,ParameterValue=financial-news-backend-staging `
    ParameterKey=FrontendStackName,ParameterValue=financial-news-frontend-staging `
    # Other parameters...
  --capabilities CAPABILITY_IAM
```

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
- Default region (same region where your infrastructure is deployed)
- Default output format (json)

### 2. Validate the CloudFormation Template

```powershell
python -m awscli cloudformation validate-template --template-body file://cicd-template.yaml
```

### 3. Create the Stack

Make sure you have your GitHub personal access token ready. Then run:

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-cicd-staging `
  --template-body file://cicd-template.yaml `
  --parameters `
    ParameterKey=EnvironmentName,ParameterValue=staging `
    ParameterKey=GitHubOwner,ParameterValue=your-github-username `
    ParameterKey=GitHubRepo,ParameterValue=financial-news-engine `
    ParameterKey=GitHubBranch,ParameterValue=main `
    ParameterKey=GitHubToken,ParameterValue=your-github-token `
    ParameterKey=FrontendStackName,ParameterValue=financial-news-frontend-staging `
    ParameterKey=BackendStackName,ParameterValue=financial-news-backend-staging `
    ParameterKey=VpcStackName,ParameterValue=financial-news-vpc-staging `
  --capabilities CAPABILITY_IAM
```

Parameters explanation:
- `EnvironmentName`: Deployment environment (development, staging, or production)
- `GitHubOwner`: Your GitHub username or organization
- `GitHubRepo`: Name of the GitHub repository
- `GitHubBranch`: Repository branch to monitor (usually main or master)
- `GitHubToken`: Personal access token for GitHub API access
- `FrontendStackName`: Name of the frontend CloudFormation stack
- `BackendStackName`: Name of the backend CloudFormation stack
- `VpcStackName`: Name of the VPC CloudFormation stack

### 4. Monitor Stack Creation

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-cicd-staging
```

### 5. Get Stack Outputs

After the stack is created, retrieve the outputs (including the pipeline URL):

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-cicd-staging --query "Stacks[0].Outputs"
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
python -m awscli cloudformation delete-stack --stack-name financial-news-cicd-staging
```

If you see command not found errors with `aws`, remember to use `python -m awscli` as shown above.

## YAML Syntax Requirements for CodeBuild Buildspecs

The CI/CD pipeline uses AWS CodeBuild buildspecs defined in the CloudFormation template. Pay special attention to the syntax requirements for these buildspecs:

### Common Syntax Issues

1. **Multiline Commands**: When using multiline bash commands, properly quote and escape the strings:
   ```yaml
   # CORRECT:
   - "if [ -f \"package.json\" ]; then echo \"Found package.json\"; npm install; else echo \"No package.json found\"; fi"
   
   # INCORRECT:
   - if [ -f "package.json" ]; then
       echo "Found package.json"
       npm install
     else
       echo "No package.json found"
     fi
   ```

2. **Variable Interpolation**: Use `$(command)` syntax instead of backticks:
   ```yaml
   # CORRECT:
   - "echo \"Build completed on $(date)\""
   
   # INCORRECT:
   - echo "Build completed on `date`"
   ```

3. **Quoting and Escaping**: Always escape embedded double quotes and properly quote the entire command:
   ```yaml
   # CORRECT:
   - "echo \"Current directory: $(pwd)\""
   
   # INCORRECT:
   - echo "Current directory: $(pwd)"
   ```

### Validating Buildspec Syntax

To avoid deployment failures, validate your syntax before committing changes:

1. Extract the buildspec to a separate file for testing:
   ```bash
   # Extract buildspec from CloudFormation template to test file
   python -c "import yaml; print(yaml.dump(yaml.safe_load(open('cicd-template.yaml').read())['Resources']['FrontendBuildProject']['Properties']['Source']['BuildSpec']))" > test-buildspec.yml
   ```

2. Validate the buildspec directly:
   ```bash
   cat test-buildspec.yml | python -c "import sys, yaml; yaml.safe_load(sys.stdin)"
   ```

3. If no errors are displayed, the syntax is valid.

## Common Deployment Issues and Solutions

### Access Denied Errors

If your CodeBuild projects encounter "Access Denied" errors:

1. **IAM Role Permissions**: Ensure the CodeBuildServiceRole has necessary permissions:
   ```yaml
   # Add these permissions to CodeBuildServiceRole
   - Effect: Allow
     Action:
       - 'cloudformation:DescribeStacks'
       - 'cloudformation:ListStackResources'
     Resource: '*'
   ```

2. **S3 Bucket Access**: Verify the bucket policy allows access from CodeBuild

3. **CloudFront Access**: Ensure the IAM role has proper CloudFront permissions:
   ```yaml
   - Effect: Allow
     Action:
       - 'cloudfront:CreateInvalidation'
       - 'cloudfront:GetInvalidation'
       - 'cloudfront:ListInvalidations'
     Resource: '*'
   ```

### Build Environment Issues

1. **Runtime Version**: Ensure you're using compatible runtime versions:
   ```yaml
   runtime-versions:
     nodejs: 16  # Update as needed
     python: 3.9 # Update as needed
   ```

2. **Environment Variables**: Set all required environment variables in the CodeBuild project

3. **Memory/CPU Limits**: If builds fail due to resource constraints, increase the compute type:
   ```yaml
   ComputeType: BUILD_GENERAL1_MEDIUM # Increase from SMALL if needed
   ```

### CI/CD Pipeline Debugging

To debug pipeline issues:

1. Check the individual phases of your CodeBuild projects in the AWS Console
2. Examine CloudWatch Logs for detailed error messages
3. Validate IAM permissions for each service
4. Check that environment variables are correctly passed between stages
5. Verify source code is correctly pulled from GitHub
6. Update the GitHub webhook if pipeline isn't triggered by code pushes

## Updating an Existing Pipeline

When updating an existing CI/CD pipeline:

1. Make a backup of your current template:
   ```bash
   python -m awscli cloudformation get-template --stack-name financial-news-cicd > cicd-template-backup.json
   ```

2. Make your changes to the template, ensuring proper YAML syntax

3. Validate the template:
   ```bash
   python -m awscli cloudformation validate-template --template-body file://cicd-template.yaml
   ```

4. Update the stack:
   ```bash
   python -m awscli cloudformation update-stack --stack-name financial-news-cicd --template-body file://cicd-template.yaml --capabilities CAPABILITY_IAM
   ```

5. Monitor the stack update:
   ```bash
   python -m awscli cloudformation describe-stack-events --stack-name financial-news-cicd
   ```

## Parameters Reference

The CI/CD template accepts the following parameters:

| Parameter | Description | Default | Required |
|-----------|-------------|---------|----------|
| EnvironmentName | Deployment environment | production | No |
| GitHubOwner | GitHub repository owner | | Yes |
| GitHubRepo | GitHub repository name | | Yes |
| GitHubBranch | GitHub repository branch | main | No |
| GitHubToken | GitHub OAuth token | | Yes |
| FrontendStackName | Name of the frontend stack | financial-news-frontend | No |
| BackendStackName | Name of the backend stack | financial-news-backend | No |
| VpcStackName | Name of the VPC stack | financial-news-vpc | No | 