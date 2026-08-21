import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Structural subset of Dashboard's ChartPlanet — only the fields the
// carousel actually shows. Everything is optional, entries missing a sign
// are skipped.
interface LiveSkyPlanet {
  sign?: string;
  degree?: number;
  house?: number;
  /**
   * Transits/progressions name the house differently (TransitPlanet /
   * ProgressedPlanet in services/api.ts) and can leave it null — read here
   * so those panels can pass their planet record through untouched, with
   * no per-panel mapper.
   */
  natal_house?: number | null;
  is_retrograde?: boolean;
}

export interface LiveSkyPerson {
  /** Person name for synastry cards; omit for a single natal chart. */
  label?: string;
  planets: Record<string, LiveSkyPlanet>;
}

interface LiveSkyCarouselProps {
  people: LiveSkyPerson[];
  /**
   * Which chart the cards are describing — decides the card title only.
   * Transit planets are the sky right now, not the user's natal chart, so
   * calling them "meanwhile in your chart" would be plainly untrue; the
   * progressed chart is its own thing too. Defaults to 'natal', so the
   * existing natal/synastry call site is unaffected.
   */
  variant?: 'natal' | 'sky' | 'progressed';
}

interface CarouselEntry {
  personLabel?: string;
  planetKey: string;
  symbol: string;
  sign: string;
  signSymbol: string;
  degree?: number;
  house?: number;
  isRetrograde: boolean;
}

// Display order + astrological glyphs. Only planets/points that both exist
// in the chart data AND have a keywords entry get a card — the rest are
// skipped silently (Vertex, Part of Fortune etc. have no keywords).
const PLANET_ORDER: Array<{ key: string; symbol: string }> = [
  { key: 'Sun', symbol: '☉' },
  { key: 'Moon', symbol: '☽' },
  { key: 'Mercury', symbol: '☿' },
  { key: 'Venus', symbol: '♀' },
  { key: 'Mars', symbol: '♂' },
  { key: 'Jupiter', symbol: '♃' },
  { key: 'Saturn', symbol: '♄' },
  { key: 'Uranus', symbol: '♅' },
  { key: 'Neptune', symbol: '♆' },
  { key: 'Pluto', symbol: '♇' },
  { key: 'Chiron', symbol: '⚷' },
  { key: 'NorthNode', symbol: '☊' },
  { key: 'SouthNode', symbol: '☋' },
  { key: 'Lilith', symbol: '⚸' },
];

const SIGN_SYMBOLS: Record<string, string> = {
  Aries: '♈', Taurus: '♉', Gemini: '♊', Cancer: '♋',
  Leo: '♌', Virgo: '♍', Libra: '♎', Scorpio: '♏',
  Sagittarius: '♐', Capricorn: '♑', Aquarius: '♒', Pisces: '♓',
};

const ROTATE_MS = 14000;

/**
 * "Meanwhile in your chart…" — rotates through REAL planet placements
 * (sign / house / retrograde, data already on the client) with static i18n
 * keyword lines during the long analysis wait. Honest and personal by
 * construction: no invented progress, no network, no LLM (see
 * plans/live-sky-v2-loading-experience.md). Reused for the transits and
 * progressions waits too, where `variant` retitles the card for what those
 * planets actually are (see plans/live-sky-panels-parity.md).
 */
const LiveSkyCarousel: React.FC<LiveSkyCarouselProps> = ({ people, variant = 'natal' }) => {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Bumped on every manual navigation (arrows / planet chips) so the
  // auto-rotate interval restarts and doesn't yank the card away right
  // after the user picked it.
  const [manualNonce, setManualNonce] = useState(0);

  const entries = useMemo<CarouselEntry[]>(() => {
    const result: CarouselEntry[] = [];
    for (const { key, symbol } of PLANET_ORDER) {
      // Interleave persons per planet (Sun p1, Sun p2, Moon p1, …) so a
      // synastry wait alternates between the two charts.
      for (const person of people) {
        const planet = person.planets?.[key];
        if (!planet?.sign || !SIGN_SYMBOLS[planet.sign]) continue;
        const house = planet.house ?? planet.natal_house;
        result.push({
          personLabel: person.label,
          planetKey: key,
          symbol,
          sign: planet.sign,
          signSymbol: SIGN_SYMBOLS[planet.sign],
          degree: typeof planet.degree === 'number' ? planet.degree : undefined,
          house: typeof house === 'number' ? house : undefined,
          isRetrograde: planet.is_retrograde === true,
        });
      }
    }
    return result;
  }, [people]);

  const hasMultiple = entries.length > 1;

  // Interval keys off primitives, not the entries array identity —
  // Dashboard re-renders during streaming would otherwise restart the
  // timer on every render and the card would never advance.
  useEffect(() => {
    if (!hasMultiple || paused) return;
    const id = window.setInterval(() => {
      setIndex(i => i + 1);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [hasMultiple, paused, manualNonce]);

  if (entries.length === 0) return null;

  const current = ((index % entries.length) + entries.length) % entries.length;
  const entry = entries[current];

  const goTo = (i: number) => {
    setIndex(((i % entries.length) + entries.length) % entries.length);
    setManualNonce(n => n + 1);
  };

  // One chip per distinct planet (first person's order); clicking jumps
  // the carousel to that planet's first card.
  const chips: Array<{ planetKey: string; symbol: string; firstIndex: number }> = [];
  entries.forEach((e, i) => {
    if (!chips.some(c => c.planetKey === e.planetKey)) {
      chips.push({ planetKey: e.planetKey, symbol: e.symbol, firstIndex: i });
    }
  });

  const titleKeys = {
    natal: { one: 'liveSky.carousel.title', named: 'liveSky.carousel.titleFor' },
    sky: { one: 'liveSky.carousel.titleSky', named: 'liveSky.carousel.titleSky' },
    progressed: { one: 'liveSky.carousel.titleProgressed', named: 'liveSky.carousel.titleProgressedFor' },
  }[variant];
  const title = entry.personLabel
    ? t(titleKeys.named, { name: entry.personLabel })
    : t(titleKeys.one);
  const planetName = t(`planets.names.${entry.planetKey}`, entry.planetKey);
  const signName = t(`planets.signs.${entry.sign}`, entry.sign);
  const mainLine = t('liveSky.carousel.inSign', { planet: planetName, sign: signName });
  const details: string[] = [];
  if (entry.degree !== undefined) details.push(`${Math.round(entry.degree)}°`);
  if (entry.house !== undefined) details.push(t('liveSky.carousel.house', { num: entry.house }));
  if (entry.isRetrograde) details.push(`℞ ${t('liveSky.carousel.retrograde')}`);
  const keywords = t(`liveSky.keywords.${entry.planetKey}`, '');

  return (
    <div
      className="live-sky-carousel"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="live-sky-card" key={current}>
        {hasMultiple && (
          <button
            type="button"
            className="live-sky-card-arrow live-sky-card-arrow--prev"
            aria-label={t('liveSky.carousel.prev')}
            onClick={() => goTo(current - 1)}
          >
            ‹
          </button>
        )}
        <div className="live-sky-card-title">{title}</div>
        <div className="live-sky-card-main">
          {/* U+FE0E forces text presentation — some glyphs (♏ etc.) otherwise
              render as color emoji on macOS/iOS and clash with the design. */}
          <span className="live-sky-card-symbol" aria-hidden="true">{`${entry.symbol}\uFE0E`}</span>
          {mainLine}
          <span className="live-sky-card-symbol" aria-hidden="true">{`${entry.signSymbol}\uFE0E`}</span>
        </div>
        {details.length > 0 && (
          <div className="live-sky-card-details">{details.join(' · ')}</div>
        )}
        {keywords && <div className="live-sky-card-keywords">{keywords}</div>}
        {hasMultiple && (
          <button
            type="button"
            className="live-sky-card-arrow live-sky-card-arrow--next"
            aria-label={t('liveSky.carousel.next')}
            onClick={() => goTo(current + 1)}
          >
            ›
          </button>
        )}
      </div>
      {chips.length > 1 && (
        <div className="live-sky-chips">
          {chips.map(chip => (
            <button
              key={chip.planetKey}
              type="button"
              className={`live-sky-chip${chip.planetKey === entry.planetKey ? ' live-sky-chip--active' : ''}`}
              aria-label={t(`planets.names.${chip.planetKey}`, chip.planetKey)}
              title={t(`planets.names.${chip.planetKey}`, chip.planetKey)}
              onClick={() => goTo(chip.firstIndex)}
            >
              {`${chip.symbol}\uFE0E`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveSkyCarousel;
