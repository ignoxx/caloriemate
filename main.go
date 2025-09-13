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

		// get image vector
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
			MealTemplateID string    `db:"meal_template_id"`
			Embedding      []float32 `db:"embedding"`
			Distance       float32   `db:"distance"`
		}

		err = e.App.DB().NewQuery("SELECT * FROM meal_vectors WHERE embedding MATCH {:mealVector} AND and distance <= 0.8 ORDER BY distance LIMIT 5;").Bind(dbx.Params{
			"embedding": mealVector,
		}).All(&mealMatches)

		if err != nil {
			slog.Error("Failed to search for similar meal templates", "error", err)
			return e.Next() // idk if we should exit here
		}

		slog.Info("Found similar meal templates", "count", len(mealMatches), "recordId", e.Record.Id)
		//TODO: if similar matches found, somehow propagate that to the user :shrug:

		output, err := llm.AnalyzeImage(imageFile)
		if err != nil {
			slog.Error("Failed to analyze image for meal template", "error", err)
			return e.Next()
		}

		userContext := e.Record.GetString("description")
		meal, err := llm.EstimateNutritions(output, userContext)
		if err != nil {
			slog.Error("Failed to estimate nutritions for meal template", "error", err)
			return e.Next()
		}

		e.Record.Set("name", meal.Name)
		e.Record.Set("ai_description", meal.AIDescription)
		e.Record.Set("description", meal.UserContext)

		e.Record.Set("total_calories", meal.TotalCalories)
		e.Record.Set("calorie_uncertainty_percent", meal.CalorieUncertaintyPercent)

		e.Record.Set("total_protein_g", meal.TotalProteinG)
		e.Record.Set("protein_uncertainty_percent", meal.ProteinUncertaintyPercent)

		e.Record.Set("total_carbs_g", meal.TotalCarbsG)
		e.Record.Set("carbs_uncertainty_percent", meal.CarbsUncertaintyPercent)

		e.Record.Set("total_fat_g", meal.TotalFatG)
		e.Record.Set("fat_uncertainty_percent", meal.FatUncertaintyPercent)

		if err := e.App.Save(e.Record); err != nil {
			slog.Error("Failed to save meal template after analysis", "error", err)
			return e.Next()
		}

		mealVectors, _ := e.App.FindCollectionByNameOrId("meal_vectors")
		mealVecRecord := core.NewRecord(mealVectors)
		mealVecRecord.Set("meal_template_id", e.Record.Id)
		mealVecRecord.Set("embedding", mealVector)

		if err := e.App.Save(mealVecRecord); err != nil {
			slog.Error("Failed to save meal template image embedding", "error", err)
			return e.Next()
		}

		slog.Info("Meal template analysis completed", "recordId", e.Record.Id)

		return e.Next()
	})

	app.Logger().Info("Starting app", "stage", stage)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
