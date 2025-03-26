# Buildspec Files

This directory contains the buildspec files used by the CI/CD pipeline for building and deploying the Financial News Engine application.

## Files

- `frontend-build.yml` - Buildspec for building the frontend React application
- `frontend-deploy.yml` - Buildspec for deploying the frontend to S3 and invalidating CloudFront cache
- `backend-build.yml` - Buildspec for building the backend application
- `backend-deploy.yml` - Buildspec for deploying the backend to EC2 instances
- `api-deploy.yml` - Buildspec for deploying the API code directly to backend instances
- `deployment-notification.yml` - Buildspec for sending deployment notifications via SNS

## Purpose

These buildspec files are referenced in the `cicd-template.yaml` CloudFormation template. Extracting the buildspecs into separate files makes the template more maintainable and reduces its size.

## Usage

When the CI/CD pipeline runs, it will use these buildspec files to build and deploy the application. The buildspec files are referenced by their relative path from the repository root in the CodeBuild project definitions.

Example:

```yaml
Source:
  Type: CODEPIPELINE
  BuildSpec: buildspecs/frontend-build.yml
```

## Customization

To modify the build or deployment process, edit the appropriate buildspec file. The changes will take effect the next time the pipeline runs. 