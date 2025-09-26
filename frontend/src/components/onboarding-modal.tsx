import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "./ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { User, Target, Calculator } from "lucide-react";
import { OnboardingData, OnboardingFormData } from "../types/common";
import { 
  UserProfilesGenderOptions, 
  UserProfilesActivityLevelOptions, 
  UserProfilesGoalOptions 
} from "../types/pocketbase-types";

interface OnboardingModalProps {
  open: boolean;
  onComplete: (data: OnboardingData) => void;
}

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    age: "",
    weight: "",
    height: "",
    gender: UserProfilesGenderOptions.male,
    activity: UserProfilesActivityLevelOptions.sedentary,
    goal: UserProfilesGoalOptions.lose_weight,
    customProtein: "",
    customCalories: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateGoals = () => {
    const age = Number.parseInt(formData.age);
    const weight = Number.parseInt(formData.weight);
    const height = Number.parseInt(formData.height);

    // Simple BMR calculation (Mifflin-St Jeor for male, approximate)
    const bmr = 10 * weight + 6.25 * height - 5 * age + 5;

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      "very active": 1.9,
    };

    const tdee =
      bmr *
      activityMultipliers[
        formData.activity as keyof typeof activityMultipliers
      ];

    // Goal adjustment
    let calories = tdee;
    if (formData.goal === "lose_weight") calories -= 500;
    if (formData.goal === "gain_weight") calories += 500;

    // Protein: 1.6-2.2g per kg body weight
    const protein = Math.round(weight * 1.8);

    return {
      calories: Math.round(calories),
      protein,
      weight,
      age,
    };
  };

  const handleComplete = () => {
    const onboardingData: OnboardingData = {
      age: parseInt(formData.age),
      weight: parseInt(formData.weight),
      height: parseInt(formData.height),
      gender: formData.gender,
      activityLevel: formData.activity,
      goal: formData.goal,
      customCalories: formData.customCalories
        ? parseInt(formData.customCalories)
        : undefined,
      customProtein: formData.customProtein
        ? parseInt(formData.customProtein)
        : undefined,
    };

    onComplete(onboardingData);
  };

  return (
    <Drawer open={open} onOpenChange={() => {}}>
      <DrawerContent className="max-h-[95vh] md:max-h-[90vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {step === 1 && <User className="h-5 w-5 text-primary" />}
            {step === 2 && <Target className="h-5 w-5 text-primary" />}
            {step === 3 && <Calculator className="h-5 w-5 text-primary" />}
            {step === 1 && "Tell us about yourself"}
            {step === 2 && "Your goals"}
            {step === 3 && "Set your targets"}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 space-y-4 overflow-y-auto flex-1">
          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  placeholder="25"
                  value={formData.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="70"
                  value={formData.weight}
                  onChange={(e) => handleInputChange("weight", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  placeholder="175"
                  value={formData.height}
                  onChange={(e) => handleInputChange("height", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange("gender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setStep(2)}
                className="w-full"
                disabled={!formData.age || !formData.weight || !formData.height}
              >
                Next
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-2">
                <Label>Activity Level</Label>
                <Select
                  value={formData.activity}
                  onValueChange={(value) => handleInputChange("activity", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sedentary">Sedentary (desk job)</SelectItem>
                    <SelectItem value="light">Light exercise (1-3 days/week)</SelectItem>
                    <SelectItem value="moderate">
                      Moderate exercise (3-5 days/week)
                    </SelectItem>
                    <SelectItem value="active">Active (6-7 days/week)</SelectItem>
                    <SelectItem value="very active">Very active (2x/day)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Goal</Label>
                <Select
                  value={formData.goal}
                  onValueChange={(value) => handleInputChange("goal", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lose_weight">Lose weight</SelectItem>
                    <SelectItem value="maintain">Maintain weight</SelectItem>
                    <SelectItem value="gain_weight">Gain weight</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="bg-secondary p-4 rounded-lg space-y-2">
                <h3 className="font-medium text-primary">
                  Calculated Targets
                </h3>
                <p className="text-sm text-primary">
                  Calories: {calculateGoals().calories} kcal/day
                </p>
                <p className="text-sm text-primary">
                  Protein: {calculateGoals().protein}g/day
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">Or set custom targets:</p>
                <div className="space-y-2">
                  <Label htmlFor="customCalories">Daily Calories</Label>
                  <Input
                    id="customCalories"
                    type="number"
                    placeholder={calculateGoals().calories.toString()}
                    value={formData.customCalories}
                    onChange={(e) =>
                      handleInputChange("customCalories", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customProtein">Daily Protein (g)</Label>
                  <Input
                    id="customProtein"
                    type="number"
                    placeholder={calculateGoals().protein.toString()}
                    value={formData.customProtein}
                    onChange={(e) =>
                      handleInputChange("customProtein", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button onClick={handleComplete} className="flex-1">
                  Get Started
                </Button>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
