import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Home from './pages/Home'
import Chart from './pages/Chart'
import Synastry from './pages/Synastry'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Logout from './pages/Logout'
import ConfirmEmail from './pages/ConfirmEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

function LanguageSync() {
  const { i18n } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    const match = location.pathname.match(/^\/(ru|en)\//)
    if (match) {
      const urlLang = match[1]
      if (urlLang !== i18n.language) {
        i18n.changeLanguage(urlLang)
      }
    }
  }, [location, i18n])

  return null
}

function AppRoutes() {
  const { i18n } = useTranslation()
  const location = useLocation()

  const specialRoutes = ['/confirm', '/reset-password', '/chart/']
  const isSpecialRoute = specialRoutes.some(route => location.pathname.startsWith(route))
  const hasLangPrefix = location.pathname.match(/^\/(ru|en)\//)

  if (!isSpecialRoute && !hasLangPrefix && location.pathname !== '/') {
    const currentLang = i18n.language || 'ru'
    return <Navigate to={`/${currentLang}${location.pathname}`} replace />
  }

  if (location.pathname === '/') {
    const currentLang = i18n.language || 'ru'
    return <Navigate to={`/${currentLang}`} replace />
  }

  return (
    <Routes>
      <Route path="/:lang/" element={<Home />} />
      <Route path="/:lang/chart/:id" element={<Chart />} />
      <Route path="/:lang/synastry" element={<Synastry />} />
      <Route path="/:lang/dashboard"  element={<Dashboard key={location.key} />}  />
      <Route path="/:lang/login" element={<Login />} />
      <Route path="/:lang/register" element={<Register />} />
      <Route path="/:lang/logout" element={<Logout />} />
      <Route path="/confirm" element={<ConfirmEmail />} />
      <Route path="/:lang/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  )
}

function App() {
  return (
    <div className="app">
      <LanguageSync />
      <AppRoutes />
    </div>
  )
}

export default App