package utils

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/ignoxx/caloriemate/types"
)

func ValidateJSON(s string) (types.MealTemplate, error) {
	s = normalizeJSONResponse(s)

	var meal types.MealTemplate
	if err := json.Unmarshal([]byte(s), &meal); err != nil {
		return meal, fmt.Errorf("%w (normalized response length=%d, preview=%q)", err, len(s), preview(s, 500))
	}

	return meal, nil
}

func preview(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

func normalizeJSONResponse(s string) string {
	s = strings.TrimSpace(s)
	s = strings.TrimPrefix(s, "```json")
	s = strings.TrimPrefix(s, "```JSON")
	s = strings.TrimPrefix(s, "```")
	s = strings.TrimSuffix(s, "```")
	s = strings.TrimSpace(s)

	start := strings.IndexByte(s, '{')
	end := strings.LastIndexByte(s, '}')
	if start >= 0 && end > start {
		return s[start : end+1]
	}

	return s
}
