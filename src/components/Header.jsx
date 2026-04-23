import React, { useState } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ru', name: 'Русский' },
  { code: 'en', name: 'English' },
];

const Header = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const [langOpen, setLangOpen] = useState(false);

  const currentLangCode = lang || i18n.language || 'ru';
  const currentLang = languages.find(l => l.code === currentLangCode) || languages[0];

  const handleLogout = async () => {
    await signOut();
    navigate(`/${currentLangCode}/`);
  };

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    const currentPath = window.location.pathname.replace(/^\/(ru|en|es|de|fr)/, '');
    window.location.href = `/${langCode}${currentPath || '/'}`;
    setLangOpen(false);
  };

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo" onClick={() => navigate(`/${currentLangCode}/`)} style={{ cursor: 'pointer' }}>
          {t('chart.logo')}
        </div>
        <nav className="nav">
          <Link to={`/${currentLangCode}/`} className="nav-link">{t('nav.home')}</Link>
          <Link to={`/${currentLangCode}/synastry`} className="nav-link">{t('nav.synastry')}</Link>
          {isAuthenticated ? (
            <>
              <Link to={`/${currentLangCode}/dashboard`} className="nav-link">{t('nav.dashboard')}</Link>
              <div className="user-info">
                <span className="user-name">{user?.user_metadata?.name || user?.email}</span>
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
                    if (currentLangCode !== lang.code) e.target.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (currentLangCode !== lang.code) e.target.style.background = 'transparent';
                  }}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;