package ollama

import (
	"io"

	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/types"
	"github.com/ollama/ollama/api"
)

const (
	VISION_QWEN2_5vl_7b = "qwen2.5vl:7b"
	TEXT_GEMMA3n_E4b    = "gemma3n:e4b"
	EMBED_CLIP          = "clip"
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

func (c *Client) AnalyzeImage(input io.Reader) string {
	// api.ChatRequest(api)
	return ""
}

func (c *Client) EstimateNutritions(analyzerOutput, userContext string) types.Meal {
	return types.Meal{}
}

var _ ai.Analyzer = (*Client)(nil)
