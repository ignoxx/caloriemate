package ai

import (
	"io"

	"github.com/ignoxx/caloriemate/types"
)

type Embedder interface {
	GenerateEmbeddings(input io.ReadSeeker) ([]float32, error)
}

type ContextImage struct {
	Image io.ReadSeeker
	Note  string
}

type Analyzer interface {
	EstimateNutritions(image io.ReadSeeker, imageContext string, contextImages []ContextImage, userContext string) (types.MealTemplate, error)
}
