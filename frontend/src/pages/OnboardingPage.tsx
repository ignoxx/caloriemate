import { useState } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { User, Target, Calculator, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "../components/theme-toggle";
import { OnboardingData, OnboardingFormData } from "../types/common";
import { 
  UserProfilesGenderOptions, 
  UserProfilesActivityLevelOptions, 
  UserProfilesGoalOptions 
} from "../types/pocketbase-types";

interface OnboardingPageProps {
  onComplete: (data: OnboardingData) => void;
  onBack?: () => void;
}

export default function OnboardingPage({
  onComplete,
  onBack,
}: OnboardingPageProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingFormData>({
    age: "",
    weight: "",
    height: "",
    gender: UserProfilesGenderOptions.male,
    activity: UserProfilesActivityLevelOptions.moderate,
    goal: UserProfilesGoalOptions.maintain,
    customCalories: "",
    customProtein: "",
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const calculateGoals = () => {
    const age = Number.parseInt(formData.age);
    const weight = Number.parseInt(formData.weight);
    const height = Number.parseInt(formData.height);

    // Simple BMR calculation (Mifflin-St Jeor)
    let bmr: number;
    if (formData.gender === "male") {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      "very active": 1.9,
    };

    const tdee = bmr * activityMultipliers[formData.activity];

    // Goal adjustment
    let calories = tdee;
    if (formData.goal === "lose_weight") calories -= 500;
    if (formData.goal === "gain_weight" || formData.goal === "gain_muscle")
      calories += 500;

    // Protein: 1.6-2.2g per kg body weight
    const protein = Math.round(weight * 1.8);

    return {
      calories: Math.round(calories),
      protein,
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-md mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              {onBack && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onBack}
                  title="Back to signup"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Setup Your Profile
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Step {step} of 3
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <User className="h-5 w-5 text-primary" />}
              {step === 2 && <Target className="h-5 w-5 text-primary" />}
              {step === 3 && <Calculator className="h-5 w-5 text-primary" />}
              {step === 1 && "Tell us about yourself"}
              {step === 2 && "Your goals"}
              {step === 3 && "Set your targets"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                    onChange={(e) =>
                      handleInputChange("weight", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="175"
                    value={formData.height}
                    onChange={(e) =>
                      handleInputChange("height", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Gender</Label>
                  <select
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground"
                    value={formData.gender}
                    onChange={(e) =>
                      handleInputChange("gender", e.target.value)
                    }
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <Button
                  onClick={() => setStep(2)}
                  className="w-full"
                  disabled={
                    !formData.age || !formData.weight || !formData.height
                  }
                >
                  Next
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label>Activity Level</Label>
                  <select
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground"
                    value={formData.activity}
                    onChange={(e) =>
                      handleInputChange("activity", e.target.value)
                    }
                  >
                    <option value="sedentary">Sedentary (desk job)</option>
                    <option value="light">
                      Light exercise (1-3 days/week)
                    </option>
                    <option value="moderate">
                      Moderate exercise (3-5 days/week)
                    </option>
                    <option value="active">Active (6-7 days/week)</option>
                    <option value="very active">Very active (2x/day)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <select
                    className="w-full p-2 border border-input rounded-md bg-background text-foreground"
                    value={formData.goal}
                    onChange={(e) => handleInputChange("goal", e.target.value)}
                  >
                    <option value="lose_weight">Lose weight</option>
                    <option value="maintain">Maintain weight</option>
                    <option value="gain_weight">Gain weight</option>
                    <option value="gain_muscle">Gain muscle</option>
                  </select>
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
                <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
                  <h3 className="font-medium text-primary">
                    Calculated Targets
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Calories: {calculateGoals().calories} kcal/day
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Protein: {calculateGoals().protein}g/day
                  </p>
                </div>

                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Or set custom targets:
                  </p>
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
                    Complete Setup
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
