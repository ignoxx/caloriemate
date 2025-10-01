package types

type Meal struct {
	ID                        string  `json:"id,omitempty"`
	Name                      string  `json:"meal_name"`
	UserContext               string  `json:"userContext"`
	AIDescription             string  `json:"ai_description"`
	TotalCalories             float32 `json:"total_calories"`
	CalorieUncertaintyPercent float32 `json:"calorie_uncertainty_percent"`
	TotalProteinG             float32 `json:"total_protein_g"`
	ProteinUncertaintyPercent float32 `json:"protein_uncertainty_percent"`
	TotalCarbsG               float32 `json:"total_carbs_g"`
	CarbsUncertaintyPercent   float32 `json:"carbs_uncertainty_percent"`
	TotalFatG                 float32 `json:"total_fat_g"`
	FatUncertaintyPercent     float32 `json:"fat_uncertainty_percent"`
	AnalysisNotes             string  `json:"analysis_notes"`
}
