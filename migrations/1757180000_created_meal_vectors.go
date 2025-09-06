package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		// Create vector table for image embeddings (CLIP - 512 dimensions)
		_, err := app.DB().NewQuery(`
            CREATE VIRTUAL TABLE IF NOT EXISTS meal_image_vectors USING vec0(
                meal_template_id TEXT PRIMARY KEY,
                embedding float[512]
            );
        `).Execute()

		return err
	}, func(app core.App) error {
		// Rollback - drop the vector table
		_, err := app.DB().NewQuery("DROP TABLE IF EXISTS meal_image_vectors;").Execute()
		return err
	})
}
