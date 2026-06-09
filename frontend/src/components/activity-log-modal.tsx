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
import { Flame, Footprints } from "lucide-react";
import { calculateCaloriesBurnedFromSteps, calculateCaloriesBurnedFromDuration } from "../lib/calories";

interface ActivityLogModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: { steps?: number; durationMinutes?: number; caloriesBurned: number; activityType?: "walking" | "custom" }) => void;
  userWeightKg: number;
}

export function ActivityLogModal({ open, onClose, onSubmit, userWeightKg }: ActivityLogModalProps) {
  const [inputMode, setInputMode] = useState<"calories" | "steps" | "duration">("calories");
  const [steps, setSteps] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [caloriesBurned, setCaloriesBurned] = useState("");

  const handleSubmit = () => {
    if (inputMode === "calories" && caloriesBurned) {
      onSubmit({ caloriesBurned: parseInt(caloriesBurned), activityType: "custom" });
    } else if (inputMode === "steps" && steps) {
      const stepsNum = parseInt(steps);
      const calories = calculateCaloriesBurnedFromSteps(stepsNum, userWeightKg);
      onSubmit({ steps: stepsNum, caloriesBurned: calories, activityType: "walking" });
    } else if (inputMode === "duration" && durationMinutes) {
      const duration = parseInt(durationMinutes);
      const calories = calculateCaloriesBurnedFromDuration(duration, userWeightKg);
      onSubmit({ durationMinutes: duration, caloriesBurned: calories, activityType: "walking" });
    }
    setSteps("");
    setDurationMinutes("");
    setCaloriesBurned("");
    onClose();
  };

  const canSubmit = (inputMode === "calories" && caloriesBurned) || (inputMode === "steps" && steps) || (inputMode === "duration" && durationMinutes);

  const estimatedCalories = () => {
    if (inputMode === "calories" && caloriesBurned) {
      return parseInt(caloriesBurned);
    } else if (inputMode === "steps" && steps) {
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
              {inputMode === "calories" ? <Flame className="h-5 w-5 text-primary" /> : <Footprints className="h-5 w-5 text-primary" />}
              Log Activity
            </DrawerTitle>
          </DrawerHeader>

          <div className="px-4 pb-4 space-y-4 overflow-y-auto flex-1 overscroll-contain touch-pan-y" style={{WebkitOverflowScrolling: 'touch'}}>
            <div className="grid grid-cols-3 gap-2">
              <Button variant={inputMode === "calories" ? "default" : "outline"} onClick={() => setInputMode("calories")} className="flex-1">Calories</Button>
              <Button variant={inputMode === "steps" ? "default" : "outline"} onClick={() => setInputMode("steps")} className="flex-1">Steps</Button>
              <Button variant={inputMode === "duration" ? "default" : "outline"} onClick={() => setInputMode("duration")} className="flex-1">Walk</Button>
            </div>

            {inputMode === "calories" ? (
              <div className="space-y-2">
                <Label htmlFor="calories-burned">Calories burned</Label>
                <Input
                  id="calories-burned"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="e.g., 350"
                  value={caloriesBurned}
                  onChange={(e) => setCaloriesBurned(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Use this for gym, cycling, sport, or anything your watch reports.</p>
              </div>
            ) : inputMode === "steps" ? (
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
                  <p className="text-sm text-green-700">{inputMode === "calories" ? "Calories burned" : "Estimated calories burned"}</p>
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
