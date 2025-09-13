package types

type Meal struct {
	ID                        string `json:"id,omitempty"`
	Name                      string `json:"meal_name"`
	UserContext               string `json:"userContext"`
	AIDescription             string `json:"ai_description"`
	TotalCalories             int    `json:"total_calories"`
	CalorieUncertaintyPercent int    `json:"calorie_uncertainty_percent"`
	TotalProteinG             int    `json:"total_protein_g"`
	ProteinUncertaintyPercent int    `json:"protein_uncertainty_percent"`
	TotalCarbsG               int    `json:"total_carbs_g"`
	CarbsUncertaintyPercent   int    `json:"carbs_uncertainty_percent"`
	TotalFatG                 int    `json:"total_fat_g"`
	FatUncertaintyPercent     int    `json:"fat_uncertainty_percent"`
	AnalysisNotes             string `json:"analysis_notes"`
}
