import React from 'react';
import { useTranslation } from 'react-i18next';
import ProcessingMessage from './ProcessingMessage';
import MarkdownContent from './MarkdownContent';
import type { StreamPhase } from '../hooks/useStreamedText';
import { createPortal } from 'react-dom';
// Root-cause фикс меню (.header-panel-clip, index.css) не покрыл все случаи
// обреза модалки — 2026-08-24, повторный репорт после отключения этой
// заплатки. Включена обратно, JS-фикс снова активен.
import { useModalWidthVar } from '../hooks/useModalWidthVar';

interface AspectData {
  planet1?: string;
  planet2?: string;
  aspect?: string;
  aspect_ru?: string;
  orb?: number;
}

interface AspectAnalysisModalProps {
  aspect: AspectData | null;
  analysis: string | null;
  displayedText?: string;
  phase?: StreamPhase;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  error?: string | null;
}

const AspectAnalysisModal = ({ aspect, analysis, displayedText = '', phase = 'idle', isOpen, onClose, loading, error }: AspectAnalysisModalProps) => {
  const { t, i18n } = useTranslation();

  // До раннего return: хук обязан вызываться на каждом рендере.
  useModalWidthVar(isOpen);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Портал в body: у модалки position: fixed, а он отсчитывается от экрана
  // только если ни у одного предка нет transform / filter / will-change.
  // Модалки рендерятся глубоко внутри страницы, и любая анимация появления
  // у обёртки уводила окно вниз. Портал снимает зависимость от предков.
  return createPortal(
    <div
      className="ui-modal-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="ui-modal ui-modal--wide"
      >
        <button
          onClick={onClose}
          className="ui-modal__close"
          onMouseEnter={(e) => {
            (e.target as HTMLElement).style.background = 'var(--bg-primary)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLElement).style.background = 'none';
          }}
        >
          ×
        </button>

        <h2 className="ui-modal__title">
          <span className="ui-dot" style={{ width: 36, height: 36 }}>
             △
          </span>
          {t('analysis.aspectAnalysis')}: {aspect?.planet1 ? t(`planets.names.${aspect.planet1}`, aspect.planet1) : ''} / {aspect?.planet2 ? t(`planets.names.${aspect.planet2}`, aspect.planet2) : ''}
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
            <div><strong>{t('planets.aspects.type')}:</strong> {i18n.language === 'ru' && aspect.aspect_ru ? aspect.aspect_ru : aspect.aspect}</div>
            <div><strong>{t('planets.orb')}:</strong> {aspect.orb}°</div>
          </div>
        )}

        {loading && phase !== 'typing' && (
          <ProcessingMessage
            title={phase === 'generating' ? t('dashboard.fullAnalysis.generating') : phase === 'searching' ? t('dashboard.fullAnalysis.searching') : undefined}
          />
        )}

        {error && (
          <div className="ui-error" style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
            {error}
          </div>
        )}

        {phase === 'typing' && !analysis && (
          <div className="markdown-content" style={{ marginTop: 'var(--space-3)' }}>
            <MarkdownContent content={displayedText} />
            <span className="typing-cursor" aria-hidden="true">▍</span>
          </div>
        )}

        {analysis && !loading && (
          <div className="markdown-content" style={{ marginTop: 'var(--space-3)' }}>
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
    ,
    document.body,
  );
};

export default AspectAnalysisModal;