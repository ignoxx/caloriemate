package types

import (
	"time"

	"github.com/pocketbase/pocketbase/core"
)

type Collection = string

const (
	COL_MEAL_TEMPLATES Collection = "meal_templates"
	COL_MEAL_HISTORY   Collection = "meal_history"
)

type MealTemplate struct {
	ID                        string    `json:"id,omitempty"`
	ImageURL                  string    `json:"image_url,omitempty"`
	Name                      string    `json:"meal_name"`
	UserContext               string    `json:"userContext"`
	AIDescription             string    `json:"ai_description"`
	TotalCalories             float64   `json:"total_calories"`
	CalorieUncertaintyPercent float64   `json:"calorie_uncertainty_percent"`
	TotalProteinG             float64   `json:"total_protein_g"`
	ProteinUncertaintyPercent float64   `json:"protein_uncertainty_percent"`
	TotalCarbsG               float64   `json:"total_carbs_g"`
	CarbsUncertaintyPercent   float64   `json:"carbs_uncertainty_percent"`
	TotalFatG                 float64   `json:"total_fat_g"`
	FatUncertaintyPercent     float64   `json:"fat_uncertainty_percent"`
	AnalysisNotes             string    `json:"analysis_notes"`
	ProcessingStatus          string    `json:"processing_status,omitempty"`
	Created                   time.Time `json:"created"`
	Updated                   time.Time `json:"updated"`
}

type MealHistory struct {
	ID                string    `json:"id,omitempty"`
	MealID            string    `json:"meal"`
	User              string    `json:"user"`
	PortionMultiplier float64   `json:"portion_multiplier"`
	Adjustements      string    `json:"adjustements"`
	CalorieAdjustment float64   `json:"calorie_adjustment"`
	ProteinAdjustment float64   `json:"protein_adjustment"`
	CarbsAdjustment   float64   `json:"carbs_adjustment"`
	FatAdjustment     float64   `json:"fat_adjustment"`
	Name              string    `json:"meal_name,omitempty"`
	Created           time.Time `json:"created"`
	Updated           time.Time `json:"updated"`
}

type UserProfiles struct {
	ID       string    `json:"id,omitempty"`
	User     string    `json:"user"`
	Age      int       `json:"age"`
	WeightKg float64   `json:"weight_kg"`
	HeightCm float64   `json:"height_cm"`
	Gender   string    `json:"gender"`
	Activity string    `json:"activity"`
	Goal     string    `json:"goal"`
	Created  time.Time `json:"created"`
	Updated  time.Time `json:"updated"`
}

func MealTemplateFromRecord(r *core.Record) MealTemplate {
	return MealTemplate{
		ID:                        r.GetString("id"),
		Name:                      r.GetString("name"),
		UserContext:               r.GetString("description"),
		AIDescription:             r.GetString("ai_description"),
		TotalCalories:             r.GetFloat("total_calories"),
		CalorieUncertaintyPercent: r.GetFloat("calorie_uncertainty_percent"),
		TotalProteinG:             r.GetFloat("total_protein_g"),
		ProteinUncertaintyPercent: r.GetFloat("protein_uncertainty_percent"),
		TotalCarbsG:               r.GetFloat("total_carbs_g"),
		CarbsUncertaintyPercent:   r.GetFloat("carbs_uncertainty_percent"),
		TotalFatG:                 r.GetFloat("total_fat_g"),
		FatUncertaintyPercent:     r.GetFloat("fat_uncertainty_percent"),
		ProcessingStatus:          r.GetString("processing_status"),
		Created:                   r.GetDateTime("created").Time(),
		Updated:                   r.GetDateTime("updated").Time(),
	}
}

func MealHistoryFromRecord(r *core.Record) MealHistory {
	return MealHistory{
		ID:                r.GetString("id"),
		MealID:            r.GetString("meal"),
		User:              r.GetString("user"),
		PortionMultiplier: r.GetFloat("portion_multiplier"),
		Adjustements:      r.GetString("adjustements"),
		CalorieAdjustment: r.GetFloat("calorie_adjustment"),
		ProteinAdjustment: r.GetFloat("protein_adjustment"),
		CarbsAdjustment:   r.GetFloat("carbs_adjustment"),
		FatAdjustment:     r.GetFloat("fat_adjustment"),
		Name:              r.GetString("meal_name"),
		Created:           r.GetDateTime("created").Time(),
		Updated:           r.GetDateTime("updated").Time(),
	}
}
