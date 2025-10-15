# Dockerfile for CLIP Service
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install PyTorch (CPU version for universal compatibility)
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu

# Install CLIP
RUN pip install --no-cache-dir git+https://github.com/openai/CLIP.git

# Install Pillow for image processing
RUN pip install --no-cache-dir Pillow

# Copy the service code
COPY clip_service.py .

# Expose port
EXPOSE 8001

# Run the service
CMD ["python", "clip_service.py"]