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

	visionModel, ok := os.LookupEnv("OPENROUTER_VISION_MODEL")
	if !ok {
		visionModel = "google/gemini-2.5-flash"
	}

	return &Client{
		Client:      openrouter.NewClient(apiToken),
		visionModel: visionModel,
	}
}

func (c *Client) EstimateNutritions(image io.ReadSeeker, userContext string) (types.MealTemplate, error) {
	ctx := context.Background()

	if _, err := image.Seek(0, io.SeekStart); err != nil {
		return types.MealTemplate{}, errors.New("image seek to start failed with: " + err.Error())
	}

	var imgBuf bytes.Buffer
	var promptBuf bytes.Buffer

	enc := base64.NewEncoder(base64.StdEncoding, &imgBuf)
	defer enc.Close()

	if _, err := io.Copy(enc, image); err != nil {
		return types.MealTemplate{}, errors.New("image copy to buffer failed with: " + err.Error())
	}

	type input struct {
		UserContext string
	}

	if err := ai.STAGE_SINGLE_PROMPT.Execute(&promptBuf, input{UserContext: userContext}); err != nil {
		return types.MealTemplate{}, errors.New("single stage prompt execute failed with: " + err.Error())
	}

	resp, err := c.Client.CreateChatCompletion(ctx, openrouter.ChatCompletionRequest{
		Model: c.visionModel,
		Reasoning: &openrouter.ChatCompletionReasoning{
			Effort: utils.ToPtr("low"),
		},
		Messages: []openrouter.ChatCompletionMessage{
			{
				Role: "user",
				Content: openrouter.Content{
					Multi: []openrouter.ChatMessagePart{
						{
							Type: openrouter.ChatMessagePartTypeText,
							Text: promptBuf.String(),
						},
						{
							Type: openrouter.ChatMessagePartTypeImageURL,
							ImageURL: &openrouter.ChatMessageImageURL{
								URL: "data:image/jpeg;base64," + imgBuf.String(),
							},
						},
					},
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
