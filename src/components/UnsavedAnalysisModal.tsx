import React from 'react';
import { useTranslation } from 'react-i18next';

interface UnsavedAnalysisModalProps {
  isOpen: boolean;
  onSave: () => void;
  onLeave: () => void;
  saving?: boolean;
}

const UnsavedAnalysisModal: React.FC<UnsavedAnalysisModalProps> = ({
  isOpen,
  onSave,
  onLeave,
  saving = false
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '16px',
        padding: '32px', maxWidth: '420px', width: '90%',
        border: '1px solid var(--border)'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)' }}>
          ⚠️ {t('unsavedModal.title')}
        </h3>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {t('unsavedModal.message')}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
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