package ai

import (
	"io"

	"github.com/ignoxx/caloriemate/types"
)

type Embedder interface {
	GenerateEmbeddings(input io.Reader) ([]float32, error)
}

type Analyzer interface {
	AnalyzeImage(image io.Reader) (string, error)
	EstimateNutritions(analyzedImgOutput string, additionalInformation string) (types.Meal, error)
}
