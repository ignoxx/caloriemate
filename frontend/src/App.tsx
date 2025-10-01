import { useAuth, AuthProvider } from './contexts/AuthContext'
import CalorieTracker from './pages/CalorieTracker'
import AuthPage from './pages/AuthPage'
import { ThemeProvider } from './components/theme-provider'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <CalorieTracker /> : <AuthPage />
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App