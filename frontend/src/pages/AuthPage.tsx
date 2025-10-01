import React, { useState } from 'react'
import LoginPage from './LoginPage'
import SignupPage from './SignupPage'

type AuthMode = 'login' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>('login')

  const switchToSignup = () => setMode('signup')
  const switchToLogin = () => setMode('login')

  if (mode === 'signup') {
    return <SignupPage onSwitchToLogin={switchToLogin} />
  }

  return <LoginPage onSwitchToSignup={switchToSignup} />
}