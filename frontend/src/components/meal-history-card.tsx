

import { Card, CardContent } from "./ui/card"
import { Badge } from "./ui/badge"
import { Clock, Edit, Loader2, CheckCircle, AlertCircle } from "lucide-react"

interface MealEntry {
  id: string
  name: string
  calories: number | { min: number; max: number }
  protein: number | { min: number; max: number }
  timestamp: Date
  imageUrl?: string
  description?: string
  status: "processing" | "processed" | "confirmed"
}

interface MealHistoryCardProps {
  meal: MealEntry
  onClick?: () => void
}

export function MealHistoryCard({ meal, onClick }: MealHistoryCardProps) {
  const timeString = new Date(meal.timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const getStatusIcon = () => {
    switch (meal.status) {
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      case "processed":
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case "confirmed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getStatusText = () => {
    switch (meal.status) {
      case "processing":
        return "Analyzing..."
      case "processed":
        return "Tap to review"
      case "confirmed":
        return "Confirmed"
    }
  }

  const formatNutritionValue = (value: number | { min: number; max: number }, unit = "") => {
    if (typeof value === "number") {
      return `${value}${unit}`
    }
    return `${value.min}-${value.max}${unit}`
  }

  const isClickable = meal.status === "processed"

  return (
    <Card
      className={`transition-shadow ${isClickable ? "hover:shadow-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : ""}`}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="p-4">
        <div className="flex gap-3">
          {meal.imageUrl && (
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={meal.imageUrl || "/placeholder.svg"} alt={meal.name} className="w-full h-full object-cover" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-medium text-sm text-gray-900 dark:text-white truncate pr-2">{meal.name}</h3>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getStatusIcon()}
                {meal.status === "confirmed" && (
                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <Edit className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {meal.status === "processing" ? (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {getStatusText()}
                </Badge>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-xs">
                  {formatNutritionValue(meal.calories)} kcal
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {formatNutritionValue(meal.protein, "g")} protein
                </Badge>
                {meal.status === "processed" && (
                  <Badge variant="outline" className="text-xs text-orange-600 dark:text-orange-400">
                    {getStatusText()}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              {timeString}
            </div>

            {meal.description && meal.status === "confirmed" && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">{meal.description}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
