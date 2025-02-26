# Financial News Engine Frontend Setup

This document guides you through setting up the frontend infrastructure for the Financial News Engine project using AWS CloudFormation.

## Frontend Architecture Overview

The CloudFormation template (`frontend-template.yaml`) creates a modern, scalable frontend infrastructure with the following components:

- **S3 Bucket**: Hosts the static React.js application files with website configuration.
- **CloudFront Distribution**: Content delivery network for fast, global access to the frontend.
- **SSL Certificate**: For secure HTTPS connections (created only if a domain name is provided).
- **Route 53 Records**: For custom domain name routing (created only if specified).
- **IAM User and Access Keys**: For continuous integration/continuous deployment (CI/CD) of frontend updates.
- **AWS Secrets Manager**: Securely stores deployment credentials.

The infrastructure is designed to provide a secure, scalable, and high-performance hosting solution for the React-based frontend of the Financial News Engine.

## Prerequisites

1. Python and AWS CLI installed via pip (installed with `pip install --user awscli`)
2. AWS account with permissions to create CloudFormation stacks
3. Backend infrastructure deployed using the `backend-template.yaml` template (recommended)
4. (Optional) Registered domain name if you want to use a custom domain
5. (Optional) Route 53 hosted zone for your domain

## Deployment Steps

### 1. Configure AWS CLI

If you haven't already configured AWS CLI, run:

```powershell
python -m awscli configure
```

Provide your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (same region where your backend is deployed)
- Default output format (json)

### 2. Validate the CloudFormation Template

```powershell
python -m awscli cloudformation validate-template --template-body file://frontend-template.yaml
```

### 3. Create the Stack

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-frontend `
  --template-body file://frontend-template.yaml `
  --capabilities CAPABILITY_NAMED_IAM
```

> **IMPORTANT:** The `--capabilities CAPABILITY_NAMED_IAM` flag is required because the template creates IAM resources with specific names.

You can customize the deployment with these parameters:
- `EnvironmentName`: Environment (development, staging, production)
- `DomainName`: Custom domain name (leave empty to use CloudFront domain)
- `CreateRoute53Records`: Whether to create Route 53 records (true/false)
- `HostedZoneId`: Route 53 Hosted Zone ID for your domain
- `BackendStackName`: Name of the backend CloudFormation stack

Example with all parameters specified:

```powershell
python -m awscli cloudformation create-stack `
  --stack-name financial-news-frontend `
  --template-body file://frontend-template.yaml `
  --parameters ParameterKey=EnvironmentName,ParameterValue=production `
              ParameterKey=DomainName,ParameterValue=financialnews.example.com `
              ParameterKey=CreateRoute53Records,ParameterValue=true `
              ParameterKey=HostedZoneId,ParameterValue=Z1D633PJN98FT9 `
              ParameterKey=BackendStackName,ParameterValue=financial-news-backend `
  --capabilities CAPABILITY_NAMED_IAM
```

### 4. Monitor Stack Creation

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-frontend
```

### 5. Get Stack Outputs

After the stack is created, retrieve the outputs (including the CloudFront URL):

```powershell
python -m awscli cloudformation describe-stacks --stack-name financial-news-frontend --query "Stacks[0].Outputs"
```

### 6. Deploy the React Application

Once the stack is created, you need to deploy your React application to the S3 bucket:

1. Build your React application:
   ```powershell
   cd /path/to/your/react/app
   npm run build
   ```

2. Get the deployment credentials from AWS Secrets Manager:
   ```powershell
   python -m awscli secretsmanager get-secret-value `
     --secret-id financial-news-frontend-deployer-credentials-production | cat
   ```

3. Configure AWS CLI with the deployment credentials:
   ```powershell
   python -m awscli configure --profile financial-news-deployer
   ```
   Provide the AccessKey and SecretKey from the previous step.

4. Upload the build files to the S3 bucket:
   ```powershell
   python -m awscli s3 sync ./build/ s3://your-frontend-bucket-name/ --profile financial-news-deployer
   ```
   Replace `your-frontend-bucket-name` with the actual bucket name from the stack outputs.

5. Create a CloudFront invalidation to clear the cache:
   ```powershell
   python -m awscli cloudfront create-invalidation `
     --distribution-id your-distribution-id `
     --paths "/*" `
     --profile financial-news-deployer
   ```
   Replace `your-distribution-id` with the actual distribution ID from the stack outputs.

### 7. Test the Deployment

Once the deployment is complete, test the website by visiting the CloudFront URL or your custom domain:

```
https://<CloudFront-Domain-Name>
```

or

```
https://<Your-Custom-Domain>
```

## Understanding the Deployment

### S3 Bucket and CloudFront

The template creates an S3 bucket configured for website hosting but with public access blocked. All access to the bucket is done through CloudFront, which provides:
- Global content delivery with low latency
- HTTPS encryption
- Edge caching to improve performance
- Protection against certain types of attacks

### Custom Domain and SSL

If you provide a domain name, the template will:
- Create an SSL certificate for secure HTTPS
- Configure CloudFront to use this certificate
- Optionally create Route 53 records to point your domain to CloudFront

The SSL certificate uses DNS validation, which requires you to add CNAME records to prove domain ownership. If using Route 53, this can be automated.

### Deployment User and Credentials

The template creates:
- An IAM user with permissions to deploy to the S3 bucket and invalidate CloudFront
- Access keys for this user
- A Secrets Manager secret containing these credentials

This allows you to set up a CI/CD pipeline that can securely deploy updates to your frontend without requiring broad AWS permissions.

## Security Considerations

1. The S3 bucket is configured to block all public access. Only CloudFront can access its contents.
2. CloudFront is configured to enforce HTTPS.
3. Deployment credentials are stored securely in AWS Secrets Manager.
4. The IAM deployment user has only the permissions needed for deployment.

## Next Steps

After setting up the frontend:

1. Set up a CI/CD pipeline for automated deployments
2. Configure the React application to use the backend API
3. Set up monitoring for the CloudFront distribution
4. Implement a content security policy
5. Consider setting up AWS WAF for additional security

## Resource Management

### Updating the Stack

To update the stack with new parameters or template changes:

```powershell
python -m awscli cloudformation update-stack `
  --stack-name financial-news-frontend `
  --template-body file://frontend-template.yaml `
  --parameters ParameterKey=DomainName,ParameterValue=newdomain.example.com `
  --capabilities CAPABILITY_NAMED_IAM
```

### Updating the Frontend

To update the frontend application:

1. Build the new version:
   ```powershell
   npm run build
   ```

2. Upload to S3:
   ```powershell
   python -m awscli s3 sync ./build/ s3://your-frontend-bucket-name/ --delete --profile financial-news-deployer
   ```

3. Invalidate the CloudFront cache:
   ```powershell
   python -m awscli cloudfront create-invalidation --distribution-id your-distribution-id --paths "/*" --profile financial-news-deployer
   ```

### Deleting the Stack

Before deleting the stack, you must empty the S3 bucket:

```powershell
python -m awscli s3 rm s3://your-frontend-bucket-name/ --recursive --profile financial-news-deployer
```

Then delete the stack:

```powershell
python -m awscli cloudformation delete-stack --stack-name financial-news-frontend
```

## Troubleshooting

- If the stack creation fails, check the error in the CloudFormation console or using:
  ```powershell
  python -m awscli cloudformation describe-stack-events --stack-name financial-news-frontend
  ```

- If SSL certificate validation fails:
  - Check that the CNAME records for validation have been created
  - Certificate validation can take up to 30 minutes

- If you're unable to access the website:
  - Verify that the S3 bucket contains the files (check with `aws s3 ls`)
  - Check that the CloudFront distribution is deployed (status should be "Deployed")
  - Verify that the Route 53 records are correctly configured (if using a custom domain)

- If the React app loads but API requests fail:
  - Verify that the API endpoint URLs are correct
  - Check CORS settings on both the frontend and backend
  - Ensure the backend is properly deployed and accessible

- If you see command not found errors with `aws`, remember to use `python -m awscli` as shown above 