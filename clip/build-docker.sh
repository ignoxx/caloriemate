#!/bin/bash

# Build and run CLIP service with Docker

echo "Building CLIP service Docker image..."
docker build -t caloriemate-clip .

if [ $? -eq 0 ]; then
    echo "Build successful! Starting CLIP service..."
    echo "CLIP service will be available at http://localhost:8001"
    echo "API docs at http://localhost:8001/docs"
    echo ""
    echo "To run with GPU support (if available):"
    echo "docker run --gpus all -p 8001:8001 caloriemate-clip"
    echo ""
    echo "Starting service..."
    docker run -p 8001:8001 caloriemate-clip
else
    echo "Build failed!"
    exit 1
fi