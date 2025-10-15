# CLIP Image Embeddings Service

Cross-platform CLIP model service for generating image embeddings using Docker.

## Docker Quick Start (Recommended)

```bash
# Build and run in one command
./build-docker.sh

# Or manually:
docker build -t caloriemate-clip .
docker run -p 8001:8001 caloriemate-clip
```

## GPU Support (Optional)

For faster processing with NVIDIA GPUs:

```bash
# Build with CUDA support (edit Dockerfile to use cu121 index)
docker build -t caloriemate-clip-gpu .
docker run --gpus all -p 8001:8001 caloriemate-clip-gpu
```

## Service Endpoints

- **Health**: http://localhost:8001/health
- **API Docs**: http://localhost:8001/docs
- **Embed Image**: POST http://localhost:8001/embed/image
- **Embed Base64**: POST http://localhost:8001/embed/image-base64
- **Embed Text**: POST http://localhost:8001/embed/text

## Local Development (Alternative)

From the main project directory:

```bash
make clip-run
```

## Integration

The Go client (`ai/clip/client.go`) implements the `ai.Embedder` interface for seamless integration with your CalorieMate backend.

Set `CLIP_HOST=http://localhost:8001` in your environment.