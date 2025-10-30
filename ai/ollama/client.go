package ollama

import (
	"bytes"
	"context"
	"errors"
	"io"
	"log/slog"

	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/types"
	"github.com/ignoxx/caloriemate/utils"
	"github.com/ollama/ollama/api"
)

const (
	VISION_MODEL = "qwen3-vl:8b"
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

func (c *Client) EstimateNutritions(image io.ReadSeeker, userContext string) (types.MealTemplate, error) {
	ctx := context.Background()

	if _, err := image.Seek(0, io.SeekStart); err != nil {
		return types.MealTemplate{}, errors.New("image seek to start failed with: " + err.Error())
	}

	var promptBuf bytes.Buffer

	imgBytes, err := io.ReadAll(image)
	if err != nil {
		return types.MealTemplate{}, errors.New("failed to read the image with: " + err.Error())
	}

	type input struct {
		UserContext string
	}

	if err := ai.STAGE_SINGLE_PROMPT.Execute(&promptBuf, input{UserContext: userContext}); err != nil {
		return types.MealTemplate{}, errors.New("single stage prompt execute failed with: " + err.Error())
	}

	var estimatedMeal *types.MealTemplate

	respFunc := func(resp api.ChatResponse) error {
		slog.Info("chat response", "resp", resp)
		if len(resp.Message.Content) > 0 {
			meal, err := utils.ValidateJSON(resp.Message.Content)
			if err != nil {
				return errors.New("response JSON validation failed with: " + err.Error())
			}

			estimatedMeal = &meal
			return nil
		}

		return errors.New("no content in response message")
	}

	req := api.ChatRequest{
		Model:  VISION_MODEL,
		Stream: utils.ToPtr(false),
		Messages: []api.Message{
			{
				Role:    "user",
				Content: promptBuf.String(),
				Images: []api.ImageData{
					imgBytes,
				},
			},
		},
	}

	if err := c.Chat(ctx, &req, respFunc); err != nil {
		return types.MealTemplate{}, errors.New("chat completion request failed with: " + err.Error())
	}

	if estimatedMeal != nil {
		return *estimatedMeal, nil
	}

	return types.MealTemplate{}, errors.New("no choices in response")
}

// Make sure Client implements the Analyzer interface
var _ ai.Analyzer = (*Client)(nil)
