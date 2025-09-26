import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, Edit, Loader2, CheckCircle, AlertCircle, Link as LinkIcon, X } from "lucide-react";
import { MealEntry } from "../types/meal";
import { useState } from "react";
import pb from "../lib/pocketbase";

interface MealHistoryCardProps {
  meal: MealEntry;
  onClick?: () => void;
  onMealRemoved?: () => void;
}

export function MealHistoryCard({ meal, onClick, onMealRemoved }: MealHistoryCardProps) {
  const [isRemoving, setIsRemoving] = useState(false);

  const timeString = new Date(meal.created).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const getStatusIcon = () => {
    switch (meal.processingStatus) {
      case "pending":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    switch (meal.processingStatus) {
      case "pending":
        return "Queued...";
      case "processing":
        return "Analyzing...";
      case "completed":
        return "Completed";
      case "failed":
        return "Failed";
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

  const handleRemoveMeal = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
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

      onMealRemoved?.();
    } catch (error) {
      console.error('Failed to remove meal:', error);
      // TODO: Show error toast
    } finally {
      setIsRemoving(false);
    }
  };

  const isClickable = meal.processingStatus === "completed";

  return (
    <Card
      className={`transition-shadow ${isClickable ? "hover:shadow-md cursor-pointer hover:bg-accent/50" : ""}`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {meal.imageUrl && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img
                src={meal.imageUrl || "/placeholder.svg"}
                alt={meal.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm text-foreground truncate pr-2">
                {meal.name}
              </h3>
               <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusIcon()}
                {meal.processingStatus === "completed" && (
                  <>
                    <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={handleRemoveMeal}
                      disabled={isRemoving}
                      className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                      title="Remove from today's meals"
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                  </>
                )}
              </div>
            </div>

            {meal.processingStatus === "pending" ||
            meal.processingStatus === "processing" ? (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {getStatusText()}
                </Badge>
              </div>
            ) : meal.processingStatus === "completed" ? (
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="secondary" className="text-xs">
                  {formatNutritionWithUncertainty(
                    meal.totalCalories,
                    meal.calorieUncertaintyPercent,
                    "",
                  )}{" "}
                  kcal
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatNutritionWithUncertainty(
                    meal.totalProteinG,
                    meal.proteinUncertaintyPercent,
                    "g",
                  )}{" "}
                  protein
                </Badge>
                {meal.linkedMealTemplateId && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800">
                    <LinkIcon className="h-3 w-3 mr-1" />
                    Linked meal
                  </Badge>
                )}
                 {meal.isPrimaryInGroup && (
                   <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
                     Primary in group
                   </Badge>
                 )}
               </div>
             ) : (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">
                  {getStatusText()}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {timeString}
            </div>

            {meal.aiDescription && meal.processingStatus === "completed" && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                {meal.aiDescription}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
