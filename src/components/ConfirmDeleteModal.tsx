import { useTranslation } from 'react-i18next';
import Modal from './Modal';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chartName?: string;
  deleting: boolean;
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, chartName, deleting }: ConfirmDeleteModalProps) {
  const { t } = useTranslation();

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <h3 style={{ marginBottom: 'var(--space-3)' }}>
        {t('history.confirmDeleteTitle', 'Delete chart?')}
      </h3>
      <p className="ui-modal__text">
        {t('history.confirmDeleteMessage', { name: chartName })}
      </p>

      <div className="ui-modal__actions">
        <button
          className="btn btn-secondary"
          onClick={onClose}
          disabled={deleting}
        >
          {t('history.cancel', 'Cancel')}
        </button>
        <button
          className="ui-btn ui-btn--danger"
          onClick={onConfirm}
          disabled={deleting}
        >
          {deleting ? '...' : t('history.delete', 'Delete')}
        </button>
      </div>
    </Modal>
  );
}

export default ConfirmDeleteModal;
