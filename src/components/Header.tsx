import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
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
  { code: 'uk', name: 'Українська' },
];

const Header: React.FC<HeaderProps> = ({ hasUnsavedAnalysis = false, onProtectedNavigate }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const [langOpen, setLangOpen] = useState(false);
  // The mobile menu lives here, not in App/Dashboard — modelled on the sidebar
  // drawer (openspec/changes/premium-design-system, Decision 5). At ≥900px the
  // class does nothing: all the mechanics are inside @media.
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Esc closes the menu. The listener is attached only while it is open, so on
  // desktop and with the menu closed it does not exist at all.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  const currentLangCode = lang || i18n.language || 'ru';
  const currentLang = languages.find(l => l.code === currentLangCode) || languages[0];

  const handleLogout = async () => {
    await signOut();
    navigate(`/${currentLangCode}/`);
  };

  const changeLanguage = (langCode: string) => {
    i18n.changeLanguage(langCode);
    const currentPath = window.location.pathname.replace(/^\/(ru|en|uk|es|de|fr)/, '');
    window.location.href = `/${langCode}${currentPath || '/'}`;
    setLangOpen(false);
  };

  const handleNavClick = (to: string) => (e: React.MouseEvent) => {
    setMenuOpen(false);
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
        {/* One markup for every width. At ≥900px this wrapper is `display:
            contents`, so .nav and .language-dropdown stay direct flex children of
            .header-content and the desktop layout is unchanged; below 900px the
            same wrapper becomes the slide-out panel. No duplicated navigation. */}
        {/* Drawer clipper. The animation below starts at `transform:
            translateX(100%)`, and a transformed block still counts towards the
            scrollable overflow of the nearest ancestor that has none — which
            inflated window.innerWidth from 430 to 750 and clipped the fixed
            analysis modals. This static, transform-free box with `overflow:
            hidden` absorbs that contribution in place. See INSIGHTS.md 2026-08-24. */}
        <div className={`header-panel-clip${menuOpen ? ' header-panel-clip--open' : ''}`}>
          <div
            id="header-menu"
            className={`header-panel${menuOpen ? ' header-panel--open' : ''}`}
          >
            <button
              type="button"
              className="header-panel__close"
              onClick={closeMenu}
              aria-label={t('nav.closeMenu')}
            >
              <X size={18} strokeWidth={2} />
            </button>

            <nav className="nav">
              <Link to={`/${currentLangCode}/`} className="nav-link" onClick={handleNavClick(`/${currentLangCode}/`)}>{t('nav.home')}</Link>
              <Link to={`/${currentLangCode}/synastry`} className="nav-link" onClick={handleNavClick(`/${currentLangCode}/synastry`)}>
                {t('nav.synastry')} <span style={{ opacity: 0.65, fontWeight: 400 }}>({t('nav.synastryHint')})</span>
              </Link>
              {/* v1.2: event analysis temporarily hidden from the header, do not delete
              <Link to={`/${currentLangCode}/event-analysis`} className="nav-link" onClick={handleNavClick(`/${currentLangCode}/event-analysis`)}>{t('nav.eventAnalysis')}</Link>
              */}
              {isAuthenticated ? (
                <>
                  <Link to={`/${currentLangCode}/dashboard`} className="nav-link" onClick={closeMenu}>{t('nav.dashboard')}</Link>
                  <div className="user-info">
                    <span className="user-name">{(user as { user_metadata?: { name?: string }; email?: string })?.user_metadata?.name || (user as { email?: string })?.email}</span>
                    <button className="btn-logout" onClick={() => { closeMenu(); handleLogout(); }}>{t('nav.logout')}</button>
                  </div>
                </>
              ) : (
                <div className="auth-buttons">
                  <Link to={`/${currentLangCode}/login`} className="btn-login" onClick={closeMenu}>{t('nav.login')}</Link>
                  <Link to={`/${currentLangCode}/register`} className="btn-register" onClick={closeMenu}>{t('nav.register')}</Link>
                </div>
              )}
            </nav>
            <div className="language-dropdown" style={{ position: 'relative' }}>
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
              {/* Styles moved into the .language-menu class value-for-value. Same
                  reason as the theme button: inline styles cannot be overridden in
                  @media, and inside the drawer (overflow-y: auto) an absolute menu
                  dropping downwards would be clipped by the panel's bottom edge. */}
              {langOpen && (
                <div className="language-menu">
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
          </div>
        </div>

        {/* The overlay and the panel are children of .header (position: sticky),
            so they position against it, not the viewport. Deliberate: .header has
            a backdrop-filter, which — like transform — creates a containing block
            for fixed descendants (the mechanism that broke six modals, INSIGHTS.md
            2026-08-23). An explicit `absolute` does not depend on that filter staying. */}
        {menuOpen && (
          <div className="header-overlay" onClick={closeMenu} aria-hidden="true" />
        )}

        <button
          type="button"
          className="header-icon-btn"
          onClick={toggleTheme}
          title={theme === 'dark' ? t('common.switchToLight') : t('common.switchToDark')}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        <button
          type="button"
          className={`header-burger${menuOpen ? ' header-burger--hidden' : ''}`}
          onClick={() => setMenuOpen(true)}
          aria-label={t('nav.openMenu')}
          aria-expanded={menuOpen}
          aria-controls="header-menu"
        >
          <Menu size={20} strokeWidth={2} />
        </button>
      </div>
    </header>
  );
};

export default Header;