package ai

import (
	"io"

	"github.com/ignoxx/caloriemate/types"
)

type Embedder interface {
	GenerateEmbeddings(input io.ReadSeeker) ([]float32, error)
}

type Analyzer interface {
	EstimateNutritions(image io.ReadSeeker, userContext string) (types.MealTemplate, error)
}
