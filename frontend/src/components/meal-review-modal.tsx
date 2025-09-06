

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { X, CheckCircle, Clock, Database, Plus } from "lucide-react"

interface MealEntry {
  id: string
  name: string
  calories: number | { min: number; max: number }
  protein: number | { min: number; max: number }
  timestamp: Date
  imageUrl?: string
  description?: string
  status: "processing" | "processed" | "confirmed"
  analysisResults?: FoodMatch[]
}

interface FoodMatch {
  id: string
  name: string
  calories: { min: number; max: number }
  protein: { min: number; max: number }
  source: "user" | "openfoodfacts"
  confidence: number
  lastEaten?: Date
}

interface MealReviewModalProps {
  meal: MealEntry
  onMealConfirmed: (meal: MealEntry) => void
  onClose: () => void
}

export function MealReviewModal({ meal, onMealConfirmed, onClose }: MealReviewModalProps) {
  const [selectedFood, setSelectedFood] = useState<FoodMatch | null>(null)
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState("")
  const [customCaloriesMin, setCustomCaloriesMin] = useState("")
  const [customCaloriesMax, setCustomCaloriesMax] = useState("")
  const [customProteinMin, setCustomProteinMin] = useState("")
  const [customProteinMax, setCustomProteinMax] = useState("")
  const [description, setDescription] = useState("")

  const handleFoodSelect = (food: FoodMatch) => {
    setSelectedFood(food)
    setShowCustomForm(false)
  }

  const handleCustomMeal = () => {
    setShowCustomForm(true)
    setSelectedFood(null)
  }

  const handleConfirmMeal = () => {
    let confirmedMeal: MealEntry

    if (selectedFood) {
      confirmedMeal = {
        ...meal,
        name: selectedFood.name,
        calories: selectedFood.calories,
        protein: selectedFood.protein,
        status: "confirmed",
        description: description || undefined,
      }
    } else if (showCustomForm) {
      confirmedMeal = {
        ...meal,
        name: customName,
        calories: {
          min: Number.parseInt(customCaloriesMin),
          max: Number.parseInt(customCaloriesMax),
        },
        protein: {
          min: Number.parseInt(customProteinMin),
          max: Number.parseInt(customProteinMax),
        },
        status: "confirmed",
        description: description || undefined,
      }
    } else {
      return
    }

    onMealConfirmed(confirmedMeal)
  }

  const formatRange = (range: { min: number; max: number }, unit = "") => {
    return `${range.min}-${range.max}${unit}`
  }

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
            <img src={meal.imageUrl || "/placeholder.svg"} alt="Your meal" className="w-full h-full object-cover" />
          </div>

          {/* Analysis Results */}
          {meal.analysisResults && meal.analysisResults.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-medium text-gray-900 dark:text-white">Found matches:</h3>
              {meal.analysisResults.map((food) => (
                <Card
                  key={food.id}
                  className={`cursor-pointer transition-colors ${
                    selectedFood?.id === food.id
                      ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/50"
                      : "hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                  onClick={() => handleFoodSelect(food)}
                >
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm dark:text-white">{food.name}</h4>
                      <div className="flex gap-1">
                        {food.source === "user" && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-3 w-3 mr-1" />
                            Previous
                          </Badge>
                        )}
                        {food.source === "openfoodfacts" && (
                          <Badge variant="outline" className="text-xs">
                            <Database className="h-3 w-3 mr-1" />
                            Database
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                      <span>{formatRange(food.calories)} kcal</span>
                      <span>{formatRange(food.protein, "g")} protein</span>
                      <span>{food.confidence}% match</span>
                    </div>
                    {food.lastEaten && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Last eaten {Math.floor((Date.now() - food.lastEaten.getTime()) / (1000 * 60 * 60 * 24))} days
                        ago
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Custom Meal Option */}
          <Card
            className={`cursor-pointer transition-colors ${
              showCustomForm
                ? "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-950/50"
                : "hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
            onClick={handleCustomMeal}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm dark:text-white">Create custom meal</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Enter your own meal details and nutrition ranges
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
                  <Label htmlFor="caloriesMin">Min Calories</Label>
                  <Input
                    id="caloriesMin"
                    type="number"
                    value={customCaloriesMin}
                    onChange={(e) => setCustomCaloriesMin(e.target.value)}
                    placeholder="400"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="caloriesMax">Max Calories</Label>
                  <Input
                    id="caloriesMax"
                    type="number"
                    value={customCaloriesMax}
                    onChange={(e) => setCustomCaloriesMax(e.target.value)}
                    placeholder="500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="proteinMin">Min Protein (g)</Label>
                  <Input
                    id="proteinMin"
                    type="number"
                    value={customProteinMin}
                    onChange={(e) => setCustomProteinMin(e.target.value)}
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="proteinMax">Max Protein (g)</Label>
                  <Input
                    id="proteinMax"
                    type="number"
                    value={customProteinMax}
                    onChange={(e) => setCustomProteinMax(e.target.value)}
                    placeholder="35"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          {(selectedFood || showCustomForm) && (
            <div className="space-y-2 pt-4 border-t dark:border-gray-700">
              <Label htmlFor="description">Additional notes (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., extra sauce, no vegetables..."
                rows={2}
              />
            </div>
          )}
        </CardContent>

        {/* Fixed bottom button */}
        {(selectedFood || (showCustomForm && customName && customCaloriesMin && customCaloriesMax)) && (
          <div className="p-4 border-t bg-white dark:bg-gray-900 dark:border-gray-700 rounded-b-xl">
            <Button onClick={handleConfirmMeal} className="w-full" size="lg">
              Confirm Meal
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
