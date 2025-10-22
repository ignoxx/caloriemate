package api

import (
	"log/slog"

	sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"
	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/ai/clip"
	"github.com/ignoxx/caloriemate/types"
	"github.com/ignoxx/caloriemate/utils"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
)

func HandleGetSimilarMealTemplates(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	// Get the meal template record
	record, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, id)
	if err != nil {
		slog.Error("Failed to find meal template", "id", id, "error", err)
		return apis.NewNotFoundError("Meal template not found", err)
	}

	// Check if user owns this meal
	ri, err := e.RequestInfo()
	if err != nil || ri.Auth == nil {
		return apis.NewUnauthorizedError("Authentication required", nil)
	}

	if record.GetString("user") != ri.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Get the image and generate embedding
	imageNames := record.GetStringSlice("image")
	if len(imageNames) == 0 {
		return apis.NewBadRequestError("No image found for this meal", nil)
	}

	path := record.BaseFilesPath() + "/" + imageNames[0]
	fsys, _ := e.App.NewFilesystem()
	imageFile, err := fsys.GetReader(path)
	if err != nil {
		slog.Error("Failed to open meal template image", "error", err)
		return apis.NewBadRequestError("Could not read image", err)
	}
	defer imageFile.Close()

	var imgLlm ai.Embedder = clip.New()

	// Generate image embedding
	rawEmbedding, err := imgLlm.GenerateEmbeddings(imageFile)
	if err != nil {
		slog.Error("Failed to generate image embedding", "error", err)
		return apis.NewBadRequestError("Could not analyze image", err)
	}

	mealVector, err := sqlite_vec.SerializeFloat32(rawEmbedding)
	if err != nil {
		slog.Error("Failed to serialize image embedding", "error", err)
		return apis.NewBadRequestError("Could not process image", err)
	}

	// Find similar meals
	similarMeals, err := utils.FindSimilarMeals(e.App, mealVector, 4) // Get 4 to exclude self
	if err != nil {
		slog.Error("Failed to find similar meals", "error", err)
		return apis.NewBadRequestError("Could not find similar meals", err)
	}

	// Filter out the current meal and limit to 3
	var results []utils.SimilarMeal
	for _, meal := range similarMeals {
		if meal.ID != id {
			results = append(results, meal)
			if len(results) >= 3 {
				break
			}
		}
	}

	return e.JSON(200, results)

}

func HandlePostMealLink(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")
	targetId := e.Request.PathValue("targetId")

	// Get request info for authentication
	ri, err := e.RequestInfo()
	if err != nil || ri.Auth == nil {
		return apis.NewUnauthorizedError("Authentication required", nil)
	}

	// Get both meal template records
	record, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, id)
	if err != nil {
		return apis.NewNotFoundError("Meal template not found", err)
	}

	targetRecord, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, targetId)
	if err != nil {
		return apis.NewNotFoundError("Target meal template not found", err)
	}

	// Check ownership of both records
	if record.GetString("user") != ri.Auth.Id || targetRecord.GetString("user") != ri.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Link the current meal to the target meal
	record.Set("linked_meal_template_id", targetId)

	// If target meal is not already primary in a group, make it primary
	if !targetRecord.GetBool("is_primary_in_group") {
		targetRecord.Set("is_primary_in_group", true)
		if err := e.App.Save(targetRecord); err != nil {
			return apis.NewBadRequestError("Failed to update target meal", err)
		}
	}

	if err := e.App.Save(record); err != nil {
		return apis.NewBadRequestError("Failed to link meals", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meals linked successfully",
	})
}

func HandlePostMealUnlink(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	// Get request info for authentication
	ri, err := e.RequestInfo()
	if err != nil || ri.Auth == nil {
		return apis.NewUnauthorizedError("Authentication required", nil)
	}

	// Get the meal template record
	record, err := e.App.FindRecordById(types.COL_MEAL_TEMPLATES, id)
	if err != nil {
		return apis.NewNotFoundError("Meal template not found", err)
	}

	// Check ownership
	if record.GetString("user") != ri.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Unlink the meal
	record.Set("linked_meal_template_id", "")

	if err := e.App.Save(record); err != nil {
		return apis.NewBadRequestError("Failed to unlink meal", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meal unlinked successfully",
	})
}

func HandlePostMealHide(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	// Get request info for authentication
	ri, err := e.RequestInfo()
	if err != nil || ri.Auth == nil {
		return apis.NewUnauthorizedError("Authentication required", nil)
	}

	// Get the meal history record
	record, err := e.App.FindRecordById("meal_history", id)
	if err != nil {
		return apis.NewNotFoundError("Meal history not found", err)
	}

	// Check ownership
	if record.GetString("user") != ri.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Use the adjustments field to store status (hidden)
	record.Set("adjustments", "hidden")

	if err := e.App.Save(record); err != nil {
		return apis.NewBadRequestError("Failed to hide meal", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meal hidden successfully",
	})
}
func HandlePostMealUnhide(e *core.RequestEvent) error {
	id := e.Request.PathValue("id")

	// Get request info for authentication
	ri, err := e.RequestInfo()
	if err != nil || ri.Auth == nil {
		return apis.NewUnauthorizedError("Authentication required", nil)
	}

	// Get the meal history record
	record, err := e.App.FindRecordById("meal_history", id)
	if err != nil {
		return apis.NewNotFoundError("Meal history not found", err)
	}

	// Check ownership
	if record.GetString("user") != ri.Auth.Id {
		return apis.NewForbiddenError("Access denied", nil)
	}

	// Clear the adjustments field to unhide
	record.Set("adjustments", "")

	if err := e.App.Save(record); err != nil {
		return apis.NewBadRequestError("Failed to unhide meal", err)
	}

	return e.JSON(200, map[string]any{
		"success": true,
		"message": "Meal restored successfully",
	})
}
