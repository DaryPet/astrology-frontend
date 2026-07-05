import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
}

interface HeaderProps {
  hasUnsavedAnalysis?: boolean;
  onProtectedNavigate?: (to: string) => void;
}

const languages: Language[] = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];

const Header: React.FC<HeaderProps> = ({ hasUnsavedAnalysis = false, onProtectedNavigate }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const [langOpen, setLangOpen] = useState(false);

  const currentLangCode = lang || i18n.language || 'ru';
  const currentLang = languages.find(l => l.code === currentLangCode) || languages[0];

  const handleLogout = async () => {
    await signOut();
    navigate(`/${currentLangCode}/`);
  };

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    const currentPath = window.location.pathname.replace(/^\/(ru|en|es|de|fr)/, '');
    window.location.href = `/${langCode}${currentPath || '/'}`;
    setLangOpen(false);
  };

  const handleNavClick = (to: string) => (e: React.MouseEvent) => {
    if (onProtectedNavigate && hasUnsavedAnalysis) {
      e.preventDefault();
      onProtectedNavigate(to);
    }
  };

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo" onClick={() => navigate(`/${currentLangCode}/`)} style={{ cursor: 'pointer' }}>
          {t('chart.logo')}
        </div>
        <nav className="nav">
          <Link to={`/${currentLangCode}/`} className="nav-link" onClick={handleNavClick(`/${currentLangCode}/`)}>{t('nav.home')}</Link>
          <Link to={`/${currentLangCode}/synastry`} className="nav-link" onClick={handleNavClick(`/${currentLangCode}/synastry`)}>{t('nav.synastry')}</Link>
          <Link to={`/${currentLangCode}/daily-forecast`} className="nav-link" onClick={handleNavClick(`/${currentLangCode}/daily-forecast`)}>{t('nav.dailyForecast')}</Link>
          {isAuthenticated ? (
            <>
              <Link to={`/${currentLangCode}/dashboard`} className="nav-link">{t('nav.dashboard')}</Link>
              <div className="user-info">
                <span className="user-name">{(user as { user_metadata?: { name?: string }; email?: string })?.user_metadata?.name || (user as { email?: string })?.email}</span>
                <button className="btn-logout" onClick={handleLogout}>{t('nav.logout')}</button>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to={`/${currentLangCode}/login`} className="btn-login">{t('nav.login')}</Link>
              <Link to={`/${currentLangCode}/register`} className="btn-register">{t('nav.register')}</Link>
            </div>
          )}
        </nav>
        <div className="language-dropdown" style={{ position: 'relative', marginLeft: '20px' }}>
          <button
            onClick={() => setLangOpen(!langOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            🌐 {currentLang.name}
            <span style={{ fontSize: '10px' }}>▼</span>
          </button>
          {langOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              minWidth: '140px'
            }}>
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 16px',
                    background: currentLangCode === lang.code ? 'var(--accent)' : 'transparent',
                    color: currentLangCode === lang.code ? '#fff' : 'var(--text-primary)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    if (currentLangCode !== lang.code) e.currentTarget.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (currentLangCode !== lang.code) e.currentTarget.style.background = 'transparent';
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? t('common.switchToLight') : t('common.switchToDark')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            padding: '8px 12px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '14px',
            lineHeight: '1'
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  );
};

export default Header;