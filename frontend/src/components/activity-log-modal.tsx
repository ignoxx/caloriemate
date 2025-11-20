import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "./ui/drawer";
import { Footprints } from "lucide-react";
import { calculateCaloriesBurnedFromSteps, calculateCaloriesBurnedFromDuration } from "../lib/calories";

interface ActivityLogModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { steps?: number; durationMinutes?: number; caloriesBurned: number }) => void;
  userWeightKg: number;
}

export function ActivityLogModal({ open, onClose, onSubmit, userWeightKg }: ActivityLogModalProps) {
  const [inputMode, setInputMode] = useState<"steps" | "duration">("steps");
  const [steps, setSteps] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");

  const handleSubmit = () => {
    if (inputMode === "steps" && steps) {
      const stepsNum = parseInt(steps);
      const calories = calculateCaloriesBurnedFromSteps(stepsNum, userWeightKg);
      onSubmit({ steps: stepsNum, caloriesBurned: calories });
    } else if (inputMode === "duration" && durationMinutes) {
      const duration = parseInt(durationMinutes);
      const calories = calculateCaloriesBurnedFromDuration(duration, userWeightKg);
      onSubmit({ durationMinutes: duration, caloriesBurned: calories });
    }
    setSteps("");
    setDurationMinutes("");
    onClose();
  };

  const canSubmit = (inputMode === "steps" && steps) || (inputMode === "duration" && durationMinutes);

  const estimatedCalories = () => {
    if (inputMode === "steps" && steps) {
      return calculateCaloriesBurnedFromSteps(parseInt(steps), userWeightKg);
    } else if (inputMode === "duration" && durationMinutes) {
      return calculateCaloriesBurnedFromDuration(parseInt(durationMinutes), userWeightKg);
    }
    return 0;
  };

  return (
    <Drawer open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DrawerContent className="!fixed !bottom-0 !max-h-[min(500px,90vh)]">
        <div className="flex flex-col h-full">
          <DrawerHeader className="flex-shrink-0">
            <DrawerTitle className="flex items-center gap-2">
              <Footprints className="h-5 w-5 text-green-600" />
              Log Walking Activity
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1 overscroll-contain touch-pan-y" style={{WebkitOverflowScrolling: 'touch'}}>
            <div className="flex gap-2">
              <Button
                variant={inputMode === "steps" ? "default" : "outline"}
                onClick={() => setInputMode("steps")}
                className="flex-1"
              >
                Steps
              </Button>
              <Button
                variant={inputMode === "duration" ? "default" : "outline"}
                onClick={() => setInputMode("duration")}
                className="flex-1"
              >
                Duration
              </Button>
            </div>

            {inputMode === "steps" ? (
              <div className="space-y-2">
                <Label htmlFor="steps">Steps</Label>
                <Input
                  id="steps"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 5000"
                  value={steps}
                  onChange={(e) => setSteps(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 30"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            )}

            <div className="rounded-lg p-3 text-center transition-all duration-200 min-h-[88px] flex flex-col justify-center">
              {canSubmit ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 -m-3">
                  <p className="text-sm text-green-700">Estimated calories burned</p>
                  <p className="text-2xl font-bold text-green-800">{estimatedCalories()} kcal</p>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 -m-3">
                  <p className="text-sm text-gray-600">💡 Quick tip</p>
                  <p className="text-base text-gray-700">~2000 steps ≈ 1km walked</p>
                </div>
              )}
            </div>
          </div>

          <DrawerFooter className="flex-shrink-0 border-t bg-background">
            <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
              Log Activity
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
