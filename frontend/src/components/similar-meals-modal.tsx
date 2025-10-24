import { useState } from "react";
import { SimilarMeal, MealEntry } from "../types/meal";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Loader2, Link as LinkIcon, Clock } from "lucide-react";
import pb from "../lib/pocketbase";

interface SimilarMealsModalProps {
  meal: MealEntry;
  similarMeals: SimilarMeal[];
  isOpen: boolean;
  onClose: () => void;
  onMealLinked?: () => void;
}

export function SimilarMealsModal({
  meal,
  similarMeals,
  isOpen,
  onClose,
  onMealLinked,
}: SimilarMealsModalProps) {
  const [linkingMealId, setLinkingMealId] = useState<string | null>(null);

  const handleLinkMeal = async (targetMealId: string) => {
    if (!meal.mealTemplateId) return;

    setLinkingMealId(targetMealId);

    try {
      const response = await fetch(
        `${pb.baseURL}/api/v1/meal/${meal.mealTemplateId}/link/${targetMealId}`,
        {
          method: 'POST',
          headers: {
            'Authorization': pb.authStore.token ? `Bearer ${pb.authStore.token}` : '',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to link meals');
      }

      onMealLinked?.();
      onClose();
    } catch (error) {
      console.error('Failed to link meals:', error);
      // TODO: Show error toast
    } finally {
      setLinkingMealId(null);
    }
  };

  const getSimilarityPercentage = (distance: number) => {
    // Convert distance to similarity percentage (lower distance = higher similarity)
    return Math.round((1 - distance) * 100);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader>
          <DrawerTitle>Link Similar Meals</DrawerTitle>
          <p className="text-sm text-muted-foreground">
            Choose a meal to link with "{meal.name}". Linked meals will be grouped together.
          </p>
        </DrawerHeader>

        <div className="p-4 space-y-3 overflow-y-auto">
          {similarMeals.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No similar meals found
            </p>
          ) : (
            similarMeals.map((similarMeal) => (
              <Card key={similarMeal.id} className="relative">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {similarMeal.image_url && (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        <img
                          src={similarMeal.image_url}
                          alt={similarMeal.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm text-foreground truncate pr-2">
                          {similarMeal.name}
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {getSimilarityPercentage(similarMeal.distance)}% match
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {similarMeal.total_calories} kcal
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {similarMeal.total_protein_g}g protein
                        </Badge>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <Clock className="h-3 w-3" />
                        {new Date(similarMeal.created).toLocaleDateString()}
                      </div>

                      {similarMeal.ai_description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {similarMeal.ai_description}
                        </p>
                      )}

                      <Button
                        onClick={() => handleLinkMeal(similarMeal.id)}
                        disabled={linkingMealId === similarMeal.id}
                        size="sm"
                        className="w-full"
                      >
                        {linkingMealId === similarMeal.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Linking...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-4 w-4 mr-2" />
                            Link to this meal
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
