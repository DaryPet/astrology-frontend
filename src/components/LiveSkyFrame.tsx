import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface LiveSkyFrameProps {
  /**
   * True exactly while the wait we're decorating is happening — pass the
   * same condition already used for the ProcessingMessage spinner, so the
   * two stay in sync (see plans/live-sky-v2-loading-experience.md).
   * Gates only the wait-specific extras (the glow pulse, drag-to-spin and
   * its hint); the starry sky itself stays on afterwards.
   */
  active: boolean;
  children: React.ReactNode;
}

// Deterministic star positions in percent of the stage. Kept to the outer
// band / corners of the square stage so they sit in the empty space around
// the circular wheel drawing instead of on top of its lines.
const STARS: Array<{ top: string; left: string; size: number; delay: number }> = [
  { top: '2%', left: '4%', size: 4, delay: 0 },
  { top: '6%', left: '12%', size: 3, delay: 1.1 },
  { top: '3%', left: '28%', size: 2, delay: 2.3 },
  { top: '1%', left: '55%', size: 3, delay: 0.6 },
  { top: '5%', left: '72%', size: 2, delay: 1.8 },
  { top: '2%', left: '90%', size: 4, delay: 2.9 },
  { top: '9%', left: '96%', size: 3, delay: 0.9 },
  { top: '24%', left: '98%', size: 2, delay: 2.1 },
  { top: '48%', left: '97%', size: 3, delay: 1.4 },
  { top: '72%', left: '98%', size: 2, delay: 0.3 },
  { top: '88%', left: '95%', size: 4, delay: 2.6 },
  { top: '96%', left: '84%', size: 3, delay: 1.6 },
  { top: '98%', left: '62%', size: 2, delay: 0.8 },
  { top: '95%', left: '43%', size: 3, delay: 2.4 },
  { top: '97%', left: '22%', size: 2, delay: 1.2 },
  { top: '93%', left: '7%', size: 4, delay: 0.4 },
  { top: '80%', left: '2%', size: 3, delay: 1.9 },
  { top: '58%', left: '1%', size: 2, delay: 2.8 },
  { top: '34%', left: '2%', size: 3, delay: 0.2 },
  { top: '14%', left: '3%', size: 2, delay: 1.5 },
  { top: '10%', left: '86%', size: 2, delay: 3.2 },
  { top: '88%', left: '13%', size: 2, delay: 2.0 },
];

/**
 * Wraps an already-existing chart wheel (AstroChartComponent /
 * SynastryChartComponent) with a decorative "alive" sky: twinkling stars
 * around the wheel, an orbiting comet spark and an occasional shooting
 * star. Those stay on for good — the chart is meant to keep feeling
 * alive after the analysis too. `active` (the analysis wait) only adds
 * the extras that belong to the wait itself: the glow pulse, and
 * drag-to-spin; the wheel eases back upright the moment the analysis
 * arrives. The glow is deliberately wait-only: it animates
 * `filter: drop-shadow`, which repaints the whole 560px wheel every
 * frame instead of compositing on the GPU like the stars/comet do, so it
 * is the one effect not worth running forever. Pure CSS/pointer events —
 * no new network requests, no LLM calls, and the wrapped chart component
 * itself is never modified (see plans/live-sky-v2-loading-experience.md;
 * v1's barely-visible "breathing" was scrapped for these clearly visible
 * effects). Drag listens on our own wrapper div, not on the
 * library-generated SVG, so no fragile SVG hit-testing is involved.
 */
const LiveSkyFrame: React.FC<LiveSkyFrameProps> = ({ active, children }) => {
  const { t } = useTranslation();
  const stageRef = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startAngle: number; startPointerAngle: number } | null>(null);

  // Ease the wheel back upright as soon as the wait is over, so the real
  // chart is never left tilted.
  useEffect(() => {
    if (!active) {
      dragRef.current = null;
      setDragging(false);
      setAngle(0);
    }
  }, [active]);

  const pointerAngleDeg = (e: React.PointerEvent): number => {
    const rect = stageRef.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!active || !stageRef.current) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    dragRef.current = { startAngle: angle, startPointerAngle: pointerAngleDeg(e) };
    setDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const delta = pointerAngleDeg(e) - dragRef.current.startPointerAngle;
    setAngle(dragRef.current.startAngle + delta);
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div className="live-sky-frame">
      <div
        ref={stageRef}
        className={`live-sky-stage${active ? ' live-sky-stage--draggable' : ''}${dragging ? ' live-sky-stage--dragging' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div className="live-sky-sky" aria-hidden="true">
          {STARS.map((star, i) => (
            <span
              key={i}
              className="live-sky-star"
              style={{
                top: star.top,
                left: star.left,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
          <span className="live-sky-shooting-star" />
          <div className="live-sky-orbit">
            <span className="live-sky-comet" />
          </div>
        </div>
        <div
          className={`chart-wheel-live${active ? ' chart-wheel-live--active' : ''}${dragging ? ' chart-wheel-live--dragging' : ''}`}
          style={angle !== 0 || dragging ? { transform: `rotate(${angle}deg)` } : undefined}
        >
          {children}
        </div>
      </div>
      {active && (
        <div className="live-sky-drag-hint">{t('liveSky.dragHint')}</div>
      )}
    </div>
  );
};

export default LiveSkyFrame;
