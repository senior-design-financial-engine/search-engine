#!/usr/bin/env python3
"""
Extract application code from a source file and create app.py
This script analyzes a larger codebase file and extracts the relevant 
application code needed for deployment.
"""

import os
import re
import sys

def extract_app_code():
    """
    Extract application code from source files and create a standalone app.py
    """
    # Define potential source files
    source_files = [
        "backend.py",
        "app.py",
        "../backend.py",
        "../app.py"
    ]
    
    # Find the first existing source file
    source_file = None
    for file_path in source_files:
        if os.path.exists(file_path):
            source_file = file_path
            break
    
    if not source_file:
        print("Error: Could not find any source files")
        sys.exit(1)
    
    print(f"Found source file: {source_file}")
    
    # Read the source file
    with open(source_file, 'r') as file:
        content = file.read()
    
    # Create destination directory if it doesn't exist
    os.makedirs("api/deploy", exist_ok=True)
    
    # Add robust log and error handling initialization code to the beginning of app.py
    log_init_code = """#!/usr/bin/env python3
# Robust startup code with error handling - this must come first
import os
import sys
import logging
import traceback
from pathlib import Path
from datetime import datetime

# Create startup logging function before anything else can fail
def log_startup(message, error=None):
    """Log startup message to both console and file if possible"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    log_line = f"{timestamp} - STARTUP - {message}"
    
    # Always print to stdout
    print(log_line)
    
    # Try to write to startup log file
    try:
        log_dir = '/opt/financial-news-engine/logs'
        os.makedirs(log_dir, exist_ok=True)
        
        with open(f"{log_dir}/app-startup.log", "a") as f:
            f.write(log_line + "\\n")
            if error:
                f.write(f"{timestamp} - ERROR - {str(error)}\\n")
                f.write(f"{timestamp} - TRACEBACK - {traceback.format_exc()}\\n")
    except Exception as log_error:
        print(f"Warning: Could not write to log file: {str(log_error)}")

# Main startup block with comprehensive error handling
try:
    log_startup("Application startup initiated")
    
    # Create log directory with proper permissions
    log_dir = '/opt/financial-news-engine/logs'
    Path(log_dir).mkdir(parents=True, exist_ok=True)
    try:
        # Try to set permissive permissions for troubleshooting
        os.chmod(log_dir, 0o777)
        log_startup(f"Set permissions 777 on {log_dir}")
    except Exception as perm_error:
        log_startup(f"Could not set permissions on log directory: {str(perm_error)}", perm_error)
    
    # Set environment variables for logging
    os.environ['LOG_DIR'] = log_dir
    os.environ['MAX_CONSECUTIVE_DUPLICATES'] = '1'  # Allow only 1 duplicate before suppressing
    
    log_startup(f"Initialized log directory: {log_dir}")
    
    # Check Elasticsearch environment variables
    es_url = os.environ.get('ELASTICSEARCH_URL') or os.environ.get('ELASTICSEARCH_ENDPOINT')
    if not es_url:
        log_startup("Warning: ELASTICSEARCH_URL/ENDPOINT environment variable not set")
    else:
        log_startup(f"Elasticsearch URL configured: {es_url}")
        
    log_startup("Startup initialization completed successfully")
except Exception as e:
    log_startup(f"Critical error during startup initialization: {str(e)}", e)
    # We continue despite errors to allow the application to try to start anyway

"""
    
    # Write content to app.py with log initialization code
    with open("api/deploy/app.py", 'w') as file:
        file.write(log_init_code + content)
    
    print(f"Created app.py from {source_file} with robust error handling")
    
    # Check for utils directory and ensure it exists in the deployment
    utils_dir = "api/deploy/utils"
    os.makedirs(utils_dir, exist_ok=True)
    
    # Copy necessary utility files
    util_files = ["utils/logger.py", "utils/__init__.py"]
    for util_file in util_files:
        if os.path.exists(util_file):
            with open(util_file, 'r') as src:
                dest_path = os.path.join("api/deploy", util_file)
                os.makedirs(os.path.dirname(dest_path), exist_ok=True)
                with open(dest_path, 'w') as dest:
                    dest.write(src.read())
            print(f"Copied {util_file}")
    
    # Also create an empty __init__.py in the root to make imports work
    with open("api/deploy/__init__.py", 'w') as f:
        f.write("# Package initialization\n")
    
    # Check for requirements.txt
    if not os.path.exists("api/deploy/requirements.txt"):
        if os.path.exists("requirements.txt"):
            with open("requirements.txt", 'r') as src:
                with open("api/deploy/requirements.txt", 'w') as dest:
                    dest.write(src.read())
            print("Copied requirements.txt")
        else:
            # Create requirements file with gunicorn
            with open("api/deploy/requirements.txt", 'w') as file:
                file.write("flask==2.3.3\nelasticsearch==7.17.0\npython-dotenv==1.0.0\nrequests==2.31.0\nflask-cors==4.0.0\ngunicorn==21.2.0\n")
            print("Created requirements.txt with gunicorn")

if __name__ == "__main__":
    extract_app_code()
