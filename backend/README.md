# Financial News Engine Backend

This directory contains the backend services for the Financial News Engine, including the Flask API, web scrapers, and Elasticsearch integration.

## Architecture

The backend consists of several key components:

1. **API Service** (`app.py`)
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

4. **Recommender System** (`recommender/`)
   - Provides news recommendations based on user preferences
   - Implements content-based filtering algorithms

## Setup and Development

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
   FLASK_APP=app.py
   FLASK_ENV=development
   ```

4. **Run the development server**:
   ```bash
   flask run
   ```

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

### Example Request

```
GET /query?query=finance&source=bbc&time_range=day
```

### Example Response

```json
{
  "results": [
    {
      "id": "12345",
      "title": "Financial Markets Update",
      "content": "...",
      "source": "BBC",
      "publish_date": "2023-02-15T12:30:00Z",
      "url": "https://www.bbc.com/news/article-12345"
    }
  ],
  "count": 1,
  "query_time_ms": 42
}
```

## Troubleshooting

### Common Issues

- **Elasticsearch Connection Errors**: Check security group rules and ensure Elasticsearch is running
- **CORS Issues**: Verify CORS settings in app.py match the frontend origin
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