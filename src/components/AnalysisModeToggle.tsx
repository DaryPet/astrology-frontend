import { useTranslation } from 'react-i18next';

interface AnalysisModeToggleProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const AnalysisModeToggle = ({ value, onChange, disabled = false }: AnalysisModeToggleProps) => {
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'inline-flex',
      gap: '4px',
      padding: '4px',
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      marginBottom: '16px'
    }}>
      <button
        type="button"
        onClick={() => onChange('simple')}
        disabled={disabled}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '6px',
          background: value === 'simple' ? 'var(--accent)' : 'transparent',
          color: value === 'simple' ? '#fff' : 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
      >
        {t('analysisMode.simple', 'Basic')}
      </button>
      <button
        type="button"
        onClick={() => onChange('advanced')}
        disabled={disabled}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '6px',
          background: value === 'advanced' ? 'var(--accent)' : 'transparent',
          color: value === 'advanced' ? '#fff' : 'var(--text-secondary)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          fontSize: '14px',
          fontWeight: '500',
          transition: 'all 0.2s'
        }}
      >
        {t('analysisMode.advanced', 'Advanced')}
      </button>
    </div>
  );
};

export default AnalysisModeToggle;