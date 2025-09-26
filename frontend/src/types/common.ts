// Central types file for shared interfaces across the application

// PocketBase record interface
export interface PBRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export interface UserGoals {
  target_calories: number
  target_protein_g: number
  weight: number
  age: number
}

export interface UserProfile {
  id?: string
  user?: string
  target_calories: number
  target_protein_g: number
  target_carbs_g?: number
  target_fat_g?: number
  weight_kg: number
  age: number
  height_cm: number
  gender: 'male' | 'female'
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very active'
  goal: 'lose_weight' | 'maintain' | 'gain_weight' | 'gain_muscle'
  display_name?: string
  created?: string
  updated?: string
}

export interface OnboardingData {
  age: number
  weight: number
  height: number
  gender: 'male' | 'female'
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very active'
  goal: 'lose_weight' | 'maintain' | 'gain_weight' | 'gain_muscle'
  customCalories?: number
  customProtein?: number
}

export interface OnboardingFormData {
  age: string
  weight: string
  height: string
  gender: 'male' | 'female'
  activity: 'sedentary' | 'light' | 'moderate' | 'active' | 'very active'
  goal: 'lose_weight' | 'maintain' | 'gain_weight' | 'gain_muscle'
  customCalories: string
  customProtein: string
}

export interface SignupData {
  email: string;
  password: string;
  passwordConfirm: string;
  name?: string;
  userGoals?: UserGoals;
  onboardingData?: OnboardingData;
}

export interface MealEntry {
  id: string;
  mealTemplateId?: string; // ID of the referenced meal_templates record
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

export interface FoodMatch {
  id: string;
  name: string;
  calories: number;
  protein: number;
  source: "user" | "openfoodfacts";
  confidence: number;
  lastEaten?: Date;
}

// Legacy MealEntry interface for food-recognition-modal
export interface LegacyMealEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  timestamp: Date;
  imageUrl?: string;
  description?: string;
}

