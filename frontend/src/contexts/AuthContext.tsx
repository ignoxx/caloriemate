import React, { createContext, useContext, useEffect, useState } from 'react'
import pb, { type User } from '../lib/pocketbase'

interface SignupData {
  email: string
  password: string
  passwordConfirm: string
  name?: string
}

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
    // Check if user is already authenticated on app start
    const checkAuth = () => {
      if (pb.authStore.isValid && pb.authStore.record) {
        setUser(pb.authStore.record as User)
      }
      setIsLoading(false)
    }

    checkAuth()

    // Listen for auth changes
    const unsubscribe = pb.authStore.onChange(() => {
      if (pb.authStore.isValid && pb.authStore.record) {
        setUser(pb.authStore.record as User)
      } else {
        setUser(null)
      }
    })

    return unsubscribe
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password)
      setUser(authData.record as User)
    } catch (error) {
      throw error
    }
  }

  const signup = async (data: SignupData) => {
    try {
      // Create the user account
      const record = await pb.collection('users').create(data)
      
      // Automatically log them in after signup
      const authData = await pb.collection('users').authWithPassword(data.email, data.password)
      setUser(authData.record as User)
    } catch (error) {
      throw error
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
