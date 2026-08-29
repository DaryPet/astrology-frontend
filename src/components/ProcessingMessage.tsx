import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface ProcessingMessageProps {
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  /**
   * Real backend-reported stage (see StreamPhase in useStreamedText —
   * only 'searching'/'generating' are meaningful here, the SSE `stage`
   * event only ever carries those two). When given, the hint line cycles
   * through a few honest, stage-matched phrases instead of the generic
   * static one — purely decorative text rotation over an already-true
   * wait, no extra requests/LLM calls involved. Forces the hint visible
   * even at size="sm" (which otherwise hides it), since that's exactly
   * where this is meant to be seen (Progressions/Transits/ProgressedSynastry
   * panels).
   */
  phase?: 'searching' | 'generating';
  /**
   * Optional one-time greeting shown in place of the hint line for the
   * first few seconds after mount ("Welcome, dear soul…"), then the
   * normal hint/rotation takes over. Static i18n text, purely decorative —
   * no extra requests/LLM calls. Only affects call sites that pass it
   * (see plans/live-sky-v2-loading-experience.md).
   */
  intro?: string;
}

const ROTATE_MS = 3500;
const INTRO_MS = 6000;

const ProcessingMessage = ({ size = 'md', title, phase, intro }: ProcessingMessageProps) => {
  const { t } = useTranslation();
  const [hintIndex, setHintIndex] = useState(0);
  const [introActive, setIntroActive] = useState(Boolean(intro));
  const prevPhaseRef = useRef(phase);

  useEffect(() => {
    if (!intro) return;
    const id = window.setTimeout(() => setIntroActive(false), INTRO_MS);
    return () => window.clearTimeout(id);
  }, [intro]);

  const rawHints = phase ? t(`analysis.processingHints.${phase}`, { returnObjects: true }) : null;
  const rotatingHints = Array.isArray(rawHints) ? (rawHints as string[]) : null;

  // Restart the rotation from the first phrase whenever the real stage
  // changes (searching -> generating), so it never shows a stale phrase
  // from the previous stage.
  useEffect(() => {
    if (prevPhaseRef.current !== phase) {
      prevPhaseRef.current = phase;
      setHintIndex(0);
    }
  }, [phase]);

  useEffect(() => {
    // While the intro greeting is up, hold the rotation so it starts from
    // the first phrase once the greeting fades.
    if (introActive || !rotatingHints || rotatingHints.length < 2) return;
    const id = window.setInterval(() => {
      setHintIndex(i => (i + 1) % rotatingHints.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [rotatingHints, introActive]);

  const sizeStyles = {
    sm: {
      container: { padding: '8px', borderRadius: '8px' },
      icon: { width: '24px', height: '24px' },
      iconSvg: { width: '12px', height: '12px' },
      title: { fontSize: '12px', marginBottom: '2px', display: 'none' },
      hint: { fontSize: '14px', display: 'none' },
      dots: { marginTop: '0px', gap: '4px' },
      dot: { width: '4px', height: '4px' }
    },
    md: {
      container: { padding: '20px', borderRadius: '12px' },
      icon: { width: '40px', height: '40px' },
      iconSvg: { width: '20px', height: '20px' },
      title: { fontSize: '18px', marginBottom: '4px' },
      hint: { fontSize: '14px' },
      dots: { marginTop: '8px', gap: '6px' },
      dot: { width: '6px', height: '6px' }
    },
    lg: {
      container: { padding: '40px 20px', borderRadius: '16px' },
      icon: { width: '80px', height: '80px' },
      iconSvg: { width: '40px', height: '40px' },
      title: { fontSize: '24px', marginBottom: '8px' },
      hint: { fontSize: '16px' },
      dots: { marginTop: '20px', gap: '8px' },
      dot: { width: '8px', height: '8px' }
    }
  };

  const styles = sizeStyles[size];

  const hintText = (introActive && intro)
    ? intro
    : (rotatingHints?.[hintIndex] ?? t('analysis.processingHint'));
  // A rotating, stage-matched phrase (or the intro greeting) is worth
  // showing even where the generic static hint is normally hidden
  // (size="sm").
  const hintStyle = (phase || intro) ? { ...styles.hint, display: 'block' } : styles.hint;

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
      <div className="processing-hint" style={hintStyle}>{hintText}</div>
      <div className="processing-dots" style={styles.dots}>
        <span style={styles.dot}></span>
        <span style={styles.dot}></span>
        <span style={styles.dot}></span>
      </div>
    </div>
  );
};

export default ProcessingMessage;
