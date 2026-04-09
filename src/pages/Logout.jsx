import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const Logout = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    const performLogout = async () => {
      try {
        // Очищаем только данные, связанные с авторизованным пользователем
        localStorage.removeItem('savedFullAnalysis');
        localStorage.removeItem('chartDataForAnalysis');
        await signOut();
      } catch (error) {
        console.log('Logout error:', error);
      } finally {
        navigate('/');
      }
    };

    performLogout();
  }, [navigate, signOut]);

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