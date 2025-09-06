

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Textarea } from "./ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { X, Search, Clock, Database } from "lucide-react"

interface MealEntry {
  id: string
  name: string
  calories: number
  protein: number
  timestamp: Date
  imageUrl?: string
  description?: string
}

interface FoodMatch {
  id: string
  name: string
  calories: number
  protein: number
  source: "user" | "openfoodfacts"
  confidence: number
  lastEaten?: Date
}

interface FoodRecognitionModalProps {
  imageUrl: string
  onMealLogged: (meal: MealEntry) => void
  onClose: () => void
}

export function FoodRecognitionModal({ imageUrl, onMealLogged, onClose }: FoodRecognitionModalProps) {
  const [selectedFood, setSelectedFood] = useState<FoodMatch | null>(null)
  const [weight, setWeight] = useState("")
  const [customCalories, setCustomCalories] = useState("")
  const [customProtein, setCustomProtein] = useState("")
  const [description, setDescription] = useState("")
  const [isAnalyzing, setIsAnalyzing] = useState(true)

  // Mock food recognition results
  const [foodMatches] = useState<FoodMatch[]>([
    {
      id: "1",
      name: "Grilled Chicken Breast with Rice",
      calories: 450,
      protein: 35,
      source: "user",
      confidence: 95,
      lastEaten: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    {
      id: "2",
      name: "Chicken Rice Bowl",
      calories: 520,
      protein: 32,
      source: "openfoodfacts",
      confidence: 87,
    },
    {
      id: "3",
      name: "Teriyaki Chicken with Steamed Rice",
      calories: 480,
      protein: 28,
      source: "openfoodfacts",
      confidence: 82,
    },
  ])

  // Simulate analysis completion
  useState(() => {
    setTimeout(() => setIsAnalyzing(false), 2000)
  })

  const handleFoodSelect = (food: FoodMatch) => {
    setSelectedFood(food)
    setCustomCalories(food.calories.toString())
    setCustomProtein(food.protein.toString())
  }

  const handleLogMeal = () => {
    if (!selectedFood) return

    const finalCalories = customCalories ? Number.parseInt(customCalories) : selectedFood.calories
    const finalProtein = customProtein ? Number.parseInt(customProtein) : selectedFood.protein

    // Apply weight adjustment if provided
    let adjustedCalories = finalCalories
    let adjustedProtein = finalProtein

    if (weight) {
      const weightMultiplier = Number.parseInt(weight) / 100 // assuming base is per 100g
      adjustedCalories = Math.round(finalCalories * weightMultiplier)
      adjustedProtein = Math.round(finalProtein * weightMultiplier)
    }

    const meal: MealEntry = {
      id: Date.now().toString(),
      name: selectedFood.name,
      calories: adjustedCalories,
      protein: adjustedProtein,
      timestamp: new Date(),
      imageUrl,
      description: description || undefined,
    }

    onMealLogged(meal)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 md:items-center">
      <Card className="w-full max-w-md max-h-[95vh] rounded-t-xl md:rounded-xl md:max-h-[90vh] md:m-4 flex flex-col dark:bg-gray-900">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Food Recognition
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4 overflow-y-auto flex-1 pb-6">
          {/* Captured Image */}
          <div className="aspect-square w-full max-w-48 mx-auto rounded-lg overflow-hidden bg-gray-100">
            <img src={imageUrl || "/placeholder.svg"} alt="Captured food" className="w-full h-full object-cover" />
          </div>

          {isAnalyzing ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">Analyzing your food...</p>
            </div>
          ) : (
            <>
              {/* Food Matches */}
              <div className="space-y-3">
                <h3 className="font-medium text-gray-900">Found matches:</h3>
                {foodMatches.map((food) => (
                  <Card
                    key={food.id}
                    className={`cursor-pointer transition-colors ${
                      selectedFood?.id === food.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handleFoodSelect(food)}
                  >
                    <CardContent className="p-3">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-sm">{food.name}</h4>
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
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>{food.calories} kcal</span>
                        <span>{food.protein}g protein</span>
                        <span>{food.confidence}% match</span>
                      </div>
                      {food.lastEaten && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last eaten {Math.floor((Date.now() - food.lastEaten.getTime()) / (1000 * 60 * 60 * 24))} days
                          ago
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Meal Details Form */}
              {selectedFood && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium text-gray-900">Adjust details:</h3>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="calories">Calories</Label>
                      <Input
                        id="calories"
                        type="number"
                        value={customCalories}
                        onChange={(e) => setCustomCalories(e.target.value)}
                        placeholder="450"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="protein">Protein (g)</Label>
                      <Input
                        id="protein"
                        type="number"
                        value={customProtein}
                        onChange={(e) => setCustomProtein(e.target.value)}
                        placeholder="35"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="weight">Weight (g) - Optional</Label>
                    <Input
                      id="weight"
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g., 250g"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Additional notes - Optional</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="e.g., extra sauce, no vegetables..."
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>

        {/* Fixed bottom button */}
        {selectedFood && !isAnalyzing && (
          <div className="p-4 border-t bg-white dark:bg-gray-900 dark:border-gray-700 rounded-b-xl md:rounded-b-xl">
            <Button onClick={handleLogMeal} className="w-full" size="lg">
              Log Meal
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
