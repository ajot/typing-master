import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LeaderboardPage } from './pages/LeaderboardPage.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { VibePage } from './pages/VibePage.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import { AuthProvider } from './contexts/AuthContext'
import LoginPage, { VerifyPage } from './pages/LoginPage'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardPage from './pages/DashboardPage'
import DashboardEventPage from './pages/DashboardEventPage'
import PricingPage from './pages/PricingPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/vibe" element={<VibePage />} />
          {import.meta.env.DEV && <Route path="/admin" element={<AdminPage />} />}
          <Route path="/login" element={<AuthProvider><LoginPage /></AuthProvider>} />
          <Route path="/login/verify" element={<AuthProvider><VerifyPage /></AuthProvider>} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/dashboard" element={<AuthProvider><DashboardLayout /></AuthProvider>}>
            <Route index element={<DashboardPage />} />
            <Route path="events/:eventId" element={<DashboardEventPage />} />
          </Route>
          <Route path="/:eventSlug/leaderboard" element={<LeaderboardPage />} />
          <Route path="/:eventSlug" element={<App />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
