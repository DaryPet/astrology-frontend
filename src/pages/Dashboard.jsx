import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { astrologyAPI } from '../services/api';
import i18n from '../i18n';
import Header from '../components/Header';
import ProcessingMessage from '../components/ProcessingMessage';
import MarkdownContent from '../components/MarkdownContent';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const { t } = useTranslation();

  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [chartDataForAnalysis, setChartDataForAnalysis] = useState(null);
  const [fullAnalysis, setFullAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Читаем данные из localStorage при загрузке
  useEffect(() => {
    const savedData = localStorage.getItem('chartDataForAnalysis');
    if (savedData && !chartDataForAnalysis) {
      try {
        const parsed = JSON.parse(savedData);
        console.log('=== ВОССТАНОВЛЕНО ИЗ LOCALSTORAGE ===', parsed);
        setChartDataForAnalysis(parsed);
        setShowFullAnalysis(true);
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }
  }, []);

  useEffect(() => {
    const state = location.state;
    console.log('=== LOCATION.STATE ===', state);
    if (state?.showFullAnalysis && state?.chartDataForAnalysis) {
      setShowFullAnalysis(true);
      setChartDataForAnalysis(state.chartDataForAnalysis);
    }
  }, [location.state]);

  useEffect(() => {
    if (showFullAnalysis && chartDataForAnalysis && !fullAnalysis && !analysisLoading) {
      console.log('=== ВЫЗЫВАЕМ loadFullAnalysis ===', { showFullAnalysis, chartDataForAnalysis, fullAnalysis });
      loadFullAnalysis();
    }
  }, [showFullAnalysis, chartDataForAnalysis, fullAnalysis, analysisLoading]);

  const loadFullAnalysis = async () => {
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      console.log('=== ОТПРАВЛЯЕМ НА СЕРВЕР ===', { chartDataForAnalysis, language: i18n.language, topBooks: 5 });
      const result = await astrologyAPI.getFullChartAnalysis(
        chartDataForAnalysis,
        i18n.language,
        5
      );
      console.log('=== ОТВЕТ ОТ СЕРВЕРА ===', result);
      console.log('=== ANALYSIS ===', result.analysis);
      setFullAnalysis(result.analysis);
    } catch (err) {
      console.error('Full analysis error:', err);
      console.error('Error response:', err.response?.data);
      setAnalysisError(err.response?.data?.detail || t('dashboard.errors.analysisError'));
    } finally {
      setAnalysisLoading(false);
    }
  };

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

          {showFullAnalysis && (
            <div className="dashboard-card full-analysis-card">
              <h2>{t('dashboard.fullAnalysis.title')}</h2>
              
{analysisLoading && (
                <div style={{ marginTop: '20px' }}>
                  <ProcessingMessage />
                </div>
              )}
              
              {analysisError && (
                <div className="error-message" style={{ marginTop: '10px' }}>
                  {analysisError}
                </div>
              )}
              
              {fullAnalysis && (
                <div 
                  className="analysis-content"
                  style={{ 
                    marginTop: '20px', 
                    padding: '20px', 
                    background: 'var(--bg-secondary)', 
                    borderRadius: '8px',
                    maxHeight: '600px',
                    overflowY: 'auto',
                    lineHeight: '1.8',
                    fontSize: '15px'
                  }}
                >
                  <MarkdownContent content={fullAnalysis} />
                </div>
              )}
            </div>
          )}

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