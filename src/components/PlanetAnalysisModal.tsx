import { useTranslation } from 'react-i18next';
import ProcessingMessage from './ProcessingMessage';
import MarkdownContent from './MarkdownContent';
import Modal from './Modal';
import type { StreamPhase } from '../hooks/useStreamedText';

interface PlanetAnalysisModalProps {
  planet?: {
    name?: string;
    sign?: string;
    degree?: number;
    house?: number;
    [key: string]: unknown;
  };
  analysis?: string | null;
  displayedText?: string;
  phase?: StreamPhase;
  isOpen: boolean;
  onClose: () => void;
  loading?: boolean;
  error?: string;
}

const PlanetAnalysisModal = ({ planet, analysis, displayedText = '', phase = 'idle', isOpen, onClose, loading, error }: PlanetAnalysisModalProps) => {
  const { t } = useTranslation();

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
          {planet?.name?.substring(0, 2)}
        </span>
        {t('analysis.planetAnalysis')}: {planet?.name ? t(`planets.names.${planet.name}`, planet.name) : ''}
      </h2>

      {planet && (
        <div style={{
          marginBottom: '16px',
          padding: '12px',
          background: 'var(--bg-primary)',
          borderRadius: '8px',
          fontSize: '14px',
          color: 'var(--text-secondary)'
        }}>
          {planet.sign && <span>{t(`planets.signs.${planet.sign}`, planet.sign)}</span>}
          {planet.degree !== undefined && <span> {planet.degree.toFixed(2)}°</span>}
          {planet.house && <span> — {t('planets.house')} {planet.house}</span>}
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

export default PlanetAnalysisModal;
