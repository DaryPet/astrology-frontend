import { useCallback, useEffect, useRef, useState } from 'react';

export type StreamPhase = 'idle' | 'searching' | 'generating' | 'typing' | 'done' | 'error';

export interface UseStreamedTextResult {
  phase: StreamPhase;
  displayedText: string;
  finalReceived: boolean;
  reset: () => void;
  handleStage: (stage: string) => void;
  handleDelta: (text: string) => void;
  handleFinal: (analysis: string) => void;
  handleError: () => void;
  hasDelta: () => boolean;
}

/**
 * @param onDone called exactly once, when the typing catches up with final —
 *   this is where the cache/DB write and spinner teardown go (as finishStreamRef does for natal).
 */
export function useStreamedText(onDone: (finalText: string) => void): UseStreamedTextResult {
  const [phase, setPhase] = useState<StreamPhase>('idle');
  const [displayedText, setDisplayedText] = useState('');
  const [finalReceived, setFinalReceived] = useState(false);
  const verifiedTextRef = useRef('');
  const finalTextRef = useRef<string | null>(null);
  const deltaReceivedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  const reset = useCallback(() => {
    verifiedTextRef.current = '';
    finalTextRef.current = null;
    deltaReceivedRef.current = false;
    setFinalReceived(false);
    setDisplayedText('');
    setPhase('searching');
  }, []);

  const handleStage = useCallback((stage: string) => {
    setPhase(prev => {
      if (prev === 'typing' || prev === 'done') return prev;
      return stage === 'generating' ? 'generating' : 'searching';
    });
  }, []);

  const handleDelta = useCallback((text: string) => {
    deltaReceivedRef.current = true;
    verifiedTextRef.current += text;
    setPhase(prev => (prev === 'searching' || prev === 'generating') ? 'typing' : prev);
  }, []);

  const handleFinal = useCallback((analysis: string) => {
    verifiedTextRef.current = analysis;
    finalTextRef.current = analysis;
    setFinalReceived(true);
    setPhase(prev => prev === 'done' ? prev : 'typing');
  }, []);

  const handleError = useCallback(() => {
    setPhase('error');
    setDisplayedText('');
    verifiedTextRef.current = '';
  }, []);

  useEffect(() => {
    if (phase !== 'searching' && phase !== 'generating' && phase !== 'typing') {
      return;
    }
    const TICK_MS = 35;
    const id = window.setInterval(() => {
      setDisplayedText(prev => {
        const target = verifiedTextRef.current;
        const backlog = target.length - prev.length;
        if (backlog <= 0) return prev;
        const step = Math.min(backlog, 1 + Math.floor(backlog / 20));
        return target.slice(0, prev.length + step);
      });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (!finalReceived || finalTextRef.current == null) return;
    if (displayedText.length < finalTextRef.current.length) return;
    const text = finalTextRef.current;
    finalTextRef.current = null;
    setPhase('done');
    onDoneRef.current(text);
  }, [displayedText, finalReceived]);

  return {
    phase,
    displayedText,
    finalReceived,
    reset,
    handleStage,
    handleDelta,
    handleFinal,
    handleError,
    hasDelta: () => deltaReceivedRef.current,
  };
}
