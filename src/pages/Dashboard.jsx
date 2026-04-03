import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="dashboard">
        <Header />
        <div className="container">
          <div className="loading">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="dashboard">
      <Header />

      <div className="container">
        <div className="dashboard-header">
          <h1>{t('dashboard.title')}</h1>
          <p>{t('dashboard.subtitle')}</p>
        </div>

        <div className="dashboard-content">
          <div className="dashboard-card">
            <h2>{t('dashboard.userInfo.title')}</h2>
            <div className="user-info-details">
              <div className="info-row">
                <span className="info-label">{t('dashboard.userInfo.email')}:</span>
                <span className="info-value">{user?.email}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('dashboard.userInfo.name')}:</span>
                <span className="info-value">{user?.user_metadata?.name || t('dashboard.userInfo.notSpecified')}</span>
              </div>
              <div className="info-row">
                <span className="info-label">{t('dashboard.userInfo.createdAt')}:</span>
                <span className="info-value">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : t('dashboard.userInfo.unknown')}
                </span>
              </div>
            </div>
          </div>

          <div className="dashboard-card">
            <h2>{t('dashboard.features.title')}</h2>
            <div className="future-features">
              <div className="feature">
                <div className="feature-icon">📊</div>
                <div className="feature-content">
                  <h3>{t('dashboard.features.history.title')}</h3>
                  <p>{t('dashboard.features.history.desc')}</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">⭐</div>
                <div className="feature-content">
                  <h3>{t('dashboard.features.favorites.title')}</h3>
                  <p>{t('dashboard.features.favorites.desc')}</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">🔔</div>
                <div className="feature-content">
                  <h3>{t('dashboard.features.notifications.title')}</h3>
                  <p>{t('dashboard.features.notifications.desc')}</p>
                </div>
              </div>
              <div className="feature">
                <div className="feature-icon">👥</div>
                <div className="feature-content">
                  <h3>{t('dashboard.features.compare.title')}</h3>
                  <p>{t('dashboard.features.compare.desc')}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="dashboard-actions">
            <button className="btn-primary" onClick={() => navigate('/')}>
              {t('dashboard.actions.newChart')}
            </button>
            <button className="btn-secondary" onClick={() => navigate('/synastry')}>
              {t('dashboard.actions.synastry')}
            </button>
            <button className="btn-logout" onClick={handleLogout}>
              {t('dashboard.actions.logout')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;