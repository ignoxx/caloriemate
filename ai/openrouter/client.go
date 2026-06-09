package openrouter

import (
	"bytes"
	"context"
	"encoding/base64"
	"errors"
	"io"
	"os"

	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/types"
	"github.com/ignoxx/caloriemate/utils"
	"github.com/revrost/go-openrouter"
)

type Client struct {
	*openrouter.Client
	visionModel string
}

func New() *Client {
	apiToken, ok := os.LookupEnv("OPENROUTER_API_KEY")
	if !ok {
		panic("OPENROUTER_API_KEY environment variable not set")
	}

	visionModel := os.Getenv("OPENROUTER_VISION_MODEL")
	if visionModel == "" {
		visionModel = "google/gemini-2.5-flash"
	}

	return &Client{
		Client:      openrouter.NewClient(apiToken),
		visionModel: visionModel,
	}
}

func encodeImage(image io.ReadSeeker) (string, error) {
	if _, err := image.Seek(0, io.SeekStart); err != nil {
		return "", errors.New("image seek to start failed with: " + err.Error())
	}

	var imgBuf bytes.Buffer
	enc := base64.NewEncoder(base64.StdEncoding, &imgBuf)
	if _, err := io.Copy(enc, image); err != nil {
		return "", errors.New("image copy to buffer failed with: " + err.Error())
	}
	if err := enc.Close(); err != nil {
		return "", errors.New("image base64 encode failed with: " + err.Error())
	}

	return imgBuf.String(), nil
}

func (c *Client) EstimateNutritions(image io.ReadSeeker, imageContext string, contextImages []ai.ContextImage, userContext string) (types.MealTemplate, error) {
	ctx := context.Background()

	primaryImage, err := encodeImage(image)
	if err != nil {
		return types.MealTemplate{}, err
	}

	var promptBuf bytes.Buffer
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

	parts := []openrouter.ChatMessagePart{
		{
			Type: openrouter.ChatMessagePartTypeText,
			Text: promptBuf.String(),
		},
		{
			Type: openrouter.ChatMessagePartTypeImageURL,
			ImageURL: &openrouter.ChatMessageImageURL{
				URL: "data:image/jpeg;base64," + primaryImage,
			},
		},
	}
	for _, contextImage := range contextImages {
		encoded, err := encodeImage(contextImage.Image)
		if err != nil {
			return types.MealTemplate{}, err
		}
		parts = append(parts, openrouter.ChatMessagePart{
			Type: openrouter.ChatMessagePartTypeImageURL,
			ImageURL: &openrouter.ChatMessageImageURL{
				URL: "data:image/jpeg;base64," + encoded,
			},
		})
	}

	resp, err := c.Client.CreateChatCompletion(ctx, openrouter.ChatCompletionRequest{
		Model:       c.visionModel,
		Temperature: 0.1,
		Reasoning: &openrouter.ChatCompletionReasoning{
			Effort: new("low"),
		},
		ResponseFormat: &openrouter.ChatCompletionResponseFormat{
			Type: openrouter.ChatCompletionResponseFormatTypeJSONObject,
		},
		Messages: []openrouter.ChatCompletionMessage{
			{
				Role: "user",
				Content: openrouter.Content{
					Multi: parts,
				},
			},
		},
	})

	if err != nil {
		return types.MealTemplate{}, errors.New("chat completion request failed with: " + err.Error())
	}

	if len(resp.Choices) > 0 {
		meal, err := utils.ValidateJSON(resp.Choices[0].Message.Content.Text)
		if err != nil {
			return types.MealTemplate{}, errors.New("response JSON validation failed with: " + err.Error())
		}

		return meal, nil
	}

	return types.MealTemplate{}, errors.New("no choices in response")
}

// Make sure Client implements ai.Analyzer
var _ ai.Analyzer = (*Client)(nil)
