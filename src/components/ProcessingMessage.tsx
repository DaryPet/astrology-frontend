import React from 'react';
import { useTranslation } from 'react-i18next';

const ProcessingMessage = () => {
  const { t } = useTranslation();

  return (
    <div className="processing-container">
      <div className="processing-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      </div>
      <div className="processing-title">{t('analysis.processing')}</div>
      <div className="processing-hint">{t('analysis.processingHint')}</div>
      <div className="processing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  );
};

export default ProcessingMessage;