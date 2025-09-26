import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Camera, Upload, Plus, Target, Zap, Send, User } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { OnboardingModal } from "../components/onboarding-modal";
import { MealReviewModal } from "../components/meal-review-modal";
import { MealHistoryCard } from "../components/meal-history-card";
// import { WeeklyActivity } from "../components/weekly-activity";
import { useAuth } from "../contexts/AuthContext";
import ProfilePage from "./ProfilePage";
import { UserGoals, MealEntry, OnboardingData } from "../types/common";
import { SimilarMeal } from "../types/meal";
import { MealTemplatesProcessingStatusOptions } from "../types/pocketbase-types";

import pb from "../lib/pocketbase";

export default function CalorieTracker() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [showMealReview, setShowMealReview] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null);
  const [mealHistory, setMealHistory] = useState<MealEntry[]>([]);
  const [mealDescription, setMealDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedMealsRef = useRef(false);
  const hasLoadedProfileRef = useRef(false);
  const { user } = useAuth();

  // Load user profile and check onboarding status
  useEffect(() => {
    if (user && !hasLoadedProfileRef.current) {
      hasLoadedProfileRef.current = true;
      loadUserProfile();
    }

    // Load meal history from PocketBase when component mounts
    if (!hasLoadedMealsRef.current) {
      hasLoadedMealsRef.current = true;
      loadMealHistory();
    }
  }, [user]);

  // Load user profile from database
  const loadUserProfile = async () => {
    try {
      if (!user) return;

      setIsLoadingProfile(true);
      console.log("Loading user profile for user:", user.id);
      
      const records = await pb.collection("user_profiles").getList(1, 1, {
        filter: `user = "${user.id}"`,
      });

      console.log("User profile query result:", records);

      if (records.items.length > 0) {
        const profile = records.items[0];
        console.log("Found user profile:", profile);
        const goals: UserGoals = {
          target_calories: profile.target_calories || 2000,
          target_protein_g: profile.target_protein_g || 150,
          weight: profile.weight_kg || 70, // Convert weight_kg to weight
          age: profile.age || 25,
        };
        setUserGoals(goals);
        setIsOnboarded(true);
        console.log("User is onboarded, setting goals:", goals);
      } else {
        // No profile found - user needs onboarding
        console.log("No user profile found - showing onboarding");
        setIsOnboarded(false);
      }
    } catch (error) {
      console.error("Failed to load user profile:", error);
      setIsOnboarded(false);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  // Load meal history from PocketBase
  const loadMealHistory = async () => {
    try {
      const records = await pb.collection("meal_history").getList(1, 50, {
        sort: "-created",
        created: `>${new Date(new Date().setHours(0, 0, 0, 0)).toISOString()}`,
        expand: "meal", // Expand the meal relation to get nutrition data
      });

      const meals: MealEntry[] = records.items.map((record) => {
        const recordData = record as Record<string, unknown>;
        const expandData = recordData.expand as Record<string, unknown>;
        const mealTemplate = expandData?.meal as Record<string, unknown>;
        const portionMultiplier = (recordData.portion_multiplier as number) || 1.0;
        
        return {
          id: record.id,
          mealTemplateId: (mealTemplate?.id as string) || "",
          name: (mealTemplate?.name as string) || "Unknown Meal",
          userContext: (mealTemplate?.description as string) || "",
          aiDescription: (mealTemplate?.ai_description as string) || "",
          totalCalories: Math.round(((mealTemplate?.total_calories as number) || 0) * portionMultiplier + ((recordData.calorie_adjustment as number) || 0)),
          calorieUncertaintyPercent: (mealTemplate?.calorie_uncertainty_percent as number) || 0,
          totalProteinG: Math.round(((mealTemplate?.total_protein_g as number) || 0) * portionMultiplier + ((recordData.protein_adjustment as number) || 0)),
          proteinUncertaintyPercent: (mealTemplate?.protein_uncertainty_percent as number) || 0,
          totalCarbsG: Math.round(((mealTemplate?.total_carbs_g as number) || 0) * portionMultiplier + ((recordData.carb_adjustment as number) || 0)),
          carbsUncertaintyPercent: (mealTemplate?.carbs_uncertainty_percent as number) || 0,
          totalFatG: Math.round(((mealTemplate?.total_fat_g as number) || 0) * portionMultiplier + ((recordData.fat_adjustment as number) || 0)),
          fatUncertaintyPercent: (mealTemplate?.fat_uncertainty_percent as number) || 0,
          imageUrl: mealTemplate?.image ? `${pb.baseURL}/api/files/meal_templates/${mealTemplate.id}/${mealTemplate.image}` : undefined,
          processingStatus: ((mealTemplate?.processing_status as string) || "pending") as MealTemplatesProcessingStatusOptions,
          created: record.created,
          updated: record.updated,
        };
      });

      setMealHistory(meals);

      // Calculate today's totals
      const today = new Date().toDateString();
      const todayMeals = meals.filter(
        (meal: MealEntry) =>
          new Date(meal.created).toDateString() === today &&
          meal.processingStatus === "completed",
      );

      const totalCalories = todayMeals.reduce(
        (sum, meal) => sum + meal.totalCalories,
        0,
      );
      const totalProtein = todayMeals.reduce(
        (sum, meal) => sum + meal.totalProteinG,
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
      (meal) => meal.processingStatus === "processing",
    );

    if (processingMeals.length > 0) {
      const interval = setInterval(() => {
        loadMealHistory();
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(interval);
    }
  }, [mealHistory]);

  const handleOnboardingComplete = async (data: OnboardingData) => {
    try {
      if (!user) throw new Error("No user found");

      console.log("Completing onboarding with data:", data);

      // Calculate default values using the same logic as onboarding components
      const calculateGoals = () => {
        const age = data.age;
        const weight = data.weight;
        const height = data.height;

        // Simple BMR calculation (Mifflin-St Jeor)
        let bmr: number;
        if (data.gender === "male") {
          bmr = 10 * weight + 6.25 * height - 5 * age + 5;
        } else {
          bmr = 10 * weight + 6.25 * height - 5 * age - 161;
        }

        // Activity multiplier
        const activityMultipliers = {
          sedentary: 1.2,
          light: 1.375,
          moderate: 1.55,
          active: 1.725,
          "very active": 1.9,
        };

        const tdee = bmr * activityMultipliers[data.activityLevel as keyof typeof activityMultipliers];

        // Goal adjustment
        let calories = tdee;
        if (data.goal === "lose_weight") calories -= 500;
        if (data.goal === "gain_weight" || data.goal === "gain_muscle") calories += 500;

        // Protein: 1.6-2.2g per kg body weight
        const protein = Math.round(weight * 1.8);

        return {
          calories: Math.round(calories),
          protein,
        };
      };

      const calculatedGoals = calculateGoals();

      // Create user profile in database
      const profileData = {
        user: user.id,
        target_calories: data.customCalories || calculatedGoals.calories,
        target_protein_g: data.customProtein || calculatedGoals.protein,
        weight_kg: data.weight,
        age: data.age,
        height_cm: data.height,
        gender: data.gender,
        activity_level: data.activityLevel,
        goal: data.goal,
      };

      console.log("Creating profile data:", profileData);

      await pb.collection("user_profiles").create(profileData);

      console.log("Profile created successfully");

      // Convert to UserGoals format for local state
      const goals: UserGoals = {
        target_calories: data.customCalories || calculatedGoals.calories,
        target_protein_g: data.customProtein || calculatedGoals.protein,
        weight: data.weight, // Note: this maps to weight_kg in DB
        age: data.age,
      };

      setUserGoals(goals);
      setIsOnboarded(true);
    } catch (error) {
      console.error("Failed to create user profile:", error);
    }
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
      setSelectedImage(file);
    }
  };

  const handleMealSubmission = async () => {
    if (!selectedImage) return;

    try {
      await pb.collection("meal_templates").create({
        image: selectedImage,
        processing_status: "pending",
        description: mealDescription || "",
      });

      setSelectedImage(null);
      setMealDescription("");
      await loadMealHistory();
    } catch (error) {
      console.error("Error uploading image:", error);
    }
  };

  const handleMealClick = (meal: MealEntry) => {
    if (meal.processingStatus === "completed") {
      setSelectedMeal(meal);
      setShowMealReview(true);
    }
  };

  const handleMealConfirmed = async (confirmedMeal: MealEntry) => {
    try {
      // Update the meal status in PocketBase
      await pb.collection("meal_history").update(confirmedMeal.id, {
        processingStatus: "completed",
      });

      // Refresh meal history
      await loadMealHistory();
    } catch (error) {
      console.error("Error confirming meal:", error);
    }

    setShowMealReview(false);
    setSelectedMeal(null);
  };

  const handleSimilarMealSelected = async (similarMeal: SimilarMeal) => {
    try {
      // Create new meal history record that references the meal template
      const newMealRecord = await pb.collection("meal_history").create({
        meal: similarMeal.id, // Reference to the meal_templates record
        user: pb.authStore.model?.id,
        portion_multiplier: 1.0, // Default to 1x portion
        adjustments: `Selected from similar meal: ${similarMeal.name}`,
      });

      console.log("Created meal history from similar meal:", newMealRecord);

      // Refresh meal history
      await loadMealHistory();
    } catch (error) {
      console.error("Error creating meal from similar meal:", error);
    }

    setShowMealReview(false);
    setSelectedMeal(null);
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return <OnboardingModal open={true} onComplete={handleOnboardingComplete} />;
  }

  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />;
  }

  const calorieProgress = userGoals
    ? (todayCalories / userGoals.target_calories) * 100
    : 0;
  const proteinProgress = userGoals
    ? (todayProtein / userGoals.target_protein_g) * 100
    : 0;
  const isCalorieGoalMet = calorieProgress >= 100;
  const isProteinGoalMet = proteinProgress >= 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
                <h1 className="text-2xl font-bold text-foreground">
                  CalorieMate
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Your personal nutrition assistant
                </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProfile(true)}
                title="Profile"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Daily Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calories */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-foreground">
                  Calories
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {todayCalories} / {userGoals.target_calories}
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
                <span className="text-sm font-medium text-foreground">
                  Protein
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {todayProtein}g / {userGoals?.target_protein_g}g
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
        <Card className="border-dashed border-2 border-muted-foreground/30 hover:border-primary/50 transition-colors">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-foreground mb-1">
                  Log Your Meal
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
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

              {/* Show selected image preview */}
              {selectedImage && (
                <div className="pt-4 border-t">
                  <div className="aspect-square w-32 mx-auto rounded-lg overflow-hidden bg-gray-100 mb-3">
                    <img
                      src={URL.createObjectURL(selectedImage)}
                      alt="Selected meal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    {selectedImage.name}
                  </p>
                </div>
              )}

              {/* Meal description textarea */}
              <div className="space-y-2 text-left">
                <Label htmlFor="meal-description" className="text-sm font-medium">
                  Meal Description (Optional)
                </Label>
                <Textarea
                  id="meal-description"
                  placeholder="Describe your meal, ingredients, or any additional context..."
                  value={mealDescription}
                  onChange={(e) => setMealDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Submit button - only show when image is selected */}
              {selectedImage && (
                <Button
                  onClick={handleMealSubmission}
                  className="w-full"
                  size="lg"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Meal for Analysis
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        {mealHistory.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-accent" />
              Today's Meals
            </h2>
            {mealHistory.map((meal) => (
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
      {selectedMeal && (
        <MealReviewModal
          meal={selectedMeal}
          open={showMealReview}
          onMealConfirmed={handleMealConfirmed}
          onSimilarMealSelected={handleSimilarMealSelected}
          onClose={() => {
            setShowMealReview(false);
            setSelectedMeal(null);
          }}
        />
      )}
    </div>
  );
}
