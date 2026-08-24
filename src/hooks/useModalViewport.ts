import { useLayoutEffect } from 'react';

/**
 * Viewport geometry and scroll lock for modals. Its only consumer is the
 * <Modal> component; individual modals no longer call it directly. The former
 * name (useModalWidthVar) described about a third of what it actually does.
 *
 * While a modal is open it does three things:
 *
 * 1. LOCKS PAGE SCROLL. This is the important one. The symptom it cures
 *    (2026-08-24): click a planet near the bottom of a long page and the page
 *    jumps, so the modal ends up somewhere other than where you clicked. The
 *    delete-chart modal and the leave-during-analysis modal did the same. The
 *    modal was in fact centred correctly — just relative to the page's new
 *    scroll position. What exactly nudged the scroll on open was never
 *    reproduced; the lock makes that question moot, because a page that cannot
 *    scroll cannot carry the modal away. Fixing a cause you cannot reproduce is
 *    guesswork; removing the possibility of the shift is deterministic.
 *
 * 2. MEASURES scrollY ONCE, at open, and never chases it afterwards. There used
 *    to be a `scroll` listener here that rewrote the overlay's position on every
 *    frame of scrolling — the overlay was permanently one frame behind the page,
 *    which is what made it look like the modal was being yanked around. After
 *    (1) there is nothing left to chase.
 *
 * 3. Sets three custom properties on <html>. On mobile (`@media max-width:
 *    599px`, ui.css) they fully describe `.ui-modal-overlay`: `--ui-modal-w`
 *    (width), `--ui-modal-overlay-top` and `--ui-modal-overlay-h` (top and
 *    height). Why JS computes these instead of CSS: the overlay there is
 *    `position: absolute` in document coordinates, because `position: fixed;
 *    inset: 0` on the live page behaved as though it were anchored to the whole
 *    document rather than to the screen (INSIGHTS.md, 2026-08-24). An explicit
 *    pixel value does not depend on whatever was breaking `fixed`.
 *
 * useLayoutEffect rather than useEffect: both the lock and the measurement must
 * land in the same frame the modal appears in. Through useEffect they were one
 * frame late, and the scroll shift had already happened by the time the lock
 * was applied.
 */

/* Two modals can be open at once: DeleteChartModal renders ConfirmDeleteModal
   inside itself. Without a counter, closing the inner one would release the
   lock and delete the custom properties while the outer one is still open —
   and the outer one would jump to the top of the document (the `top: 0`
   fallback). */
let openCount = 0;
let releaseLock: (() => void) | null = null;

export const useModalViewport = (isOpen: boolean) => {
  useLayoutEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    const body = document.body;

    const lockedScrollY = window.scrollY || root.scrollTop || 0;
    const applyGeometry = () => {
      root.style.setProperty('--ui-modal-w', `${root.clientWidth}px`);
      const vh = window.visualViewport?.height ?? window.innerHeight;
      root.style.setProperty('--ui-modal-overlay-h', `${vh}px`);
      root.style.setProperty('--ui-modal-overlay-top', `${lockedScrollY}px`);
    };

    applyGeometry();

    openCount += 1;
    if (openCount === 1) {
      const prevRootOverflow = root.style.overflow;
      const prevBodyOverflow = body.style.overflow;
      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';

      releaseLock = () => {
        root.style.overflow = prevRootOverflow;
        body.style.overflow = prevBodyOverflow;
      };
    }

    window.addEventListener('resize', applyGeometry);
    window.addEventListener('orientationchange', applyGeometry);
    window.visualViewport?.addEventListener('resize', applyGeometry);

    return () => {
      window.removeEventListener('resize', applyGeometry);
      window.removeEventListener('orientationchange', applyGeometry);
      window.visualViewport?.removeEventListener('resize', applyGeometry);

      openCount -= 1;
      if (openCount === 0) {
        releaseLock?.();
        releaseLock = null;
        root.style.removeProperty('--ui-modal-w');
        root.style.removeProperty('--ui-modal-overlay-top');
        root.style.removeProperty('--ui-modal-overlay-h');
      }
    };
  }, [isOpen]);
};

export default useModalViewport;
