import { useTranslation } from 'react-i18next';

interface DuplicateChartModalProps {
  isOpen: boolean;
  chartName?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

function DuplicateChartModal({ isOpen, chartName, onClose, onConfirm }: DuplicateChartModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

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
          width: '90%'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: '12px' }}>
          {t('history.duplicateTitle')}
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {t('history.duplicateMessage', { name: chartName })}
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-secondary"
            onClick={onClose}
          >
            {t('history.cancel')}
          </button>
          <button
            className="btn btn-primary"
            onClick={onConfirm}
          >
            {t('history.saveAnyway')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default DuplicateChartModal;