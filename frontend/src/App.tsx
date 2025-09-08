import { useAuth, AuthProvider } from './contexts/AuthContext'
import CalorieTracker from './pages/CalorieTracker'
import AuthPage from './pages/AuthPage'
import { ThemeProvider } from './components/theme-provider'
import { Loader2 } from 'lucide-react'

function AppContent() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return user ? <CalorieTracker /> : <AuthPage />
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App