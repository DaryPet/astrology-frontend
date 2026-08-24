import { useEffect } from 'react';

/**
 * Пока модалка открыта, ставит на <html> три переменные, которыми на мобильном
 * (`@media max-width: 599px`, ui.css) целиком описан `.ui-modal-overlay`:
 * `--ui-modal-w` (ширина), `--ui-modal-overlay-top` и `--ui-modal-overlay-h`
 * (верх и высота оверлея). Сама модалка (`.ui-modal`) эти переменные не
 * читает — она как была, так и осталась `position: fixed; bottom: 0`
 * относительно оверлея; чинится только геометрия самого оверлея, оверлей же
 * несёт containing block для модалки дальше сам, без изменений.
 *
 * Ширина (не новое, было и раньше): `position: fixed`-бокс меряется от своего
 * containing block'а, а на практике им может оказаться не экран (см. ниже),
 * поэтому размеры вычисляются явным пикселем, а не left:0/right:0/vw/%.
 *
 * Верх и высота (2026-08-24, новый случай той же болезни): у `.ui-modal-overlay`
 * `position: fixed; inset: 0`. По спецификации это должно быть намертво
 * приклеено к экрану вне зависимости от прокрутки страницы — но на живой
 * странице (репорт: модалка удаления карты) оверлей вёл себя так, будто его
 * containing block — не экран, а весь документ: `bottom: 0` внутри модалки
 * упирался не в низ экрана, а в низ document.body (там были все 3273px
 * длинной страницы с таблицей планет), и окно пряталось в подвале страницы,
 * а не сразу перед глазами. Причина фиксом не подтверждена (соответствия
 * transform/filter/perspective/contain на <body>/<html> в коде проекта нет —
 * то есть либо баг именно в связке position:fixed + очень длинная страница,
 * либо что-то внешнее вроде расширения браузера), поэтому вместо того чтобы
 * гадать дальше, оверлей на мобильном переведён с `position: fixed` на
 * `position: absolute` с координатами, которые вычисляет JS сам —
 * `scrollY` и `visualViewport`, а не то, что решит браузер про containing
 * block. `absolute` с явным document-relative top/height корректен
 * независимо от того, что именно сбивало `fixed`: это не гипотеза про
 * причину, а обход самого механизма `fixed`, который не сработал.
 */
export const useModalWidthVar = (isOpen: boolean) => {
  useEffect(() => {
    if (!isOpen) return;

    const root = document.documentElement;
    let rafId: number | null = null;

    const applyNow = () => {
      rafId = null;
      root.style.setProperty('--ui-modal-w', `${root.clientWidth}px`);
      const vh = window.visualViewport?.height ?? window.innerHeight;
      const scrollY = window.scrollY ?? root.scrollTop;
      root.style.setProperty('--ui-modal-overlay-top', `${scrollY}px`);
      root.style.setProperty('--ui-modal-overlay-h', `${vh}px`);
    };
    // scroll на мобильном может стрелять часто — коалесцируем через rAF,
    // чтобы не писать инлайн-стили на каждое событие.
    const applyThrottled = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(applyNow);
    };

    applyNow();
    window.addEventListener('resize', applyNow);
    window.addEventListener('orientationchange', applyNow);
    window.addEventListener('scroll', applyThrottled, { passive: true });
    window.visualViewport?.addEventListener('resize', applyNow);
    window.visualViewport?.addEventListener('scroll', applyThrottled);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', applyNow);
      window.removeEventListener('orientationchange', applyNow);
      window.removeEventListener('scroll', applyThrottled);
      window.visualViewport?.removeEventListener('resize', applyNow);
      window.visualViewport?.removeEventListener('scroll', applyThrottled);
      root.style.removeProperty('--ui-modal-w');
      root.style.removeProperty('--ui-modal-overlay-top');
      root.style.removeProperty('--ui-modal-overlay-h');
    };
  }, [isOpen]);
};

export default useModalWidthVar;
