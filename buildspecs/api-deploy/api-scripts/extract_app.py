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
    
    # Write content to app.py with minimal processing
    with open("api/deploy/app.py", 'w') as file:
        file.write(content)
    
    print(f"Created app.py from {source_file}")
    
    # Check for requirements.txt
    if not os.path.exists("api/deploy/requirements.txt"):
        if os.path.exists("requirements.txt"):
            with open("requirements.txt", 'r') as src:
                with open("api/deploy/requirements.txt", 'w') as dest:
                    dest.write(src.read())
            print("Copied requirements.txt")
        else:
            # Create minimal requirements file
            with open("api/deploy/requirements.txt", 'w') as file:
                file.write("flask\nelasticsearch\npython-dotenv\n")
            print("Created minimal requirements.txt")

if __name__ == "__main__":
    extract_app_code()
