import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import pb from "../lib/pocketbase";
import { UserGoals } from "../types/common";
import { UserProfilesGoalOptions, MealTemplatesProcessingStatusOptions } from "../types/pocketbase-types";

interface WeeklyHistoryPageProps {
  onBack: () => void;
  userGoals: UserGoals | null;
}

interface DayData {
  date: Date;
  totalCalories: number;
  totalProtein: number;
  mealCount: number;
  calorieStatus: 'none' | 'perfect' | 'slight-over' | 'over' | 'way-over' | 'under';
  proteinStatus: 'none' | 'perfect' | 'close' | 'under';
}

export default function WeeklyHistoryPage({ onBack, userGoals }: WeeklyHistoryPageProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(getWeekStart(new Date()));
  const [weeklyData, setWeeklyData] = useState<DayData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userGoal, setUserGoal] = useState<UserProfilesGoalOptions>(UserProfilesGoalOptions.maintain);
  const { user } = useAuth();

  // Get start of current week (Monday)
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // Generate array of 7 days for current week
  function getWeekDays(weekStart: Date): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  }

  // Calculate goal achievement status
  const calculateCalorieStatus = useCallback((calories: number, targetCalories: number, goal: UserProfilesGoalOptions): DayData['calorieStatus'] => {
    if (calories === 0) return 'none';
    
    const percentage = (calories / targetCalories) * 100;
    
    if (goal === UserProfilesGoalOptions.lose_weight) {
      // For weight loss, being under/at goal is good
      if (percentage <= 100) return 'perfect';
      if (percentage <= 115) return 'slight-over';
      if (percentage <= 130) return 'over';
      return 'way-over';
    } else if (goal === UserProfilesGoalOptions.gain_weight || goal === UserProfilesGoalOptions.gain_muscle) {
      // For weight gain, being at/over goal is good
      if (percentage >= 100) return 'perfect';
      if (percentage >= 85) return 'slight-over'; // Close to goal
      return 'under';
    } else {
      // For maintenance, being close to goal is good
      if (percentage >= 90 && percentage <= 110) return 'perfect';
      if (percentage >= 80 && percentage <= 120) return 'slight-over';
      if (percentage < 80) return 'under';
      return 'over';
    }
  }, []);

  const calculateProteinStatus = useCallback((protein: number, targetProtein: number): DayData['proteinStatus'] => {
    if (protein === 0) return 'none';
    
    const percentage = (protein / targetProtein) * 100;
    
    if (percentage >= 100) return 'perfect';
    if (percentage >= 80) return 'close';
    return 'under';
  }, []);

  // Load user's goal from profile
  const loadUserGoal = useCallback(async () => {
    try {
      if (!user) return;
      
      const records = await pb.collection("user_profiles").getList(1, 1, {
        filter: `user = "${user.id}"`,
      });

      if (records.items.length > 0) {
        const profile = records.items[0];
        setUserGoal(profile.goal || UserProfilesGoalOptions.maintain);
      }
    } catch (error) {
      console.error("Failed to load user goal:", error);
    }
  }, [user]);

  // Load meal data for the week
  const loadWeeklyData = useCallback(async () => {
    if (!userGoals) return;
    
    setIsLoading(true);
    try {
      const weekDays = getWeekDays(currentWeekStart);
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(currentWeekStart.getDate() + 7);
      
      // Load all meals for the week
      const records = await pb.collection("meal_history").getList(1, 200, {
        sort: "-created",
        created: `>=${currentWeekStart.toISOString()} && <${weekEnd.toISOString()}`,
        expand: "meal",
        filter: `adjustments != 'hidden'`,
      });

      const weeklyData: DayData[] = weekDays.map(date => {
        const dayStart = new Date(date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        // Filter meals for this specific day
        const dayMeals = records.items.filter(record => {
          const mealDate = new Date(record.created);
          return mealDate >= dayStart && mealDate <= dayEnd;
        });

        // Calculate totals for completed meals only
        const completedMeals = dayMeals.filter(record => {
          const expandData = record.expand as Record<string, unknown>;
          const mealTemplate = expandData?.meal as Record<string, unknown>;
          return mealTemplate?.processing_status === MealTemplatesProcessingStatusOptions.completed;
        });

        const totalCalories = completedMeals.reduce((sum, record) => {
          const recordData = record as Record<string, unknown>;
          const expandData = recordData.expand as Record<string, unknown>;
          const mealTemplate = expandData?.meal as Record<string, unknown>;
          const portionMultiplier = (recordData.portion_multiplier as number) || 1.0;
          const calories = ((mealTemplate?.total_calories as number) || 0) * portionMultiplier + ((recordData.calorie_adjustment as number) || 0);
          return sum + Math.round(calories);
        }, 0);

        const totalProtein = completedMeals.reduce((sum, record) => {
          const recordData = record as Record<string, unknown>;
          const expandData = recordData.expand as Record<string, unknown>;
          const mealTemplate = expandData?.meal as Record<string, unknown>;
          const portionMultiplier = (recordData.portion_multiplier as number) || 1.0;
          const protein = ((mealTemplate?.total_protein_g as number) || 0) * portionMultiplier + ((recordData.protein_adjustment as number) || 0);
          return sum + Math.round(protein);
        }, 0);

        const calorieStatus = calculateCalorieStatus(totalCalories, userGoals.target_calories, userGoal);
        const proteinStatus = calculateProteinStatus(totalProtein, userGoals.target_protein_g);

        return {
          date,
          totalCalories,
          totalProtein,
          mealCount: completedMeals.length,
          calorieStatus,
          proteinStatus,
        };
      });

      setWeeklyData(weeklyData);
    } catch (error) {
      console.error("Failed to load weekly data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWeekStart, userGoals, calculateCalorieStatus, calculateProteinStatus, userGoal]);

  useEffect(() => {
    loadUserGoal();
  }, [loadUserGoal]);

  useEffect(() => {
    if (userGoals && userGoal) {
      loadWeeklyData();
    }
  }, [loadWeeklyData, userGoals, userGoal]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeekStart(newWeekStart);
  };

  const getStatusBadge = (status: DayData['calorieStatus'] | DayData['proteinStatus'], type: 'calorie' | 'protein') => {
    if (status === 'none') {
      return <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-600">No data</Badge>;
    }

    if (type === 'calorie') {
      switch (status) {
        case 'perfect':
          return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Perfect</Badge>;
        case 'slight-over':
          return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Close</Badge>;
        case 'over':
          return <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Over</Badge>;
        case 'way-over':
          return <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Way over</Badge>;
        case 'under':
          return <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">Under</Badge>;
        default:
          return <Badge variant="secondary" className="text-xs">-</Badge>;
      }
    } else {
      switch (status) {
        case 'perfect':
          return <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Great</Badge>;
        case 'close':
          return <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Close</Badge>;
        case 'under':
          return <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Low</Badge>;
        default:
          return <Badge variant="secondary" className="text-xs">-</Badge>;
      }
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const weekSummary = weeklyData.reduce((acc, day) => {
    acc.totalDaysLogged += day.mealCount > 0 ? 1 : 0;
    acc.perfectDays += day.calorieStatus === 'perfect' && day.proteinStatus === 'perfect' ? 1 : 0;
    return acc;
  }, { totalDaysLogged: 0, perfectDays: 0 });

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-8 w-8"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Weekly History
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Track your nutrition progress
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Week Navigation */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateWeek('prev')}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Week of {formatDate(currentWeekStart)}
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigateWeek('next')}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{weekSummary.totalDaysLogged}/7 days logged</span>
              <span>{weekSummary.perfectDays} perfect days</span>
            </div>
          </CardContent>
        </Card>

        {/* Daily Grid */}
        {isLoading ? (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <div className="h-8 w-8 animate-spin mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full" />
                <p className="text-muted-foreground">Loading weekly data...</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {weeklyData.map((dayData, index) => (
              <Card key={index} className={`${isToday(dayData.date) ? 'ring-2 ring-primary' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-foreground">
                          {formatDate(dayData.date)}
                        </h3>
                        {isToday(dayData.date) && (
                          <Badge variant="outline" className="text-xs">Today</Badge>
                        )}
                      </div>
                      
                      {dayData.mealCount === 0 ? (
                        <p className="text-sm text-muted-foreground">No meals logged</p>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              {dayData.mealCount} meal{dayData.mealCount !== 1 ? 's' : ''}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Calories</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {dayData.totalCalories}
                                </span>
                                {getStatusBadge(dayData.calorieStatus, 'calorie')}
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Protein</p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                  {dayData.totalProtein}g
                                </span>
                                {getStatusBadge(dayData.proteinStatus, 'protein')}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Legend */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Status Legend</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Calories</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Perfect</Badge>
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Close</Badge>
                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700">Over</Badge>
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Way over</Badge>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Protein</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">Great</Badge>
                <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">Close</Badge>
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">Low</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}