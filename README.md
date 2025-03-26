# Financial News Engine

## Overview
The Financial News Engine is an open-source, customizable search platform designed to provide real-time financial news aggregation and analysis. The system aims to democratize access to financial information by offering a free alternative to expensive terminals while incorporating advanced machine learning capabilities for enhanced news processing and analysis.

## Project Status
Currently in active development by Team 14 at Boston University's Electrical & Computer Engineering department as part of the EC463/EC464 Capstone Senior Design Project. The MVP features are implemented and functional.

## Key Features

### Real-Time News Aggregation
- Multi-source web crawling (BBC, NPR, AP News)
- Real-time indexing with updates within 3 minutes of publication
- Support for multiple news categories and regions

### Advanced Search Capabilities
- Full-text search across headlines and content
- Filtering by source, time ranges, and categories
- Customizable news feeds
- Sub-second query response time

### Machine Learning Integration
- Article summarization using transformers
- Sentiment analysis
- Topic identification
- Category classification

### Analytics Features
- News source distribution analysis
- Sentiment trends tracking
- Regional news coverage analysis
- Company mention tracking

### Development Features
- Mock data generator for frontend development
- Configurable environment variables to toggle mock/real backends
- CI/CD integration with AWS deployment

## Technical Architecture

### Frontend (React.js)
- Responsive web interface
- Real-time updates
- Bootstrap integration
- Chart.js visualization components

### Backend (Python/Flask)
- RESTful API architecture
- CORS support
- Elasticsearch integration
- Environment-based configuration
- Mock data generator for development and testing

### Core Components
1. **Web Crawler**
   - RSS feed processing
   - Multi-source support (BBC, NPR, AP News)
   - Content validation
   - URL deduplication

2. **Indexer**
   - Document processing
   - Metadata extraction
   - Real-time updates

3. **Search Engine**
   - Query processing
   - Elasticsearch backend
   - Result ranking

4. **ML Pipeline**
   - Transformer-based summarization
   - Sentiment analysis
   - Topic modeling

## System Requirements

### Technical Dependencies
- Python 3.x
- Flask
- Elasticsearch 8.11.0
- React.js
- Additional libraries:
  - transformers
  - pandas
  - numpy
  - requests
  - flask-cors
  - python-dotenv

### Development Setup
- Node.js environment for frontend
- Python virtual environment for backend
- Elasticsearch instance
- Environment configuration (.env)

### Mock Data Mode
For development without an Elasticsearch instance:
1. Set `USE_MOCK_DATA=true` in your environment file
2. Run the backend server as normal
3. All API requests will return realistic fake financial news data

## Differentiators

### vs. Bloomberg Terminal
- Open-source and free access
- Machine learning-enhanced search
- Customizable interface
- Focus on diverse news sources

### vs. Yahoo Finance
- Advanced filtering capabilities
- Sentiment analysis
- Real-time processing
- Comprehensive API access

## Target Users
- Individual traders and investors
- Financial professionals
- Business owners
- Market analysts
- Anyone interested in financial markets

## Development Constraints
- Open-source requirement
- Data privacy compliance
- Development budget cap of $1,000
- Real-time processing requirements

## Future Enhancements
- Extended machine learning capabilities
- Additional data source integration
- Enhanced visualization tools
- Mobile application development
- API ecosystem expansion

## Cloud Deployment

This project is designed to be deployed on AWS using a comprehensive infrastructure-as-code approach with CloudFormation templates.

### Deployment Architecture

The system is deployed using four main CloudFormation templates:

1. **VPC Infrastructure** (`vpc-template.yaml`)
   - Networking foundation with public and private subnets
   - NAT Gateways for private subnet internet access
   - Appropriate security groups and routing tables

2. **Backend Infrastructure** (`backend-template.yaml`)
   - Auto Scaling Group of EC2 instances
   - Application Load Balancer
   - Security groups with appropriate ingress/egress rules
   - IAM roles with least privilege access

3. **Frontend Infrastructure** (`frontend-template.yaml`)
   - S3 bucket for static website hosting
   - CloudFront distribution for content delivery
   - Appropriate bucket policies and access controls

4. **CI/CD Pipeline** (`cicd-template.yaml`)
   - CodePipeline for orchestrating the deployment workflow
   - CodeBuild projects for building and testing
   - GitHub integration for automatic deployments
   - IAM roles with appropriate permissions

### Deployment Steps

See the dedicated README files for detailed deployment instructions:
- VPC setup: [vpc-setup-readme.md](vpc-setup-readme.md)
- Backend setup: [backend-setup-readme.md](backend-setup-readme.md)
- Frontend setup: [frontend-setup-readme.md](frontend-setup-readme.md)
- CI/CD setup: [cicd-setup-readme.md](cicd-setup-readme.md)

## Deployment Quick Start

Follow these steps to quickly deploy the entire application:

1. **Set up VPC infrastructure**
   ```bash
   aws cloudformation create-stack --stack-name financial-news-vpc-{environment} --template-body file://vpc-template.yaml --parameters ParameterKey=EnvironmentName,ParameterValue={environment}
   ```

2. **Deploy backend services**
   ```bash
   aws cloudformation create-stack --stack-name financial-news-backend-{environment} --template-body file://backend-template.yaml --parameters ParameterKey=EnvironmentName,ParameterValue={environment} ParameterKey=VpcStackName,ParameterValue=financial-news-vpc-{environment} --capabilities CAPABILITY_IAM
   ```

3. **Deploy frontend application**
   ```bash
   aws cloudformation create-stack --stack-name financial-news-frontend-{environment} --template-body file://frontend-template.yaml --parameters ParameterKey=EnvironmentName,ParameterValue={environment} ParameterKey=BackendStackName,ParameterValue=financial-news-backend-{environment} --capabilities CAPABILITY_IAM
   ```

4. **Set up CI/CD pipeline**
   ```bash
   aws cloudformation create-stack --stack-name financial-news-cicd-{environment} --template-body file://cicd-template.yaml --parameters ParameterKey=EnvironmentName,ParameterValue={environment} ParameterKey=VpcStackName,ParameterValue=financial-news-vpc-{environment} ParameterKey=BackendStackName,ParameterValue=financial-news-backend-{environment} ParameterKey=FrontendStackName,ParameterValue=financial-news-frontend-{environment} --capabilities CAPABILITY_IAM
   ```

Replace `{environment}` with your target environment (e.g., `development`, `staging`, or `production`).

> **Important**: Always include the environment name in the stack name itself, not just as a parameter. This ensures proper cross-stack references and allows you to deploy multiple environments in the same AWS account.

For detailed setup instructions, refer to the dedicated README files:
- [VPC Setup](vpc-setup-readme.md)
- [Backend Setup](backend-setup-readme.md)
- [Frontend Setup](frontend-setup-readme.md)
- [CI/CD Pipeline Setup](cicd-setup-readme.md)

## Deployment Paths and Structure

The application uses the following standardized paths for deployment:

- **Application Directory**: `/opt/financial-news-engine`
- **Logs Directory**: `/opt/financial-news-engine/logs`
- **Deployment Scripts**: `/opt/financial-news-engine/deploy_scripts`
- **Environment File**: `/opt/financial-news-engine/.env`
- **Service File**: `/etc/systemd/system/financial-news.service`

### Parameter Retrieval

The application retrieves configuration parameters from AWS Parameter Store using either:
1. Batch retrieval with `get-parameters-by-path` from path `/financial-news/`
2. Fallback to individual parameter retrieval if batch retrieval fails

### Log Files

- Application logs: `/opt/financial-news-engine/logs/backend.log`
- Service output: `/opt/financial-news-engine/logs/service-output.log`
- Service errors: `/opt/financial-news-engine/logs/service-error.log`

### Troubleshooting

If you're experiencing issues with the deployment:

1. Check service status:
   ```
   sudo systemctl status financial-news
   ```

2. Check logs:
   ```
   sudo cat /opt/financial-news-engine/logs/service-error.log
   sudo cat /opt/financial-news-engine/logs/backend.log
   ```

3. Test API locally:
   ```
   curl http://localhost:5000/health
   ```

4. Verify parameters are correctly loaded:
   ```
   sudo cat /opt/financial-news-engine/.env
   ```

## Development Environment

To set up a local development environment:

1. **Backend**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Mock data mode**
   Set `USE_MOCK_DATA=true` in your `.env` file to develop without an Elasticsearch instance.

## Troubleshooting

### Common Issues

- **Missing AWS CLI**: Install AWS CLI using pip: `pip install awscli`
- **CORS Errors**: Ensure the backend CORS settings match the frontend URL
- **Elasticsearch Connection Issues**: Check security group rules and network ACLs
- **CI/CD Pipeline Failures**: Check CodeBuild logs and IAM permissions

### Debugging Tips

- Use CloudWatch Logs to view application logs
- Check the CloudFormation stack events for deployment issues
- Use AWS Systems Manager to connect to EC2 instances for debugging

## AWS Infrastructure (CloudFormation)

The project uses a complete infrastructure-as-code approach with AWS CloudFormation templates:

- **VPC Setup** (`vpc-template.yaml`): Creates a custom VPC with public and private subnets, NAT Gateway, and security groups.
- **Backend Setup** (`backend-template.yaml`): Deploys EC2 instances with Auto Scaling and an Application Load Balancer.
- **Frontend Setup** (`frontend-template.yaml`): Configures S3 bucket and CloudFront distribution for the static web frontend.
- **CI/CD Pipeline** (`cicd-template.yaml`): Sets up AWS CodePipeline with GitHub integration for continuous delivery.

All templates are designed with consistent parameterization, allowing for flexible deployment across different environments. External components and cross-stack references are properly parameterized, enabling clean separation of concerns between stacks.

### Key Infrastructure Parameters

- **VPC Stack Name**: All templates reference the VPC stack by name parameter for import values
- **Frontend/Backend Stack Names**: Pipeline and other templates reference these by name parameters
- **CloudFront Hosted Zone ID**: Parameterized for flexibility across different AWS regions

For detailed deployment instructions, see:
- [VPC Setup Guide](vpc-setup-readme.md)
- [Backend Setup Guide](backend-setup-readme.md)
- [Frontend Setup Guide](frontend-setup-readme.md)
- [CI/CD Setup Guide](cicd-setup-readme.md)