import { useState, useEffect, useRef } from "react";
import { Calculator, Loader2, User, Target, LogOut, Info, ChevronDown } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../components/ui/collapsible";
import { ThemeToggle } from "../components/theme-toggle";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../contexts/AuthContext";
import { UserProfile } from "../types/common";
import {
  UserProfilesGenderOptions,
  UserProfilesActivityLevelOptions,
  UserProfilesGoalOptions
} from "../types/pocketbase-types";
import pb from "../lib/pocketbase";
interface ProfilePageProps {
  onBack?: () => void;
}

export default function ProfilePage({ onBack }: ProfilePageProps) {
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    target_calories: 0,
    target_protein_g: 0,
    weight_kg: 0,
    age: 0,
    height_cm: 0,
    gender: UserProfilesGenderOptions.male,
    activity_level: UserProfilesActivityLevelOptions.sedentary,
    goal: UserProfilesGoalOptions.lose_weight,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [tipsOpen, setTipsOpen] = useState(false);
  const hasLoadedRef = useRef(false);
  const autoSaveReadyRef = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const suppressNextAutoSaveRef = useRef(false);

  const { user, logout } = useAuth();

  // Load user profile only once when user becomes available
  useEffect(() => {
    if (user && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadUserProfile();
    } else if (!user) {
      setIsLoading(false);
    }
  }, [user?.id]);

  const loadUserProfile = async () => {
    try {
      if (!user) return;

      setIsLoading(true);
      setError("");

      const records = await pb.collection("user_profiles").getList(1, 1, {
        filter: `user = "${user.id}"`,
      });

      if (records.items.length > 0) {
        const userProfile = records.items[0];
        setProfile({
          id: userProfile.id,
          target_calories: userProfile.target_calories || 2000,
          target_protein_g: userProfile.target_protein_g || 150,
          weight_kg: userProfile.weight_kg || 70,
          age: userProfile.age || 25,
          height_cm: userProfile.height_cm || 170,
          gender: userProfile.gender || UserProfilesGenderOptions.male,
          activity_level: userProfile.activity_level || UserProfilesActivityLevelOptions.moderate,
          goal: userProfile.goal || UserProfilesGoalOptions.maintain,
        });
      }
    } catch (error: unknown) {
      console.error("Failed to load user profile:", error);
      // Only show error if request wasn't canceled
      if (error instanceof Error && !error.message.includes('aborted')) {
        setError("Failed to load profile data");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    const numericFields: Array<keyof UserProfile> = ["age", "weight_kg", "height_cm", "target_calories", "target_protein_g"];
    setProfile((prev) => ({
      ...prev,
      [field]: numericFields.includes(field) ? parseInt(value) || 0 : value,
    }));
  };

  const saveProfile = async (
    nextProfile: Partial<UserProfile>,
    successMessage = "",
  ) => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!user) throw new Error("No user found");

      const profileData = {
        user: user.id,
        target_calories: nextProfile.target_calories,
        target_protein_g: nextProfile.target_protein_g,
        weight_kg: nextProfile.weight_kg,
        age: nextProfile.age,
        height_cm: nextProfile.height_cm,
        gender: nextProfile.gender,
        activity_level: nextProfile.activity_level,
        goal: nextProfile.goal,
      };

      if (nextProfile.id) {
        await pb.collection("user_profiles").update(nextProfile.id, profileData);
      } else {
        const newProfile = await pb.collection("user_profiles").create(profileData);
        setProfile((prev) => ({ ...prev, id: newProfile.id }));
      }

      if (successMessage) setSuccess(successMessage);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const recalculateGoals = async () => {
    const age = Number(profile.age) || 25;
    const weight = Number(profile.weight_kg) || 70;
    const height = Number(profile.height_cm) || 170;
    const isFemale = profile.gender === UserProfilesGenderOptions.female;
    const bmr = 10 * weight + 6.25 * height - 5 * age + (isFemale ? -161 : 5);
    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      "very active": 1.9,
    };
    let calories = bmr * (activityMultipliers[profile.activity_level || UserProfilesActivityLevelOptions.sedentary] || 1.2);
    if (profile.goal === UserProfilesGoalOptions.lose_weight) calories -= 500;
    if (profile.goal === UserProfilesGoalOptions.gain_weight || profile.goal === UserProfilesGoalOptions.gain_muscle) calories += 500;

    const nextProfile = {
      ...profile,
      target_calories: Math.round(calories),
      target_protein_g: Math.round(weight * 1.8),
    };

    suppressNextAutoSaveRef.current = true;
    setProfile(nextProfile);
    await saveProfile(nextProfile, "Goals recalculated and saved.");
  };

  useEffect(() => {
    if (isLoading || !user) return;

    if (!autoSaveReadyRef.current) {
      autoSaveReadyRef.current = true;
      return;
    }

    if (suppressNextAutoSaveRef.current) {
      suppressNextAutoSaveRef.current = false;
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      saveProfile(profile);
    }, 900);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [profile, isLoading, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin mx-auto mb-4 border-4 border-primary border-t-transparent rounded-full" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-10%,hsl(var(--primary)/0.20),transparent_36%),radial-gradient(circle_at_15%_45%,hsl(var(--primary)/0.10),transparent_28%)]" />
      <div className="relative max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground">Profile</h1>
            <p className="text-xs text-muted-foreground">Update your nutrition goals</p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={logout} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
        {/* Progress Tracking Tips */}
        <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
          <div className="space-y-2">
            <CollapsibleTrigger asChild>
              <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Info className="h-4 w-4" />
                <span>Progress Tracking Tips</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${tipsOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="space-y-3 text-xs text-muted-foreground pl-6 pt-2">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Calorie estimates are conservative</h4>
                  <p>CalorieMate uses conservative calculations for both food and activity. If you're not seeing progress after 1-2 weeks, your actual calorie needs may differ.</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Track progress consistently</h4>
                  <p>In a calorie deficit, you should start seeing changes within 1-2 weeks. Track your weight daily or weekly, take progress photos, and measure body parts.</p>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Adjust your goals if needed</h4>
                  <p>If you're not seeing expected changes after consistent tracking for 1-2 weeks, reassess your calorie targets here and make small adjustments (±200 kcal).</p>
                </div>
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>

        {/* Personal Information */}
        <Card className="border-white/10 bg-card/80 shadow-lg shadow-black/10 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => handleInputChange("age", e.target.value)}
                  min="1"
                  max="120"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={profile.weight_kg}
                  onChange={(e) => handleInputChange("weight_kg", e.target.value)}
                  min="1"
                  max="500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input id="height" type="number" value={profile.height_cm} onChange={(e) => handleInputChange("height_cm", e.target.value)} min="1" max="250" />
              </div>
              <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={profile.gender} onValueChange={(value) => handleInputChange("gender", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserProfilesGenderOptions.male}>Male</SelectItem>
                    <SelectItem value={UserProfilesGenderOptions.female}>Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nutrition Goals */}
        <Card className="border-white/10 bg-card/80 shadow-lg shadow-black/10 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Nutrition Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Goal</Label>
                <Select value={profile.goal} onValueChange={(value) => handleInputChange("goal", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserProfilesGoalOptions.lose_weight}>Lose weight</SelectItem>
                    <SelectItem value={UserProfilesGoalOptions.maintain}>Maintain</SelectItem>
                    <SelectItem value={UserProfilesGoalOptions.gain_weight}>Gain weight</SelectItem>
                    <SelectItem value={UserProfilesGoalOptions.gain_muscle}>Gain muscle</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Activity</Label>
                <Select value={profile.activity_level} onValueChange={(value) => handleInputChange("activity_level", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={UserProfilesActivityLevelOptions.sedentary}>Sedentary</SelectItem>
                    <SelectItem value={UserProfilesActivityLevelOptions.light}>Light</SelectItem>
                    <SelectItem value={UserProfilesActivityLevelOptions.moderate}>Moderate</SelectItem>
                    <SelectItem value={UserProfilesActivityLevelOptions.active}>Active</SelectItem>
                    <SelectItem value={UserProfilesActivityLevelOptions["very active"]}>Very active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={recalculateGoals} disabled={isSaving} className="w-full rounded-2xl">
              <Calculator className="h-4 w-4 mr-2" />
              Recalculate and save
            </Button>
            <div className="space-y-2">
              <Label htmlFor="calories">Daily Calories Target</Label>
              <Input
                id="calories"
                type="number"
                value={profile.target_calories}
                onChange={(e) =>
                  handleInputChange("target_calories", e.target.value)
                }
                min="800"
                max="5000"
              />
               <p className="text-xs text-muted-foreground">
                Recommended: 1,500-3,000 kcal/day
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="protein">Daily Protein Target (g)</Label>
              <Input
                id="protein"
                type="number"
                value={profile.target_protein_g}
                onChange={(e) =>
                  handleInputChange("target_protein_g", e.target.value)
                }
                min="20"
                max="400"
              />
              <p className="text-xs text-muted-foreground">
                Recommended: 1.6-2.2g per kg body weight
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-secondary border border-secondary rounded-md p-3">
            <p className="text-sm text-primary">
              {success}
            </p>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {isSaving ? (
            <span className="inline-flex items-center gap-2 text-primary">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving changes...
            </span>
          ) : (
            "Changes save automatically."
          )}
        </p>
      </div>
    </div>
  );
}

