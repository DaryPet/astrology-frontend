import { useEffect, useRef } from 'react';

interface ScrollAnchorProps {
  /** Меняется — контейнер подматывается вниз. Строка/число, а не объект. */
  watch: string | number;
  /** На сколько пикселей можно отлистать вверх, не теряя автоскролл. */
  threshold?: number;
}

/**
 * Держит скроллящегося родителя прижатым к низу, пока пользователь сам
 * не отлистает вверх. Хук живёт здесь, а не в Dashboard, чтобы не менять
 * порядок хуков Dashboard (см. openspec/changes/premium-design-system,
 * Decision 2).
 *
 * Скроллим `scrollTop` контейнера напрямую, а не через `scrollIntoView`:
 * тот подматывает все родительские скролл-контейнеры, включая окно, и
 * дёргал бы страницу под читающим пользователем.
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
