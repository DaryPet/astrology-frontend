import React from 'react';
import { useTranslation } from 'react-i18next';

interface UnsavedAnalysisModalProps {
  isOpen: boolean;
  onSave: () => void;
  onCancel: () => void;
  onLeave: () => void;
  saving?: boolean;
  title?: string;
  message?: string;
  showSave?: boolean;
}

const UnsavedAnalysisModal: React.FC<UnsavedAnalysisModalProps> = ({
  isOpen,
  onSave,
  onCancel,
  onLeave,
  saving = false,
  title,
  message,
  showSave = true
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="ui-modal-overlay">
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px',
        padding: '32px', maxWidth: '420px', width: '90%',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
          ⚠️ {title ?? t('unsavedModal.title')}
        </h3>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {message ?? t('unsavedModal.message')}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          {showSave && (
            <button
              onClick={onSave}
              disabled={saving}
              style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '600', cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.8 : 1
              }}
            >
              {saving ? '...' : t('unsavedModal.save')}
            </button>
          )}
          <button
            onClick={onCancel}
            disabled={saving}
            style={{
              flex: 1, padding: '12px',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text-secondary)',
              fontSize: '14px', cursor: saving ? 'default' : 'pointer'
            }}
          >
            {showSave ? t('unsavedModal.cancel') : t('unsavedModal.wait')}
          </button>
          <button
            onClick={onLeave}
            disabled={saving}
            style={{
              flex: 1, padding: '12px',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: '10px', color: 'var(--text-secondary)',
              fontSize: '14px', cursor: saving ? 'default' : 'pointer'
            }}
          >
            {t('unsavedModal.leave')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UnsavedAnalysisModal;