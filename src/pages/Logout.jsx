import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const Logout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t, i18n } = useTranslation();

  const currentLang = i18n.language || 'ru';

  useEffect(() => {
    const performLogout = async () => {
      try {
        localStorage.removeItem('savedFullAnalysis');
        localStorage.removeItem('chartDataForAnalysis');
        localStorage.removeItem('savedChartId');
        await signOut();
      } catch (error) {
        console.log('Logout error:', error);
      } finally {
        navigate(`/${currentLang}/`);
      }
    };

    performLogout();
  }, [navigate, signOut, currentLang]);

  return (
    <div className="logout-page">
      <Header />
      <div className="container">
        <div className="logout-card">
          <h1>{t('logout.title')}</h1>
          <p>{t('logout.text')}</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    </div>
  );
};

export default Logout;