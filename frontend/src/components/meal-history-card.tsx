

import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Clock, Edit, Loader2, CheckCircle, AlertCircle } from "lucide-react"

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

interface MealHistoryCardProps {
  meal: MealEntry
  onClick?: () => void
}

export function MealHistoryCard({ meal, onClick }: MealHistoryCardProps) {
  const timeString = new Date(meal.created).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const getStatusIcon = () => {
    switch (meal.processing_status) {
      case "pending":
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
    }
  }

  const getStatusText = () => {
    switch (meal.processing_status) {
      case "pending":
        return "Queued..."
      case "processing":
        return "Analyzing..."
      case "completed":
        return "Completed"
      case "failed":
        return "Failed"
    }
  }

  const formatNutritionWithUncertainty = (value: number, uncertainty: number, unit: string) => {
    if (uncertainty > 0) {
      const min = Math.round(value * (1 - uncertainty / 100));
      const max = Math.round(value * (1 + uncertainty / 100));
      return `${min}-${max}${unit}`;
    }
    return `${value}${unit}`;
  }

  const isClickable = meal.processing_status === "completed"

  return (
    <Card
      className={`transition-shadow ${isClickable ? "hover:shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : ""}`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {meal.imageUrl && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={meal.imageUrl || "/placeholder.svg"} alt={meal.meal_name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate pr-2">{meal.meal_name}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusIcon()}
                {meal.processing_status === "completed" && (
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {meal.processing_status === "pending" || meal.processing_status === "processing" ? (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {getStatusText()}
                </Badge>
              </div>
            ) : meal.processing_status === "completed" ? (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {formatNutritionWithUncertainty(meal.total_calories, meal.calorie_uncertainty_percent, "")} kcal
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatNutritionWithUncertainty(meal.total_protein_g, meal.protein_uncertainty_percent, "g")} protein
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="destructive" className="text-xs">
                  {getStatusText()}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              {timeString}
            </div>

            {meal.ai_description && meal.processing_status === "completed" && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{meal.ai_description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
