package utils

import (
	"encoding/json"
	"strings"

	"github.com/ignoxx/caloriemate/types"
)

func ToPtr[T any](v T) *T {
	return &v
}

func ValidateJSON(s string) (types.MealTemplate, error) {
	s, _ = strings.CutPrefix(s, "```json")
	s, _ = strings.CutPrefix(s, "```")
	s, _ = strings.CutSuffix(s, "```")

	var meal types.MealTemplate
	err := json.Unmarshal([]byte(s), &meal)

	return meal, err
}
