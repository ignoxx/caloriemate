import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Camera, Upload, Plus, Target, Zap } from "lucide-react"
import { Button } from "../components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Progress } from "../components/ui/progress"
import { Badge } from "../components/ui/badge"
import { OnboardingModal } from "../components/onboarding-modal"
import { MealReviewModal } from "../components/meal-review-modal"
import { MealHistoryCard } from "../components/meal-history-card"
import { WeeklyActivity } from "../components/weekly-activity"
import { ThemeToggle } from "../components/theme-toggle"

interface UserGoals {
  calories: number
  protein: number
  weight: number
  age: number
}

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

export default function CalorieTracker() {
  const [isOnboarded, setIsOnboarded] = useState(false)
  const [userGoals, setUserGoals] = useState<UserGoals | null>(null)
  const [todayCalories, setTodayCalories] = useState(0)
  const [todayProtein, setTodayProtein] = useState(0)
  const [showMealReview, setShowMealReview] = useState(false)
  const [selectedMeal, setSelectedMeal] = useState<MealEntry | null>(null)
  const [mealHistory, setMealHistory] = useState<MealEntry[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check if user is onboarded
  useEffect(() => {
    const savedGoals = localStorage.getItem("userGoals")
    const savedMeals = localStorage.getItem("mealHistory")

    if (savedGoals) {
      setUserGoals(JSON.parse(savedGoals))
      setIsOnboarded(true)
    }

    if (savedMeals) {
      const meals = JSON.parse(savedMeals).map((meal: MealEntry) => ({
        ...meal,
        timestamp: new Date(meal.timestamp),
      }))
      setMealHistory(meals)

      // Calculate today's totals (only confirmed meals)
      const today = new Date().toDateString()
      const todayMeals = meals.filter(
        (meal: MealEntry) => new Date(meal.timestamp).toDateString() === today && meal.status === "confirmed",
      )

      const totalCalories = todayMeals.reduce((sum: number, meal: MealEntry) => {
        const calories = typeof meal.calories === "number" ? meal.calories : meal.calories.max
        return sum + calories
      }, 0)
      const totalProtein = todayMeals.reduce((sum: number, meal: MealEntry) => {
        const protein = typeof meal.protein === "number" ? meal.protein : meal.protein.max
        return sum + protein
      }, 0)

      setTodayCalories(totalCalories)
      setTodayProtein(totalProtein)
    }
  }, [])

  // Simulate meal processing
  useEffect(() => {
    const processingMeals = mealHistory.filter((meal) => meal.status === "processing")

    processingMeals.forEach((meal) => {
      setTimeout(() => {
        // Simulate analysis completion
        const mockAnalysisResults: FoodMatch[] = [
          {
            id: "1",
            name: "Grilled Chicken Breast with Rice",
            calories: { min: 400, max: 500 },
            protein: { min: 30, max: 40 },
            source: "user",
            confidence: 95,
            lastEaten: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            id: "2",
            name: "Chicken Rice Bowl",
            calories: { min: 480, max: 560 },
            protein: { min: 28, max: 36 },
            source: "openfoodfacts",
            confidence: 87,
          },
          {
            id: "3",
            name: "Teriyaki Chicken with Steamed Rice",
            calories: { min: 450, max: 510 },
            protein: { min: 25, max: 31 },
            source: "openfoodfacts",
            confidence: 82,
          },
        ]

        setMealHistory((prev) =>
          prev.map((m) =>
            m.id === meal.id
              ? {
                  ...m,
                  status: "processed" as const,
                  analysisResults: mockAnalysisResults,
                }
              : m,
          ),
        )
      }, 3000) // 3 second processing time
    })
  }, [mealHistory])

  const handleOnboardingComplete = (goals: UserGoals) => {
    setUserGoals(goals)
    setIsOnboarded(true)
    localStorage.setItem("userGoals", JSON.stringify(goals))
  }

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      // For POC, we'll simulate camera capture
      setTimeout(() => {
        stream.getTracks().forEach((track) => track.stop())
        handleImageCaptured("/placeholder.svg?height=300&width=300")
      }, 1000)
    } catch (error) {
      console.error("Camera access denied:", error)
      // Fallback to file upload
      fileInputRef.current?.click()
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        handleImageCaptured(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageCaptured = (imageUrl: string) => {
    // Immediately create a processing meal entry
    const newMeal: MealEntry = {
      id: Date.now().toString(),
      name: "Analyzing meal...",
      calories: 0,
      protein: 0,
      timestamp: new Date(),
      imageUrl,
      status: "processing",
    }

    const updatedHistory = [...mealHistory, newMeal]
    setMealHistory(updatedHistory)
    localStorage.setItem("mealHistory", JSON.stringify(updatedHistory))
  }

  const handleMealClick = (meal: MealEntry) => {
    if (meal.status === "processed") {
      setSelectedMeal(meal)
      setShowMealReview(true)
    }
  }

  const handleMealConfirmed = (confirmedMeal: MealEntry) => {
    const updatedHistory = mealHistory.map((meal) => (meal.id === confirmedMeal.id ? confirmedMeal : meal))
    setMealHistory(updatedHistory)
    localStorage.setItem("mealHistory", JSON.stringify(updatedHistory))

    // Update today's totals if it's today's meal
    const today = new Date().toDateString()
    if (new Date(confirmedMeal.timestamp).toDateString() === today) {
      const calories = typeof confirmedMeal.calories === "number" ? confirmedMeal.calories : confirmedMeal.calories.max
      const protein = typeof confirmedMeal.protein === "number" ? confirmedMeal.protein : confirmedMeal.protein.max

      setTodayCalories((prev) => prev + calories)
      setTodayProtein((prev) => prev + protein)
    }

    setShowMealReview(false)
    setSelectedMeal(null)
  }

  if (!isOnboarded) {
    return <OnboardingModal onComplete={handleOnboardingComplete} />
  }

  const calorieProgress = userGoals ? (todayCalories / userGoals.calories) * 100 : 0
  const proteinProgress = userGoals ? (todayProtein / userGoals.protein) * 100 : 0
  const isCalorieGoalMet = calorieProgress >= 100
  const isProteinGoalMet = proteinProgress >= 100

  const todayMeals = mealHistory.filter((meal) => new Date(meal.timestamp).toDateString() === new Date().toDateString())

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 shadow-sm border-b dark:border-gray-800">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">CalorieMate</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your personal nutrition assistant</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Daily Progress */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              Today's Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Calories */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Calories</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {todayCalories} / {userGoals?.calories}
                  </span>
                  {isCalorieGoalMet && (
                    <Badge variant="secondary" className="text-xs">
                      Goal Met!
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={Math.min(calorieProgress, 100)} className="h-2" />
            </div>

            {/* Protein */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Protein</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold">
                    {todayProtein}g / {userGoals?.protein}g
                  </span>
                  {isProteinGoalMet && (
                    <Badge variant="secondary" className="text-xs">
                      Goal Met!
                    </Badge>
                  )}
                </div>
              </div>
              <Progress value={Math.min(proteinProgress, 100)} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Activity */}
        <WeeklyActivity mealHistory={mealHistory} userGoals={userGoals} />

        {/* Add Meal Button */}
        <Card className="border-dashed border-2 border-gray-300 hover:border-blue-400 transition-colors">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-12 h-12 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                <Plus className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-1">Log Your Meal</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Take a photo to get started</p>
              </div>
              <div className="space-y-2">
                <Button onClick={handleCameraCapture} className="w-full" size="lg">
                  <Camera className="h-4 w-4 mr-2" />
                  Take Photo
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="w-full" size="lg">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Meals */}
        {todayMeals.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Today's Meals
            </h2>
            {todayMeals.map((meal) => (
              <MealHistoryCard key={meal.id} meal={meal} onClick={() => handleMealClick(meal)} />
            ))}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />

      {/* Meal Review Modal */}
      {showMealReview && selectedMeal && (
        <MealReviewModal
          meal={selectedMeal}
          onMealConfirmed={handleMealConfirmed}
          onClose={() => {
            setShowMealReview(false)
            setSelectedMeal(null)
          }}
        />
      )}
    </div>
  )
}
