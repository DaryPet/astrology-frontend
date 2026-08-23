/**
 * Декоративное небо на фон страницы: мерцающие звёзды, комета по орбите
 * и падающая звезда.
 *
 * Почему отдельный компонент, а не LiveSkyFrame: тот спроектирован как
 * рамка вокруг колеса карты — его звёзды намеренно прижаты к краям и углам
 * квадратной сцены, чтобы не ложиться на линии чертежа. На полной странице
 * такая раскладка собрала бы всё по периметру.
 *
 * Анимации переиспользуются из index.css (live-sky-twinkle, -orbit-spin,
 * -shoot) — свои keyframes здесь не заводятся. Всё движение идёт через
 * transform и opacity, то есть композитится на GPU; filter и box-shadow
 * не анимируются нигде (см. plans/home-synastry-design.md).
 *
 * Ничего не рендерит в светлой теме и не двигается при prefers-reduced-motion
 * — и то и другое решается в CSS, без JS.
 */

// Детерминированные позиции — как в LiveSkyFrame, чтобы небо не «прыгало»
// между рендерами. Первые 20 покрывают экран и сами по себе: на мобильном
// CSS прячет остальные, поэтому порядок здесь не случайный.
const STARS: Array<{ top: string; left: string; size: number; delay: number }> = [
  { top: '8%', left: '12%', size: 3, delay: 0 },
  { top: '17%', left: '78%', size: 2, delay: 1.4 },
  { top: '31%', left: '24%', size: 3, delay: 2.6 },
  { top: '44%', left: '89%', size: 2, delay: 0.7 },
  { top: '58%', left: '9%', size: 3, delay: 1.9 },
  { top: '69%', left: '63%', size: 2, delay: 3.1 },
  { top: '82%', left: '31%', size: 3, delay: 0.4 },
  { top: '91%', left: '82%', size: 2, delay: 2.2 },
  { top: '12%', left: '45%', size: 2, delay: 1.1 },
  { top: '26%', left: '58%', size: 3, delay: 2.9 },
  { top: '38%', left: '6%', size: 2, delay: 0.9 },
  { top: '51%', left: '41%', size: 3, delay: 2.4 },
  { top: '63%', left: '95%', size: 2, delay: 1.6 },
  { top: '75%', left: '17%', size: 3, delay: 0.2 },
  { top: '86%', left: '52%', size: 2, delay: 2.7 },
  { top: '95%', left: '7%', size: 3, delay: 1.3 },
  { top: '5%', left: '66%', size: 2, delay: 3.4 },
  { top: '22%', left: '93%', size: 3, delay: 0.6 },
  { top: '47%', left: '71%', size: 2, delay: 2.1 },
  { top: '71%', left: '44%', size: 3, delay: 1.8 },
  // Дальше — уплотнение для больших экранов, на мобильном скрыто
  { top: '3%', left: '33%', size: 2, delay: 2.3 },
  { top: '14%', left: '61%', size: 3, delay: 0.5 },
  { top: '20%', left: '4%', size: 2, delay: 3.0 },
  { top: '29%', left: '84%', size: 2, delay: 1.2 },
  { top: '35%', left: '49%', size: 3, delay: 2.8 },
  { top: '42%', left: '20%', size: 2, delay: 0.3 },
  { top: '49%', left: '57%', size: 2, delay: 1.7 },
  { top: '55%', left: '86%', size: 3, delay: 3.3 },
  { top: '61%', left: '28%', size: 2, delay: 0.8 },
  { top: '66%', left: '11%', size: 3, delay: 2.5 },
  { top: '73%', left: '74%', size: 2, delay: 1.0 },
  { top: '79%', left: '96%', size: 3, delay: 3.2 },
  { top: '84%', left: '38%', size: 2, delay: 0.1 },
  { top: '89%', left: '68%', size: 2, delay: 2.0 },
  { top: '93%', left: '25%', size: 3, delay: 1.5 },
  { top: '97%', left: '59%', size: 2, delay: 2.9 },
  { top: '10%', left: '88%', size: 2, delay: 1.9 },
  { top: '33%', left: '36%', size: 2, delay: 0.6 },
  { top: '54%', left: '3%', size: 2, delay: 3.1 },
  { top: '77%', left: '55%', size: 2, delay: 1.4 },
];

const StarfieldBackground = () => (
  <div className="starfield" aria-hidden="true">
    {STARS.map((star, i) => (
      <span
        key={i}
        className="live-sky-star starfield__star"
        style={{
          top: star.top,
          left: star.left,
          width: `${star.size}px`,
          height: `${star.size}px`,
          animationDelay: `${star.delay}s`,
        }}
      />
    ))}
    <span className="live-sky-shooting-star starfield__shooting-star" />
    <div className="starfield__orbit">
      <span className="live-sky-comet" />
    </div>
  </div>
);

export default StarfieldBackground;
