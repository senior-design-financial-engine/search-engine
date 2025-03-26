#!/usr/bin/env python3

import os
import sys
import shutil
import re
import glob
import json
import yaml

print("Extracting application components...")

# Define paths
root_dir = os.getcwd()
output_dir = os.path.join(root_dir, 'api', 'deploy')
os.makedirs(output_dir, exist_ok=True)

# Standard application path on target instance
APP_DIR = "/opt/financial-news-engine"

# Check if backend-api.yaml exists and extract app code from it
api_yaml_paths = glob.glob(os.path.join(root_dir, 'backend-api.yaml')) + \
                 glob.glob(os.path.join(root_dir, '**/backend-api.yaml'), recursive=True)

app_file = None
req_file = None

if api_yaml_paths:
    api_yaml_path = api_yaml_paths[0]
    print(f"Found backend-api.yaml at {api_yaml_path}")
    
    # Read the YAML file
    try:
        with open(api_yaml_path, 'r') as f:
            content = f.read()
            
        # Use regex to extract app_code and requirements sections
        app_code_match = re.search(r'app_code:\s*\|(.*?)(?:^\w|\Z)', content, re.DOTALL | re.MULTILINE)
        req_match = re.search(r'requirements:\s*\|(.*?)(?:^\w|\Z)', content, re.DOTALL | re.MULTILINE)
        
        if app_code_match:
            app_code = app_code_match.group(1).strip()
            app_code_lines = app_code.split('\n')
            # Remove indentation
            app_code = '\n'.join([line[2:] if line.startswith('  ') else line for line in app_code_lines])
            
            # Write app.py
            app_file = os.path.join(output_dir, 'app.py')
            with open(app_file, 'w') as f:
                f.write(app_code)
            print(f"Extracted app.py from backend-api.yaml")
        
        if req_match:
            requirements = req_match.group(1).strip()
            req_lines = requirements.split('\n')
            # Remove indentation
            requirements = '\n'.join([line[2:] if line.startswith('  ') else line for line in req_lines])
            
            # Write requirements.txt
            req_file = os.path.join(output_dir, 'requirements.txt')
            with open(req_file, 'w') as f:
                f.write(requirements)
            print(f"Extracted requirements.txt from backend-api.yaml")
    except Exception as e:
        print(f"Error extracting from YAML: {str(e)}")

# If app.py wasn't extracted from YAML, check backend.py and app.py
if not app_file:
    backend_file = os.path.join(root_dir, 'backend', 'backend.py')
    if os.path.exists(backend_file):
        print(f"Found backend.py at {backend_file}")
        app_file = backend_file
    else:
        # Find backend.py in other locations
        backend_files = glob.glob(os.path.join(root_dir, '**', 'backend.py'), recursive=True)
        if backend_files:
            app_file = backend_files[0]
            print(f"Found backend.py at {app_file}")
        else:
            # Look for app.py files
            app_files = glob.glob(os.path.join(root_dir, '**', 'app.py'), recursive=True)
            if app_files:
                # Find the most likely app.py that contains API code
                for file in app_files:
                    with open(file, 'r') as f:
                        content = f.read()
                        if 'Flask' in content and ('route' in content or 'api' in content.lower()):
                            app_file = file
                            print(f"Found app.py at {app_file}")
                            break

    if not app_file:
        print("WARNING: Could not find backend.py or app.py!")
        # Create minimal app.py as fallback
        app_file = os.path.join(output_dir, 'app.py')
        with open(app_file, 'w') as f:
            f.write("""#!/usr/bin/env python3
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
import sys
import json
import time
from datetime import datetime

# Configure logging
log_dir = "logs"
if not os.path.exists(log_dir):
    os.makedirs(log_dir)
    
logger = logging.getLogger("backend")
logger.setLevel(logging.INFO)

# Create console handler
ch = logging.StreamHandler(sys.stdout)
ch.setLevel(logging.INFO)

# Create file handler
fh = logging.FileHandler(os.path.join(log_dir, "backend.log"))
fh.setLevel(logging.INFO)

# Create formatter and add to handlers
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
ch.setFormatter(formatter)
fh.setFormatter(formatter)

# Add handlers to logger
logger.addHandler(ch)
logger.addHandler(fh)

# Create Flask app
app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    \"\"\"Health check endpoint\"\"\"
    status = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "version": "1.0",
        "environment": os.environ.get('ENVIRONMENT', 'development')
    }
    return jsonify(status)

@app.route('/query', methods=['GET', 'POST'])
def query():
    \"\"\"Search endpoint for the Financial News Engine API\"\"\"
    try:
        if request.method == 'POST':
            data = request.get_json()
            query_text = data.get('query', '')
        else:
            query_text = request.args.get('query', '')
        
        logger.info(f"Search request: query='{query_text}'")
        
        results = {
            "query": query_text,
            "timestamp": int(time.time()),
            "results": [
                {
                    "id": "mock-1",
                    "title": f"Sample Article about {query_text}",
                    "snippet": f"This is a sample snippet for {query_text} search query...",
                    "url": "https://example.com/article1",
                    "publishedDate": "2023-06-01T12:00:00Z",
                    "source": "Mock News"
                }
            ],
            "totalHits": 1
        }
        
        return jsonify(results)
    except Exception as e:
        logger.error(f"Error processing search query: {str(e)}", exc_info=True)
        return jsonify({
            "error": f"Server error: {str(e)}",
            "status": "error"
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))
""")
        print("Created minimal fallback app.py")
    else:
        # Copy app file to deploy directory
        shutil.copy(app_file, os.path.join(output_dir, 'app.py'))
        print(f"Copied {app_file} to {output_dir}/app.py")

# If requirements.txt wasn't extracted from YAML, find or create it
if not req_file:
    req_file = os.path.join(root_dir, 'backend', 'requirements.txt')
    if os.path.exists(req_file):
        print(f"Found requirements.txt at {req_file}")
    else:
        # Find requirements.txt in other locations
        req_files = glob.glob(os.path.join(root_dir, '**/requirements.txt'), recursive=True)
        if req_files:
            req_file = req_files[0]
            print(f"Found requirements.txt at {req_file}")
        else:
            # Create minimal requirements.txt as fallback
            req_file = os.path.join(output_dir, 'requirements.txt')
            with open(req_file, 'w') as f:
                f.write("""flask==2.0.1
flask-cors==3.0.10
requests==2.26.0
boto3==1.18.0
elasticsearch==7.13.0
psutil==5.8.0
""")
            print("Created minimal fallback requirements.txt")
    
    # Copy requirements file to deploy directory if not created in-place
    if req_file != os.path.join(output_dir, 'requirements.txt'):
        shutil.copy(req_file, os.path.join(output_dir, 'requirements.txt'))
        print(f"Copied {req_file} to {output_dir}/requirements.txt")

print(f"Application extraction completed successfully. Files available in {output_dir}")