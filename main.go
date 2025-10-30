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
	"github.com/ignoxx/caloriemate/ai/ollama"
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
		Automigrate: stage == "dev",
	})

	aiProvider := os.Getenv("AI_PROVIDER")
	if aiProvider == "" {
		aiProvider = "ollama"
	}

	var llm ai.Analyzer
	switch aiProvider {
	case "ollama":
		llm = ollama.New()
		app.Logger().Info("Using Ollama AI provider")
	case "openrouter":
		llm = openrouter.New()
		app.Logger().Info("Using OpenRouter AI provider")
	default:
		log.Fatalf("Unknown AI_PROVIDER: %s (valid options: ollama, openrouter)", aiProvider)
	}

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
