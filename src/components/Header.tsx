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
  // Мобильное меню живёт здесь, а не в App/Dashboard — по образцу drawer'а
  // сайдбара (openspec/changes/premium-design-system, Decision 5). На ≥900px
  // класс ни на что не влияет: вся механика внутри @media.
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  // Esc закрывает меню. Слушатель вешается только пока оно открыто, поэтому
  // на десктопе и на закрытом меню его нет вообще.
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
        {/* Одна и та же разметка на всех ширинах. На ≥900px обёртка объявлена
            `display: contents`, поэтому .nav и .language-dropdown остаются
            прямыми flex-детьми .header-content — раскладка десктопа не меняется
            ни на пиксель. Ниже 900px эта же обёртка становится выездной
            панелью. Дублировать навигацию в двух местах не требуется. */}
        {/* Клиппер выездной панели. Первопричина обреза модалок анализа
            (2026-08-24): анимация открытия ниже стартует с `transform:
            translateX(100%)` — панель в первом кадре целиком за экраном.
            По спецификации трансформированный блок всё равно засчитывается
            в scrollable overflow ближайшего предка без своего overflow —
            а такого предка на пути до документа не было. На время анимации
            `window.innerWidth` раздувался с 430 до 750, и это НЕ схлопывалось
            обратно само — держалось до настоящего resize/поворота экрана.
            Всё, что позиционируется от вьюпорта (`position: fixed` — оверлей
            и окно модалок анализа аспектов/планет), занимало эти же 750,
            из-за чего окно резалось по правому краю экрана.
            `.header-panel-clip` — статичная коробка без transform, с
            `overflow: hidden` ровно по месту панели; она поглощает
            overflow-вклад анимируемого потомка на месте, не давая ему
            всплыть выше по дереву. Видимо снаружи ничего не меняется —
            панель всё так же выезжает справа, тем же таймингом. */}
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
              {/* Стили переехали в класс .language-menu значение-в-значение.
                  Причина та же, что у кнопки темы: inline не переопределить в
                  @media, а внутри drawer'а (overflow-y: auto) выпадающее вниз
                  absolute-меню обрезалось бы по нижнему краю панели. */}
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

        {/* Оверлей и панель — потомки .header (position: sticky), то есть
            позиционируются от неё, а не от экрана. Это сделано намеренно:
            у .header есть backdrop-filter, а он, как и transform, создаёт
            containing block для fixed-потомков (та же механика, что сломала
            шесть модалок — INSIGHTS.md, 2026-08-23). Явный `absolute` от
            sticky-предка не зависит от того, останется ли backdrop-filter. */}
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