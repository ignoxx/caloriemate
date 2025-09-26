import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent } from "./ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerClose,
} from "./ui/drawer";

import { X, CheckCircle, Plus, Repeat, Trash2, Link as LinkIcon, Loader2 } from "lucide-react";
import { MealEntry, SimilarMeal } from "../types/meal";
import { MealTemplatesProcessingStatusOptions } from "../types/pocketbase-types";
import { fetchSimilarMeals } from "../lib/pocketbase";
import pb from "../lib/pocketbase";

// interface MealEntry {
//   id: string;
//   meal_name: string;
//   aiDescription: string;
//   totalCalories: number;
//   calorieUncertaintyPercent: number;
//   totalProteinG: number;
//   proteinUncertaintyPercent: number;
//   totalCarbsG: number;
//   carbsUncertaintyPercent: number;
//   totalFatG: number;
//   fatUncertaintyPercent: number;
//   analysisNotes: string;
//   imageUrl?: string;
//   processing_status: "pending" | "processing" | "completed" | "failed";
//   created: string;
//   updated: string;
// }

interface MealReviewModalProps {
  meal: MealEntry;
  open: boolean;
  onMealConfirmed?: (meal: MealEntry) => void; // Optional for existing meals
  onSimilarMealSelected?: (similarMeal: SimilarMeal) => void; // Optional for existing meals
  onMealRemoved?: () => void; // New: for removing existing meals
  onClose: () => void;
  mode?: 'review' | 'view'; // New: determines if this is for new meal review or existing meal view
}

export function MealReviewModal({
  meal,
  open,
  onMealConfirmed,
  onSimilarMealSelected,
  onMealRemoved,
  onClose,
  mode = 'review',
}: MealReviewModalProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState(meal.name);
  const [customCalories, setCustomCalories] = useState(
    meal.totalCalories.toString(),
  );
  const [customProtein, setCustomProtein] = useState(
    meal.totalProteinG.toString(),
  );
  const [customCarbs, setCustomCarbs] = useState(meal.totalCarbsG.toString());
  const [customFat, setCustomFat] = useState(meal.totalFatG.toString());
  const [description, setDescription] = useState(meal.aiDescription);
  const [similarMeals, setSimilarMeals] = useState<SimilarMeal[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const loadSimilarMeals = async () => {
      try {
        // For existing meals, use mealTemplateId if available, otherwise use id
        const templateId = meal.mealTemplateId || meal.id;
        const similar = await fetchSimilarMeals(templateId);
        setSimilarMeals(similar);
      } catch (error) {
        console.error("Failed to load similar meals:", error);
      } finally {
        setLoadingSimilar(false);
      }
    };

    // Only load similar meals for completed meals and if not already linked
    if (meal.processingStatus === "completed" && !meal.linkedMealTemplateId) {
      loadSimilarMeals();
    } else {
      setLoadingSimilar(false);
    }
  }, [meal.id, meal.mealTemplateId, meal.processingStatus, meal.linkedMealTemplateId]);

  const handleSimilarMealClick = async (similarMeal: SimilarMeal) => {
    if (mode === 'review' && onSimilarMealSelected) {
      onSimilarMealSelected(similarMeal);
    } else if (mode === 'view' && meal.mealHistoryId) {
      // Link existing meal to similar meal
      setIsLinking(true);
      try {
        const response = await fetch(
          `${pb.baseUrl}/api/collections/meal_history/records/${meal.mealHistoryId}/link`,
          {
            method: 'POST',
            headers: {
              'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              linked_meal_template_id: similarMeal.id,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to link meal');
        }

        // Close modal and refresh parent
        onClose();
        // You might want to add a success callback here
      } catch (error) {
        console.error('Failed to link meal:', error);
        // TODO: Show error toast
      } finally {
        setIsLinking(false);
      }
    }
  };

  const handleConfirmMeal = () => {
    if (!onMealConfirmed) return;
    
    const confirmedMeal: MealEntry = {
      ...meal,
      name: showCustomForm ? customName : meal.name,
      totalCalories: showCustomForm
        ? parseInt(customCalories)
        : meal.totalCalories,
      totalProteinG: showCustomForm
        ? parseInt(customProtein)
        : meal.totalProteinG,
      totalCarbsG: showCustomForm
        ? parseInt(customCarbs)
        : meal.totalCarbsG,
      totalFatG: showCustomForm ? parseInt(customFat) : meal.totalFatG,
      aiDescription: description,
      processingStatus: MealTemplatesProcessingStatusOptions.completed,
    };

    onMealConfirmed(confirmedMeal);
  };

  const handleRemoveMeal = async () => {
    if (!meal.mealHistoryId || !onMealRemoved) return;
    
    if (!confirm("Remove this meal from today's list? The meal will be kept in your templates.")) {
      return;
    }

    setIsRemoving(true);
    
    try {
      const response = await fetch(
        `${pb.baseUrl}/api/collections/meal_history/records/${meal.mealHistoryId}/hide`,
        {
          method: 'POST',
          headers: {
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove meal');
      }

      onMealRemoved();
      onClose();
    } catch (error) {
      console.error('Failed to remove meal:', error);
      // TODO: Show error toast
    } finally {
      setIsRemoving(false);
    }
  };

  const formatNutritionWithUncertainty = (
    value: number,
    uncertainty: number,
    unit: string,
  ) => {
    if (uncertainty > 0) {
      const min = Math.round(value * (1 - uncertainty / 100));
      const max = Math.round(value * (1 + uncertainty / 100));
      return `${min}-${max}${unit}`;
    }
    return `${value}${unit}`;
  };

  return (
    <Drawer open={open} onOpenChange={onClose}>
      <DrawerContent className="max-h-[95vh] md:max-h-[90vh]">
        <DrawerHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <DrawerTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {mode === 'review' ? 'Review Your Meal' : 'Meal Details'}
          </DrawerTitle>
          <DrawerClose asChild>
            <Button variant="ghost" size="sm">
              <X className="h-4 w-4" />
            </Button>
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 space-y-4 overflow-y-auto flex-1 pb-6">
          {/* Captured Image */}
          <div className="aspect-square w-full max-w-48 mx-auto rounded-lg overflow-hidden bg-gray-100">
            <img
              src={meal.imageUrl || "/placeholder.svg"}
              alt="Your meal"
              className="w-full h-full object-cover"
            />
          </div>

          {/* AI Analysis Results */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">
              AI Analysis:
            </h3>
            <Card className="bg-accent/30">
              <CardContent className="p-3">
                <h4 className="font-medium text-sm dark:text-white mb-2">
                  {meal.name}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Calories:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalCalories,
                        meal.calorieUncertaintyPercent,
                        "",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Protein:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalProteinG,
                        meal.proteinUncertaintyPercent,
                        "g",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Carbs:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalCarbsG,
                        meal.carbsUncertaintyPercent,
                        "g",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fat:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalFatG,
                        meal.fatUncertaintyPercent,
                        "g",
                      )}
                    </span>
                  </div>
                </div>
                {meal.aiDescription && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {meal.aiDescription}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Similar Meals Section */}
          {!loadingSimilar && similarMeals.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Repeat className="h-4 w-4" />
                Similar meals you've had before:
              </h3>
              <div className="space-y-2">
                {similarMeals.slice(0, 3).map((similarMeal) => (
                  <Card
                    key={similarMeal.id}
                    className="cursor-pointer transition-colors hover:bg-accent/50 border-dashed"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm dark:text-white">
                              {similarMeal.name}
                            </h4>
                            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                              {Math.round((1 - similarMeal.distance) * 100)}% match
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2 text-xs text-gray-600 dark:text-gray-400">
                            <span>{similarMeal.total_calories} cal</span>
                            <span>{similarMeal.total_protein_g}g protein</span>
                            <span>{similarMeal.total_carbs_g}g carbs</span>
                            <span>{similarMeal.total_fat_g}g fat</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSimilarMealClick(similarMeal)}
                          disabled={isLinking}
                          className="ml-3"
                        >
                          {isLinking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : mode === 'review' ? (
                            'Use This'
                          ) : (
                            <>
                              <LinkIcon className="h-3 w-3 mr-1" />
                              Link
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Edit Option */}
          <Card
            className={`cursor-pointer transition-colors ${
              showCustomForm
                ? "ring-2 ring-primary bg-primary/10"
                : "hover:bg-accent/50"
            }`}
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm dark:text-white">
                  {showCustomForm ? "Use AI analysis" : "Edit meal details"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {showCustomForm
                  ? "Accept the AI analysis as is"
                  : "Modify the meal name and nutrition values"}
              </p>
            </CardContent>
          </Card>

          {/* Custom Meal Form */}
          {showCustomForm && (
            <div className="space-y-4 pt-4 border-t dark:border-gray-700">
              <div className="space-y-2">
                <Label htmlFor="customName">Meal Name</Label>
                <Input
                  id="customName"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="e.g., Grilled Chicken with Rice"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    value={customCalories}
                    onChange={(e) => setCustomCalories(e.target.value)}
                    placeholder="400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    value={customProtein}
                    onChange={(e) => setCustomProtein(e.target.value)}
                    placeholder="25"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    value={customCarbs}
                    onChange={(e) => setCustomCarbs(e.target.value)}
                    placeholder="45"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    value={customFat}
                    onChange={(e) => setCustomFat(e.target.value)}
                    placeholder="15"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Meal description..."
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Meal Actions - Only show for existing meals */}
          {mode === 'view' && (
            <div className="space-y-3">
              <h3 className="font-medium text-foreground">Actions</h3>
              <div className="space-y-2">
                <Card
                  className="cursor-pointer transition-colors hover:bg-red-50 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
                  onClick={handleRemoveMeal}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin text-red-600" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600" />
                      )}
                      <span className="font-medium text-sm text-red-600">
                        {isRemoving ? "Removing..." : "Remove from today's meals"}
                      </span>
                    </div>
                    <p className="text-xs text-red-500 mt-1">
                      This will hide the meal from today but keep it in your templates
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t">
          {mode === 'review' ? (
            <Button onClick={handleConfirmMeal} className="w-full" size="lg">
              Confirm Meal
            </Button>
          ) : (
            <DrawerClose asChild>
              <Button variant="outline" className="w-full" size="lg">
                Close
              </Button>
            </DrawerClose>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
