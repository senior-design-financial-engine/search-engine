#!/bin/bash
set -e

echo "Verifying backend service startup..."

# Wait for the service to start
for i in {1..12}; do
  if curl -s http://localhost:5000/ping > /dev/null; then
    echo "Service is responding to ping"
    break
  fi
  
  if [ $i -eq 12 ]; then
    echo "ERROR: Service failed to start within 60 seconds"
    exit 1
  fi
  
  echo "Waiting for service to start (attempt $i/12)..."
  sleep 5
done

echo "Checking diagnostic report endpoint..."
curl -s -H "Origin: https://financialnewsengine.com" http://localhost:5000/diagnostic/report | grep -q "status" && echo "Diagnostic endpoint working" || echo "WARNING: Diagnostic endpoint not responding properly"

echo "Checking query endpoint..."
curl -s -H "Origin: https://financialnewsengine.com" "http://localhost:5000/query?query=test" | grep -q "results" && echo "Query endpoint working" || echo "WARNING: Query endpoint not responding properly"

echo "Startup verification successful" 