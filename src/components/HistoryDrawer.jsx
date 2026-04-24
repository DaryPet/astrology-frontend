import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { chartsApi } from '../services/chartsApi';

function HistoryDrawer({ isOpen, onClose, onSelectChart, isMobile = false }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && user) {
      loadCharts();
    }
  }, [isOpen, user, loadCharts]);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await chartsApi.getCharts(user.id);
      setCharts(data);
    } catch {
      // Error loading charts
    } finally {
      setLoading(false);
    }
  }, [user]);

  const handleDelete = async (chartId, e) => {
    e.stopPropagation();
    if (!confirm(t('history.confirmDelete'))) return;

    try {
      await chartsApi.deleteChart(chartId);
      loadCharts();
    } catch {
      // Error deleting
    }
  };

  const handleSelect = (chart) => {
    onSelectChart?.(chart);
    onClose();
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

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  if (!isOpen) return null;

  const drawerStyle = isMobile
    ? {
      position: 'fixed',
      left: 0,
      right: 0,
      bottom: 0,
      height: '60vh',
      borderTopLeftRadius: '16px',
      borderTopRightRadius: '16px'
    }
    : {
      position: 'fixed',
      top: 0,
      right: 0,
      bottom: 0,
      width: '350px'
    };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999
        }}
        onClick={onClose}
      />

      <div
        style={{
          ...drawerStyle,
          background: 'var(--bg-card)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          boxShadow: '-4px 0 20px rgba(0,0,0,0.2)'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: 0 }}>
            {t('dashboard.features.history.title')} ({charts.length}/{chartsApi.CHARTS_LIMIT})
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : charts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: 'var(--text-secondary)',
            padding: '40px 0'
          }}>
            {t('history.empty')}
          </div>
        ) : (
          <div style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {charts.map((chart) => (
              <div
                key={chart.id}
                onClick={() => handleSelect(chart)}
                style={{
                  padding: '14px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '15px' }}>
                      {getSunSignEmoji(chart.sun_sign)} {chart.name || 'Карта'}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      marginTop: '4px'
                    }}>
                      📅 {chart.chart_data?.birth_date?.split('T')[0] || '—'}
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)'
                    }}>
                      📍 {chart.chart_data?.birth_place || '—'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      marginTop: '6px'
                    }}>
                      {t('history.saved')}: {formatDate(chart.created_at)}
                    </div>
                  </div>
                  <button
                    onClick={(e) => handleDelete(chart.id, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px',
                      opacity: 0.6
                    }}
                    title={t('history.delete')}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default HistoryDrawer;