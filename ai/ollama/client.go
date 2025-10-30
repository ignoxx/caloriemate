package ollama

import (
	"io"

	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/types"
	"github.com/ollama/ollama/api"
)

const (
	VISION_MODEL = "qwen2.5vl:7b"
	TEXT_MODEl   = "gemma3n:e4b"
)

type Client struct {
	*api.Client
}

func New() *Client {
	client, err := api.ClientFromEnvironment()
	if err != nil {
		panic(err)
	}

	return &Client{client}
}

func (c *Client) AnalyzeImage(input io.ReadSeeker) (string, error) {
	return "", nil
}

func (c *Client) EstimateNutritions(image io.ReadSeeker, userContext string) (types.MealTemplate, error) {
	return types.MealTemplate{}, nil
}

// Make sure Client implements the Analyzer interface
var _ ai.Analyzer = (*Client)(nil)
