package handlers

import (
	"net/http"

	"github.com/ignoxx/caloriemate/ai/clip"
	"github.com/ignoxx/caloriemate/ai/ollama"
	"github.com/pocketbase/pocketbase/core"
)

func HandleMealSubmit(e *core.RequestEvent) error {
	ollama := ollama.New()
	clip := clip.New()

	return e.JSON(http.StatusOK, map[string]bool{"success": true})
}


func HandleProfileCreate(e *core.RequestEvent) error {
	buildID := e.Request.PathValue("buildID")

	record, err := e.App.FindRecordById("builds", buildID)
	if err != nil {
		return err
	}

	copies, ok := record.Get("copies").(float64)
	if !ok {
		return e.JSON(http.StatusInternalServerError, map[string]string{"success": "false"})
	}

	record.Set("copies", copies+1)
	if err := e.App.Save(record); err != nil {
		return err
	}

	return e.JSON(http.StatusOK, map[string]bool{"success": true})
}
