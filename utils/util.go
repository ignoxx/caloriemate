package utils

import (
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

// Turn any value into a pointer
func ToPtr[T any](v T) *T {
	return &v
}

// SimilarMeal represents a similar meal match
type SimilarMeal struct {
	ID            string  `json:"id" db:"id"`
	Name          string  `json:"name" db:"name"`
	Distance      float32 `json:"distance" db:"distance"`
	TotalCalories float64 `json:"total_calories" db:"total_calories"`
	TotalProteinG float64 `json:"total_protein_g" db:"total_protein_g"`
	TotalCarbsG   float64 `json:"total_carbs_g" db:"total_carbs_g"`
	TotalFatG     float64 `json:"total_fat_g" db:"total_fat_g"`
	AiDescription string  `json:"ai_description" db:"ai_description"`
	ImageURL      string  `json:"image_url,omitempty"`
	Created       string  `json:"created" db:"created"`
}

// FindSimilarMeals searches for similar meals using vector embeddings
func FindSimilarMeals(app core.App, mealVector []byte, limit int) ([]SimilarMeal, error) {
	var matches []struct {
		MealTemplateID string  `db:"meal_template_id"`
		Distance       float32 `db:"distance"`
	}

	err := app.DB().NewQuery(`
		SELECT meal_template_id, distance 
		FROM meal_image_vectors 
		WHERE embedding MATCH {:mealVector} AND k = {:limit}
	`).Bind(dbx.Params{
		"mealVector": mealVector,
		"limit":      limit,
	}).All(&matches)

	if err != nil {
		return nil, err
	}

	if len(matches) == 0 {
		return []SimilarMeal{}, nil
	}

	// Get meal template details for the matches
	var mealIDs []interface{}
	for _, match := range matches {
		mealIDs = append(mealIDs, match.MealTemplateID)
	}

	var meals []SimilarMeal
	err = app.DB().Select("id", "name", "total_calories", "total_protein_g", "total_carbs_g", "total_fat_g", "ai_description", "created").
		From("meal_templates").
		Where(dbx.In("id", mealIDs...)).
		AndWhere(dbx.HashExp{"processing_status": "completed"}).
		OrderBy("created DESC").
		All(&meals)

	if err != nil {
		return nil, err
	}

	// Add distance information and create image URLs
	mealMap := make(map[string]*SimilarMeal)
	for i := range meals {
		mealMap[meals[i].ID] = &meals[i]
	}

	var result []SimilarMeal
	for _, match := range matches {
		if meal, exists := mealMap[match.MealTemplateID]; exists {
			meal.Distance = match.Distance

			// Get image URL - we'll need the actual record for this
			record, err := app.FindRecordById("meal_templates", meal.ID)
			if err == nil {
				imageFiles := record.GetStringSlice("image")
				if len(imageFiles) > 0 {
					meal.ImageURL = app.Settings().Meta.AppURL + "/api/files/" + record.Collection().Name + "/" + record.Id + "/" + imageFiles[0]
				}
			}

			result = append(result, *meal)
		}
	}

	return result, nil
}
