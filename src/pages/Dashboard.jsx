import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { astrologyAPI } from '../services/api';
import { chartsApi } from '../services/chartsApi';
import i18n from '../i18n';
import Header from '../components/Header';
import ProcessingMessage from '../components/ProcessingMessage';
import MarkdownContent from '../components/MarkdownContent';
import DeleteChartModal from '../components/DeleteChartModal';
import DuplicateChartModal from '../components/DuplicateChartModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const { user, isAuthenticated, loading, signOut } = useAuth();
  const { t } = useTranslation();

  const currentLang = lang || i18n.language || 'ru';

  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chartDataForAnalysis, setChartDataForAnalysis] = useState(null);
  const [fullAnalysis, setFullAnalysis] = useState(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [saving, setSaving] = useState(false);
  // const [savedChartId, setSavedChartId] = useState(() => {
  //   const saved = localStorage.getItem('savedChartId');
  //   return saved ? parseInt(saved, 10) : null;
  // });
  const [savedChartId, setSavedChartId] = useState(() => {
    const saved = localStorage.getItem('savedChartId');
    return saved ? parseInt(saved, 10) : null;
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyCharts, setHistoryCharts] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [pendingSaveName, setPendingSaveName] = useState(null);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState(false);
  const [chartToDelete, setChartToDelete] = useState(null);
  const [deletingChart, setDeletingChart] = useState(false);
  // Rename functionality
  const [renameChartId, setRenameChartId] = useState(null);
  const [renameChartName, setRenameChartName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState(null);
  const [chartsUpdated, setChartsUpdated] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate(`/${currentLang}/login`);
    }
  }, [loading, isAuthenticated, navigate, currentLang]);

  // Читаем данные из localStorage при загрузке
  useEffect(() => {
    const savedData = localStorage.getItem('chartDataForAnalysis');
    if (savedData && !chartDataForAnalysis) {
      try {
        const parsed = JSON.parse(savedData);
        setChartDataForAnalysis(parsed);
      } catch {
        // Error parsing saved data
      }
    }

    // Восстанавливаем сохраненный анализ из localStorage
    const savedAnalysis = localStorage.getItem('savedFullAnalysis');
    if (savedAnalysis && !fullAnalysis) {
      setFullAnalysis(savedAnalysis);
      setShowFullAnalysis(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const state = location.state;

    if (state?.showFullAnalysis && state?.chartDataForAnalysis) {
      // Новая карта — сбрасываем всё старое
      setFullAnalysis(null);
      setSavedChartId(null);
      localStorage.removeItem('savedFullAnalysis');
      localStorage.removeItem('savedChartId');
      setShowFullAnalysis(true);
      setChartDataForAnalysis(state.chartDataForAnalysis);
    }
  }, [location.state]);

  const loadFullAnalysis = useCallback(async () => {
    if (!chartDataForAnalysis) return;
    setAnalysisLoading(true);
    setAnalysisError('');
    try {
      const result = await astrologyAPI.getFullChartAnalysis(
        chartDataForAnalysis,
        i18n.language,
        5
      );
      setFullAnalysis(result.analysis);
      localStorage.setItem('savedFullAnalysis', result.analysis);
    } catch (err) {
      setAnalysisError(err.response?.data?.detail || t('dashboard.errors.analysisError'));
    } finally {
      setAnalysisLoading(false);
    }
  }, [chartDataForAnalysis, t]);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !chartDataForAnalysis || !fullAnalysis || !savedChartId) return;

    const questionText = chatInput.trim();
    const currentHistory = [...chatHistory];
    const userMessage = { role: 'user', content: questionText };

    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      const response = await astrologyAPI.chatAnalysis({
        question: questionText,
        chart_data: chartDataForAnalysis,
        summary: fullAnalysis,
        chat_history: currentHistory,
        language: i18n.language || 'ru'
      });

      const botMessage = {
        role: 'assistant',
        content: response.data?.answer || t('dashboard.chat.noAnswer'),
        relevant_chunks: response.data?.relevant_chunks || []
      };
      setChatHistory(prev => [...prev, botMessage]);
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: t('dashboard.chat.errorWithDetails', { error: error.message })
      }]);
    }
  }, [chatInput, chartDataForAnalysis, fullAnalysis, savedChartId, chatHistory, t]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  useEffect(() => {
    if (showFullAnalysis && chartDataForAnalysis && !fullAnalysis && !analysisLoading) {
      loadFullAnalysis();
    }
  }, [showFullAnalysis, chartDataForAnalysis, fullAnalysis, analysisLoading, loadFullAnalysis]);

  const loadHistoryCharts = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const data = await chartsApi.getCharts(user.id);
      setHistoryCharts(data);
    } catch {
      // Error loading charts
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const handleSaveChartWithAnalysis = async () => {
    if (!user || !chartDataForAnalysis || !fullAnalysis) return;

    const chartName = chartDataForAnalysis.name || t('dashboard.chart.defaultName');

    setSaving(true);
    try {
      const hasLimit = await chartsApi.hasReachedLimit(user.id);
      if (hasLimit) {
        setShowDeleteModal(true);
        setSaving(false);
        return;
      }

      const existingChart = await chartsApi.checkChartByName(user.id, chartName);
      if (existingChart) {
        setPendingSaveName(chartName);
        setShowDuplicateModal(true);
        setSaving(false);
        return;
      }

      const saved = await chartsApi.saveChartWithInterpretation(
        user.id,
        chartDataForAnalysis,
        fullAnalysis
      );
      setSavedChartId(saved.id);
      localStorage.setItem('savedChartId', saved.id.toString());
    } catch {
      setSaving(false);
    }
  };

  const handleDuplicateConfirm = async () => {
    if (!user || !chartDataForAnalysis || !fullAnalysis || !pendingSaveName) return;

    setShowDuplicateModal(false);
    setSaving(true);
    try {
      const existingCharts = await chartsApi.getCharts(user.id);
      const uniqueName = chartsApi.getUniqueChartName(pendingSaveName, existingCharts);

      const chartDataWithNewName = {
        ...chartDataForAnalysis,
        name: uniqueName
      };

      const saved = await chartsApi.saveChartWithInterpretation(
        user.id,
        chartDataWithNewName,
        fullAnalysis
      );
      setSavedChartId(saved.id);
      localStorage.setItem('savedChartId', saved.id.toString());
      setPendingSaveName(null);
    } catch {
      // Error
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    // Очищаем localStorage при выходе
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedChartId');
    setChatVisible(false);
    setChatHistory([]);
    setChatInput('');
    await signOut();
    navigate(`/${currentLang}/`);
  };

  const handleDeleted = () => {
    setShowDeleteModal(false);
    handleSaveChartWithAnalysis();
  };

  const handleNewChart = () => {
    localStorage.removeItem('savedChartData');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedChartId');
    setChatVisible(false);
    setChatHistory([]);
    setChatInput('');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('planetAnalysis_')) {
        localStorage.removeItem(key);
      }
    });
    navigate(`/${currentLang}/`);
  };
  // Rename functionality
  const handleSaveRename = async () => {
    if (!renameChartId || !renameChartName.trim()) return;

    // Validate length
    if (renameChartName.trim().length > 10) {
      setRenameError(t('dashboard.rename.maxLength'));
      return;
    }

    // Reset error state
    setRenameError(null);

    setRenaming(true);
    try {
      // Check for duplicate names (excluding the current chart being renamed)
      const existingCharts = await chartsApi.getCharts(user.id);
      const duplicateExists = existingCharts.some(
        chart => chart.id !== renameChartId && chart.name.toLowerCase() === renameChartName.trim().toLowerCase()
      );

      if (duplicateExists) {
        setRenameError(t('dashboard.rename.exists'));
        setRenaming(false);
        return;
      }

      await chartsApi.updateChartName(renameChartId, renameChartName.trim());
      // Update the chart name in historyCharts state
      setHistoryCharts((prevCharts) =>
        prevCharts.map((chart) =>
          chart.id === renameChartId
            ? { ...chart, name: renameChartName.trim() }
            : chart
        )
      );
      // If renamed chart is the one currently displayed, update chartDataForAnalysis and localStorage
      if (savedChartId === renameChartId) {
        setChartDataForAnalysis(prev => {
          const updated = { ...prev, name: renameChartName.trim() };
          localStorage.setItem('chartDataForAnalysis', JSON.stringify(updated));
          return updated;
        });
      }
      setChartsUpdated((prev) => !prev);
    } catch (error) {
      alert(t('dashboard.rename.error') + ': ' + (error.message || error));
    } finally {
      setRenaming(false);
      setRenameChartId(null);
      setRenameChartName('');
      setRenameError(null);
    }
  };

  const handleCancelRename = () => {
    setRenameChartId(null);
    setRenameChartName('');
  };

  // Trigger UI update after rename
  useEffect(() => {
    if (chartsUpdated && user) {
      loadHistoryCharts();
    }
  }, [chartsUpdated, user, loadHistoryCharts]);

  const handleSelectChart = (chart) => {
    setShowHistory(false);
    setChartDataForAnalysis(chart.chart_data);
    setChatVisible(false);
    setChatHistory([]);
    setChatInput('');
    const interp = chart.chart_interpretations?.[0];
    if (interp?.interpretation) {
      setFullAnalysis(interp.interpretation);
      setShowFullAnalysis(true);
      // Сохраняем в localStorage
      localStorage.setItem('chartDataForAnalysis', JSON.stringify(chart.chart_data));
      localStorage.setItem('savedFullAnalysis', interp.interpretation);
      // Записываем ID карты чтобы кнопка "Сохранить" не появилась
      localStorage.setItem('savedChartId', chart.id.toString());
      setSavedChartId(chart.id);
    }
  };

  const handleDeleteFromHistory = (chart, e) => {
    e.stopPropagation();
    setChartToDelete(chart);
    setConfirmDeleteModal(true);
  };

  const handleConfirmDeleteFromHistory = async () => {
    if (!chartToDelete) return;
    setDeletingChart(true);
    try {
      await chartsApi.deleteChart(chartToDelete.id);
      setConfirmDeleteModal(false);
      setChartToDelete(null);
      loadHistoryCharts();
    } catch {
      // Error deleting chart
    } finally {
      setDeletingChart(false);
    }
  };

  const getSunSignEmoji = (sign) => {
    const fireSigns = ['Aries', 'Leo', 'Sagittarius'];
    const earthSigns = ['Taurus', 'Virgo', 'Capricorn'];
    const airSigns = ['Gemini', 'Libra', 'Aquarius'];
    const waterSigns = ['Cancer', 'Scorpio', 'Pisces'];
    if (fireSigns.includes(sign)) return '🔥';
    if (earthSigns.includes(sign)) return '🌍';
    if (airSigns.includes(sign)) return '💨';
    if (waterSigns.includes(sign)) return '💧';
    return '🌟';
  };

  useEffect(() => {
    if (showHistory && user) {
      loadHistoryCharts();
    }
  }, [showHistory, user, loadHistoryCharts]);

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
              {/* Кнопка "Получить полный анализ" — видна если пользователь залогинен и есть данные карты */}
              {chartDataForAnalysis && isAuthenticated && !fullAnalysis && !savedChartId && (
                <button
                  type="button"
                  className="btn-full-analysis"
                  onClick={() => {
                    setShowFullAnalysis(true);
                    loadFullAnalysis();
                  }}
                  disabled={analysisLoading}
                  style={{
                    marginTop: '24px',
                    marginLeft: 'auto',
                    marginRight: 'auto',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    padding: analysisLoading ? '30px 28px' : '14px 28px',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: analysisLoading ? 'default' : 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    opacity: analysisLoading ? 0.8 : 1,
                    minWidth: '280px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {t('home.getFullAnalysis')}
                </button>
              )}

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
                      {!savedChartId && !analysisLoading &&(
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                          <button
                            className="btn btn-primary"
                            onClick={handleSaveChartWithAnalysis}
                            disabled={saving}
                          >
                            {saving ? '...' : t('dashboard.actions.save')}
                          </button>
                        </div>
                      )}
                      <MarkdownContent content={fullAnalysis} />

                      {/* Chat section for saved charts only */}
                      {savedChartId && (
                        <>
                          {!chatVisible && (
                            <div style={{ textAlign: 'center', marginTop: '20px' }}>
                              <button
                                onClick={() => setChatVisible(true)}
                                className="btn btn-primary"
                                style={{ maxWidth: '300px' }}
                                disabled={!fullAnalysis}
                              >
                                {t('dashboard.chat.start')}
                              </button>
                            </div>
                          )}

                          {chatVisible && (
                            <div style={{ marginTop: '30px', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
                              <div style={{ marginBottom: '20px' }}>
                                <h3 style={{ margin: '0 0 15px 0' }}>{t('dashboard.chat.title')}</h3>
                                <div style={{
                                  minHeight: '100px',
                                  height: 'auto',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  padding: '15px',
                                  background: 'var(--bg-secondary)'
                                }}>
                                  {chatHistory.length === 0 ? (
                                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                                      {t('dashboard.chat.placeholder')}
                                    </p>
                                  ) : (
                                    chatHistory.map((message, index) => (
                                      <div
                                        key={index}
                                        style={{
                                          marginBottom: '15px',
                                          padding: '10px',
                                          borderRadius: '8px',
                                          background: message.role === 'user'
                                            ? 'var(--bg-primary)'
                                            : 'var(--bg-secondary)',
                                          border: '1px solid var(--border)'
                                        }}
                                      >
                                        <strong style={{
                                          color: message.role === 'user' ? '#4CAF50' : '#2196F3',
                                          marginRight: '10px'
                                        }}>
                                          {message.role === 'user' ? t('dashboard.chat.user') : t('dashboard.chat.assistant')}
                                        </strong>
                                        <div>{message.content}</div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                              {/* Chat Input */}
                              <textarea
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                onInput={(e) => {
                                  const textarea = e.target;
                                  textarea.style.height = 'auto';
                                  textarea.style.height = textarea.scrollHeight + 'px';
                                }}
                                placeholder={t('dashboard.chat.placeholder')}
                                maxlength="300"
                                style={{
                                  width: '100%',
                                  minHeight: '20px',
                                  height: '20px',
                                  resize: 'none',
                                  padding: '12px',
                                  border: '1px solid var(--border)',
                                  borderRadius: '8px',
                                  background: 'var(--bg-secondary)',
                                  color: 'var(--text-primary)',
                                  fontSize: '14px',
                                  marginBottom: '10px',
                                  overflowY: 'hidden',
                                  boxSizing: 'border-box'
                                }}
                              />
                              {/* Send Button */}
                              <button
                                onClick={sendChatMessage}
                                disabled={!chatInput.trim()}
                                className="btn btn-primary"
                                style={{
                                  width: '100%',
                                  padding: '12px',
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  border: 'none',
                                  borderRadius: '8px',
                                  color: 'white',
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  cursor: 'pointer'
                                }}
                              >
                                {t('dashboard.chat.send')}
                              </button>
                            </div>
                          )}
                        </>
                      )}
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
                <div
                  className="feature"
                  onClick={() => setShowHistory(!showHistory)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="feature-icon">📊</div>
                  <div className="feature-content" style={{ flex: 1 }}>
                    <h3>
                      {t('dashboard.features.history.title')}
                      <span style={{ float: 'right', fontSize: '12px' }}>
                        {showHistory ? '▼' : '▶'}
                      </span>
                    </h3>
                  </div>
                </div>

                {showHistory && (
                  <div style={{
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '8px',
                    marginTop: '8px'
                  }}>
                    {historyLoading ? (
                      <div className="loading">{t('common.loading')}</div>
                    ) : historyCharts.length === 0 ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>
                        {t('history.empty')}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {historyCharts.map((chart) => (
                          <div
                            key={chart.id}
                            onClick={renameChartId === chart.id ? undefined : () => handleSelectChart(chart)}
                            style={{
                              padding: '10px',
                              background: 'var(--bg-card)',
                              borderRadius: '6px',
                              cursor: renameChartId === chart.id ? 'default' : 'pointer',
                              border: '1px solid var(--border)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontSize: '13px', fontWeight: '600', flex: 1 }}>
                                {renameChartId === chart.id ? (
                                  <>
                                    <input
                                      type="text"
                                      value={renameChartName}
                                      onChange={(e) => {
                                        setRenameChartName(e.target.value);
                                        // Validate length and check for duplicates
                                        if (e.target.value.length > 10) {
                                          setRenameError(t('dashboard.rename.maxLength'));
                                        } else {
                                          setRenameError(null);
                                        }
                                      }}
                                      maxlength="10"
                                      style={{
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        padding: '2px',
                                        border: '1px solid var(--border)',
                                        borderRadius: '3px',
                                        width: '100%',
                                        boxSizing: 'border-box'
                                      }}
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleSaveRename();
                                        } else if (e.key === 'Escape') {
                                          handleCancelRename();
                                        }
                                      }}
                                    />
                                    <div style={{ fontSize: '11px', color: renameError ? 'var(--error)' : 'var(--text-secondary)', marginTop: '2px' }}>
                                      {renameError || `${renameChartName.length}/10`}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    {getSunSignEmoji(chart.sun_sign)} {chart.name || t('dashboard.chart.defaultName')}
                                  </>
                                )}
                              </div>
                              <div style={{ display: 'flex', gap: '5px' }}>
                                {renameChartId !== chart.id ? (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setRenameChartId(chart.id);
                                        setRenameChartName(chart.name || '');
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        padding: '2px'
                                      }}
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={(e) => handleDeleteFromHistory(chart, e)}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        padding: '2px'
                                      }}
                                    >
                                       🗑️
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={handleSaveRename}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        padding: '2px'
                                      }}
                                    >
                                      {renaming ? t('dashboard.rename.saving') : '💾'}
                                    </button>
                                    <button
                                      onClick={handleCancelRename}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        padding: '2px'
                                      }}
                                    >
                                       ❌
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                               📅 {chart.chart_data?.meta?.birth_date?.split('T')[0] || '—'} • 📍 {chart.chart_data?.meta?.birth_place || '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="feature">
                  <div className="feature-icon">👥</div>
                  <div className="feature-content">
                    <h3>{t('dashboard.features.compare.title')}</h3>
                    <p>{t('dashboard.features.compare.desc')}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleNewChart}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  padding: '14px 24px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  marginTop: '20px'
                }}
              >
                {t('dashboard.actions.newChart')}
              </button>

              <button
                onClick={handleLogout}
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
                {t('dashboard.actions.logout')}
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

      <DeleteChartModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleted={handleDeleted}
      />

      <DuplicateChartModal
        isOpen={showDuplicateModal}
        chartName={pendingSaveName}
        onClose={() => {
          setShowDuplicateModal(false);
          setPendingSaveName(null);
        }}
        onConfirm={handleDuplicateConfirm}
      />

      <ConfirmDeleteModal
        isOpen={confirmDeleteModal}
        onClose={() => {
          setConfirmDeleteModal(false);
          setChartToDelete(null);
        }}
        onConfirm={handleConfirmDeleteFromHistory}
        chartName={chartToDelete?.name}
        deleting={deletingChart}
      />
    </div>
  );
};

export default Dashboard;