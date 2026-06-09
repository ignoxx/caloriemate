package migrations

import (
	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("activity_logs")
		if err != nil {
			return err
		}

		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "select2400881851",
			"maxSelect": 1,
			"name": "activity_type",
			"presentable": false,
			"required": true,
			"system": false,
			"type": "select",
			"values": [
				"walking",
				"custom"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("activity_logs")
		if err != nil {
			return err
		}

		if err := collection.Fields.AddMarshaledJSONAt(2, []byte(`{
			"hidden": false,
			"id": "select2400881851",
			"maxSelect": 1,
			"name": "activity_type",
			"presentable": false,
			"required": true,
			"system": false,
			"type": "select",
			"values": [
				"walking"
			]
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	})
}
