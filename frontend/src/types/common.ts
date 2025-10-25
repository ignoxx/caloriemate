// Central types file for shared interfaces across the application
import type { 
  UserProfilesResponse, 
  MealTemplatesResponse, 
  MealHistoryResponse,
  ActivityLogsResponse,
  UserProfilesGenderOptions,
  UserProfilesActivityLevelOptions,
  UserProfilesGoalOptions,
  MealTemplatesProcessingStatusOptions
} from './pocketbase-types';

// Re-export generated types for better DX
export type UserProfile = UserProfilesResponse;
export type MealTemplate = MealTemplatesResponse;
export type MealHistoryEntry = MealHistoryResponse;
export type ActivityLog = ActivityLogsResponse;

// Type aliases for enums
export type Gender = UserProfilesGenderOptions;
export type ActivityLevel = UserProfilesActivityLevelOptions;
export type Goal = UserProfilesGoalOptions;
export type ProcessingStatus = MealTemplatesProcessingStatusOptions;

export interface UserGoals {
  target_calories: number
  target_protein_g: number
  weight: number
  age: number
}

export interface OnboardingData {
  age: number
  weight: number
  height: number
  gender: Gender
  activityLevel: ActivityLevel
  goal: Goal
  customCalories?: number
  customProtein?: number
}

export interface OnboardingFormData {
  age: string
  weight: string
  height: string
  gender: Gender
  activity: ActivityLevel
  goal: Goal
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

// Enhanced MealEntry that combines MealTemplate with MealHistory data
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
  processingStatus: ProcessingStatus;
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

