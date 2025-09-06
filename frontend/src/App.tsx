import CalorieTracker from './pages/CalorieTracker'
import { ThemeProvider } from './components/theme-provider'

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <CalorieTracker />
    </ThemeProvider>
  )
}

export default App