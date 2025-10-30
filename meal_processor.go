package main

import (
	"errors"
	"io"
	"log/slog"

	sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"
	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/types"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase/core"
)

type mealMatch struct {
	MealTemplateID string  `db:"meal_template_id"`
	Distance       float32 `db:"distance"`
}

func getImageReader(app core.App, record *core.Record) (io.ReadSeekCloser, error) {
	imageNames := record.GetStringSlice("image")
	if len(imageNames) == 0 {
		return nil, errors.New("no image found")
	}

	path := record.BaseFilesPath() + "/" + imageNames[0]
	fsys, _ := app.NewFilesystem()
	return fsys.GetReader(path)
}

func generateMealEmbedding(app core.App, record *core.Record, imgLlm ai.Embedder) ([]byte, error) {
	imageFile, err := getImageReader(app, record)
	if err != nil {
		slog.Error("Failed to open meal template image", "error", err)
		return nil, err
	}
	defer imageFile.Close()

	rawEmbedding, err := imgLlm.GenerateEmbeddings(imageFile)
	if err != nil {
		slog.Error("Failed to generate image embedding", "error", err)
		return nil, err
	}

	mealVector, err := sqlite_vec.SerializeFloat32(rawEmbedding)
	if err != nil {
		slog.Error("Failed to serialize embedding", "error", err)
		return nil, err
	}

	return mealVector, nil
}

func findSimilarMealIDs(app core.App, mealVector []byte, recordId string) ([]mealMatch, error) {
	var matches []mealMatch

	err := app.DB().NewQuery("SELECT meal_template_id, distance FROM meal_image_vectors WHERE embedding MATCH {:mealVector} AND k = 5;").Bind(dbx.Params{
		"mealVector": mealVector,
	}).All(&matches)

	if err != nil {
		slog.Error("Failed to search for similar meals", "error", err)
		return nil, err
	}

	slog.Info("Found similar meals", "count", len(matches), "recordId", recordId)
	return matches, nil
}

func analyzeMealTemplate(app core.App, record *core.Record, llm ai.Analyzer, similarMeals []mealMatch) error {
	shouldAnalyze := true

	if len(similarMeals) > 0 {
		var bestMatch mealMatch
		for _, match := range similarMeals {
			if match.MealTemplateID != record.Id {
				bestMatch = match
				break
			}
		}

		if bestMatch.Distance < 0.1 && bestMatch.MealTemplateID != record.Id {
			slog.Info("Auto-matching with existing meal", "recordId", record.Id, "matchId", bestMatch.MealTemplateID, "distance", bestMatch.Distance)

			similarRecord, err := app.FindRecordById(types.COL_MEAL_TEMPLATES, bestMatch.MealTemplateID)
			if err == nil {
				record.Set("name", similarRecord.GetString("name"))
				record.Set("ai_description", similarRecord.GetString("ai_description"))
				record.Set("total_calories", similarRecord.GetInt("total_calories"))
				record.Set("calorie_uncertainty_percent", similarRecord.GetInt("calorie_uncertainty_percent"))
				record.Set("total_protein_g", similarRecord.GetInt("total_protein_g"))
				record.Set("protein_uncertainty_percent", similarRecord.GetInt("protein_uncertainty_percent"))
				record.Set("total_carbs_g", similarRecord.GetInt("total_carbs_g"))
				record.Set("carbs_uncertainty_percent", similarRecord.GetInt("carbs_uncertainty_percent"))
				record.Set("total_fat_g", similarRecord.GetInt("total_fat_g"))
				record.Set("fat_uncertainty_percent", similarRecord.GetInt("fat_uncertainty_percent"))
				record.Set("processing_status", "completed")

				if similarRecord.GetString("linked_meal_template_id") != "" {
					record.Set("linked_meal_template_id", similarRecord.GetString("linked_meal_template_id"))
				} else if similarRecord.GetBool("is_primary_in_group") {
					record.Set("linked_meal_template_id", bestMatch.MealTemplateID)
				} else {
					similarRecord.Set("is_primary_in_group", true)
					if err := app.Save(similarRecord); err != nil {
						slog.Error("Failed to make similar meal primary", "error", err)
					} else {
						record.Set("linked_meal_template_id", bestMatch.MealTemplateID)
						slog.Info("Auto-linked new meal to similar meal", "newMeal", record.Id, "primaryMeal", bestMatch.MealTemplateID)
					}
				}

				shouldAnalyze = false
				slog.Info("Auto-match completed", "recordId", record.Id, "matchId", bestMatch.MealTemplateID)
			}
		}
	}

	if shouldAnalyze {
		imageFile, err := getImageReader(app, record)
		if err != nil {
			return err
		}
		defer imageFile.Close()

		userContext := record.GetString("description")
		meal, err := llm.EstimateNutritions(imageFile, userContext)
		if err != nil {
			slog.Error("Failed to analyze meal template", "error", err)
			return err
		}

		record.Set("name", meal.Name)
		record.Set("ai_description", meal.AIDescription)
		record.Set("total_calories", meal.TotalCalories)
		record.Set("calorie_uncertainty_percent", meal.CalorieUncertaintyPercent)
		record.Set("total_protein_g", meal.TotalProteinG)
		record.Set("protein_uncertainty_percent", meal.ProteinUncertaintyPercent)
		record.Set("total_carbs_g", meal.TotalCarbsG)
		record.Set("carbs_uncertainty_percent", meal.CarbsUncertaintyPercent)
		record.Set("total_fat_g", meal.TotalFatG)
		record.Set("fat_uncertainty_percent", meal.FatUncertaintyPercent)
		record.Set("processing_status", "completed")
	}

	if err := app.Save(record); err != nil {
		slog.Error("Failed to save meal template after analysis", "error", err)
		return err
	}

	return nil
}

func upsertMealVector(app core.App, recordId string, mealVector []byte) error {
	_, _ = app.DB().NewQuery("DELETE FROM meal_image_vectors WHERE meal_template_id = {:id}").Bind(dbx.Params{
		"id": recordId,
	}).Execute()

	_, err := app.DB().NewQuery("INSERT INTO meal_image_vectors(meal_template_id, embedding) VALUES ({:meal_template_id}, {:embedding})").Bind(dbx.Params{
		"meal_template_id": recordId,
		"embedding":        mealVector,
	}).Execute()

	if err != nil {
		slog.Error("Failed to save meal vector", "error", err)
		return err
	}

	return nil
}

func processMealTemplate(app core.App, record *core.Record, llm ai.Analyzer, imgLlm ai.Embedder) error {
	slog.Info("Starting meal template analysis", "recordId", record.Id)

	mealVector, err := generateMealEmbedding(app, record, imgLlm)
	if err != nil {
		return err
	}

	similarMeals, err := findSimilarMealIDs(app, mealVector, record.Id)
	if err != nil {
		return err
	}

	if err := analyzeMealTemplate(app, record, llm, similarMeals); err != nil {
		return err
	}

	if err := upsertMealVector(app, record.Id, mealVector); err != nil {
		return err
	}

	slog.Info("Meal template analysis completed", "recordId", record.Id)
	return nil
}

func createMealHistory(app core.App, record *core.Record) error {
	mealHistoryCollection, err := app.FindCollectionByNameOrId("meal_history")
	if err != nil {
		slog.Error("Failed to find meal_history collection", "error", err)
		return err
	}

	mealHistoryRecord := core.NewRecord(mealHistoryCollection)
	mealHistoryRecord.Set("meal", record.Id)
	mealHistoryRecord.Set("user", record.GetString("user"))
	mealHistoryRecord.Set("portion_multiplier", 1.0)

	if err := app.Save(mealHistoryRecord); err != nil {
		slog.Error("Failed to auto-create meal_history record", "error", err)
		return err
	}

	slog.Info("Auto-created meal_history record", "mealTemplateId", record.Id, "mealHistoryId", mealHistoryRecord.Id)
	return nil
}
