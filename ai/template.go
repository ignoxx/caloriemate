package ai

import (
	"embed"
	"text/template"
)

//go:embed all:templates
var templateDir embed.FS

var (
	STAGE_A_PROMPT *template.Template
	STAGE_B_PROMPT *template.Template
)

func LoadTemplates() {
	t1 := template.New("stage_a")
	t2 := template.New("stage_b")

	stageA, err := templateDir.ReadFile("templates/stageA_image_analyze.tmpl")
	if err != nil {
		panic(err)
	}

	stageB, err := templateDir.ReadFile("templates/stageB_nutrition_analyze.tmpl")
	if err != nil {
		panic(err)
	}

	STAGE_A_PROMPT = template.Must(t1.Parse(string(stageA)))
	STAGE_B_PROMPT = template.Must(t2.Parse(string(stageB)))
}
