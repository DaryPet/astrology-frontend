import { useTranslation } from 'react-i18next';
import { createPortal } from 'react-dom';

interface DuplicateChartModalProps {
  isOpen: boolean;
  chartName?: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

function DuplicateChartModal({ isOpen, chartName, onClose, onConfirm }: DuplicateChartModalProps) {
  const { t } = useTranslation();

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
    ,
    document.body,
  );
}

export default DuplicateChartModal;