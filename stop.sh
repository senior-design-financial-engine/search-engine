#!/bin/bash

# Check if the backend PID file exists
if [ -f backend_pid.txt ]; then
  # Read the PID from the file
  BACKEND_PID=$(cat backend_pid.txt)
  
  # Kill the backend process
  echo "Shutting down backend server with PID $BACKEND_PID..."
  kill $BACKEND_PID
  
  # Remove the PID file
  rm backend_pid.txt
else
  echo "Backend PID file not found. Backend server may not be running."
fi