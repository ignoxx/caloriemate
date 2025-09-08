package ai

import (
	"io"

	"github.com/ignoxx/caloriemate/types"
)

type Embedder interface {
	GenerateEmbeddings(input io.ReadSeeker) ([]float32, error)
}

type Analyzer interface {
	AnalyzeImage(image io.ReadSeeker) (string, error)
	EstimateNutritions(analyzedImgOutput string, additionalInformation string) (types.Meal, error)
}
