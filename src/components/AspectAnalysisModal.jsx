import React from 'react';
import { useTranslation } from 'react-i18next';
import ProcessingMessage from './ProcessingMessage';
import MarkdownContent from './MarkdownContent';

const AspectAnalysisModal = ({ aspect, analysis, isOpen, onClose, loading, error }) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={handleOverlayClick}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          maxHeight: '80vh',
          overflow: 'auto',
          position: 'relative',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'none';
          }}
        >
          ×
        </button>

        <h2 style={{
          margin: '0 0 20px 0',
          color: 'var(--text-primary)',
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            color: '#fff'
          }}>
            △
          </span>
          {t('analysis.aspectAnalysis')}: {aspect?.planet1} / {aspect?.planet2}
        </h2>

        {aspect && (
          <div style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'var(--bg-primary)',
            borderRadius: '8px',
            fontSize: '14px',
            color: 'var(--text-secondary)'
          }}>
            <div><strong>{t('planets.aspects.type')}:</strong> {aspect.aspect}</div>
            <div><strong>{t('planets.orb')}:</strong> {aspect.orb}°</div>
          </div>
        )}

        {loading && (
          <ProcessingMessage />
        )}

        {error && (
          <div style={{
            padding: '16px',
            background: 'rgba(255, 59, 48, 0.1)',
            borderRadius: '8px',
            color: '#ff3b30',
            marginBottom: '16px'
          }}>
            {error}
          </div>
        )}

        {analysis && !loading && (
          <div className="markdown-content" style={{
            marginTop: '12px'
          }}>
            <MarkdownContent content={analysis} />
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AspectAnalysisModal;
