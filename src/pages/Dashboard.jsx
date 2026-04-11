import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
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
  const { lang } = useParams();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const { t } = useTranslation();

  const currentLang = lang || i18n.language || 'ru';

  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [chartDataForAnalysis, setChartDataForAnalysis] = useState(null);
  const [fullAnalysis, setFullAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(`/${currentLang}/login`);
    }
  }, [loading, isAuthenticated, navigate]);

  // Читаем данные и сохраненный анализ из localStorage при загрузке
  useEffect(() => {
    const savedData = localStorage.getItem('chartDataForAnalysis');
    if (savedData && !chartDataForAnalysis) {
      try {
        const parsed = JSON.parse(savedData);
        console.log('=== ВОССТАНОВЛЕНО ИЗ LOCALSTORAGE ===', parsed);
        setChartDataForAnalysis(parsed);
      } catch (e) {
        console.error('Error parsing saved data:', e);
      }
    }

    // Восстанавливаем сохраненный анализ из localStorage
    const savedAnalysis = localStorage.getItem('savedFullAnalysis');
    if (savedAnalysis && !fullAnalysis) {
      console.log('=== ВОССТАНОВЛЕН АНАЛИЗ ИЗ LOCALSTORAGE ===');
      setFullAnalysis(savedAnalysis);
      setShowFullAnalysis(true);
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
      // Сохраняем анализ в localStorage
      localStorage.setItem('savedFullAnalysis', result.analysis);
    } catch (err) {
      console.error('Full analysis error:', err);
      console.error('Error response:', err.response?.data);
      setAnalysisError(err.response?.data?.detail || t('dashboard.errors.analysisError'));
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleLogout = async () => {
    // Очищаем localStorage при выходе
    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('chartDataForAnalysis');
    await signOut();
    navigate(`/${currentLang}/`);
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

      <div className="container" style={{ paddingTop: '40px' }}>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
          {/* Основной контент */}
          <div style={{ flex: '1 1 600px' }}>
            <div className="dashboard-content">
              {showFullAnalysis && (
                <>
                  <h2 style={{ marginBottom: '20px' }}>
                    {chartDataForAnalysis?.name && (
                      <span style={{ fontWeight: '500', marginRight: '10px' }}>
                        {chartDataForAnalysis.name}
                      </span>
                    )}
                    {t('dashboard.fullAnalysis.title')}
                  </h2>
                  
                  {analysisLoading && (
                    <div style={{ marginTop: '40px' }}>
                      <ProcessingMessage />
                    </div>
                  )}
                  
                  {analysisError && (
                    <div className="error-message" style={{ marginTop: '20px' }}>
                      {analysisError}
                    </div>
                  )}
                  
                  {fullAnalysis && (
                    <div style={{ 
                      marginTop: '40px', 
                      lineHeight: '2',
                      fontSize: '16px'
                    }}>
                      <MarkdownContent content={fullAnalysis} />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Боковая панель */}
          <div style={{ width: '300px', flexShrink: 0 }}>
            <div className="dashboard-card">
              {t('dashboard.features.title') && <h2>{t('dashboard.features.title')}</h2>}
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
                  <div className="feature-icon">👥</div>
                  <div className="feature-content">
                    <h3>{t('dashboard.features.compare.title')}</h3>
                    <p>{t('dashboard.features.compare.desc')}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => navigate(`/${currentLang}/`)}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                {t('dashboard.actions.newChart')}
              </button>

              <button 
                onClick={() => navigate(`/${currentLang}/synastry`)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  padding: '14px 24px',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '12px'
                }}
              >
                {t('dashboard.actions.synastry')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;