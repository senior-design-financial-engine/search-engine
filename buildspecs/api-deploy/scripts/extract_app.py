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

# Find backend.py or app.py
backend_files = glob.glob(os.path.join(root_dir, '**', 'backend.py'), recursive=True)
app_files = glob.glob(os.path.join(root_dir, '**', 'app.py'), recursive=True)

app_file = None

if backend_files:
    app_file = backend_files[0]
    print(f"Found backend.py at {app_file}")
elif app_files:
    # Find the most likely app.py that contains API code
    for file in app_files:
        with open(file, 'r') as f:
            content = f.read()
            if 'Flask' in content and ('route' in content or 'api' in content.lower()):
                app_file = file
                print(f"Found app.py at {app_file}")
                break

if not app_file:
    print("ERROR: Could not find backend.py or app.py!")
    # Create minimal app.py as fallback
    app_file = os.path.join(output_dir, 'app.py')
    with open(app_file, 'w') as f:
        f.write("""
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({"status": "ok"})

@app.route('/search')
def search():
    return jsonify({"results": [], "error": "Search engine not properly configured"})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
""")
    print("Created minimal fallback app.py")

# Copy app file to deploy directory
shutil.copy(app_file, os.path.join(output_dir, 'app.py'))

# Find or create requirements.txt
req_files = glob.glob(os.path.join(root_dir, '**/requirements.txt'), recursive=True)
req_file = None

if req_files:
    req_file = req_files[0]
    print(f"Found requirements.txt at {req_file}")
else:
    # Create minimal requirements.txt as fallback
    req_file = os.path.join(output_dir, 'requirements.txt')
    with open(req_file, 'w') as f:
        f.write("""
flask==2.0.1
gunicorn==20.1.0
requests==2.26.0
boto3==1.18.0
""")
    print("Created minimal fallback requirements.txt")

# Copy requirements file to deploy directory
shutil.copy(req_file, os.path.join(output_dir, 'requirements.txt'))

print("Application extraction completed successfully") 