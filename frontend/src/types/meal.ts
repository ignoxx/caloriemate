export interface MealEntry {
  id: string;
  mealTemplateId?: string;
  name: string;
  userContext: string;
  aiDescription: string;
  totalCalories: number;
  calorieUncertaintyPercent: number;
  totalProteinG: number;
  proteinUncertaintyPercent: number;
  totalCarbsG: number;
  carbsUncertaintyPercent: number;
  totalFatG: number;
  fatUncertaintyPercent: number;
  imageUrl?: string;
  processingStatus: "pending" | "processing" | "completed" | "failed";
  created: string;
  updated: string;
}

export interface SimilarMeal {
  id: string;
  name: string;
  distance: number;
  total_calories: number;
  total_protein_g: number;
  total_carbs_g: number;
  total_fat_g: number;
  ai_description: string;
  image_url?: string;
  created: string;
}
