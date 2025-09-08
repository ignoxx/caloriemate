package clip

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"

	"github.com/ignoxx/caloriemate/ai"
)

type CLIPClient struct {
	baseURL string
	client  *http.Client
}

type EmbeddingResponse struct {
	Embeddings []float32 `json:"embeddings"`
	Model      string    `json:"model"`
	Dimensions int       `json:"dimensions"`
}

func New() *CLIPClient {
	host, ok := os.LookupEnv("CLIP_HOST")
	if !ok {
		panic("CLIP_HOST environment variable not set")
	}

	return &CLIPClient{
		baseURL: host,
		client:  &http.Client{},
	}
}

func (c *CLIPClient) GenerateEmbeddings(image io.Reader) ([]float32, error) {
	embeddings, err := c.generateEmbeddingsWithError(image)
	if err != nil {
		// Log error and return empty slice
		// In production, you might want to handle this differently
		return []float32{}, err
	}
	return embeddings, nil
}

func (c *CLIPClient) generateEmbeddingsWithError(image io.Reader) ([]float32, error) {
	// Create multipart form
	var buf bytes.Buffer
	writer := multipart.NewWriter(&buf)

	// Add the image file
	part, err := writer.CreateFormFile("file", "image.jpg")
	if err != nil {
		return nil, fmt.Errorf("failed to create form file: %w", err)
	}

	_, err = io.Copy(part, image)
	if err != nil {
		return nil, fmt.Errorf("failed to copy image data: %w", err)
	}

	err = writer.Close()
	if err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	// Make request to CLIP service
	req, err := http.NewRequest("POST", c.baseURL+"/embed/image", &buf)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("CLIP service error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var embeddingResp EmbeddingResponse
	err = json.NewDecoder(resp.Body).Decode(&embeddingResp)
	if err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return embeddingResp.Embeddings, nil
}

// Ensure CLIPClient implements the Embedder interface
var _ ai.Embedder = (*CLIPClient)(nil)
