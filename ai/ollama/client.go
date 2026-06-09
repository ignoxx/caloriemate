package ollama

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"os"

	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/types"
	"github.com/ignoxx/caloriemate/utils"
	"github.com/ollama/ollama/api"
)

type Client struct {
	*api.Client
	visionModel string
}

func New() *Client {
	client, err := api.ClientFromEnvironment()
	if err != nil {
		panic("failed to create Ollama client: " + err.Error())
	}

	visionModel := os.Getenv("OLLAMA_VISION_MODEL")
	if visionModel == "" {
		visionModel = "qwen3-vl:8b"
	}

	return &Client{
		Client:      client,
		visionModel: visionModel,
	}
}

func readImage(image io.ReadSeeker) ([]byte, error) {
	if _, err := image.Seek(0, io.SeekStart); err != nil {
		return nil, errors.New("image seek to start failed with: " + err.Error())
	}

	imgBytes, err := io.ReadAll(image)
	if err != nil {
		return nil, errors.New("failed to read the image with: " + err.Error())
	}
	return imgBytes, nil
}

func (c *Client) EstimateNutritions(image io.ReadSeeker, imageContext string, contextImages []ai.ContextImage, userContext string) (types.MealTemplate, error) {
	ctx := context.Background()

	var promptBuf bytes.Buffer

	images, err := readImage(image)
	if err != nil {
		return types.MealTemplate{}, err
	}
	imageData := []api.ImageData{images}
	for _, contextImage := range contextImages {
		imgBytes, err := readImage(contextImage.Image)
		if err != nil {
			return types.MealTemplate{}, err
		}
		imageData = append(imageData, imgBytes)
	}

	type promptContextImage struct {
		Index int
		Note  string
	}
	type input struct {
		ImageContext  string
		ContextImages []promptContextImage
		UserContext   string
	}
	promptImages := make([]promptContextImage, 0, len(contextImages))
	for i, contextImage := range contextImages {
		promptImages = append(promptImages, promptContextImage{Index: i + 1, Note: contextImage.Note})
	}

	if err := ai.STAGE_SINGLE_PROMPT.Execute(&promptBuf, input{ImageContext: imageContext, ContextImages: promptImages, UserContext: userContext}); err != nil {
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

	jsonFormat := json.RawMessage(`"json"`)
	req := api.ChatRequest{
		Model:  c.visionModel,
		Format: jsonFormat,
		Stream: new(false),
		Messages: []api.Message{
			{
				Role:    "user",
				Content: promptBuf.String(),
				Images:  imageData,
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
