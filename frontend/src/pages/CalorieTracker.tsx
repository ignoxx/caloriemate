import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Plus, Target, Zap, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { OnboardingModal } from "../components/onboarding-modal";
import { MealReviewModal } from "../components/meal-review-modal";
import { MealHistoryCard } from "../components/meal-history-card";
// import { WeeklyActivity } from "../components/weekly-activity";
import { ThemeToggle } from "../components/theme-toggle";
import { useAuth } from "../contexts/AuthContext";

import pb from "../lib/pocketbase";

interface UserGoals {
  calories: number;
  protein: number;
  weight: number;
  age: number;
}

interface MealEntry {
  id: string;
  meal_name: string;
  ai_description: string;
  total_calories: number;
  calorie_uncertainty_percent: number;
  total_protein_g: number;
  protein_uncertainty_percent: number;
  total_carbs_g: number;
  carbs_uncertainty_percent: number;
  total_fat_g: number;
  fat_uncertainty_percent: number;
  analysis_notes: string;
  imageUrl?: string;
  processing_status: "pending" | "processing" | "completed" | "failed";
  created: string;
  updated: string;
}

export default function CalorieTracker() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [showMealReview, setShowMealReview] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null);
  const [mealHistory, setMealHistory] = useState<MealEntry[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { logout } = useAuth();

  // Check if user is onboarded
  useEffect(() => {
    const savedGoals = localStorage.getItem("userGoals");

    if (savedGoals) {
      setUserGoals(JSON.parse(savedGoals));
      setIsOnboarded(true);
    }

    // Load meal history from PocketBase when component mounts
    loadMealHistory();
  }, []);

  // Load meal history from PocketBase
  const loadMealHistory = async () => {
    try {
      const records = await pb.collection("meal_history").getList(1, 50, {
        sort: "-created",
      });

      const meals = records.items.map((record: Record<string, any>) => ({
        id: record.id,
        meal_name: record.meal_name || "Analyzing meal...",
        ai_description: record.ai_description || "",
        total_calories: record.total_calories || 0,
        calorie_uncertainty_percent: record.calorie_uncertainty_percent || 0,
        total_protein_g: record.total_protein_g || 0,
        protein_uncertainty_percent: record.protein_uncertainty_percent || 0,
        total_carbs_g: record.total_carbs_g || 0,
        carbs_uncertainty_percent: record.carbs_uncertainty_percent || 0,
        total_fat_g: record.total_fat_g || 0,
        fat_uncertainty_percent: record.fat_uncertainty_percent || 0,
        analysis_notes: record.analysis_notes || "",
        imageUrl: record.image
          ? pb.files.getURL(record, record.image)
          : undefined,
        processing_status: record.processing_status || "pending",
        created: record.created,
        updated: record.updated,
      }));

      setMealHistory(meals);

      // Calculate today's totals
      const today = new Date().toDateString();
      const todayMeals = meals.filter(
        (meal: MealEntry) =>
          new Date(meal.created).toDateString() === today &&
          meal.processing_status === "completed",
      );

      const totalCalories = todayMeals.reduce(
        (sum, meal) => sum + meal.total_calories,
        0,
      );
      const totalProtein = todayMeals.reduce(
        (sum, meal) => sum + meal.total_protein_g,
        0,
      );

      setTodayCalories(totalCalories);
      setTodayProtein(totalProtein);
    } catch (error) {
      console.error("Failed to load meal history:", error);
    }
  };

  // Poll for processing status updates
  useEffect(() => {
    const processingMeals = mealHistory.filter(
      (meal) => meal.processing_status === "processing",
    );

    if (processingMeals.length > 0) {
      const interval = setInterval(() => {
        loadMealHistory();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [mealHistory]);

  const handleOnboardingComplete = (goals: UserGoals) => {
    setUserGoals(goals);
    setIsOnboarded(true);
    localStorage.setItem("userGoals", JSON.stringify(goals));
  };

  const handleCameraCapture = async () => {
    try {
      // For now, fallback to file upload as camera capture would need more complex implementation
      fileInputRef.current?.click();
    } catch (error) {
      console.error("Camera access denied:", error);
      // Fallback to file upload
      fileInputRef.current?.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImageCaptured(file);
    }
  };

  const handleImageCaptured = async (imageFile: File) => {
    try {
      // Create FormData for file upload
      // const formData = new FormData();
      // formData.append("image", imageFile);
      // formData.append("processing_status", "pending");
      // formData.append("meal_name", "Analyzing meal...");

      // Upload to PocketBase
      // await pb.collection("meal_history").create(formData);

      await pb.collection("meal_templates").create({
        image: imageFile,
        name: "Pending...",
        processing_status: "pending"
      });

      // Refresh meal history to show the new meal
      await loadMealHistory();
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleMealClick = (meal: MealEntry) => {
    if (meal.processing_status === "completed") {
      setSelectedMeal(meal);
      setShowMealReview(true);
    }
  };

  const handleMealConfirmed = async (confirmedMeal: MealEntry) => {
    try {
      // Update the meal status in PocketBase
      await pb.collection("meal_history").update(confirmedMeal.id, {
        processing_status: "completed",
      });

      // Refresh meal history
      await loadMealHistory();
    } catch (error) {
      console.error("Error confirming meal:", error);
    }

    setShowMealReview(false);
    setSelectedMeal(null);
  };

  if (!isOnboarded) {
    return <OnboardingModal onComplete={handleOnboardingComplete} />;
  }

  const calorieProgress = userGoals
    ? (todayCalories / userGoals.calories) * 100
    : 0;
  const proteinProgress = userGoals
    ? (todayProtein / userGoals.protein) * 100
    : 0;
  const isCalorieGoalMet = calorieProgress >= 100;
  const isProteinGoalMet = proteinProgress >= 100;

  const todayMeals = mealHistory.filter(
    (meal) =>
      new Date(meal.created).toDateString() === new Date().toDateString(),
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                CalorieMate
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Your personal nutrition assistant
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Daily Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calories */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Calories
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {todayCalories} / {userGoals?.calories}
                  </span>
                  {isCalorieGoalMet && (
                    <Badge variant="secondary" className="text-xs">
                      Goal Met!
                    </Badge>
                  )}
                </div>
              </div>
              <Progress
                value={Math.min(calorieProgress, 100)}
                className="h-2"
              />
            </div>

            {/* Protein */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Protein
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {todayProtein}g / {userGoals?.protein}g
                  </span>
                  {isProteinGoalMet && (
                    <Badge variant="secondary" className="text-xs">
                      Goal Met!
                    </Badge>
                  )}
                </div>
              </div>
              <Progress
                value={Math.min(proteinProgress, 100)}
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        {/* <WeeklyActivity mealHistory={mealHistory} userGoals={userGoals} />*/}

        {/* Add Meal Button */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                  Log Your Meal
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Take a photo to get started
                </p>
              </div>
              <div className="space-y-2">
                <Button
                  onClick={handleCameraCapture}
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                  size="lg"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        {todayMeals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Today's Meals
            </h2>
            {todayMeals.map((meal) => (
              <MealHistoryCard
                key={meal.id}
                meal={meal}
                onClick={() => handleMealClick(meal)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Meal Review Modal */}
      {showMealReview && selectedMeal && (
        <MealReviewModal
          meal={selectedMeal}
          onMealConfirmed={handleMealConfirmed}
          onClose={() => {
            setShowMealReview(false);
            setSelectedMeal(null);
          }}
        />
      )}
    </div>
  );
}
