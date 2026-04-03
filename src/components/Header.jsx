import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  const [langOpen, setLangOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    setLangOpen(false);
  };

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  return (
    <header className="header">
      <div className="container header-content">
        <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          {t('chart.logo')}
        </div>
        <nav className="nav">
          <Link to="/" className="nav-link">{t('nav.home')}</Link>
          <Link to="/synastry" className="nav-link">{t('nav.synastry')}</Link>
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">{t('nav.dashboard')}</Link>
              <div className="user-info">
                <span className="user-name">{user?.user_metadata?.name || user?.email}</span>
                <button className="btn-logout" onClick={handleLogout}>{t('nav.logout')}</button>
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-login">{t('nav.login')}</Link>
              <Link to="/register" className="btn-register">{t('nav.register')}</Link>
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
                    background: i18n.language === lang.code ? 'var(--accent)' : 'transparent',
                    color: i18n.language === lang.code ? '#fff' : 'var(--text-primary)',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => {
                    if (i18n.language !== lang.code) e.target.style.background = 'var(--bg-secondary)';
                  }}
                  onMouseLeave={(e) => {
                    if (i18n.language !== lang.code) e.target.style.background = 'transparent';
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