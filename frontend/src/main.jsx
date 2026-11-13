// Starting point of the app: sets up the theme, login, readings and pages.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ReadingsProvider } from './data/ReadingsContext'
import { AuthProvider } from './auth/AuthContext'
import { ThemeProvider } from './theme/ThemeContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <ReadingsProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ReadingsProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
