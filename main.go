package main

import (
	"database/sql"
	"embed"
	"errors"
	"io"
	"io/fs"
	"log"
	"log/slog"
	"os"

	"github.com/joho/godotenv"
	"github.com/mattn/go-sqlite3"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"

	"github.com/ignoxx/caloriemate/ai"
	"github.com/ignoxx/caloriemate/ai/clip"
	"github.com/ignoxx/caloriemate/ai/openrouter"
	"github.com/ignoxx/caloriemate/api"
	_ "github.com/ignoxx/caloriemate/migrations"
	"github.com/ignoxx/caloriemate/types"
)

func init() {
	sqlite_vec.Auto()

	sql.Register("pb_sqlite3_vec",
		&sqlite3.SQLiteDriver{
			ConnectHook: func(conn *sqlite3.SQLiteConn) error {
				_, err := conn.Exec(`
					PRAGMA busy_timeout       = 10000;
					PRAGMA journal_mode       = WAL;
					PRAGMA journal_size_limit = 200000000;
					PRAGMA synchronous        = NORMAL;
					PRAGMA foreign_keys       = ON;
					PRAGMA temp_store         = MEMORY;
					PRAGMA cache_size         = -16000;
				`, nil)
				return err
			},
		},
	)

	dbx.BuilderFuncMap["pb_sqlite3_vec"] = dbx.BuilderFuncMap["sqlite3"]
}

//go:embed all:frontend/build
var distDir embed.FS

type mealMatch struct {
	MealTemplateID string  `db:"meal_template_id"`
	Distance       float32 `db:"distance"`
}

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DBConnect: func(dbPath string) (*dbx.DB, error) {
			db, err := dbx.Open("pb_sqlite3_vec", dbPath)
			if err != nil {
				return nil, err
			}

			_, err = db.NewQuery("SELECT vec_version()").Execute()
			if err != nil {
				log.Printf("Warning: vec extension not available: %v", err)
			} else {
				log.Printf("sqlite-vec extension loaded successfully!")
			}

			return db, nil
		},
	})

	godotenv.Load()
	app.Logger().Info(".env file loaded")

	ai.LoadTemplates()
	app.Logger().Info("AI templates loaded")

	stage := os.Getenv("STAGE")

	distDirFs := os.DirFS("./pb_public")
	if stage == "prod" {
		distDirFs, _ = fs.Sub(distDir, "frontend/build")
	}

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		// enable auto creation of migration files when making collection changes in the Dashboard
		Automigrate: stage == "dev",
	})

	var llm ai.Analyzer = openrouter.New()
	var imgLlm ai.Embedder = clip.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static FE files
		se.Router.GET("/{path...}", apis.Static(distDirFs, true))

		cr := se.Router.Group("/api/v1")
		cr.Bind(apis.RequireAuth())

		cr.GET("/similar/{id}", api.HandleGetSimilarMealTemplates)
		cr.POST("/meal/{id}/link/{targetId}", api.HandlePostMealLink)
		cr.POST("/meal/{id}/hide", api.HandlePostMealHide)

		return se.Next()
	})

	app.OnRecordCreateRequest(types.COL_MEAL_TEMPLATES).BindFunc(func(e *core.RecordRequestEvent) error {
		ri, err := e.RequestInfo()
		if err != nil {
			slog.Error("Failed to get request info", "error", err)
			return errors.New("failed to get request info: " + err.Error())
		}

		if ri.Auth == nil {
			slog.Warn("Unauthenticated user tried to create meal template")
			return apis.NewUnauthorizedError("Unauthorized", nil)
		}

		slog.Info("Setting meal template user", "userId", ri.Auth.Id, "recordId", e.Record.Id)

		e.Record.Set("user", ri.Auth.Id)

		return e.Next()
	})

	app.OnRecordAfterCreateSuccess(types.COL_MEAL_TEMPLATES).BindFunc(func(e *core.RecordEvent) error {
		if err := processMealTemplate(e.App, e.Record, llm, imgLlm); err != nil {
			return e.Next()
		}

		if err := createMealHistory(e.App, e.Record); err != nil {
			slog.Error("Failed to create meal_history", "error", err)
		}

		return e.Next()
	})

	app.OnRecordAfterUpdateSuccess(types.COL_MEAL_TEMPLATES).BindFunc(func(e *core.RecordEvent) error {
		oldStatus := e.Record.Original().GetString("processing_status")
		newStatus := e.Record.GetString("processing_status")

		if oldStatus != "pending" && newStatus == "pending" {
			slog.Info("Re-analyzing meal template", "recordId", e.Record.Id)
			if err := processMealTemplate(e.App, e.Record, llm, imgLlm); err != nil {
				return e.Next()
			}
		}

		return e.Next()
	})

	app.Logger().Info("Starting app", "stage", stage)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
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

func findSimilarMeals(app core.App, mealVector []byte, recordId string) ([]mealMatch, error) {
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

	similarMeals, err := findSimilarMeals(app, mealVector, record.Id)
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

