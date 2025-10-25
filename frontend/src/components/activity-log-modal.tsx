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
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Footprints className="h-5 w-5 text-green-600" />
            Log Walking Activity
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4 space-y-4">
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
                placeholder="e.g., 30"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          )}

          {canSubmit && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
              <p className="text-sm text-green-700">Estimated calories burned</p>
              <p className="text-2xl font-bold text-green-800">{estimatedCalories()} kcal</p>
            </div>
          )}
        </div>

        <DrawerFooter>
          <Button onClick={handleSubmit} disabled={!canSubmit} className="w-full">
            Log Activity
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Cancel
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
