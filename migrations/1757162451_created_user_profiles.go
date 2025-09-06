package migrations

import (
	"encoding/json"

	"github.com/pocketbase/pocketbase/core"
	m "github.com/pocketbase/pocketbase/migrations"
)

func init() {
	m.Register(func(app core.App) error {
		jsonData := `{
			"createRule": null,
			"deleteRule": null,
			"fields": [
				{
					"autogeneratePattern": "[a-z0-9]{15}",
					"hidden": false,
					"id": "text3208210256",
					"max": 15,
					"min": 15,
					"name": "id",
					"pattern": "^[a-z0-9]+$",
					"presentable": false,
					"primaryKey": true,
					"required": true,
					"system": true,
					"type": "text"
				},
				{
					"cascadeDelete": true,
					"collectionId": "_pb_users_auth_",
					"hidden": false,
					"id": "relation2375276105",
					"maxSelect": 1,
					"minSelect": 0,
					"name": "user",
					"presentable": false,
					"required": false,
					"system": false,
					"type": "relation"
				},
				{
					"autogeneratePattern": "",
					"hidden": false,
					"id": "text3578368839",
					"max": 20,
					"min": 0,
					"name": "display_name",
					"pattern": "",
					"presentable": false,
					"primaryKey": false,
					"required": false,
					"system": false,
					"type": "text"
				},
				{
					"hidden": false,
					"id": "number2704281778",
					"max": 99,
					"min": null,
					"name": "age",
					"onlyInt": true,
					"presentable": false,
					"required": true,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "number2654930660",
					"max": null,
					"min": null,
					"name": "weight_kg",
					"onlyInt": false,
					"presentable": false,
					"required": true,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "number3310020690",
					"max": null,
					"min": null,
					"name": "height_cm",
					"onlyInt": true,
					"presentable": false,
					"required": true,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "select3343321666",
					"maxSelect": 1,
					"name": "gender",
					"presentable": false,
					"required": true,
					"system": false,
					"type": "select",
					"values": [
						"male",
						"female"
					]
				},
				{
					"hidden": false,
					"id": "select2229861024",
					"maxSelect": 1,
					"name": "activity_level",
					"presentable": false,
					"required": true,
					"system": false,
					"type": "select",
					"values": [
						"sedentary",
						"light",
						"moderate",
						"active",
						"very active"
					]
				},
				{
					"hidden": false,
					"id": "select4242336558",
					"maxSelect": 1,
					"name": "goal",
					"presentable": false,
					"required": true,
					"system": false,
					"type": "select",
					"values": [
						"lose_weight",
						"maintain",
						"gain_weight",
						"gain_muscle"
					]
				},
				{
					"hidden": false,
					"id": "number4291749736",
					"max": null,
					"min": null,
					"name": "target_calories",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "number2590397343",
					"max": null,
					"min": null,
					"name": "target_protein_g",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "number2240611292",
					"max": null,
					"min": null,
					"name": "target_carbs_g",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "number1382812534",
					"max": null,
					"min": null,
					"name": "target_fat_g",
					"onlyInt": false,
					"presentable": false,
					"required": false,
					"system": false,
					"type": "number"
				},
				{
					"hidden": false,
					"id": "autodate2990389176",
					"name": "created",
					"onCreate": true,
					"onUpdate": false,
					"presentable": false,
					"system": false,
					"type": "autodate"
				},
				{
					"hidden": false,
					"id": "autodate3332085495",
					"name": "updated",
					"onCreate": true,
					"onUpdate": true,
					"presentable": false,
					"system": false,
					"type": "autodate"
				}
			],
			"id": "pbc_2190040129",
			"indexes": [],
			"listRule": null,
			"name": "user_profiles",
			"system": false,
			"type": "base",
			"updateRule": null,
			"viewRule": null
		}`

		collection := &core.Collection{}
		if err := json.Unmarshal([]byte(jsonData), &collection); err != nil {
			return err
		}

		return app.Save(collection)
	}, func(app core.App) error {
		collection, err := app.FindCollectionByNameOrId("pbc_2190040129")
		if err != nil {
			return err
		}

		return app.Delete(collection)
	})
}
