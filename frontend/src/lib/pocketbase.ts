import PocketBase from 'pocketbase'
import { SimilarMeal } from "../types/meal";

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090')

// Helper function to fetch similar meals
export const fetchSimilarMeals = async (mealId: string): Promise<SimilarMeal[]> => {
  try {
    const response = await fetch(`${pb.baseURL}/api/collections/meal_templates/records/${mealId}/similar`, {
      headers: {
        'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch similar meals');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching similar meals:', error);
    return [];
  }
};

export default pb

// Type definitions for user record
export interface User {
  id: string
  email: string
  username?: string
  name?: string
  avatar?: string
  created: string
  updated: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow additional properties from PocketBase
}
