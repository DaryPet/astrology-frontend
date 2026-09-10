import { useEffect, useRef } from 'react';

interface ScrollAnchorProps {
  /** Changes — the container scrolls to the bottom. A string or number, not an object. */
  watch: string | number;
  /** How many pixels the user may scroll up without losing autoscroll. */
  threshold?: number;
}

/**
 * Keeps the scrolling parent pinned to the bottom until the user scrolls
 * up themselves. The hook lives here, not in Dashboard, so Dashboard's hook
 * order stays unchanged (see openspec/changes/premium-design-system,
 * Decision 2).
 *
 * Scrolls the container's `scrollTop` directly instead of `scrollIntoView`:
 * that one scrolls every parent scroll container including the window, and
 * would yank the page under a reading user.
 */
const ScrollAnchor = ({ watch, threshold = 120 }: ScrollAnchorProps) => {
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const stickRef = useRef(true);

  useEffect(() => {
    const container = anchorRef.current?.parentElement;
    if (!container) return;

    const handleScroll = () => {
      const distance = container.scrollHeight - container.scrollTop - container.clientHeight;
      stickRef.current = distance <= threshold;
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  useEffect(() => {
    const container = anchorRef.current?.parentElement;
    if (!container || !stickRef.current) return;
    container.scrollTop = container.scrollHeight;
  }, [watch]);

  return <div ref={anchorRef} aria-hidden="true" className="db-scroll-anchor" />;
};

export default ScrollAnchor;
