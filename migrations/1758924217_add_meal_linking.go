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

		// Add linked_meal_template_id field (relation to meal_templates)
		if err := collection.Fields.AddMarshaledJSONAt(15, []byte(`{
			"cascadeDelete": false,
			"collectionId": "pbc_4138469906",
			"displayFields": ["name"],
			"hidden": false,
			"id": "relation_linked_meal",
			"maxSelect": 1,
			"minSelect": 0,
			"name": "linked_meal_template_id",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "relation"
		}`)); err != nil {
			return err
		}

		// Add is_primary_in_group field
		if err := collection.Fields.AddMarshaledJSONAt(16, []byte(`{
			"hidden": false,
			"id": "bool_primary_group",
			"name": "is_primary_in_group",
			"presentable": false,
			"primaryKey": false,
			"required": false,
			"system": false,
			"type": "bool"
		}`)); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("meal_templates")
		if err != nil {
			return err
		}

		// Remove fields
		collection.Fields.RemoveById("relation_linked_meal")
		collection.Fields.RemoveById("bool_primary_group")

		return app.Save(collection)
	}, "1758924217")
}
