import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { chartsApi } from '../services/chartsApi';

function SaveChartButton({ chartData, onSaved, onLimitReached }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const handleSave = async () => {
    if (!user || !chartData) return;

    setSaving(true);
    try {
      const hasLimit = await chartsApi.hasReachedLimit(user.id);

      if (hasLimit) {
        onLimitReached?.();
        setSaving(false);
        return;
      }

      await chartsApi.saveChart(user.id, chartData);
      setShowToast(true);
      onSaved?.();

      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Save chart error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        className="btn btn-primary"
        onClick={handleSave}
        disabled={saving || !user || !chartData}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        {saving ? (
          <span className="spinner" style={{ width: 16, height: 16 }} />
        ) : (
          '💾'
        )}
        {t('chart.saveButton')}
      </button>

      {showToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            background: '#22c55e',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontWeight: '500',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}
        >
          ✓ {t('history.saved')}
        </div>
      )}
    </>
  );
}

export default SaveChartButton;