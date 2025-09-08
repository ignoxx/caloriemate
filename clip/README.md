# CLIP Image Embeddings Service

Local CLIP model service for generating image embeddings, optimized for M1 MacBook Pro.

## Quick Start

From the main project directory:

```bash
make clip-run
```

That's it! The command will:
- Set up the environment (first time only)
- Install dependencies automatically
- Start the CLIP service on port 8001

## Service Endpoints

- **Health**: http://localhost:8001/health
- **API Docs**: http://localhost:8001/docs
- **Embed Image**: POST http://localhost:8001/embed/image

## Integration

The Go client (`ai/clip_client.go`) implements the `ai.Embedder` interface for seamless integration with your CalorieMate backend.