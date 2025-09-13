export interface MealEntry {
  id: string;
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
