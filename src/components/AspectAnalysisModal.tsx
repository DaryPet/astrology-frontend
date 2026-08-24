import { useTranslation } from 'react-i18next';
import ProcessingMessage from './ProcessingMessage';
import MarkdownContent from './MarkdownContent';
import Modal from './Modal';
import type { StreamPhase } from '../hooks/useStreamedText';

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} wide>
      <button
        onClick={onClose}
        className="ui-modal__close"
        aria-label={t('common.close', 'Close')}
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
    </Modal>
  );
};

export default AspectAnalysisModal;
