import React from 'react';
import { useTranslation } from 'react-i18next';

interface ProcessingMessageProps {
  size?: 'sm' | 'md' | 'lg';
  title?: string;
}

const ProcessingMessage = ({ size = 'md', title }: ProcessingMessageProps) => {
  const { t } = useTranslation();

  const sizeStyles = {
    sm: {
      container: { padding: '8px', borderRadius: '8px' },
      icon: { width: '24px', height: '24px' },
      iconSvg: { width: '12px', height: '12px' },
      title: { fontSize: '12px', marginBottom: '2px', display: 'none' },
      hint: { display: 'none' },
      dots: { marginTop: '0px', gap: '4px' },
      dot: { width: '4px', height: '4px' }
    },
    md: {
      container: { padding: '20px', borderRadius: '12px' },
      icon: { width: '40px', height: '40px' },
      iconSvg: { width: '20px', height: '20px' },
      title: { fontSize: '16px', marginBottom: '4px' },
      hint: { fontSize: '12px' },
      dots: { marginTop: '8px', gap: '6px' },
      dot: { width: '6px', height: '6px' }
    },
    lg: {
      container: { padding: '40px 20px', borderRadius: '16px' },
      icon: { width: '80px', height: '80px' },
      iconSvg: { width: '40px', height: '40px' },
      title: { fontSize: '22px', marginBottom: '8px' },
      hint: { fontSize: '14px' },
      dots: { marginTop: '20px', gap: '8px' },
      dot: { width: '8px', height: '8px' }
    }
  };

  const styles = sizeStyles[size];

  return (
    <div className="processing-container" style={styles.container}>
      <div className="processing-icon" style={styles.icon}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={styles.iconSvg}>
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="processing-title" style={styles.title}>{title ?? t('analysis.processing')}</div>
      <div className="processing-hint" style={styles.hint}>{t('analysis.processingHint')}</div>
      <div className="processing-dots" style={styles.dots}>
        <span style={styles.dot}></span>
        <span style={styles.dot}></span>
        <span style={styles.dot}></span>
      </div>
    </div>
  );
};

export default ProcessingMessage;