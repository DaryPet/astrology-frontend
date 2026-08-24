import { useLayoutEffect } from 'react';

/**
 * Геометрия и скролл-лок для модалок. Вызывается из всех шести модалок
 * (Aspect/Planet/Delete/ConfirmDelete/Duplicate/UnsavedAnalysis).
 *
 * Делает три вещи, пока модалка открыта:
 *
 * 1. БЛОКИРУЕТ СКРОЛЛ СТРАНИЦЫ. Это главное. Симптом, который лечится
 *    (2026-08-24): кликаешь планету внизу длинной страницы — страница
 *    дёргается, и модалка оказывается не там, где кликнули. То же самое было
 *    у модалки удаления карты и у модалки ухода с анализа. Модалка при этом
 *    вставала по центру честно — просто уже относительно нового положения
 *    страницы. Что именно дёргало скролл в момент открытия, установить не
 *    удалось; лок делает вопрос неактуальным: страница физически не может
 *    прокрутиться, значит модалку некуда унести. Чинить причину, которую не
 *    удаётся воспроизвести, — гадание; убрать саму возможность сдвига —
 *    детерминированно.
 *
 * 2. ЗАМЕРЯЕТ scrollY ОДИН РАЗ, в момент открытия, и больше за ним не гоняется.
 *    Раньше здесь висел слушатель `scroll`, который на каждый кадр прокрутки
 *    переписывал позицию оверлея — оверлей вечно догонял страницу с
 *    отставанием на кадр, отсюда и рывок. После п.1 догонять нечего.
 *
 * 3. Ставит на <html> три переменные, которыми на мобильном
 *    (`@media max-width: 599px`, ui.css) описан `.ui-modal-overlay`:
 *    `--ui-modal-w` (ширина), `--ui-modal-overlay-top` / `--ui-modal-overlay-h`
 *    (верх и высота). Причина, по которой размеры считает JS, а не CSS:
 *    у `.ui-modal-overlay` там `position: absolute` с координатами документа,
 *    потому что `position: fixed; inset: 0` на живой странице вёл себя так,
 *    будто приклеен не к экрану, а ко всему документу (INSIGHTS.md,
 *    2026-08-24). Явный пиксель от этого не зависит.
 *
 * useLayoutEffect, а не useEffect: и лок, и замер обязаны встать в том же
 * кадре, в котором модалка появляется. Через useEffect они опаздывали на кадр,
 * и сдвиг скролла успевал произойти до лока.
 */

/* Открытых модалок может быть две одновременно: DeleteChartModal рендерит
   внутри себя ConfirmDeleteModal. Без счётчика закрытие внутренней снимало бы
   лок и стирало переменные, пока внешняя ещё открыта, — и внешняя прыгала бы
   в верх документа (fallback `top: 0`). */
let openCount = 0;
let releaseLock: (() => void) | null = null;

export const useModalWidthVar = (isOpen: boolean) => {
  useLayoutEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    const body = document.body;

    /* Замеры строго ДО лока: `overflow: hidden` убирает полосу прокрутки, и
       после этого clientWidth и innerWidth уже другие. */
    const lockedScrollY = window.scrollY || root.scrollTop || 0;
    const scrollbarW = window.innerWidth - root.clientWidth;

    /* Верх оверлея берётся из замера при открытии и при resize не
       пересчитывается: скролл залочен, значит эта координата не устареет.
       Ширина и высота пересчитываются — поворот экрана и вылезающая
       клавиатура их реально меняют. */
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
      const prevBodyPaddingRight = body.style.paddingRight;

      root.style.overflow = 'hidden';
      body.style.overflow = 'hidden';
      /* На десктопе исчезнувшая полоса прокрутки иначе расширила бы контент и
         страница дёрнулась бы вбок в момент открытия. На мобильном полосы нет
         и scrollbarW === 0 — компенсация не применяется. */
      if (scrollbarW > 0) {
        body.style.paddingRight = `${scrollbarW}px`;
      }

      releaseLock = () => {
        root.style.overflow = prevRootOverflow;
        body.style.overflow = prevBodyOverflow;
        body.style.paddingRight = prevBodyPaddingRight;
      };
    }

    /* Реальные изменения вьюпорта: поворот экрана, вылезшая клавиатура.
       `scroll` здесь намеренно НЕ слушается — см. п.2 в docblock. */
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
      /* Позиция скролла НЕ восстанавливается вручную (scrollTo) намеренно:
         браузер сохраняет её сам при снятии `overflow: hidden`, а модалка
         ухода с анализа закрывается ровно в момент навигации — ручной scrollTo
         там применился бы уже к новой странице. */
    };
  }, [isOpen]);
};

export default useModalWidthVar;
