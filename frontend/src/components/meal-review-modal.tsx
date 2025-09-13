import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

import { X, CheckCircle, Plus } from "lucide-react";
import { MealEntry } from "@/types/common";

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
  onMealConfirmed: (meal: MealEntry) => void;
  onClose: () => void;
}

export function MealReviewModal({
  meal,
  onMealConfirmed,
  onClose,
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

  const handleConfirmMeal = () => {
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
      processingStatus: "completed" as const,
    };

    onMealConfirmed(confirmedMeal);
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
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 md:items-center">
      <Card className="w-full max-w-md max-h-[95vh] rounded-t-xl md:rounded-xl md:max-h-[90vh] md:m-4 flex flex-col dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Review Your Meal
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto flex-1 pb-6">
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
            <h3 className="font-medium text-gray-900 dark:text-white">
              AI Analysis:
            </h3>
            <Card className="bg-gray-50 dark:bg-gray-800">
              <CardContent className="p-3">
                <h4 className="font-medium text-sm dark:text-white mb-2">
                  {meal.name}
                </h4>
                {meal.aiDescription && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {meal.aiDescription}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500">Calories:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalCalories,
                        meal.calorieUncertaintyPercent,
                        "",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Protein:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalProteinG,
                        meal.proteinUncertaintyPercent,
                        "g",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Carbs:</span>
                    <span className="ml-1 font-medium">
                      {formatNutritionWithUncertainty(
                        meal.totalCarbsG,
                        meal.carbsUncertaintyPercent,
                        "g",
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Fat:</span>
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
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {meal.aiDescription}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Edit Option */}
          <Card
            className={`cursor-pointer transition-colors ${
              showCustomForm
                ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/50"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            onClick={() => setShowCustomForm(!showCustomForm)}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm dark:text-white">
                  {showCustomForm ? "Use AI analysis" : "Edit meal details"}
                </span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
        </CardContent>

        {/* Fixed bottom button */}
        <div className="p-4 border-t bg-white dark:bg-gray-900 dark:border-gray-700 rounded-b-xl">
          <Button onClick={handleConfirmMeal} className="w-full" size="lg">
            Confirm Meal
          </Button>
        </div>
      </Card>
    </div>
  );
}
