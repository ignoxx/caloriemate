import React, { createContext, useContext, useEffect, useState } from 'react'
import pb, { type User } from '../lib/pocketbase'
import { SignupData } from '../types/common'
import { Collections } from '@/types/pocketbase-types'

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Clean up old localStorage data that might cause issues
    const cleanupOldStorage = () => {
      try {
        // Remove any old user goals that might conflict
        const oldKeys = ['userGoals', 'isOnboarded', 'onboardingData'];
        oldKeys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
          }
        });
      } catch (error) {
        console.warn('Failed to cleanup old localStorage:', error);
      }
    };

    // Check if user is already authenticated on app start
    const checkAuth = () => {
      cleanupOldStorage();

      if (pb.authStore.isValid && pb.authStore.record) {
        setUser(pb.authStore.record as unknown as User)
      }
      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.record) {
        setUser(pb.authStore.record as unknown as User)
      } else {
        setUser(null)
      }
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email, password)
    setUser(authData.record as unknown as User)
  }

  const signup = async (data: SignupData) => {
    // Create the user account
    await pb.collection(Collections.Users).create(data)

    // Automatically log them in after signup
    const authData = await pb.collection('users').authWithPassword(data.email, data.password)
    setUser(authData.record as unknown as User)

    // Create user profile with goals if provided
    if (data.onboardingData && data.userGoals) {
      try {
        await pb.collection(Collections.UserProfiles).create({
          user: authData.record.id,
          target_calories: data.userGoals.target_calories,
          target_protein_g: data.userGoals.target_protein_g,
          weight_kg: data.onboardingData.weight,
          age: data.onboardingData.age,
          height_cm: data.onboardingData.height,
          gender: data.onboardingData.gender,
          activity_level: data.onboardingData.activityLevel,
          goal: data.onboardingData.goal,
        })
      } catch (error) {
        console.error('Failed to create user profile:', error)
        throw error
      }
    }
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
