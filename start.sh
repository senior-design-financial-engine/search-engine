#!/bin/bash

# Start the backend server
echo "Starting backend server..."
cd backend
python3 backend.py &
BACKEND_PID=$!
echo $BACKEND_PID > ../backend_pid.txt

# Start the frontend server
echo "Starting frontend server..."
cd ../frontend
npm start &

# Wait for all background processes to finish
wait