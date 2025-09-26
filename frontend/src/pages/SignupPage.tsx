import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ThemeToggle } from "../components/theme-toggle";
import OnboardingPage from "./OnboardingPage";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "../lib/utils";
import { OnboardingData, UserGoals, SignupData } from "../types/common";

interface SignupPageProps {
  onSwitchToLogin?: () => void;
}

export default function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [signupData, setSignupData] = useState<SignupData | null>(null);

  const { signup } = useAuth();

  const calculateGoalsFromOnboarding = (data: OnboardingData): UserGoals => {
    if (data.customCalories && data.customProtein) {
      return {
        target_calories: data.customCalories,
        target_protein_g: data.customProtein,
        weight: data.weight,
        age: data.age,
      };
    }

    // Calculate BMR
    let bmr: number;
    if (data.gender === "male") {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
    } else {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      "very active": 1.9,
    };

    const tdee = bmr * activityMultipliers[data.activityLevel];

    // Goal adjustment
    let calories = tdee;
    if (data.goal === "lose_weight") calories -= 500;
    if (data.goal === "gain_weight" || data.goal === "gain_muscle")
      calories += 500;

    // Protein calculation
    const protein = Math.round(data.weight * 1.8);

    return {
      target_calories: Math.round(calories),
      target_protein_g: protein,
      weight: data.weight,
      age: data.age,
    };
  };

  const handleOnboardingComplete = async (data: OnboardingData) => {
    setIsLoading(true);
    try {
      // Calculate goals from onboarding data
      const goals = calculateGoalsFromOnboarding(data);

      await signup({
        ...signupData,
        onboardingData: data,
        userGoals: goals,
      });
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Signup failed. Please try again.");
      setShowOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.id]: e.target.value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    // Validate passwords match
    if (formData.password !== formData.passwordConfirm) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setIsLoading(false);
      return;
    }

    // Store signup data and show onboarding
    setSignupData({
      email: formData.email,
      password: formData.password,
      passwordConfirm: formData.passwordConfirm,
      name: formData.name,
    });
    setShowOnboarding(true);
    setIsLoading(false);
  };

  if (showOnboarding) {
    return (
      <OnboardingPage
        onComplete={handleOnboardingComplete}
        onBack={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card shadow-sm border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                CalorieMate
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Your personal nutrition assistant
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Signup Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className={cn("flex flex-col gap-6 w-full max-w-4xl")}>
          <Card className="overflow-hidden p-0">
            <CardContent className="grid p-0 md:grid-cols-2">
              <form onSubmit={handleSubmit} className="p-6 md:p-8">
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col items-center text-center">
                    <h1 className="text-2xl font-bold">Create your account</h1>
                    <p className="text-muted-foreground text-balance">
                      Join CalorieMate and start tracking your nutrition
                    </p>
                  </div>

                  {error && (
                    <div className="bg-destructive/15 border border-destructive/50 rounded-md p-3">
                      <p className="text-sm text-destructive">
                        {error}
                      </p>
                    </div>
                  )}

                  <div className="grid gap-3">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="m@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Choose a strong password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-muted-foreground">
                      Password must be at least 8 characters long
                    </p>
                  </div>

                  <div className="grid gap-3">
                    <Label htmlFor="passwordConfirm">Confirm Password</Label>
                    <Input
                      id="passwordConfirm"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.passwordConfirm}
                      onChange={handleChange}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Continue to Setup"
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={onSwitchToLogin}
                      className="underline underline-offset-4 hover:text-primary"
                    >
                      Sign in
                    </button>
                  </div>
                </div>
              </form>
              <div className="bg-muted relative hidden md:block">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600 to-blue-700 flex items-center justify-center">
                  <div className="text-center text-white p-8">
                    <div className="mb-6">
                      <div className="w-16 h-16 bg-white/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <svg
                          className="w-8 h-8"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold mb-2">
                        Start Your Journey
                      </h3>
                      <p className="text-white/80">
                        Set personalized nutrition goals, track your progress,
                        and achieve your health objectives with CalorieMate.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="text-muted-foreground text-center text-xs text-balance">
            By creating an account, you agree to our{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="#"
              className="underline underline-offset-4 hover:text-primary"
            >
              Privacy Policy
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
}

