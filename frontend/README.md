# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Cloud Deployment Configuration

When deploying the frontend to AWS, ensure the following steps are completed:

### API Endpoint Configuration

The frontend needs to connect to your deployed backend API. Update the `.env.production` file with the correct backend URL:

```
REACT_APP_API_URL=http://development-backend-alb-1048070002.us-east-1.elb.amazonaws.com
```

For AWS deployments, this URL will typically be:
- The Application Load Balancer DNS name (as shown above)
- API Gateway endpoint URL (if using API Gateway)
- CloudFront distribution domain name (if your backend is behind CloudFront)

### AWS CloudFormation Deployment

This project is deployed using AWS CloudFormation templates:

1. **Frontend Infrastructure** (`frontend-template.yaml`):
   - Creates S3 bucket for hosting
   - Sets up CloudFront distribution
   - Configures appropriate bucket policies

2. **CI/CD Pipeline** (`cicd-template.yaml`):
   - Sets up automatic deployment from GitHub
   - Handles building, testing, and deploying the application

### Deployment Process

The deployment process happens automatically through the CI/CD pipeline:

1. When code is pushed to the specified GitHub branch, CodePipeline is triggered
2. CodeBuild runs `npm install` and `npm test` to verify the code
3. If tests pass, CodeBuild runs `npm run build` to create the production build
4. The build artifacts are deployed to the S3 bucket
5. A CloudFront invalidation is created to clear the cache

### YAML Syntax Notes

When making changes to CloudFormation templates:
- Always quote multiline commands properly
- Ensure proper YAML indentation
- Validate templates before pushing changes:
  ```
  aws cloudformation validate-template --template-body file://cicd-template.yaml
  ```

### Troubleshooting Deployment

If deployment fails:
1. Check CodeBuild logs in AWS Console
2. Verify IAM permissions for CodeBuild service role
3. Check for YAML syntax errors in buildspec
4. Verify environment variables are correctly set
5. Ensure the S3 bucket exists and is correctly referenced

### Manual Deployment

For manual deployments to S3:

```bash
# Build the application
npm run build

# Sync to S3
aws s3 sync build/ s3://your-bucket-name/ --delete

# Create CloudFront invalidation
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## AWS Integration with Mock API

For development purposes, this frontend includes a mock API implementation that can be used in the AWS environment when needed. This allows the dev team to test the frontend independently of the backend availability.

### Toggling Between Mock and Real API in AWS

The frontend can be configured to use either the real backend API or the mock API implementation in AWS deployments:

1. **Using the Real Backend (Default)**

   The production environment is configured to use the real backend API by default. The `.env.production` file contains:

   ```
   REACT_APP_USE_MOCK_API=false
   ```

2. **Using the Mock API for Testing**

   To deploy with mock API enabled, you can either:

   - Modify the `.env.production` file and set:
     ```
     REACT_APP_USE_MOCK_API=true
     ```

   - Or pass it as an environment variable during the build:
     ```
     USE_MOCK_API=true npm run build
     ```

   - For AWS CodeBuild, set the `USE_MOCK_API` environment variable in the build project.

### Mock API Features in AWS

The mock API implementation is optimized for AWS production use:

- Pre-generates a cache of mock articles for better performance
- Reduces artificial delays compared to development environment
- Includes automatic fallback to mock data if the real API fails
- Shows a visual indicator when mock data is being used

### Deployment Verification

After deploying to AWS, you can verify the API configuration:

1. Open the application in a browser
2. If using mock data, a small info message will appear on the homepage
3. Search for content to validate that results are returned correctly

If you need to quickly verify which mode the application is running in, check the browser console logs in the development tools.
