package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("meal_templates")
		if err != nil {
			return err
		}

		if err := collection.Fields.AddMarshaledJSON([]byte(`{
			"hidden": false,
			"id": "text1760000001",
			"max": 1000,
			"min": 0,
			"name": "image_context",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		if err := collection.Fields.AddMarshaledJSON([]byte(`{
			"hidden": false,
			"id": "file1760000002",
			"maxSelect": 5,
			"maxSize": 15728640,
			"mimeTypes": [
				"image/png",
				"image/jpeg"
			],
			"name": "context_images",
			"presentable": false,
			"protected": false,
			"required": false,
			"system": false,
			"thumbs": [],
			"type": "file"
		}`)); err != nil {
			return err
		}

		if err := collection.Fields.AddMarshaledJSON([]byte(`{
			"hidden": false,
			"id": "text1760000003",
			"max": 5000,
			"min": 0,
			"name": "context_notes",
			"pattern": "",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "text"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("meal_templates")
		if err != nil {
			return err
		}

		collection.Fields.RemoveByName("image_context")
		collection.Fields.RemoveByName("context_images")
		collection.Fields.RemoveByName("context_notes")

		return app.Save(collection)
	})
}
