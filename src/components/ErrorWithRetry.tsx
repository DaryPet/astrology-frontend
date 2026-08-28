import React from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCw } from 'lucide-react';

interface ErrorWithRetryProps {
  message: string;
  onRetry?: () => void;
  // Each call site keeps its own error class/spacing — only the retry button is shared.
  className?: string;
  style?: React.CSSProperties;
}

const ErrorWithRetry: React.FC<ErrorWithRetryProps> = ({ message, onRetry, className = 'ui-error', style }) => {
  const { t } = useTranslation();

  return (
    <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '10px', ...style }}>
      <span style={{ flex: 1 }}>{message}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          aria-label={t('common.retry')}
          title={t('common.retry')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            flexShrink: 0,
            borderRadius: '8px',
            border: '1px solid currentColor',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer'
          }}
        >
          <RotateCw size={16} />
        </button>
      )}
    </div>
  );
};

export default ErrorWithRetry;
