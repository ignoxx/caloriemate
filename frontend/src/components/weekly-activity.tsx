

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Calendar } from "lucide-react"

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

interface UserGoals {
  calories: number
  protein: number
  weight: number
  age: number
}

interface WeeklyActivityProps {
  mealHistory: MealEntry[]
  userGoals: UserGoals | null
}

interface DayData {
  date: Date
  calories: number
  protein: number
  hasData: boolean
  intensity: number // 0-4 for different green shades
}

export function WeeklyActivity({ mealHistory, userGoals }: WeeklyActivityProps) {
  // Generate past 6 months of data
  const generatePast6MonthsData = (): DayData[] => {
    const days: DayData[] = []
    const today = new Date()

    // Start from 5 months ago
    const startDate = new Date(today)
    startDate.setMonth(today.getMonth() - 5)
    startDate.setDate(1) // First day of that month

    // Find the Monday of the week containing the start date
    const startDay = startDate.getDay()
    const mondayOffset = startDay === 0 ? 6 : startDay - 1 // Convert Sunday=0 to Monday=0
    const actualStartDate = new Date(startDate)
    actualStartDate.setDate(startDate.getDate() - mondayOffset)

    // Generate days until today
    const currentDate = new Date(actualStartDate)

    while (currentDate <= today) {
      // Calculate totals for this day (only confirmed meals)
      const dayMeals = mealHistory.filter(
        (meal) => new Date(meal.timestamp).toDateString() === currentDate.toDateString() && meal.status === "confirmed",
      )

      const calories = dayMeals.reduce((sum, meal) => {
        const mealCalories = typeof meal.calories === "number" ? meal.calories : meal.calories.max
        return sum + mealCalories
      }, 0)
      const protein = dayMeals.reduce((sum, meal) => {
        const mealProtein = typeof meal.protein === "number" ? meal.protein : meal.protein.max
        return sum + mealProtein
      }, 0)

      // Calculate intensity based on goal achievement (0-4 scale like GitHub)
      let intensity = 0
      if (dayMeals.length > 0 && userGoals) {
        const calorieRatio = calories / userGoals.calories
        const proteinRatio = protein / userGoals.protein

        // Base intensity on how well goals were met
        if (calorieRatio >= 0.8 && proteinRatio >= 0.8) {
          intensity = 4 // Dark green - both goals met well
        } else if (calorieRatio >= 0.6 || proteinRatio >= 0.6) {
          intensity = 3 // Medium-dark green - decent progress
        } else if (calorieRatio >= 0.4 || proteinRatio >= 0.4) {
          intensity = 2 // Medium green - some progress
        } else if (dayMeals.length > 0) {
          intensity = 1 // Light green - minimal activity
        }
      } else if (dayMeals.length > 0) {
        intensity = 1 // Light green if no goals set but has data
      }

      days.push({
        date: new Date(currentDate),
        calories,
        protein,
        hasData: dayMeals.length > 0,
        intensity,
      })

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return days
  }

  const days = generatePast6MonthsData()

  // Group days into weeks
  const weeks: DayData[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }

  // Generate month labels for the scrollable area
  const getMonthLabels = () => {
    const labels: { month: string; weekIndex: number; width: number }[] = []
    let currentMonth = -1
    let currentYear = -1
    const weekCount = 0

    weeks.forEach((week, weekIndex) => {
      const firstDay = week[0]
      if (firstDay) {
        const month = firstDay.date.getMonth()
        const year = firstDay.date.getFullYear()

        if (month !== currentMonth || year !== currentYear) {
          // Calculate how many weeks this month spans
          let monthWeekCount = 1
          for (let i = weekIndex + 1; i < weeks.length; i++) {
            const nextWeek = weeks[i]
            if (nextWeek[0] && (nextWeek[0].date.getMonth() !== month || nextWeek[0].date.getFullYear() !== year)) {
              break
            }
            monthWeekCount++
          }

          currentMonth = month
          currentYear = year
          labels.push({
            month: firstDay.date.toLocaleDateString("en-US", { month: "short" }),
            weekIndex,
            width: monthWeekCount * 12 - 2, // 12px per week minus gap
          })
        }
      }
    })

    return labels
  }

  const monthLabels = getMonthLabels()

  const getActivityColor = (intensity: number) => {
    switch (intensity) {
      case 0:
        return "bg-gray-100 dark:bg-gray-800" // No activity
      case 1:
        return "bg-green-100 dark:bg-green-900/30" // Light activity
      case 2:
        return "bg-green-200 dark:bg-green-800/50" // Medium activity
      case 3:
        return "bg-green-300 dark:bg-green-700/70" // Good activity
      case 4:
        return "bg-green-500 dark:bg-green-600" // Excellent activity
      default:
        return "bg-gray-100 dark:bg-gray-800"
    }
  }

  const getTooltipText = (day: DayData) => {
    const dateStr = day.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    })

    if (!day.hasData) return `${dateStr}: No meals logged`

    return `${dateStr}: ${day.calories} kcal, ${day.protein}g protein`
  }

  const dayLabels = ["Mon", "", "Wed", "", "Fri", "", ""]

  // Calculate some stats
  const totalDaysWithData = days.filter((day) => day.hasData).length
  const totalDays = days.length
  const currentStreak = (() => {
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (days[i].hasData && days[i].date <= new Date()) {
        streak++
      } else if (days[i].date <= new Date()) {
        break
      }
    }
    return streak
  })()

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5 text-green-600" />
          Activity - Past 6 Months
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex">
            {/* Day labels column */}
            <div className="flex flex-col gap-[2px] text-xs text-gray-500 dark:text-gray-400 mr-2 pt-5">
              {dayLabels.map((day, index) => (
                <div key={index} className="h-[10px] flex items-center leading-none">
                  {day}
                </div>
              ))}
            </div>

            {/* Scrollable container for months and weeks */}
            <div className="overflow-x-auto flex-1">
              <div className="min-w-max">
                {/* Month labels */}
                <div className="relative h-4 mb-1">
                  {monthLabels.map((label, index) => (
                    <div
                      key={index}
                      className="absolute text-xs text-gray-500 dark:text-gray-400 font-medium"
                      style={{
                        left: `${label.weekIndex * 12}px`,
                        width: `${label.width}px`,
                      }}
                    >
                      {label.month}
                    </div>
                  ))}
                </div>

                {/* Weeks grid */}
                <div className="flex gap-[2px]">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[2px]">
                      {week.map((day, dayIndex) => (
                        <div
                          key={dayIndex}
                          className={`w-[10px] h-[10px] rounded-sm ${getActivityColor(day.intensity)} transition-colors cursor-pointer hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500`}
                          title={getTooltipText(day)}
                        />
                      ))}
                      {/* Fill empty days if week is incomplete */}
                      {Array.from({ length: 7 - week.length }).map((_, emptyIndex) => (
                        <div key={`empty-${emptyIndex}`} className="w-[10px] h-[10px]" />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
            <span>{totalDaysWithData} days with meals logged</span>
            <span>Current streak: {currentStreak} days</span>
          </div>

          {/* Legend */}
          <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 pt-2 border-t dark:border-gray-700">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-[10px] h-[10px] rounded-sm bg-gray-100 dark:bg-gray-800"></div>
              <div className="w-[10px] h-[10px] rounded-sm bg-green-100 dark:bg-green-900/30"></div>
              <div className="w-[10px] h-[10px] rounded-sm bg-green-200 dark:bg-green-800/50"></div>
              <div className="w-[10px] h-[10px] rounded-sm bg-green-300 dark:bg-green-700/70"></div>
              <div className="w-[10px] h-[10px] rounded-sm bg-green-500 dark:bg-green-600"></div>
            </div>
            <span>More</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
