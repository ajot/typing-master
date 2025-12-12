import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LeaderboardPage } from './pages/LeaderboardPage.tsx'
import { AdminPage } from './pages/AdminPage.tsx'
import { VibePage } from './pages/VibePage.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/vibe" element={<VibePage />} />
          {import.meta.env.DEV && <Route path="/admin" element={<AdminPage />} />}
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
)
