import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface DuplicateChartModalProps {
  isOpen: boolean;
  chartName?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

function DuplicateChartModal({ isOpen, chartName, onClose, onConfirm }: DuplicateChartModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
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
    </Modal>
  );
}

export default DuplicateChartModal;
