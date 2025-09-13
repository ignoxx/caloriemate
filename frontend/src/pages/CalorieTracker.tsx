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
  const additionInformation = useRef<HTMLTextAreaElement>(null);
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
      const records = await pb.collection("user_profiles").getList(1, 1, {
        filter: `user = "${user.id}"`,
      });

      if (records.items.length > 0) {
        const profile = records.items[0];
        const goals: UserGoals = {
          target_calories: profile.target_calories || 2000,
          target_protein_g: profile.target_protein_g || 150,
          weight: profile.weight_kg || 70, // Convert weight_kg to weight
          age: profile.age || 25,
        };
        setUserGoals(goals);
        setIsOnboarded(true);
      } else {
        // No profile found - user needs onboarding
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
      });

      const meals = records.items.map((record: Record<string, any>) => ({
        id: record.id,
        name: record.name,
        userContext: record.userContext || "",
        aiDescription: record.aiDescription || "",
        totalCalories: record.totalCalories || 0,
        calorieUncertaintyPercent: record.calorieUncertaintyPercent || 0,
        totalProteinG: record.totalProteinG || 0,
        proteinUncertaintyPercent: record.proteinUncertaintyPercent || 0,
        totalCarbsG: record.totalCarbsG || 0,
        carbsUncertaintyPercent: record.carbsUncertaintyPercent || 0,
        totalFatG: record.totalFatG || 0,
        fatUncertaintyPercent: record.fatUncertaintyPercent || 0,
        imageUrl: record.image
          ? pb.files.getURL(record, record.image)
          : undefined,
        processingStatus: record.processingStatus || "pending",
        created: record.created,
        updated: record.updated,
      }));

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

      // Create user profile in database
      const profileData = {
        user: user.id,
        target_calories: data.customCalories || 2000,
        target_protein_g: data.customProtein || 150,
        weight_kg: data.weight,
        age: data.age,
        height_cm: data.height,
        gender: data.gender,
        activity_level: data.activityLevel,
        goal: data.goal,
      };

      await pb.collection("user_profiles").create(profileData);

      // Convert to UserGoals format for local state
      const goals: UserGoals = {
        target_calories: data.customCalories || 2000,
        target_protein_g: data.customProtein || 150,
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

  const handleImageCaptured = async (imageFile: File) => {
    setSelectedImage(imageFile);
  };

  const handleMealSubmission = async () => {
    if (!selectedImage) return;

    try {
      await pb.collection("meal_templates").create({
        image: selectedImage,
        processingStatus: "pending",
        userContext: mealDescription || "",
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
    return <OnboardingModal onComplete={handleOnboardingComplete} />;
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
