import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, BookOpen, Loader2, Plus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../contexts/AuthContext";
import pb from "../lib/pocketbase";
import { Collections } from "@/types/pocketbase-types";
import { MealTemplate } from "@/types/common";

interface MealLibraryPageProps {
  onBack: () => void;
  onMealLogged?: () => void;
}

export default function MealLibraryPage({ onBack, onMealLogged }: MealLibraryPageProps) {
  const [meals, setMeals] = useState<MealTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const { user } = useAuth();

  const loadMeals = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const records = await pb.collection("meal_templates").getList(1, 50, {
        filter: `user = "${user.id}" && (is_primary_in_group = true || linked_meal_template_id = "")`,
        sort: "-created",
      });

      setMeals(records.items as unknown as MealTemplate[]);
    } catch (error) {
      console.error("Failed to load meal library:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMeals();
  }, [loadMeals]);

  const handleLogMeal = async (mealTemplateId: string) => {
    if (!user) return;

    setLoggingMealId(mealTemplateId);

    try {
      console.log(user)
      console.log(mealTemplateId)
      await pb.collection(Collections.MealHistory).create({
        meal: mealTemplateId,
        user: user.id,
        portion_multiplier: 1.0,
        adjustments: "",
      });

      onMealLogged?.();
      onBack();
    } catch (error) {
      console.error("Failed to log meal:", error);
    } finally {
      setLoggingMealId(null);
    }
  };

  const getImageUrl = (meal: MealTemplate) => {
    if (!meal.image || meal.image.length === 0) return undefined;

    return pb.files.getURL(
      meal,
      meal.image,
      { thumb: '100x100' }
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="flex items-center gap-4 p-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">My Meals</h1>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <p className="text-sm text-muted-foreground">Loading your meals...</p>
          </div>
        ) : meals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-center text-muted-foreground">
              No meals yet. Start logging meals to build your library!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => {
              const imageUrl = getImageUrl(meal);
              const isLogging = loggingMealId === meal.id;

              return (
                <Card key={meal.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-3 mb-3">
                      {imageUrl && (
                        <div className="w-20 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img
                            src={imageUrl}
                            alt={meal.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm text-foreground mb-2 line-clamp-2">
                          {meal.name}
                        </h3>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className="text-xs">
                            {meal.total_calories} kcal
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {meal.total_protein_g}g protein
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {meal.ai_description && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                        {meal.ai_description}
                      </p>
                    )}

                    <Button
                      onClick={() => handleLogMeal(meal.id)}
                      disabled={isLogging}
                      size="sm"
                      className="w-full"
                    >
                      {isLogging ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Logging...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Log This Meal
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
