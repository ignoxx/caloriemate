import type React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Camera,
  Target,
  Zap,
  Send,
  User,
  History,
  Calendar,
  Footprints,
  Loader2,
} from "lucide-react";
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
import { ActivityLogModal } from "../components/activity-log-modal";
import { ActivityCard } from "../components/activity-card";
import { useAuth } from "../contexts/AuthContext";
import ProfilePage from "./ProfilePage";
import WeeklyHistoryPage from "./WeeklyHistoryPage";
import MealLibraryPage from "./MealLibraryPage";
import { UserGoals, OnboardingData, ActivityLog } from "../types/common";
import { MealEntry, SimilarMeal } from "../types/meal";
import { Collections, MealTemplatesProcessingStatusOptions } from "../types/pocketbase-types";

import pb from "../lib/pocketbase";

export default function CalorieTracker() {
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null);
  const [todayCalories, setTodayCalories] = useState(0);
  const [todayProtein, setTodayProtein] = useState(0);
  const [todayCaloriesBurned, setTodayCaloriesBurned] = useState(0);
  const [showMealReview, setShowMealReview] = useState(false);
  const [mealReviewMode, setMealReviewMode] = useState<"review" | "view">(
    "review",
  );
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null);
  const [mealHistory, setMealHistory] = useState<MealEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [mealDescription, setMealDescription] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showWeeklyHistory, setShowWeeklyHistory] = useState(false);
  const [showMealLibrary, setShowMealLibrary] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string>(
    new Date().toDateString(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedMealsRef = useRef(false);
  const hasLoadedProfileRef = useRef(false);
  const { user } = useAuth();

  // Load user profile from database
  const loadUserProfile = useCallback(async () => {
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
  }, [user]);

  // Load meal history from PocketBase
  const loadMealHistory = useCallback(async () => {
    try {
      const records = await pb.collection("meal_history").getList(1, 20, {
        sort: "-created",
        expand: "meal",
        filter: pb.filter(
          "adjustments != {:adjustment} && created > {:today}",
          {
            today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
            adjustment: "hidden",
          },
        ),
      });

      const meals: MealEntry[] = records.items.map((record) => {
        const recordData = record as Record<string, unknown>;
        const expandData = recordData.expand as Record<string, unknown>;
        const mealTemplate = expandData?.meal as Record<string, unknown>;
        const portionMultiplier =
          (recordData.portion_multiplier as number) || 1.0;

        return {
          id: record.id,
          mealHistoryId: record.id,
          mealTemplateId: (mealTemplate?.id as string) || "",
          name: (mealTemplate?.name as string) || "Unknown Meal",
          userContext: (mealTemplate?.description as string) || "",
          aiDescription: (mealTemplate?.ai_description as string) || "",
          totalCalories: Math.round(
            ((mealTemplate?.total_calories as number) || 0) *
              portionMultiplier +
              ((recordData.calorie_adjustment as number) || 0),
          ),
          calorieUncertaintyPercent:
            (mealTemplate?.calorie_uncertainty_percent as number) || 0,
          totalProteinG: Math.round(
            ((mealTemplate?.total_protein_g as number) || 0) *
              portionMultiplier +
              ((recordData.protein_adjustment as number) || 0),
          ),
          proteinUncertaintyPercent:
            (mealTemplate?.protein_uncertainty_percent as number) || 0,
          totalCarbsG: Math.round(
            ((mealTemplate?.total_carbs_g as number) || 0) * portionMultiplier +
              ((recordData.carb_adjustment as number) || 0),
          ),
          carbsUncertaintyPercent:
            (mealTemplate?.carbs_uncertainty_percent as number) || 0,
          totalFatG: Math.round(
            ((mealTemplate?.total_fat_g as number) || 0) * portionMultiplier +
              ((recordData.fat_adjustment as number) || 0),
          ),
          fatUncertaintyPercent:
            (mealTemplate?.fat_uncertainty_percent as number) || 0,
          imageUrl: mealTemplate?.image
            ? `${pb.baseURL}/api/files/meal_templates/${mealTemplate.id}/${mealTemplate.image}`
            : undefined,
          processingStatus: ((mealTemplate?.processing_status as string) ||
            "pending") as MealTemplatesProcessingStatusOptions,
          created: record.created,
          updated: record.updated,
          linkedMealTemplateId:
            (mealTemplate?.linked_meal_template_id as string) || undefined,
          isPrimaryInGroup:
            (mealTemplate?.is_primary_in_group as boolean) || false,
          portionMultiplier,
          calorieAdjustment: (recordData.calorie_adjustment as number) || 0,
          proteinAdjustment: (recordData.protein_adjustment as number) || 0,
          carbAdjustment: (recordData.carb_adjustment as number) || 0,
          fatAdjustment: (recordData.fat_adjustment as number) || 0,
        };
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todaysMeals = meals.filter((meal) => {
        const mealDate = new Date(meal.created);
        return mealDate >= todayStart;
      });

      setMealHistory((prevHistory) => {
        const optimisticEntries = prevHistory.filter((meal) =>
          meal.id.startsWith("temp_"),
        );

        const validOptimisticEntries = optimisticEntries.filter(
          (optimistic) => {
            return (
              !optimistic.mealTemplateId ||
              !todaysMeals.some(
                (real) => real.mealTemplateId === optimistic.mealTemplateId,
              )
            );
          },
        );

        const combinedMeals = [...validOptimisticEntries, ...todaysMeals].sort(
          (a, b) =>
            new Date(b.created).getTime() - new Date(a.created).getTime(),
        );

        const newlyCompletedMeals = todaysMeals.filter((meal) => {
          const wasProcessing = prevHistory.some(
            (prevMeal) =>
              prevMeal.mealTemplateId === meal.mealTemplateId &&
              prevMeal.processingStatus === "processing",
          );
          return meal.processingStatus === "completed" && wasProcessing;
        });

        if (newlyCompletedMeals.length > 0 && !selectedMeal) {
          const mostRecentCompleted = newlyCompletedMeals[0];
          setSelectedMeal(mostRecentCompleted);
          setMealReviewMode("review");
          setShowMealReview(true);
        }

        return combinedMeals;
      });

      const completedTodayMeals = todaysMeals.filter(
        (meal: MealEntry) => meal.processingStatus === "completed",
      );

      const totalCalories = completedTodayMeals.reduce(
        (sum, meal) => sum + meal.totalCalories,
        0,
      );
      const totalProtein = completedTodayMeals.reduce(
        (sum, meal) => sum + meal.totalProteinG,
        0,
      );

      setTodayCalories(totalCalories);
      setTodayProtein(totalProtein);
    } catch (error) {
      console.error("Failed to load meal history:", error);
    }
  }, []);

  const loadActivityLogs = useCallback(async () => {
    try {
      const records = await pb.collection(Collections.ActivityLogs).getList(1, 20, {
        sort: "-created",
        filter: pb.filter("created > {:today}", {
          today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        }),
      });

      const activities = records.items as unknown as ActivityLog[];
      setActivityLogs(activities);

      const totalBurned = activities.reduce(
        (sum, activity) => sum + activity.calories_burned,
        0,
      );
      setTodayCaloriesBurned(totalBurned);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
    }
  }, []);

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
  }, [mealHistory, loadMealHistory]);

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

        const tdee =
          bmr *
          activityMultipliers[
            data.activityLevel as keyof typeof activityMultipliers
          ];

        // Goal adjustment
        let calories = tdee;
        if (data.goal === "lose_weight") calories -= 500;
        if (data.goal === "gain_weight" || data.goal === "gain_muscle")
          calories += 500;

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

      await pb.collection(Collections.UserProfiles).create(profileData);

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
    if (!selectedImage || isSubmittingMeal) return;

    setIsSubmittingMeal(true);

    const tempId = `temp_${Date.now()}`;
    const imageUrl = URL.createObjectURL(selectedImage);

    // Create optimistic meal entry that appears immediately
    const optimisticMeal: MealEntry = {
      id: tempId,
      mealHistoryId: tempId, // Use tempId for optimistic entries
      mealTemplateId: "",
      name: mealDescription || "Analyzing meal...",
      userContext: mealDescription || "",
      aiDescription: "Analysis in progress...",
      totalCalories: 0,
      calorieUncertaintyPercent: 0,
      totalProteinG: 0,
      proteinUncertaintyPercent: 0,
      totalCarbsG: 0,
      carbsUncertaintyPercent: 0,
      totalFatG: 0,
      fatUncertaintyPercent: 0,
      imageUrl: imageUrl,
      processingStatus: MealTemplatesProcessingStatusOptions.processing,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };

    // Add optimistic entry to the beginning of meal history immediately
    setMealHistory((prev) => [optimisticMeal, ...prev]);

    try {
      const newMealTemplate = await pb.collection(Collections.MealTemplates).create({
        image: selectedImage,
        processing_status: "pending",
        description: mealDescription || "",
      });

      // Update the optimistic entry with the real ID and processing status
      setMealHistory((prev) =>
        prev.map((meal) =>
          meal.id === tempId
            ? {
                ...meal,
                id: newMealTemplate.id,
                mealTemplateId: newMealTemplate.id,
                processingStatus:
                  MealTemplatesProcessingStatusOptions.processing,
              }
            : meal,
        ),
      );

      setSelectedImage(null);
      setMealDescription("");

      // Clean up the temporary URL
      URL.revokeObjectURL(imageUrl);

      // Load fresh meal history to get any updates
      await loadMealHistory();
    } catch (error) {
      console.error("Error uploading image:", error);

      // Remove the optimistic entry on error
      setMealHistory((prev) => prev.filter((meal) => meal.id !== tempId));

      // Clean up the temporary URL
      URL.revokeObjectURL(imageUrl);
    } finally {
      setIsSubmittingMeal(false);
    }
  };

  const handleMealClick = (meal: MealEntry) => {
    if (meal.processingStatus === "completed") {
      setSelectedMeal(meal);
      setMealReviewMode("view"); // Set to view mode for existing meals
      setShowMealReview(true);
    }
  };

  const handleMealConfirmed = async (confirmedMeal: MealEntry) => {
    try {
      // Get the original template values to calculate adjustments
      if (confirmedMeal.mealTemplateId) {
        const template = await pb.collection('meal_templates').getOne(confirmedMeal.mealTemplateId);
        const portionMultiplier = confirmedMeal.portionMultiplier || 1;

        // Calculate adjustments as deltas from template values
        const calorieAdjustment = confirmedMeal.totalCalories - (template.total_calories * portionMultiplier);
        const proteinAdjustment = confirmedMeal.totalProteinG - (template.total_protein_g * portionMultiplier);
        const carbAdjustment = confirmedMeal.totalCarbsG - (template.total_carbs_g * portionMultiplier);
        const fatAdjustment = confirmedMeal.totalFatG - (template.total_fat_g * portionMultiplier);

        // Update meal_history with adjustments and mark as completed
        await pb.collection("meal_history").update(confirmedMeal.id, {
          processingStatus: "completed",
          calorie_adjustment: calorieAdjustment,
          protein_adjustment: proteinAdjustment,
          carb_adjustment: carbAdjustment,
          fat_adjustment: fatAdjustment,
        });

        // If name or description changed, update the template
        if (confirmedMeal.name !== template.name || confirmedMeal.aiDescription !== template.ai_description) {
          await pb.collection('meal_templates').update(confirmedMeal.mealTemplateId, {
            name: confirmedMeal.name,
            ai_description: confirmedMeal.aiDescription,
          });
        }
      } else {
        // Fallback if no template ID (shouldn't happen)
        await pb.collection("meal_history").update(confirmedMeal.id, {
          processingStatus: "completed",
        });
      }

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
      const newMealRecord = await pb.collection(Collections.MealHistory).create({
        meal: similarMeal.id,
        user: pb.authStore.record?.id,
        portion_multiplier: 1.0,
        adjustments: `Selected from similar meal: ${similarMeal.name}`,
      });

      console.log("Created meal history from similar meal:", newMealRecord);

      await loadMealHistory();
    } catch (error) {
      console.error("Error creating meal from similar meal:", error);
    }

    setShowMealReview(false);
    setSelectedMeal(null);
  };

  const handleActivitySubmit = async (data: {
    steps?: number;
    durationMinutes?: number;
    caloriesBurned: number;
  }) => {
    try {
      await pb.collection(Collections.ActivityLogs).create({
        user: user?.id,
        activity_type: "walking",
        steps: data.steps,
        duration_minutes: data.durationMinutes,
        calories_burned: data.caloriesBurned,
      });

      await loadActivityLogs();
    } catch (error) {
      console.error("Error logging activity:", error);
    }
  };

  // Check for daily reset and clear old data on mount
  useEffect(() => {
    const currentDate = new Date().toDateString();

    setMealHistory([]);
    setActivityLogs([]);
    setTodayCalories(0);
    setTodayProtein(0);
    setTodayCaloriesBurned(0);

    if (currentDate !== lastResetDate) {
      setLastResetDate(currentDate);
      hasLoadedMealsRef.current = false;
    }

    loadMealHistory();
    loadActivityLogs();
  }, [lastResetDate, loadMealHistory, loadActivityLogs]);

  // Set up interval to check for date changes (in case app stays open across midnight)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentDate = new Date().toDateString();
      if (currentDate !== lastResetDate) {
        setTodayCalories(0);
        setTodayProtein(0);
        setTodayCaloriesBurned(0);
        setMealHistory([]);
        setActivityLogs([]);
        setLastResetDate(currentDate);

        hasLoadedMealsRef.current = false;
        loadMealHistory();
        loadActivityLogs();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [lastResetDate, loadMealHistory, loadActivityLogs]);

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
  }, [user, loadMealHistory, loadUserProfile]);

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
    return (
      <OnboardingModal open={true} onComplete={handleOnboardingComplete} />
    );
  }

  if (showProfile) {
    return <ProfilePage onBack={() => setShowProfile(false)} />;
  }

  if (showWeeklyHistory) {
    return (
      <WeeklyHistoryPage
        onBack={() => setShowWeeklyHistory(false)}
        userGoals={userGoals}
      />
    );
  }

  if (showMealLibrary) {
    return (
      <MealLibraryPage
        onBack={() => setShowMealLibrary(false)}
        onMealLogged={() => {
          loadMealHistory();
        }}
      />
    );
  }

  const calorieProgress = userGoals
    ? ((todayCalories - todayCaloriesBurned) / userGoals.target_calories) * 100
    : 0;
  const proteinProgress = userGoals
    ? (todayProtein / userGoals.target_protein_g) * 100
    : 0;
  const isCalorieGoalMet = calorieProgress >= 100;
  const isProteinGoalMet = proteinProgress >= 100;
  const netCalories = todayCalories - todayCaloriesBurned;

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
                onClick={() => setShowMealLibrary(true)}
                title="My Meals"
              >
                <History className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowWeeklyHistory(true)}
                title="Weekly History"
              >
                <Calendar className="h-5 w-5" />
              </Button>
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
                    {netCalories} / {userGoals.target_calories}
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
              {todayCaloriesBurned > 0 && (
                <div className="flex justify-between items-center mt-1 text-xs text-muted-foreground">
                  <span>{todayCalories} consumed</span>
                  <span className="text-green-600">-{todayCaloriesBurned} burned</span>
                </div>
              )}
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

            {/* Log Activity Button */}
            <div className="pt-3 mt-1">
              <button
                onClick={() => setShowActivityModal(true)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-2 border border-border rounded-md hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30"
              >
                <Footprints className="h-4 w-4" />
                <span>Log walking activity</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        {/* <WeeklyActivity mealHistory={mealHistory} userGoals={userGoals} />*/}

        {/* Add Meal Button */}
        <Card className="overflow-hidden border-2">
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 pb-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Add New Meal</h3>
                <p className="text-xs text-muted-foreground">Snap and analyze instantly</p>
              </div>
            </div>

            <Button
              onClick={handleCameraCapture}
              className="w-full shadow-md"
              size="lg"
            >
              <Camera className="h-5 w-5 mr-2" />
              Take a Photo
            </Button>
          </div>

          <CardContent className="pt-4 space-y-4">
            {/* Show selected image preview */}
            {selectedImage && (
              <div className="relative">
                <div className="w-full h-40 rounded-lg overflow-hidden bg-muted border-2 border-dashed border-primary/30">
                  <img
                    src={URL.createObjectURL(selectedImage)}
                    alt="Selected meal"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-full shadow-lg">
                  ✓ Ready
                </div>
              </div>
            )}

            {/* Meal description textarea */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor="meal-description" className="text-sm font-medium">
                  Add Details
                </Label>
                <span className="text-xs text-muted-foreground">(Optional)</span>
              </div>
              <Textarea
                id="meal-description"
                placeholder="e.g., Grilled chicken 200g, brown rice, steamed broccoli..."
                value={mealDescription}
                onChange={(e) => setMealDescription(e.target.value)}
                rows={3}
                className="resize-none text-sm"
              />
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">
                <span className="text-sm">💡</span>
                <p>Include weight, ingredients, and cooking method for more accurate nutrition estimates</p>
              </div>
            </div>

            {/* Submit button - only show when image is selected */}
            {selectedImage && (
              <Button
                onClick={handleMealSubmission}
                disabled={isSubmittingMeal}
                className="w-full shadow-md"
                size="lg"
              >
                {isSubmittingMeal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Analyze My Meal
                  </>
                )}
              </Button>
            )}
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
                onMealRemoved={loadMealHistory}
              />
            ))}
          </div>
        )}

        {/* Today's Activities */}
        {activityLogs.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Footprints className="h-5 w-5 text-green-600" />
              Today's Activities
            </h2>
            {activityLogs.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
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
          mode={mealReviewMode}
          onMealConfirmed={handleMealConfirmed}
          onSimilarMealSelected={handleSimilarMealSelected}
          onMealRemoved={loadMealHistory}
          onMealUpdated={loadMealHistory}
          onClose={() => {
            setShowMealReview(false);
            setSelectedMeal(null);
          }}
        />
      )}

      {/* Activity Log Modal */}
      {userGoals && (
        <ActivityLogModal
          open={showActivityModal}
          onClose={() => setShowActivityModal(false)}
          onSubmit={handleActivitySubmit}
          userWeightKg={userGoals.weight}
        />
      )}
    </div>
  );
}
