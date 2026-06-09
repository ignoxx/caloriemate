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
  Loader2,
  Repeat,
  X,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { OnboardingModal } from "../components/onboarding-modal";
import { MealReviewModal } from "../components/meal-review-modal";
import { MealHistoryCard } from "../components/meal-history-card";
import { useAuth } from "../contexts/AuthContext";
import ProfilePage from "./ProfilePage";
import WeeklyHistoryPage from "./WeeklyHistoryPage";
import MealLibraryPage from "./MealLibraryPage";
import { UserGoals, OnboardingData } from "../types/common";
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageContext, setImageContext] = useState("");
  const [contextImages, setContextImages] = useState<Array<{ id: string; file: File; previewUrl: string; note: string }>>([]);
  const [activeImageCard, setActiveImageCard] = useState(0);
  const [dragNavIndex, setDragNavIndex] = useState<number | null>(null);
  const [dragNavPosition, setDragNavPosition] = useState<number | null>(null);
  const [isNavDragging, setIsNavDragging] = useState(false);
  const [reanalyzingMealId, setReanalyzingMealId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showWeeklyHistory, setShowWeeklyHistory] = useState(false);
  const [showMealLibrary, setShowMealLibrary] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isSubmittingMeal, setIsSubmittingMeal] = useState(false);
  const [lastResetDate, setLastResetDate] = useState<string>(
    new Date().toDateString(),
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contextFileInputRef = useRef<HTMLInputElement>(null);
  const imageCarouselRef = useRef<HTMLDivElement>(null);
  const bottomNavRef = useRef<HTMLDivElement>(null);
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
            ? pb.files.getURL(
                { id: mealTemplate.id as string, collectionId: '', collectionName: 'meal_templates' },
                mealTemplate.image as string,
                { thumb: '100x100' }
              )
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
    if (!user) {
      setTodayCaloriesBurned(0);
      return;
    }

    try {
      const records = await pb.collection(Collections.ActivityLogs).getList(1, 20, {
        sort: "-created",
        filter: pb.filter("user = {:user} && created > {:today}", {
          user: user.id,
          today: new Date(new Date().setHours(0, 0, 0, 0)).toISOString(),
        }),
      });

      const totalBurned = records.items.reduce(
        (sum, activity) => sum + activity.calories_burned,
        0,
      );
      setTodayCaloriesBurned(totalBurned);
    } catch (error) {
      console.error("Failed to load activity logs:", error);
    }
  }, [user]);

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

  const clearSelectedImages = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    contextImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    setSelectedImage(null);
    setImagePreviewUrl(null);
    setImageContext("");
    setContextImages([]);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      clearSelectedImages();
      const newUrl = URL.createObjectURL(file);
      setSelectedImage(file);
      setImagePreviewUrl(newUrl);
    }
  };

  const handleContextFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedImage) return;
    const files = Array.from(event.target.files ?? []).slice(0, Math.max(0, 5 - contextImages.length));
    if (files.length === 0) return;

    const firstNewIndex = contextImages.length + 1;
    setContextImages((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: `${file.name}_${Date.now()}_${Math.random()}`,
        file,
        previewUrl: URL.createObjectURL(file),
        note: "",
      })),
    ]);
    event.target.value = "";
    scrollImageCardIntoView(firstNewIndex);
  };

  const updateContextNote = (id: string, note: string) => {
    setContextImages((prev) => prev.map((image) => image.id === id ? { ...image, note } : image));
  };

  const removeContextImage = (id: string) => {
    setContextImages((prev) => {
      const image = prev.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return prev.filter((item) => item.id !== id);
    });
  };

  const scrollImageCardIntoView = (index: number) => {
    requestAnimationFrame(() => {
      imageCarouselRef.current
        ?.querySelector<HTMLElement>(`[data-image-card="${index}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    });
  };

  const handleImageCarouselScroll = () => {
    const carousel = imageCarouselRef.current;
    if (!carousel) return;

    const carouselCenter = carousel.scrollLeft + carousel.clientWidth / 2;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    carousel.querySelectorAll<HTMLElement>("[data-image-card]").forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const distance = Math.abs(carouselCenter - cardCenter);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = Number(card.dataset.imageCard ?? 0);
      }
    });

    setActiveImageCard(closestIndex);
  };

  const imageCardClass = (index: number, base: string) =>
    `${base} transition-all duration-300 ease-out ${
      activeImageCard === index
        ? "opacity-100 scale-100 blur-0 shadow-lg"
        : "opacity-45 scale-95 blur-[1px]"
    }`;

  const handleMealSubmission = async () => {
    if (!selectedImage || isSubmittingMeal) return;

    setIsSubmittingMeal(true);

    const tempId = `temp_${Date.now()}`;
    const imageUrl = imagePreviewUrl || "";

    try {
      if (reanalyzingMealId) {
        // RE-ANALYZE: Update existing meal template
        const formData = new FormData();
        formData.append("image", selectedImage);
        formData.append("image_context", imageContext || "");
        formData.append("description", "");
        formData.append("processing_status", "pending");
        contextImages.forEach((image) => formData.append("context_images", image.file));
        formData.append("context_notes", JSON.stringify(contextImages.map((image) => ({ filename: image.file.name, note: image.note }))));

        await pb.collection(Collections.MealTemplates).update(reanalyzingMealId, formData);

        // Update the existing entry in meal history to show processing status
        setMealHistory((prev) =>
          prev.map((meal) =>
            meal.mealTemplateId === reanalyzingMealId
              ? {
                  ...meal,
                  processingStatus: MealTemplatesProcessingStatusOptions.processing,
                  userContext: imageContext || "",
                }
              : meal,
          ),
        );

        clearSelectedImages();
        setReanalyzingMealId(null);

        // Load fresh meal history to get any updates
        await loadMealHistory();
      } else {
        // NEW MEAL: Create optimistic meal entry that appears immediately
        const optimisticMeal: MealEntry = {
          id: tempId,
          mealHistoryId: tempId,
          mealTemplateId: "",
          name: imageContext || "Analyzing meal...",
          userContext: imageContext || "",
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

        const formData = new FormData();
        formData.append("image", selectedImage);
        formData.append("image_context", imageContext || "");
        formData.append("processing_status", "pending");
        formData.append("description", "");
        contextImages.forEach((image) => formData.append("context_images", image.file));
        formData.append("context_notes", JSON.stringify(contextImages.map((image) => ({ filename: image.file.name, note: image.note }))));

        const newMealTemplate = await pb.collection(Collections.MealTemplates).create(formData);

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

        clearSelectedImages();

        // Load fresh meal history to get any updates
        await loadMealHistory();
      }
    } catch (error) {
      console.error("Error uploading image:", error);

      if (!reanalyzingMealId) {
        // Remove the optimistic entry on error (only for new meals)
        setMealHistory((prev) => prev.filter((meal) => meal.id !== tempId));
      }

      // Keep selected images so user can retry or adjust notes
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

        await pb.collection("meal_history").update(confirmedMeal.id, {
          processingStatus: "completed",
          portion_multiplier: portionMultiplier,
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

  const handleMealReanalyze = async (meal: MealEntry) => {
    try {
      if (!meal.mealTemplateId) {
        console.error("Cannot re-analyze meal without template ID");
        return;
      }

      const template = await pb.collection(Collections.MealTemplates).getOne(meal.mealTemplateId);

      if (!template.image) {
        console.error("Cannot re-analyze meal without image");
        return;
      }

      const imageUrl = pb.files.getURL(
        { id: meal.mealTemplateId, collectionId: '', collectionName: 'meal_templates' },
        template.image
      );

      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const file = new File([blob], template.image, { type: blob.type });

      clearSelectedImages();
      const newUrl = URL.createObjectURL(file);

      setSelectedImage(file);
      setImagePreviewUrl(newUrl);
      setImageContext((template as any).image_context || meal.userContext || template.description || '');
      setReanalyzingMealId(meal.mealTemplateId);

      setShowMealReview(false);
      setSelectedMeal(null);

      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error("Error preparing meal for re-analysis:", error);
    }
  };

  // Check for daily reset and clear old data on mount
  useEffect(() => {
    const currentDate = new Date().toDateString();

    setMealHistory([]);
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

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  useEffect(() => {
    if (!selectedImage || !imagePreviewUrl) return;
    setActiveImageCard(0);
    scrollImageCardIntoView(0);
  }, [imagePreviewUrl, selectedImage]);

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

  const openTrack = () => {
    setShowProfile(false);
    setShowWeeklyHistory(false);
    setShowMealLibrary(false);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const activeNavIndex = showMealLibrary ? 1 : showWeeklyHistory ? 2 : showProfile ? 3 : 0;
  const displayedNavIndex = dragNavIndex ?? activeNavIndex;
  const displayedNavPosition = dragNavPosition ?? activeNavIndex;

  const openNavIndex = (index: number) => {
    if (index === 0) {
      openTrack();
      return;
    }

    setShowMealLibrary(index === 1);
    setShowWeeklyHistory(index === 2);
    setShowProfile(index === 3);
  };

  const navPointerState = (clientX: number) => {
    const nav = bottomNavRef.current;
    if (!nav) return { index: activeNavIndex, position: activeNavIndex };

    const rect = nav.getBoundingClientRect();
    const segment = rect.width / 4;
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width - 1);
    const rawPosition = x / segment - 0.5;
    const position = Math.min(3, Math.max(0, rawPosition));
    const index = Math.min(3, Math.max(0, Math.round(position)));
    return { index, position };
  };

  const handleNavPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const { index, position } = navPointerState(event.clientX);
    setIsNavDragging(true);
    setDragNavIndex(index);
    setDragNavPosition(position);
  };

  const handleNavPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isNavDragging) return;
    const { index, position } = navPointerState(event.clientX);
    setDragNavIndex(index);
    setDragNavPosition(position);
  };

  const handleNavPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const { index } = navPointerState(event.clientX);
    setIsNavDragging(false);
    setDragNavIndex(null);
    setDragNavPosition(null);
    openNavIndex(index);
  };

  const handleNavPointerCancel = () => {
    setIsNavDragging(false);
    setDragNavIndex(null);
    setDragNavPosition(null);
  };

  const navButtonClass = (index: number) =>
    `relative z-10 flex flex-col items-center gap-0.5 rounded-[1.5rem] px-2 py-2 transition-colors ${
      displayedNavIndex === index ? "text-primary" : "text-muted-foreground"
    }`;

  const bottomNav = (
    <nav className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 flex justify-center px-4">
      <div
        ref={bottomNavRef}
        onPointerDown={handleNavPointerDown}
        onPointerMove={handleNavPointerMove}
        onPointerUp={handleNavPointerUp}
        onPointerCancel={handleNavPointerCancel}
        className="pointer-events-auto relative grid w-full max-w-sm touch-none select-none grid-cols-4 overflow-hidden rounded-[2rem] border border-white/20 bg-background/55 p-1.5 shadow-2xl shadow-black/25 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/45 dark:border-white/10 dark:bg-white/10"
      >
        <div
          className={`absolute bottom-1.5 top-1.5 rounded-[1.5rem] border border-white/20 bg-primary/20 shadow-lg shadow-primary/20 backdrop-blur-xl will-change-transform transition-transform ${isNavDragging ? "duration-150 ease-out" : "duration-500"}`}
          style={{
            left: "0.375rem",
            width: "calc((100% - 0.75rem) / 4)",
            transform: `translate3d(${displayedNavPosition * 100}%, 0, 0) scale(${isNavDragging ? 1.04 : 1})`,
            transitionTimingFunction: isNavDragging ? "cubic-bezier(0.2, 0.9, 0.2, 1)" : "cubic-bezier(0.2, 1.25, 0.2, 1)",
          }}
        />
        <button type="button" className={navButtonClass(0)} aria-label="Track">
          <Camera className="h-5 w-5" />
          <span className="text-[11px] font-medium">Track</span>
        </button>
        <button type="button" className={navButtonClass(1)} aria-label="Meals">
          <History className="h-5 w-5" />
          <span className="text-[11px] font-medium">Meals</span>
        </button>
        <button type="button" className={navButtonClass(2)} aria-label="History">
          <Calendar className="h-5 w-5" />
          <span className="text-[11px] font-medium">History</span>
        </button>
        <button type="button" className={navButtonClass(3)} aria-label="Profile">
          <User className="h-5 w-5" />
          <span className="text-[11px] font-medium">Profile</span>
        </button>
      </div>
    </nav>
  );

  if (showProfile) {
    return (
      <>
        <ProfilePage onBack={openTrack} />
        {bottomNav}
      </>
    );
  }

  if (showWeeklyHistory) {
    return (
      <>
        <WeeklyHistoryPage onBack={openTrack} userGoals={userGoals} />
        {bottomNav}
      </>
    );
  }

  if (showMealLibrary) {
    return (
      <>
        <MealLibraryPage
          onBack={openTrack}
          onMealLogged={() => {
            loadMealHistory();
          }}
        />
        {bottomNav}
      </>
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
    <div className="relative min-h-screen overflow-hidden bg-background pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.20),transparent_36%),radial-gradient(circle_at_15%_45%,hsl(var(--primary)/0.10),transparent_28%)]" />
      <div className="relative max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Daily Progress */}
        <Card className="overflow-hidden border-white/10 bg-card/80 shadow-xl shadow-black/10 backdrop-blur">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary">
                  <Target className="h-4 w-4" />
                  <p className="text-sm font-semibold">Today</p>
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <p className="text-4xl font-black tracking-tight text-foreground">{netCalories}</p>
                  <p className="pb-1 text-xs font-medium text-muted-foreground">kcal net</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Goal {userGoals.target_calories} kcal</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-muted/80 px-2.5 py-1 text-muted-foreground">{todayCalories} eaten</span>
                  {todayCaloriesBurned > 0 && (
                    <span className="rounded-full bg-primary/15 px-2.5 py-1 font-medium text-primary">-{todayCaloriesBurned} burned</span>
                  )}
                </div>
              </div>
              <div
                className="grid h-20 w-20 shrink-0 place-items-center rounded-full shadow-inner"
                style={{ background: `conic-gradient(hsl(var(--primary)) ${Math.min(Math.max(calorieProgress, 0), 100)}%, hsl(var(--muted)) 0)` }}
              >
                <div className="grid h-14 w-14 place-items-center rounded-full bg-card text-center">
                  <span className="text-sm font-bold">{Math.round(Math.min(Math.max(calorieProgress, 0), 100))}%</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-muted/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Protein</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{todayProtein}g / {userGoals?.target_protein_g}g</span>
                  {isProteinGoalMet && <Badge variant="secondary" className="text-xs">Goal</Badge>}
                </div>
              </div>
              <Progress value={Math.min(proteinProgress, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        {/* <WeeklyActivity mealHistory={mealHistory} userGoals={userGoals} />*/}

        {/* Add Meal Button */}
        <Card className={`border-2 bg-gradient-to-b from-primary/10 via-primary/5 to-transparent ${selectedImage ? "" : "min-h-[42dvh]"}`}>
          <div className="p-6 pb-4">
            {reanalyzingMealId && (
              <div className="mb-4 flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-md text-sm border border-blue-200 dark:border-blue-800">
                <Repeat className="h-4 w-4" />
                <span className="font-medium">Re-analyzing meal</span>
                 <button
                  onClick={() => {
                    setReanalyzingMealId(null);
                    clearSelectedImages();
                  }}
                  className="ml-auto text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {reanalyzingMealId ? "Re-analyze Meal" : "Add New Meal"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {reanalyzingMealId
                    ? "Update details and re-submit for analysis"
                    : "Snap and analyze instantly"}
                </p>
              </div>
            </div>

          </div>

          <CardContent className="pt-2 space-y-3">
            {!selectedImage && (
              <button
                type="button"
                onClick={handleCameraCapture}
                className="group flex min-h-[32dvh] w-full flex-col justify-between rounded-3xl border-2 border-dashed border-primary/35 bg-[linear-gradient(160deg,hsl(var(--primary)/0.12),hsl(var(--primary)/0.03))] p-5 text-left transition active:scale-[0.99] hover:border-primary/60 hover:bg-primary/10"
              >
                <div className="space-y-5">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/20 text-primary shadow-inner shadow-primary/10">
                    <Camera className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-2xl font-black tracking-tight text-foreground">Start with meal photo</p>
                    <p className="mt-2 max-w-[15rem] text-sm leading-relaxed text-muted-foreground">Snap food first. Add labels, packaging, or scale photos next.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">1. Meal photo</span>
                    <span className="rounded-full bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">2. Context</span>
                    <span className="rounded-full bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground">3. Review</span>
                  </div>
                </div>
                <div className="mt-8 flex items-center justify-center rounded-2xl bg-primary px-4 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25">
                  <Camera className="mr-2 h-5 w-5" />
                  Take a Photo
                </div>
              </button>
            )}
            {/* Image rail */}
            {selectedImage && imagePreviewUrl && (
              <div className="relative -mx-6 space-y-3 overflow-visible">
                <div
                  ref={imageCarouselRef}
                  onScroll={handleImageCarouselScroll}
                  className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
                >
                  <div
                    className="shrink-0"
                    aria-hidden="true"
                    style={{ width: "max(0px, calc((100% - 240px) / 2))" }}
                  />
                  <div
                    data-image-card={0}
                    className={imageCardClass(0, "w-[240px] shrink-0 snap-center rounded-xl border-2 border-primary bg-primary/5 p-3")}
                  >
                    <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
                      <img src={imagePreviewUrl} alt="Primary meal" className="w-full h-full object-cover" />
                      <Badge className="absolute left-2 top-2">Meal photo</Badge>
                      <button
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:scale-105 border border-white/20"
                        onClick={() => {
                          clearSelectedImages();
                          setReanalyzingMealId(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        title="Remove meal photo and context photos"
                      >
                        <X className="h-4 w-4 text-white" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-medium text-primary">Primary image · used for matching</p>
                    <Textarea
                      placeholder="Optional note: half eaten, 2 servings shown, ate only burger no fries..."
                      value={imageContext}
                      onChange={(e) => setImageContext(e.target.value)}
                      rows={5}
                      className="mt-2 min-h-36 resize-none text-sm leading-relaxed"
                    />
                  </div>

                  {contextImages.map((image, index) => (
                    <div
                      key={image.id}
                      data-image-card={index + 1}
                      className={imageCardClass(index + 1, "w-[240px] shrink-0 snap-center rounded-xl border border-border bg-card p-3")}
                    >
                      <div className="relative h-48 rounded-lg overflow-hidden bg-muted">
                        <img src={image.previewUrl} alt={`Context ${index + 1}`} className="w-full h-full object-cover" />
                        <Badge variant="secondary" className="absolute left-2 top-2">Context {index + 1}</Badge>
                        <button
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all hover:scale-105 border border-white/20"
                          onClick={() => removeContextImage(image.id)}
                          title="Remove context photo"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">Context photo · not used for matching</p>
                      <Textarea
                        placeholder="Note: used 20g from this label, package says 180 kcal per 100g..."
                        value={image.note}
                        onChange={(e) => updateContextNote(image.id, e.target.value)}
                        rows={5}
                        className="mt-2 min-h-36 resize-none text-sm leading-relaxed"
                      />
                    </div>
                  ))}

                  {contextImages.length < 5 && (
                    <button
                      type="button"
                      data-image-card={contextImages.length + 1}
                      onClick={() => contextFileInputRef.current?.click()}
                      className={imageCardClass(contextImages.length + 1, "w-[200px] shrink-0 snap-center rounded-xl border-2 border-dashed border-primary/60 bg-primary/10 p-4 text-left shadow-sm shadow-primary/20 hover:border-primary hover:bg-primary/15")}
                    >
                      <Camera className="h-5 w-5 mb-2 text-muted-foreground" />
                      <p className="text-sm font-medium">Add context photo</p>
                      <p className="text-xs text-muted-foreground mt-1">Label, packaging, scale, ingredients</p>
                    </button>
                  )}
                  <div
                    className="shrink-0"
                    aria-hidden="true"
                    style={{ width: contextImages.length < 5 ? "max(0px, calc((100% - 200px) / 2))" : "max(0px, calc((100% - 240px) / 2))" }}
                  />
                </div>
              </div>
            )}

            {/* Submit button - only show when image is selected */}
            {selectedImage && (
              <Button
                onClick={handleMealSubmission}
                disabled={isSubmittingMeal}
                className="w-full h-12 shadow-md"
              >
                {isSubmittingMeal ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {reanalyzingMealId ? "Re-analyzing..." : "Uploading..."}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {reanalyzingMealId ? "Re-analyze Meal" : "Analyze My Meal"}
                  </>
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Today's Meals */}
        {mealHistory.length > 0 ? (
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
        ) : !selectedImage ? (
          <div className="rounded-3xl border border-dashed border-border/80 bg-card/40 p-5 text-center text-sm text-muted-foreground">
            <Zap className="mx-auto mb-2 h-5 w-5 text-primary/70" />
            <p className="font-medium text-foreground">No meals logged today</p>
            <p className="mt-1">Your first photo will appear here after analysis starts.</p>
          </div>
        ) : null}
      </div>

      {bottomNav}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={contextFileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleContextFileUpload}
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
          onReanalyze={handleMealReanalyze}
          onClose={() => {
            setShowMealReview(false);
            setSelectedMeal(null);
          }}
        />
      )}
    </div>
  );
}
