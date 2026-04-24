import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { chartsApi } from '../services/chartsApi';
import ConfirmDeleteModal from './ConfirmDeleteModal';

function DeleteChartModal({ isOpen, onClose, onDeleted, chartToDelete, onConfirmDelete }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [charts, setCharts] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteInModal, setConfirmDeleteInModal] = useState(false);

  useEffect(() => {
    if (isOpen && user && !chartToDelete) {
      loadCharts();
    }
  }, [isOpen, user, chartToDelete]);

  useEffect(() => {
    if (chartToDelete) {
      setSelectedId(chartToDelete.id);
    } else {
      setSelectedId(null);
    }
  }, [chartToDelete]);

  const loadCharts = async () => {
    setLoading(true);
    try {
      const data = await chartsApi.getCharts(user.id);
      setCharts(data);
    } catch (err) {
      console.error('Load charts error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setConfirmDeleteInModal(true);
  };

  const handleConfirmDeleteInModal = async () => {
    setDeleting(true);
    try {
      await chartsApi.deleteChart(selectedId);
      setConfirmDeleteInModal(false);
      onDeleted?.();
      onClose();
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

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

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '8px' }}>
          {t('history.limitReached')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {t('history.selectToDelete')}
        </p>

        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {charts.map((chart) => (
              <label
                key={chart.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px',
                  background: 'var(--bg-secondary)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: selectedId === chart.id ? '2px solid var(--primary)' : '2px solid transparent'
                }}
              >
                <input
                  type="radio"
                  name="chartToDelete"
                  checked={selectedId === chart.id}
                  onChange={() => setSelectedId(chart.id)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500' }}>
                    {getSunSignEmoji(chart.sun_sign)} {chart.name || chart.chart_interpretations?.[0]?.name || 'Карта'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {chart.chart_data?.meta?.birth_date?.split('T')[0] || '—'} • {chart.chart_data?.meta?.birth_place || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📅 {formatDate(chart.created_at)}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={deleting}
          >
            {t('history.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleDelete}
            disabled={!selectedId || deleting}
            style={{ background: '#ef4444' }}
          >
            {deleting ? '...' : t('history.delete')}
          </button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={confirmDeleteInModal}
        onClose={() => setConfirmDeleteInModal(false)}
        onConfirm={handleConfirmDeleteInModal}
        chartName={charts.find(c => c.id === selectedId)?.name}
        deleting={deleting}
      />
    </div>
  );
}

export default DeleteChartModal;