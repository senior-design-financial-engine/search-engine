# Financial News Engine Backend

This directory contains the backend services for the Financial News Engine, including the Flask API, web scrapers, and Elasticsearch integration.

## Architecture

The backend consists of several key components:

1. **API Service** (`backend.py`)
   - Flask-based RESTful API
   - Handles search queries and data retrieval
   - Provides CORS support for cross-domain requests

2. **Web Scraper** (`scraper/`)
   - Collects news articles from various sources
   - Processes and normalizes article content
   - Stores data in Elasticsearch

3. **Database Interface** (`es_database/`)
   - Elasticsearch client interface
   - Manages indices and document storage
   - Handles search queries and aggregations

4. **Machine Learning Utils** (`ml_utils/`)
   - Provides sentiment analysis
   - Generates article summarization
   - Processes text data for insights

5. **Indexer** (`indexer/`)
   - Processes and indexes documents
   - Manages document metadata
   - Handles real-time updates

## Setup and Development

### Prerequisites

- Python 3.8+
- Elasticsearch 8.11.0
- Access to internet for article scraping
- AWS credentials (for cloud deployment)

### Local Development

1. **Create a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   Create a `.env` file with the following variables:
   ```
   ELASTICSEARCH_HOST=localhost
   ELASTICSEARCH_PORT=9200
   FLASK_APP=backend.py
   FLASK_ENV=development
   USE_MOCK_DATA=false
   ```

4. **Run the development server**:
   ```bash
   flask run
   ```

### Mock Data Mode

For development without Elasticsearch:

1. Set `USE_MOCK_DATA=true` in your `.env` file
2. Run the backend server normally
3. API endpoints will return realistic sample data

### Running Tests

```bash
python -m pytest
```

## AWS Deployment

The backend is deployed to AWS using CloudFormation with the `backend-template.yaml` file, which provisions:

1. **Auto Scaling Group** of EC2 instances
2. **Application Load Balancer** for traffic distribution
3. **Security Groups** with appropriate ingress/egress rules
4. **IAM Roles** with necessary permissions

### Deployment Steps

For detailed deployment instructions, see the [backend-setup-readme.md](../backend-setup-readme.md) file.

### CI/CD Pipeline

The backend is automatically deployed through a CI/CD pipeline defined in `cicd-template.yaml`. The pipeline:

1. Pulls code from GitHub
2. Runs tests and linting
3. Builds deployment packages
4. Deploys to EC2 instances

## API Documentation

### Endpoints

- `GET /health` - Health check endpoint
- `GET /query` - Search articles with parameters:
  - `query` (string) - Search query
  - `source` (string, optional) - Filter by news source
  - `time_range` (string, optional) - Filter by time range
- `GET /sources` - Get list of available news sources
- `GET /categories` - Get list of available news categories

### Example Requests

```
GET /query?query=finance&source=bbc&time_range=day
GET /sources
GET /categories
```

## Maintenance

### Updating Scrapers

When adding a new news source:

1. Create a new scraper in `scraper/`
2. Update the scraper configuration in `scraper/config.py`
3. Test with mock data mode before deploying

### Database Management

To reindex the Elasticsearch database:

```bash
python update_database.py --reset-index
```

## Troubleshooting

### Common Issues

- **Elasticsearch Connection Errors**: Check security group rules and ensure Elasticsearch is running
- **CORS Issues**: Verify CORS settings in backend.py match the frontend origin
- **Deployment Failures**: Check CodeBuild logs for details

### Logs

- EC2 application logs are stored in CloudWatch Logs
- Flask logs are available in `/var/log/financial-news.log`
- System logs are in the standard `/var/log/messages`

## Contributing

1. Create feature branches from `develop`
2. Write tests for new features
3. Submit pull requests with detailed descriptions
4. Ensure CI/CD pipeline passes 