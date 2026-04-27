import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { astrologyAPI } from '../services/api';
import Header from '../components/Header';
import D3NatalChartWheel from '../components/D3NatalChartWheel';
import PlanetTable from '../components/PlanetTable';
import AspectGrid from '../components/AspectGrid';

function Chart() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [chart, setChart] = useState(null);
  const [interpretation, setInterpretation] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchChart();
  }, [id, fetchChart]);

  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput.trim() };
    setChatHistory(prev => [...prev, userMessage]);
    setChatInput('');

    try {
      const response = await astrologyAPI.chatAnalysis({
        question: userMessage.content,
        chart_data: parseChartData(chart),
        summary: interpretation,
        chat_history: chatHistory.length === 0 ? [] : [...chatHistory, userMessage],
        language: i18n.language || 'ru'
      });

      const botMessage = {
        role: 'assistant',
        content: response.data?.answer || 'Ответ не получен',
        relevant_chunks: response.data?.relevant_chunks || []
      };
      setChatHistory(prev => [...prev, userMessage, botMessage]);
    } catch (error) {
      setChatHistory(prev => [...prev, userMessage, {
        role: 'assistant',
        content: 'Ошибка отправки сообщения: ' + error.message
      }]);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const fetchChart = useCallback(async () => {
    try {
      const response = await api.get(`/charts/${id}`);
      setChart(response.data);
      setLoading(false);
    } catch {
      setError(t('chart.error'));
      setLoading(false);
    }
  }, [id, t]);

  const getInterpretation = async () => {
    try {
      const response = await api.post(`/charts/${id}/interpret`, {
        type: 'natal'
      });
      setInterpretation(response.data.interpretation);
    } catch (error) {
      throw error; // Interpretation fetching error
    }
  };

  // Helper function to parse chart data (handles string-formatted houses and aspects)
  const parseChartData = (chartData) => {
    if (!chartData) return null;

    const parsed = { ...chartData };

    // Parse houses if they are in string format
    if (typeof parsed.houses === 'string') {
      try {
        parsed.houses = JSON.parse(parsed.houses);
      } catch {
        parsed.houses = {};
      }
    }

    // Parse aspects if they are in string format
    if (typeof parsed.aspects === 'string') {
      try {
        parsed.aspects = JSON.parse(parsed.aspects);
      } catch {
        parsed.aspects = [];
      }
    }

    return parsed;
  };

  if (loading) {
    return (
      <div className="chart-page">
        <div className="container">
          <div className="loading">
            <div className="spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="chart-page">
        <div className="container">
          <div className="error">{error}</div>
          <Link to="/" className="btn btn-primary">{t('common.backHome')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-page">
      <Header />

      <div className="container">
        <div className="chart-header">
          <h1>{t('chart.title')}</h1>
          <p className="chart-subtitle">
            {chart.name && `${chart.name} • `}{chart.sun_sign} • {chart.moon_sign} • ASC {chart.ascendant}
          </p>
        </div>

        {/* Профессиональное колесо с d3.js */}
        <div style={{
          margin: '40px 0',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <D3NatalChartWheel
            chartData={parseChartData(chart)}
            size={800}
          />
        </div>

        {/* Основная информация */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px',
          margin: '40px 0'
        }}>
          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.sun')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#FFD700'
            }}>
              {chart.sun_sign}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.sun_sign_ru || chart.sun_sign}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.moon')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#C0C0C0'
            }}>
              {chart.moon_sign}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.moon_sign_ru || chart.moon_sign}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.ascendant')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#FF1493'
            }}>
              {chart.ascendant}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.ascendant_ru || chart.ascendant}
              {chart.ascendant_degree && (
                <div style={{ marginTop: '4px' }}>
                  {chart.ascendant_degree.toFixed(1)}°
                </div>
              )}
            </div>
          </div>

          <div style={{
            background: 'var(--bg-secondary)',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid var(--border)',
            textAlign: 'center'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '10px', color: 'var(--text-primary)' }}>
              {t('chart.midheaven')}
            </h3>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              color: '#00BFFF'
            }}>
              {chart.mc || '—'}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginTop: '8px'
            }}>
              {chart.mc_ru || chart.mc || t('chart.notDetermined')}
              {chart.mc_degree && (
                <div style={{ marginTop: '4px' }}>
                  {chart.mc_degree.toFixed(1)}°
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Таблица планет */}
        <div style={{ margin: '40px 0' }}>
          <PlanetTable
            planets={parseChartData(chart)?.planets}
            houses={parseChartData(chart)?.houses}
          />
        </div>

        {/* Сетка аспектов */}
        <div style={{ margin: '40px 0' }}>
          <AspectGrid
            aspects={parseChartData(chart)?.aspects}
            planets={parseChartData(chart)?.planets}
          />
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center' }}>
          {!interpretation && (
            <button onClick={getInterpretation} className="btn btn-primary" style={{ maxWidth: '300px' }}>
              t('chart.getInterpretation')
            </button>
          )}
          {interpretation && (
            <div className="info-card" style={{ textAlign: 'left', marginTop: '20px' }}>
              <h3>t('chart.interpretation')</h3>
              <p style={{ marginTop: '10px', lineHeight: '1.8' }}>{interpretation}</p>
            </div>
          )}

          {interpretation && !chatVisible && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={() => setChatVisible(true)}
                className="btn btn-primary"
                style={{ maxWidth: '300px' }}
              >
                Начать чат
              </button>
            </div>
          )}

          {interpretation && chatVisible && (
            <div style={{ marginTop: '30px', border: '1px solid var(--border)', borderRadius: '12px', padding: '20px' }}>
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Чат по карте</h3>
                <div style={{
                  height: '300px',
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '15px',
                  background: 'var(--bg-secondary)'
                }}>
                  {chatHistory.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      Задайте вопрос по вашей карте выше
                    </p>
                  ) : (
                    chatHistory.map((message, index) => (
                      <div
                        key={index}
                        style={{
                          marginBottom: '15px',
                          padding: '10px',
                          borderRadius: '8px',
                          background: message.role === 'user' ?
                            'var(--bg-primary)' :
                            'var(--bg-secondary)',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <strong style={{
                          color: message.role === 'user' ? '#4CAF50' : '#2196F3',
                          marginRight: '10px'
                        }}>
                          {message.role === 'user' ? 'Вы' : 'Астролог'}
                        </strong>
                        <div>{message.content}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Задайте вопрос..."
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    minHeight: '50px'
                  }}
                />
                <button
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim()}
                  className="btn btn-primary"
                  style={{
                    padding: '10px 20px',
                    minWidth: '100px',
                    height: 'fit-content'
                  }}
                >
                  Отправить
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chart;
