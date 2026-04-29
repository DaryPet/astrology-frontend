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
import Sidebar from '../components/Sidebar';
// после строки 13:
import { loadChatHistory, saveChatHistory, isNearLimit, isAtLimit, MAX_MESSAGES } from '../services/chatStorage';

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { lang } = useParams();
  const { user, isAuthenticated, loading } = useAuth();
  const { t } = useTranslation();

  const currentLang = lang || i18n.language || 'ru';

  const [showFullAnalysis, setShowFullAnalysis] = useState(false);
  const [chatVisible, setChatVisible] = useState(false);
  //   const [chatHistory, setChatHistory] = useState([]);
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
  const [chatHistory, setChatHistory] = useState(() => loadChatHistory(savedChartId));
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
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
    if (chatLoading) return;
    if (!chatInput.trim() || !chartDataForAnalysis || !fullAnalysis || !savedChartId) return;

    const questionText = chatInput.trim();
    const currentHistory = [...chatHistory];
    const userMessage = { role: 'user', content: questionText };

    // setChatHistory(prev => [...prev, userMessage]);
    setChatHistory(prev => {
      const updated = [...prev, userMessage];
      saveChatHistory(savedChartId, updated);
      return updated;
    });
    setChatInput('');

    setChatLoading(true);
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
        //   setChatHistory(prev => [...prev, botMessage]);
      setChatHistory(prev => {
        const updated = [...prev, botMessage];
        saveChatHistory(savedChartId, updated);
        return updated;
      });
    } catch (error) {
      setChatHistory(prev => [...prev, {
        role: 'assistant',
        content: t('dashboard.chat.errorWithDetails', { error: error.message })
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [chatInput, chatLoading, chartDataForAnalysis, fullAnalysis, savedChartId, chatHistory, t]);

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
    setChartDataForAnalysis(chart.chart_data);
    setChatVisible(false);
    setChatHistory(loadChatHistory(chart.id));
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

  const handleStartRename = (chart) => {
    setRenameChartId(chart.id);
    setRenameChartName(chart.name || '');
    setRenameError(null);
  };

  const handleRenameChange = (value) => {
    setRenameChartName(value);
    if (value.length > 10) {
      setRenameError(t('dashboard.rename.maxLength'));
    } else {
      setRenameError(null);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistoryCharts();
    }
  }, [user, loadHistoryCharts]);

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

      {/* Sidebar прижат к левому краю экрана */}
      <div style={{
        position: 'fixed',
        top: '65px',
        left: 0,
        width: '260px',
        minWidth: '260px',
        maxHeight: 'calc(100vh - 65px)',
        zIndex: 50,
      }}>
        <Sidebar
          historyCharts={historyCharts}
          historyLoading={historyLoading}
          onSelectChart={handleSelectChart}
          onNewChart={handleNewChart}
          savedChartId={savedChartId}
          renameChartId={renameChartId}
          renameChartName={renameChartName}
          renaming={renaming}
          renameError={renameError}
          onStartRename={handleStartRename}
          onSaveRename={handleSaveRename}
          onCancelRename={handleCancelRename}
          onRenameChange={handleRenameChange}
          onDeleteChart={handleDeleteFromHistory}
          getSunSignEmoji={getSunSignEmoji}
        />
      </div>

      {/* Основной контент с отступом для Sidebar */}
      <div className="container" style={{ paddingTop: '40px', marginLeft: '260px' }}>
        <div style={{ display: 'flex', gap: '30px', flexWrap: 'nowrap', alignItems: 'flex-start' }}>
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
                                {chatHistory.length > 0 ? t('dashboard.chat.open') : t('dashboard.chat.start')}
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
                                          arginRight: '10px'
                                        }}>
                                          {message.role === 'user' ? t('dashboard.chat.user') : t('dashboard.chat.assistant')}
                                        </strong>
                                        <div className="chat-message-content">
                                          <MarkdownContent content={message.content} />
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                              {/* Chat Input */}
                              {/* Лимит FREE плана */}
                              {isNearLimit(chatHistory) && (
                                <div style={{
                                  padding: '8px 12px',
                                  marginBottom: '10px',
                                  borderRadius: '8px',
                                  background: isAtLimit(chatHistory) ? 'rgba(244,67,54,0.1)' : 'rgba(255,152,0,0.1)',
                                  border: `1px solid ${isAtLimit(chatHistory) ? '#f44336' : '#ff9800'}`,
                                  color: isAtLimit(chatHistory) ? '#f44336' : '#ff9800',
                                  fontSize: '13px',
                                  textAlign: 'center'
                                }}>
                                  {isAtLimit(chatHistory)
                                    ? t('dashboard.chat.limitReached', { limit: MAX_MESSAGES })
                                    : t('dashboard.chat.messagesLeft', { count: MAX_MESSAGES - chatHistory.length })}
                                </div>
                              )}
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
                                maxlength="200"
                                disabled={chatLoading}
                                style={{
                                  width: '100%',
                                  minHeight: '40px',
                                  height: '40px',
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
                                // disabled={!chatInput.trim() || chatLoading}
                                disabled={!chatInput.trim() || chatLoading || isAtLimit(chatHistory)}
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
                                {chatLoading ? t('dashboard.chat.sending') : t('dashboard.chat.send')}
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