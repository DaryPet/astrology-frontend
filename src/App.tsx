import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Home from './pages/Home';
import Synastry from './pages/Synastry';
import Dashboard from './pages/Dashboard';
import DailyForecast from './pages/DailyForecast';
import Login from './pages/Login';
import Register from './pages/Register';
import Logout from './pages/Logout';
import ConfirmEmail from './pages/ConfirmEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

function LanguageSync() {
  const { i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    const match = location.pathname.match(/^\/(ru|en)\//);
    if (match) {
      const urlLang = match[1];
      if (urlLang !== i18n.language) {
        i18n.changeLanguage(urlLang);
      }
    }
  }, [location, i18n]);

  return null;
}

function ChartRedirect() {
  const { id } = useParams();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || 'ru';
  return <Navigate to={`/${currentLang}/dashboard?chart=${id}`} replace />;
}

function AppRoutes() {
  const { i18n } = useTranslation();
  const location = useLocation();

  // Extract lang from URL
  const langMatch = location.pathname.match(/^\/(ru|en)\//);
  const currentLang = langMatch ? langMatch[1] : i18n.language || 'ru';

  const specialRoutes = ['/confirm', '/reset-password'];
  const isSpecialRoute = specialRoutes.some(route => location.pathname.startsWith(route));
  const hasLangPrefix = Boolean(langMatch);

  if (!isSpecialRoute && !hasLangPrefix && location.pathname !== '/') {
    return <Navigate to={`/${currentLang}${location.pathname}`} replace />;
  }

  if (location.pathname === '/') {
    return <Navigate to={`/${currentLang}`} replace />;
  }

  return (
    <Routes>
      <Route path="/:lang/" element={<Home />} />
      <Route path="/:lang/chart/:id" element={<ChartRedirect />} />
      <Route path="/:lang/synastry" element={<Synastry />} />
      <Route path="/:lang/daily-forecast" element={<DailyForecast />} />
      <Route path="/:lang/dashboard" element={<Dashboard key={location.key} />} />
      <Route path="/:lang/login" element={<Login />} />
      <Route path="/:lang/register" element={<Register />} />
      <Route path="/:lang/logout" element={<Logout />} />
      <Route path="/confirm" element={<ConfirmEmail />} />
      <Route path="/:lang/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="app">
      <LanguageSync />
      <AppRoutes />
    </div>
  );
}

export default App;