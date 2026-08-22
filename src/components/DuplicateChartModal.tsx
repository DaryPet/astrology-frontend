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
      className="ui-modal-overlay"
      onClick={onClose}
    >
      <div
        className="ui-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ marginBottom: 'var(--space-3)' }}>
          {t('history.duplicateTitle')}
        </h3>
        <p className="ui-modal__text">
          {t('history.duplicateMessage', { name: chartName })}
        </p>

        <div className="ui-modal__actions">
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