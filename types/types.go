package types

import (
	"encoding/json"
	"math"
	"time"

	"github.com/pocketbase/pocketbase/core"
)

type Collection = string

const (
	COL_MEAL_TEMPLATES Collection = "meal_templates"
	COL_MEAL_HISTORY   Collection = "meal_history"
	COL_ACTIVITY_LOGS  Collection = "activity_logs"
)

type MealTemplate struct {
	ID                        string    `json:"id,omitempty"`
	ImageURL                  string    `json:"image_url,omitempty"`
	Name                      string    `json:"meal_name"`
	UserContext               string    `json:"userContext"`
	AIDescription             string    `json:"ai_description"`
	TotalCalories             int       `json:"total_calories"`
	CalorieUncertaintyPercent int       `json:"calorie_uncertainty_percent"`
	TotalProteinG             int       `json:"total_protein_g"`
	ProteinUncertaintyPercent int       `json:"protein_uncertainty_percent"`
	TotalCarbsG               int       `json:"total_carbs_g"`
	CarbsUncertaintyPercent   int       `json:"carbs_uncertainty_percent"`
	TotalFatG                 int       `json:"total_fat_g"`
	FatUncertaintyPercent     int       `json:"fat_uncertainty_percent"`
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

type ActivityLog struct {
	ID              string    `json:"id,omitempty"`
	User            string    `json:"user"`
	ActivityType    string    `json:"activity_type"`
	Steps           int       `json:"steps,omitempty"`
	DurationMinutes int       `json:"duration_minutes,omitempty"`
	CaloriesBurned  int       `json:"calories_burned"`
	Created         time.Time `json:"created"`
	Updated         time.Time `json:"updated"`
}

func MealTemplateFromRecord(r *core.Record) MealTemplate {
	return MealTemplate{
		ID:                        r.GetString("id"),
		Name:                      r.GetString("name"),
		UserContext:               r.GetString("description"),
		AIDescription:             r.GetString("ai_description"),
		TotalCalories:             r.GetInt("total_calories"),
		CalorieUncertaintyPercent: r.GetInt("calorie_uncertainty_percent"),
		TotalProteinG:             r.GetInt("total_protein_g"),
		ProteinUncertaintyPercent: r.GetInt("protein_uncertainty_percent"),
		TotalCarbsG:               r.GetInt("total_carbs_g"),
		CarbsUncertaintyPercent:   r.GetInt("carbs_uncertainty_percent"),
		TotalFatG:                 r.GetInt("total_fat_g"),
		FatUncertaintyPercent:     r.GetInt("fat_uncertainty_percent"),
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

func ActivityLogFromRecord(r *core.Record) ActivityLog {
	return ActivityLog{
		ID:              r.GetString("id"),
		User:            r.GetString("user"),
		ActivityType:    r.GetString("activity_type"),
		Steps:           r.GetInt("steps"),
		DurationMinutes: r.GetInt("duration_minutes"),
		CaloriesBurned:  r.GetInt("calories_burned"),
		Created:         r.GetDateTime("created").Time(),
		Updated:         r.GetDateTime("updated").Time(),
	}
}

func (m *MealTemplate) UnmarshalJSON(data []byte) error {
	type Alias MealTemplate
	aux := &struct {
		TotalCalories             float64 `json:"total_calories"`
		CalorieUncertaintyPercent float64 `json:"calorie_uncertainty_percent"`
		TotalProteinG             float64 `json:"total_protein_g"`
		ProteinUncertaintyPercent float64 `json:"protein_uncertainty_percent"`
		TotalCarbsG               float64 `json:"total_carbs_g"`
		CarbsUncertaintyPercent   float64 `json:"carbs_uncertainty_percent"`
		TotalFatG                 float64 `json:"total_fat_g"`
		FatUncertaintyPercent     float64 `json:"fat_uncertainty_percent"`
		*Alias
	}{
		Alias: (*Alias)(m),
	}

	if err := json.Unmarshal(data, &aux); err != nil {
		return err
	}

	m.TotalCalories = int(math.Round(aux.TotalCalories))
	m.CalorieUncertaintyPercent = int(math.Round(aux.CalorieUncertaintyPercent))
	m.TotalProteinG = int(math.Round(aux.TotalProteinG))
	m.ProteinUncertaintyPercent = int(math.Round(aux.ProteinUncertaintyPercent))
	m.TotalCarbsG = int(math.Round(aux.TotalCarbsG))
	m.CarbsUncertaintyPercent = int(math.Round(aux.CarbsUncertaintyPercent))
	m.TotalFatG = int(math.Round(aux.TotalFatG))
	m.FatUncertaintyPercent = int(math.Round(aux.FatUncertaintyPercent))

	return nil
}
