package ai

import (
	"io"

	"github.com/ignoxx/caloriemate/types"
)

type Embedder interface {
	GenerateEmbeddings(input io.Reader) []float32
}

type Analyzer interface {
	AnalyzeImage(image io.Reader) string
	EstimateNutritions(analyzedImgOutput string, additionalInformation string) types.Meal
}
