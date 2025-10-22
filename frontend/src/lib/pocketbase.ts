import PocketBase from 'pocketbase'
import { SimilarMeal } from "../types/meal";
import { TypedPocketBase, UsersResponse } from "../types/pocketbase-types";

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL || 'http://localhost:8090') as TypedPocketBase

// Helper function to fetch similar meals
export const fetchSimilarMeals = async (mealId: string): Promise<SimilarMeal[]> => {
  try {
    const response = await fetch(`${pb.baseURL}/api/v1/similar/${mealId}`, {
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

// Use generated user type instead of custom interface
export type User = UsersResponse;
