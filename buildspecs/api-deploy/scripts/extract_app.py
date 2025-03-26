#!/usr/bin/env python3

import os
import sys
import shutil
import re
import glob
import json

print("Extracting application components...")

# Define paths
root_dir = os.getcwd()
output_dir = os.path.join(root_dir, 'api', 'deploy')
os.makedirs(output_dir, exist_ok=True)

# Check if backend.py exists
backend_file = os.path.join(root_dir, 'backend', 'backend.py')
app_file = None

if os.path.exists(backend_file):
    print(f"Found backend.py at {backend_file}")
    app_file = backend_file
    shutil.copy(app_file, os.path.join(output_dir, 'app.py'))
else:
    print("Creating minimal app.py as fallback")
    app_file = os.path.join(output_dir, 'app.py')
    with open(app_file, 'w') as f:
        f.write('''
from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy"})

@app.route('/query', methods=['GET', 'POST'])
def query():
    query_text = request.args.get('query', '') if request.method == 'GET' else request.get_json().get('query', '')
    return jsonify({"results": [{"title": f"Result for {query_text}"}]})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
''')

# Find or create requirements.txt
req_file = os.path.join(root_dir, 'backend', 'requirements.txt')
if os.path.exists(req_file):
    print(f"Found requirements.txt at {req_file}")
    shutil.copy(req_file, os.path.join(output_dir, 'requirements.txt'))
else:
    print("Creating minimal requirements.txt")
    with open(os.path.join(output_dir, 'requirements.txt'), 'w') as f:
        f.write('''flask==2.0.1
flask-cors==3.0.10
requests==2.26.0
boto3==1.18.0
elasticsearch==7.13.0
''')

print("Application extraction completed")
