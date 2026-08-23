import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { chartsApi } from '../services/chartsApi';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { createPortal } from 'react-dom';

interface ChartItem {
  id: string | number;
  name?: string;
  sun_sign?: string;
  chart_data?: {
    type?: string;
    meta?: {
      birth_date?: string;
      birth_place?: string;
    };
    chart1?: {
      birth_date?: string;
      birth_place?: string;
    };
    chart2?: {
      birth_date?: string;
      birth_place?: string;
    };
  };
  chart_interpretations?: Array<{ name?: string }>;
  created_at?: string;
}

interface DeleteChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

function DeleteChartModal({ isOpen, onClose, onDeleted }: DeleteChartModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [charts, setCharts] = useState<ChartItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteInModal, setConfirmDeleteInModal] = useState(false);

  const loadCharts = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await chartsApi.getCharts(user!.id);
      setCharts(data);
    } catch {
      setLoadError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [user, t]);

  useEffect(() => {
    if (isOpen && user) {
      loadCharts();
    }
  }, [isOpen, user, loadCharts]);

  const handleDelete = () => {
    if (!selectedId) return;
    setConfirmDeleteInModal(true);
  };

  const handleConfirmDeleteInModal = async () => {
    if (!selectedId) return;
    setDeleting(true);
    try {
      await chartsApi.deleteChart(Number(selectedId));
      setConfirmDeleteInModal(false);
      onDeleted?.();
      onClose();
    } catch {
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  const getSunSignEmoji = (sign: string) => {
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString();
  };

  // Портал в body: у модалки position: fixed, а он отсчитывается от экрана
  // только если ни у одного предка нет transform / filter / will-change.
  // Модалки рендерятся глубоко внутри страницы, и любая анимация появления
  // у обёртки уводила окно вниз. Портал снимает зависимость от предков.
  return createPortal(
    <div
      className="ui-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ui-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '8px' }}>
          {t('history.limitReached')}
        </h3>
        <p className="ui-modal__text">
          {t('history.selectToDelete')}
        </p>

        {loading ? (
          <div className="loading">{t('common.loading')}</div>
        ) : loadError ? (
          <div className="error" style={{ marginBottom: '20px' }}>{loadError}</div>
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
                    {getSunSignEmoji(chart.sun_sign || '')} {chart.name || chart.chart_interpretations?.[0]?.name || 'Карта'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {chart.chart_data?.meta?.birth_date?.split('T')[0] || '—'} • {chart.chart_data?.meta?.birth_place || '—'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    📅 {formatDate(chart.created_at || '')}
                  </div>
                </div>
              </label>
            ))}
          </div>
        )}

        <div className="ui-modal__actions">
          <button
            className="btn btn-secondary"
            onClick={onClose}
            disabled={deleting}
          >
            {t('history.cancel')}
          </button>
          <button
            className="ui-btn ui-btn--danger"
            onClick={handleDelete}
            disabled={!selectedId || deleting}
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
    ,
    document.body,
  );
}

export default DeleteChartModal;