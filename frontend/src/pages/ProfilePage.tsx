import { useState, useEffect, useRef } from "react";
import { Loader2, User, Target, Save, ArrowLeft, LogOut } from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ThemeToggle } from "../components/theme-toggle";
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
  const hasLoadedRef = useRef(false);

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
    const numValue = parseInt(value) || 0;
    setProfile((prev) => ({
      ...prev,
      [field]: numValue,
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!user) throw new Error("No user found");

      const profileData = {
        user: user.id,
        target_calories: profile.target_calories,
        target_protein_g: profile.target_protein_g,
        weight_kg: profile.weight_kg,
        age: profile.age,
      };

      if (profile.id) {
        // Update existing profile
        await pb.collection("user_profiles").update(profile.id, profileData);
      } else {
        // Create new profile
        const newProfile = await pb
          .collection("user_profiles")
          .create(profileData);
        setProfile((prev) => ({ ...prev, id: newProfile.id }));
      }

      setSuccess("Profile updated successfully!");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

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
                  title="Back to dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Profile
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Update your nutrition goals
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={logout}
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        {/* Personal Information */}
        <Card>
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
          </CardContent>
        </Card>

        {/* Nutrition Goals */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Nutrition Goals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full"
          size="lg"
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

