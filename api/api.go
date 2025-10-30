package api

import (
	"log/slog"

	sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"
	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/ai/clip"
	"github.com/ignoxx/caloriemate/types"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func HandleGetSimilarMealTemplates(e *core.RequestEvent) error {
	mealID := e.Request.PathValue("id")

	mealRecord, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, mealID)
	if err != nil {
		return apis.NewNotFoundError("Meal template not found", err)
	}

	if mealRecord.GetString("user") != e.Auth.Id {
		return apis.NewForbiddenError("User not authorized to access this meal", nil)
	}

	imageNames := mealRecord.GetStringSlice("image")
	if len(imageNames) == 0 {
		return apis.NewBadRequestError("No image found for this meal", nil)
	}

	path := mealRecord.BaseFilesPath() + "/" + imageNames[0]
	fsys, err := e.App.NewFilesystem()
	if err != nil {
		return apis.NewInternalServerError("Could not create filesystem", err)
	}

	imageFile, err := fsys.GetReader(path)
	if err != nil {
		return apis.NewBadRequestError("Could not read image", err)
	}

	defer imageFile.Close()
	defer fsys.Close()

	var c ai.Embedder = clip.New()

	rawEmbedding, err := c.GenerateEmbeddings(imageFile)
	if err != nil {
		slog.Error("Failed to generate image embedding", "error", err)
		return apis.NewBadRequestError("Could not analyze image", err)
	}

	mealVector, err := sqlite_vec.SerializeFloat32(rawEmbedding)
	if err != nil {
		slog.Error("Failed to serialize image embedding", "error", err)
		return apis.NewBadRequestError("Could not process image", err)
	}

	similarMeals, err := findSimilarMeals(e.App, mealVector, mealID, 3)
	if err != nil {
		return apis.NewBadRequestError("Could not find similar meals", err)
	}

	return e.JSON(200, similarMeals)
}

func HandlePostMealLink(e *core.RequestEvent) error {
	mealID := e.Request.PathValue("id")
	mealTargetID := e.Request.PathValue("targetId")

	mealRecord, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, mealID)
	if err != nil {
		return apis.NewNotFoundError("Meal template not found", err)
	}

	mealTargetRecord, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, mealTargetID)
	if err != nil {
		return apis.NewNotFoundError("Target meal template not found", err)
	}

	if mealRecord.GetString("user") != e.Auth.Id || mealTargetRecord.GetString("user") != e.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Link the current meal to the target meal
	mealRecord.Set("linked_meal_template_id", mealTargetID)

	if !mealTargetRecord.GetBool("is_primary_in_group") {
		mealTargetRecord.Set("is_primary_in_group", true)
		if err := e.App.Save(mealTargetRecord); err != nil {
			return apis.NewBadRequestError("Failed to update target meal", err)
		}
	}

	if err := e.App.Save(mealRecord); err != nil {
		return apis.NewBadRequestError("Failed to link meals", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meals linked successfully",
	})
}

func HandlePostMealHide(e *core.RequestEvent) error {
	mealID := e.Request.PathValue("id")

	mealRecord, err := e.App.FindRecordById("meal_history", mealID)
	if err != nil {
		return apis.NewNotFoundError("Meal history not found", err)
	}

	if mealRecord.GetString("user") != e.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	mealRecord.Set("adjustments", "hidden")

	if err := e.App.Save(mealRecord); err != nil {
		return apis.NewBadRequestError("Failed to hide meal", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meal hidden successfully",
	})
}

func HandlePostMealUnhide(e *core.RequestEvent) error {
	mealID := e.Request.PathValue("id")

	mealRecord, err := e.App.FindRecordById("meal_history", mealID)
	if err != nil {
		return apis.NewNotFoundError("Meal history not found", err)
	}

	if mealRecord.GetString("user") != e.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Clear the adjustments field to unhide
	mealRecord.Set("adjustments", "")

	if err := e.App.Save(mealRecord); err != nil {
		return apis.NewBadRequestError("Failed to unhide meal", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meal restored successfully",
	})
}

func findSimilarMeals(app core.App, mealVector []byte, mealID string, limit int) ([]types.SimilarMeal, error) {
	var matches []struct {
		MealTemplateID string  `db:"meal_template_id"`
		Distance       float32 `db:"distance"`
	}

	err := app.DB().NewQuery(`
		SELECT meal_template_id, distance
		FROM meal_image_vectors,
		WHERE embedding MATCH {:mealVector} AND k = {:limit} AND meal_template_id != {:mealID}
		LIMIT {:limit}
	`).Bind(dbx.Params{"mealVector": mealVector, "limit": limit, "mealID": mealID}).All(&matches)

	if err != nil {
		return nil, err
	}

	if len(matches) == 0 {
		return []types.SimilarMeal{}, nil
	}

	var mealIDs []any
	for _, match := range matches {
		mealIDs = append(mealIDs, match.MealTemplateID)
	}

	var meals []types.SimilarMeal
	err = app.DB().Select("id", "name", "total_calories", "total_protein_g", "total_carbs_g", "total_fat_g", "ai_description", "created").
		From(types.COL_MEAL_TEMPLATES).
		Where(dbx.In("id", mealIDs...)).
		AndWhere(dbx.HashExp{"processing_status": "completed"}).
		OrderBy("created DESC").
		All(&meals)

	if err != nil {
		return nil, err
	}

	// Add distance information and create image URLs
	mealMap := make(map[string]*types.SimilarMeal)
	for i := range meals {
		mealMap[meals[i].ID] = &meals[i]
	}

	var result []types.SimilarMeal
	for _, match := range matches {
		if meal, exists := mealMap[match.MealTemplateID]; exists {
			meal.Distance = match.Distance

			// Get image URL - we'll need the actual record for this
			record, err := app.FindRecordById(types.COL_MEAL_TEMPLATES, meal.ID)
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
