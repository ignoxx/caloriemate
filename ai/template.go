package ai

import (
	"embed"
	"text/template"
)

//go:embed all:templates
var templateDir embed.FS

var (
	STAGE_SINGLE_PROMPT *template.Template
)

func LoadTemplates() {
	t3 := template.New("stage_single")

	stageSingle, err := templateDir.ReadFile("templates/single_stage_analyze.tmpl")
	if err != nil {
		panic(err)
	}

	STAGE_SINGLE_PROMPT = template.Must(t3.Parse(string(stageSingle)))
}
