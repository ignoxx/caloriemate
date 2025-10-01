import { MealTemplatesProcessingStatusOptions } from './pocketbase-types';

export interface MealEntry {
  id: string; // meal_history record ID
  mealHistoryId: string; // explicit meal history ID for clarity
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
  processingStatus: MealTemplatesProcessingStatusOptions;
  created: string;
  updated: string;
  linkedMealTemplateId?: string;
  isPrimaryInGroup?: boolean;
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
