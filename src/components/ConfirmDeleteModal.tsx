import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';
import { useModalWidthVar } from '../hooks/useModalWidthVar';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  chartName?: string;
  deleting: boolean;
}

function ConfirmDeleteModal({ isOpen, onClose, onConfirm, chartName, deleting }: ConfirmDeleteModalProps) {
  const { t } = useTranslation();

  // До раннего return: хук обязан вызываться на каждом рендере.
  useModalWidthVar(isOpen);

  if (!isOpen) return null;

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
      </div>
    </div>
    ,
    document.body,
  );
}

export default ConfirmDeleteModal;