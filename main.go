package main

import (
	"database/sql"
	"embed"
	"io/fs"
	"log"
	"os"
	"strings"

	"github.com/joho/godotenv"
	"github.com/mattn/go-sqlite3"
	"github.com/pocketbase/dbx"
	"github.com/pocketbase/pocketbase"
	"github.com/pocketbase/pocketbase/apis"
	"github.com/pocketbase/pocketbase/core"
	"github.com/pocketbase/pocketbase/plugins/migratecmd"

	sqlite_vec "github.com/asg017/sqlite-vec-go-bindings/cgo"

	"github.com/ignoxx/caloriemate/ai"
	_ "github.com/ignoxx/caloriemate/migrations"
)

func init() {
	sqlite_vec.Auto()

	sql.Register("pb_sqlite3_vec",
		&sqlite3.SQLiteDriver{
			ConnectHook: func(conn *sqlite3.SQLiteConn) error {
				// Apply default PRAGMAs
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

	// Map the custom driver to use sqlite3 query builder
	dbx.BuilderFuncMap["pb_sqlite3_vec"] = dbx.BuilderFuncMap["sqlite3"]
}

//go:embed all:frontend/build
var distDir embed.FS

func main() {
	app := pocketbase.NewWithConfig(pocketbase.Config{
		DefaultDataDir: "./pb_data",
		DBConnect: func(dbPath string) (*dbx.DB, error) {
			db, err := dbx.Open("pb_sqlite3_vec", dbPath)
			if err != nil {
				return nil, err
			}

			// Test that sqlite-vec extension is available
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

	// loosely check if it was executed using "go run"
	isGoRun := strings.HasPrefix(os.Args[0], os.TempDir())

	migratecmd.MustRegister(app, app.RootCmd, migratecmd.Config{
		// enable auto creation of migration files when making collection changes in the Dashboard
		// (the isGoRun check is to enable it only during development)
		Automigrate: isGoRun,
	})

	app.OnServe().BindFunc(func(se *core.ServeEvent) error {
		// serves static files from the provided public dir (if exists)
		se.Router.GET("/{path...}", apis.Static(distDirFs, true))

		return se.Next()
	})

	app.Logger().Info("Starting app", "stage", stage)

	if err := app.Start(); err != nil {
		log.Fatal(err)
	}
}
