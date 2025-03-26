#!/usr/bin/env python3
import yaml
import sys

try:
    with open("backend-api.yaml", "r") as f:
        config = yaml.safe_load(f)
        with open("api/deploy/app.py", "w") as app_file:
            app_file.write(config.get("app_code", ""))
    print("Successfully extracted app.py from backend-api.yaml")
except Exception as e:
    print(f"Error extracting app.py: {e}")
    sys.exit(1) 