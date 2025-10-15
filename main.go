package main

import (
	"database/sql"
	"embed"
	"errors"
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

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		// TODO: move this to CLI level
		DefaultDataDir: "./pb_data",
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
		// (the isGoRun check is to enable it only during development)
		Automigrate: stage == "dev",
	})

	var llm ai.Analyzer = openrouter.New()
	var imgLlm ai.Embedder = clip.New()

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {

		// TODO: check if we need to put this behind auth mw
		se.Router.GET("/api/collections/meal_templates/records/{id}/similar", api.HandleGetSimilarMealTemplates)
		se.Router.POST("/api/collections/meal_templates/records/{id}/link/{targetId}", api.HandlePostMealLink)
		se.Router.POST("/api/collections/meal_templates/records/{id}/unlink", api.HandlePostMealUnlink)
		se.Router.POST("/api/collections/meal_history/records/{id}/hide", api.HandlePostMealHide)
		se.Router.POST("/api/collections/meal_history/records/{id}/unhide", api.HandlePostMealUnhide)

		// serves static files from the provided public dir (if exists)
		se.Router.GET("/{path...}", apis.Static(distDirFs, true))

		return se.Next()
	})

	app.OnRecordCreateRequest("meal_templates").BindFunc(func(e *core.RecordRequestEvent) error {
		ri, err := e.RequestInfo()
		if err != nil {
			slog.Error("Failed to get request info", "error", err)
			return errors.New("failed to get request info: " + err.Error())
		}

		if ri.Auth == nil {
			slog.Warn("Unauthenticated user tried to create meal template")
			return errors.New("unauthenticated")
		}

		slog.Info("Setting meal template user", "userId", ri.Auth.Id, "recordId", e.Record.Id)

		e.Record.Set("user", ri.Auth.Id)

		return e.Next()
	})

	// Analyze the meal upon successful creation
	app.OnRecordAfterCreateSuccess("meal_templates").BindFunc(func(e *core.RecordEvent) error {
		slog.Info("Starting meal template analysis", "recordId", e.Record.Id)

		imageNames := e.Record.GetStringSlice("image")

		path := e.Record.BaseFilesPath() + "/" + imageNames[0]
		fsys, _ := app.NewFilesystem()
		imageFile, err := fsys.GetReader(path)

		if err != nil {
			slog.Error("Failed to open meal template image", "error", err)
			return e.Next()
		}
		defer imageFile.Close()

		rawEmbedding, err := imgLlm.GenerateEmbeddings(imageFile)
		if err != nil {
			slog.Error("Failed to generate image embedding for meal template", "error", err)
			return e.Next()
		}

		mealVector, err := sqlite_vec.SerializeFloat32(rawEmbedding)
		if err != nil {
			slog.Error("Failed to serialize image embedding for meal template", "error", err)
			return e.Next()
		}

		var mealMatches []struct {
			MealTemplateID string  `db:"meal_template_id"`
			Distance       float32 `db:"distance"`
		}

		err = e.App.DB().NewQuery("SELECT meal_template_id, distance FROM meal_image_vectors WHERE embedding MATCH {:mealVector} AND k = 5;").Bind(dbx.Params{
			"mealVector": mealVector,
		}).All(&mealMatches)

		if err != nil {
			slog.Error("Failed to search for similar meal templates", "error", err)
			return e.Next() // WARN: idk if we should exit here
		}

		slog.Info("Found similar meal templates", "count", len(mealMatches), "recordId", e.Record.Id, "data", mealMatches)

		// Check for high confidence matches and auto-reuse
		var shouldAnalyze = true
		if len(mealMatches) > 0 {
			bestMatch := mealMatches[0]
			// Filter out self-matches
			for _, match := range mealMatches {
				if match.MealTemplateID != e.Record.Id {
					bestMatch = match
					break
				}
			}

			// Auto-match if very high confidence (distance < 0.1 = ~95% similarity)
			if bestMatch.Distance < 0.1 && bestMatch.MealTemplateID != e.Record.Id {
				slog.Info("Auto-matching with existing meal", "recordId", e.Record.Id, "matchId", bestMatch.MealTemplateID, "distance", bestMatch.Distance)

				// Get the similar meal's data
				similarRecord, err := e.App.FindRecordById("meal_templates", bestMatch.MealTemplateID)
				if err == nil {
					// Copy nutrition data from similar meal
					e.Record.Set("name", similarRecord.GetString("name"))
					e.Record.Set("ai_description", similarRecord.GetString("ai_description"))
					e.Record.Set("total_calories", similarRecord.GetInt("total_calories"))
					e.Record.Set("calorie_uncertainty_percent", similarRecord.GetInt("calorie_uncertainty_percent"))
					e.Record.Set("total_protein_g", similarRecord.GetInt("total_protein_g"))
					e.Record.Set("protein_uncertainty_percent", similarRecord.GetInt("protein_uncertainty_percent"))
					e.Record.Set("total_carbs_g", similarRecord.GetInt("total_carbs_g"))
					e.Record.Set("carbs_uncertainty_percent", similarRecord.GetInt("carbs_uncertainty_percent"))
					e.Record.Set("total_fat_g", similarRecord.GetInt("total_fat_g"))
					e.Record.Set("fat_uncertainty_percent", similarRecord.GetInt("fat_uncertainty_percent"))
					e.Record.Set("processing_status", "completed")

					// Auto-link meals if the match is very close
					// Check if the similar meal is already linked to another meal or is primary
					if similarRecord.GetString("linked_meal_template_id") != "" {
						// Link to the same primary meal that the similar meal is linked to
						e.Record.Set("linked_meal_template_id", similarRecord.GetString("linked_meal_template_id"))
					} else if similarRecord.GetBool("is_primary_in_group") {
						// Link directly to the similar meal (which is already primary)
						e.Record.Set("linked_meal_template_id", bestMatch.MealTemplateID)
					} else {
						// Make the similar meal primary and link this new meal to it
						similarRecord.Set("is_primary_in_group", true)
						if err := e.App.Save(similarRecord); err != nil {
							slog.Error("Failed to make similar meal primary", "error", err)
						} else {
							e.Record.Set("linked_meal_template_id", bestMatch.MealTemplateID)
							slog.Info("Auto-linked new meal to similar meal", "newMeal", e.Record.Id, "primaryMeal", bestMatch.MealTemplateID)
						}
					}

					shouldAnalyze = false
					slog.Info("Auto-match completed", "recordId", e.Record.Id, "matchId", bestMatch.MealTemplateID)
				}
			}
		}

		// Only run AI analysis if not auto-matched
		if shouldAnalyze {
			userContext := "" // TODO:
			meal, err := llm.EstimateNutritions(imageFile, userContext)
			if err != nil {
				slog.Error("Failed to analyze image for meal template", "error", err)
				return e.Next()
			}

			e.Record.Set("name", meal.Name)
			e.Record.Set("ai_description", meal.AIDescription)
			e.Record.Set("total_calories", meal.TotalCalories)
			e.Record.Set("calorie_uncertainty_percent", meal.CalorieUncertaintyPercent)
			e.Record.Set("total_protein_g", meal.TotalProteinG)
			e.Record.Set("protein_uncertainty_percent", meal.ProteinUncertaintyPercent)
			e.Record.Set("total_carbs_g", meal.TotalCarbsG)
			e.Record.Set("carbs_uncertainty_percent", meal.CarbsUncertaintyPercent)
			e.Record.Set("total_fat_g", meal.TotalFatG)
			e.Record.Set("fat_uncertainty_percent", meal.FatUncertaintyPercent)
			e.Record.Set("processing_status", "completed")
		}

		if err := e.App.Save(e.Record); err != nil {
			slog.Error("Failed to save meal template after analysis", "error", err)
			return e.Next()
		}

		_, err = e.App.DB().NewQuery("INSERT INTO meal_image_vectors(meal_template_id, embedding) VALUES ({:meal_template_id}, {:embedding})").Bind(
			dbx.Params{
				"meal_template_id": e.Record.Id,
				"embedding":        mealVector,
			}).Execute()

		if err != nil {
			slog.Info("Failed to save meal template image embedding", "error", err)
		}

		// Auto-create meal_history record so the meal appears in today's meals list
		mealHistoryCollection, err := e.App.FindCollectionByNameOrId("meal_history")
		if err != nil {
			slog.Error("Failed to find meal_history collection", "error", err)
			return e.Next()
		}

		mealHistoryRecord := core.NewRecord(mealHistoryCollection)
		mealHistoryRecord.Set("meal", e.Record.Id)
		mealHistoryRecord.Set("user", e.Record.GetString("user"))
		mealHistoryRecord.Set("portion_multiplier", 1.0) // Default to 1x portion

		if err := e.App.Save(mealHistoryRecord); err != nil {
			slog.Error("Failed to auto-create meal_history record", "error", err)
			// Don't return error here - meal template analysis was successful
		} else {
			slog.Info("Auto-created meal_history record", "mealTemplateId", e.Record.Id, "mealHistoryId", mealHistoryRecord.Id)
		}

		slog.Info("Meal template analysis completed", "recordId", e.Record.Id)

		return e.Next()
	})

	app.Logger().Info("Starting app", "stage", stage)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
