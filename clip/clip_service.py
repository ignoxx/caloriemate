#!/usr/bin/env python3
"""
CLIP Image Embedding Service for CalorieMate
Provides REST API endpoints for generating image embeddings using OpenAI's CLIP model.
Optimized for M1 MacBook Pro.
"""

import asyncio
import base64
import io
import logging
from typing import List, Optional

import clip
import torch
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CLIP Embedding Service",
    description="Generate image embeddings using OpenAI's CLIP model",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model and preprocessing
model = None
preprocess = None
device = None

class EmbeddingResponse(BaseModel):
    embeddings: List[float]
    model: str
    dimensions: int

class TextEmbeddingRequest(BaseModel):
    text: str

@app.on_event("startup")
async def load_model():
    """Load CLIP model on startup"""
    global model, preprocess, device
    
    logger.info("Loading CLIP model...")
    
    # Check if MPS (Metal Performance Shaders) is available for M1 optimization
    if torch.backends.mps.is_available():
        device = torch.device("mps")
        logger.info("Using MPS (Metal Performance Shaders) for M1 optimization")
    else:
        device = torch.device("cpu")
        logger.info("Using CPU")
    
    # Load CLIP model - using ViT-B/32 as it's a good balance of performance and accuracy
    model, preprocess = clip.load("ViT-B/32", device=device)
    model.eval()  # Set to evaluation mode
    
    logger.info(f"CLIP model loaded successfully on {device}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "model_loaded": model is not None}

@app.post("/embed/image", response_model=EmbeddingResponse)
async def embed_image(file: UploadFile = File(...)):
    """
    Generate embeddings for an uploaded image
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    try:
        # Read and process the image
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Preprocess the image
        image_tensor = preprocess(image).unsqueeze(0).to(device)
        
        # Generate embeddings
        with torch.no_grad():
            image_features = model.encode_image(image_tensor)
            # Normalize embeddings (CLIP does this by default, but being explicit)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            embeddings = image_features.cpu().numpy().flatten().tolist()
        
        logger.info(f"Generated embeddings for image: {file.filename}")
        
        return EmbeddingResponse(
            embeddings=embeddings,
            model="ViT-B/32",
            dimensions=len(embeddings)
        )
        
    except Exception as e:
        logger.error(f"Error processing image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/embed/image-base64", response_model=EmbeddingResponse)
async def embed_image_base64(image_b64: str):
    """
    Generate embeddings for a base64-encoded image
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Decode base64 image
        image_data = base64.b64decode(image_b64)
        image = Image.open(io.BytesIO(image_data)).convert('RGB')
        
        # Preprocess the image
        image_tensor = preprocess(image).unsqueeze(0).to(device)
        
        # Generate embeddings
        with torch.no_grad():
            image_features = model.encode_image(image_tensor)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            embeddings = image_features.cpu().numpy().flatten().tolist()
        
        logger.info("Generated embeddings for base64 image")
        
        return EmbeddingResponse(
            embeddings=embeddings,
            model="ViT-B/32",
            dimensions=len(embeddings)
        )
        
    except Exception as e:
        logger.error(f"Error processing base64 image: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")

@app.post("/embed/text", response_model=EmbeddingResponse)
async def embed_text(request: TextEmbeddingRequest):
    """
    Generate embeddings for text (useful for similarity searches)
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Tokenize and encode text
        text_tokens = clip.tokenize([request.text]).to(device)
        
        # Generate embeddings
        with torch.no_grad():
            text_features = model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
            embeddings = text_features.cpu().numpy().flatten().tolist()
        
        logger.info(f"Generated embeddings for text: {request.text[:50]}...")
        
        return EmbeddingResponse(
            embeddings=embeddings,
            model="ViT-B/32",
            dimensions=len(embeddings)
        )
        
    except Exception as e:
        logger.error(f"Error processing text: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error processing text: {str(e)}")

@app.get("/model/info")
async def model_info():
    """Get information about the loaded model"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    return {
        "model": "ViT-B/32",
        "device": str(device),
        "embedding_dimensions": 512,
        "description": "OpenAI CLIP Vision Transformer B/32"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)