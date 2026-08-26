import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';

/**
 * SynastryChartComponentV2 — synastry bi-wheel, Astro-Seek style.
 *
 * Two full wheels on one zodiac (rotated to Partner 1's ASC):
 *  - Inner ring = Partner 1: planets + full house grid (ASC/IC/DSC/MC).
 *  - Outer ring = Partner 2: planets + own house ring (ASC/IC/DSC/MC).
 *  - Center: inter-chart aspects (red = hard, blue = soft, green = conjunction).
 *
 * Positions are computed by the backend (astrology_v2.py).
 */

// U+FE0E variation selector: renders as a text glyph, not an emoji (macOS)
const T = (s: string) => s + '︎';

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
const ZODIAC_TINT = [
  '#e5533c', '#4c8c4a', '#e0a92e', '#4a7bd0',
  '#e5533c', '#4c8c4a', '#e0a92e', '#4a7bd0',
  '#e5533c', '#4c8c4a', '#e0a92e', '#4a7bd0',
];

const ASPECT_STYLE: Record<string, { color: string; hard: boolean }> = {
  Conjunction: { color: '#1f9d55', hard: false },
  Opposition:  { color: '#d33b3b', hard: true },
  Square:      { color: '#d33b3b', hard: true },
  Trine:       { color: '#2f6fd0', hard: false },
  Sextile:     { color: '#2f6fd0', hard: false },
  Quincunx:    { color: '#9a6ac0', hard: true },
  Semisextile: { color: '#9a6ac0', hard: false },
};

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', SouthNode: '☋', Chiron: '⚷', Lilith: '⚸', Vertex: 'Vx',
};
const PLANET_NAME: Record<string, string> = {
  Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера',
  Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн', Uranus: 'Уран',
  Neptune: 'Нептун', Pluto: 'Плутон', NorthNode: 'Сев.Узел',
  SouthNode: 'Юж.Узел', Chiron: 'Хирон', Lilith: 'Лилит', Vertex: 'Вертекс',
};

const P1_COLOR = '#243b6b'; // dark blue — Partner 1 (inner ring)
const P2_COLOR = '#8a4b1f'; // bronze — Partner 2 (outer ring)

interface ChartPlanet {
  full_degree?: number;
  sign?: string; sign_ru?: string; degree?: number;
  speed?: number; is_retrograde?: boolean;
  [key: string]: unknown;
}
interface ChartHouse { cusp_longitude?: number; }
interface ChartData {
  planets?: Record<string, ChartPlanet>;
  houses?: Record<string, ChartHouse>;
}
// `aspect` is the canonical English key from the backend (Conjunction,
// Opposition, …) — the same keys ASPECT_STYLE and i18n `planets.aspectNames`
// use, so the tooltip translates off it. The localized `aspect_ru` the
// backend also sends is deliberately NOT used: it hardcoded the tooltip to
// Russian whatever the UI language was.
interface Aspect { planet1: string; planet2: string; aspect: string; orb?: number; }
interface TooltipState { x: number; y: number; color: string; content: string; }
interface SynastryChartProps {
  chart1?: ChartData | null; chart2?: ChartData | null;
  aspects?: Aspect[]; size?: number; name1?: string; name2?: string;
}

const polarToCart = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (180 - deg) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const spreadPlanets = (
  entries: Array<{ name: string; data: ChartPlanet; deg: number }>,
  minGap: number,
) => {
  if (entries.length <= 1) return entries.map(e => ({ ...e, adjDeg: e.deg }));
  const sorted = entries.map(e => ({ ...e, adjDeg: e.deg })).sort((a, b) => a.deg - b.deg);
  for (let iter = 0; iter < 120; iter++) {
    let moved = false;
    for (let i = 0; i < sorted.length; i++) {
      const j = (i + 1) % sorted.length;
      const diff = ((sorted[j].adjDeg - sorted[i].adjDeg) + 360) % 360;
      if (diff < minGap) {
        const push = (minGap - diff) / 2;
        sorted[i].adjDeg -= push; sorted[j].adjDeg += push; moved = true;
      }
    }
    if (!moved) break;
  }
  return sorted;
};

const SynastryChartComponentV2 = ({
  chart1, chart2, aspects = [], size = 700,
  name1 = 'Партнёр 1', name2 = 'Партнёр 2',
}: SynastryChartProps) => {
  const { t, i18n } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!chart1?.planets || !chart2?.planets || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cx = size / 2, cy = size / 2, fs = size / 700;

    // Radii (fraction of size), outer to inner:
    const R_OUT        = size * 0.485; // zodiac outer edge
    const R_SIGN_IN    = size * 0.420; // zodiac inner edge
    const R_P2_PLANET  = size * 0.392; // Partner 2 glyphs
    const R_P2_HOUSE_O = size * 0.366; // Partner 2 house ring outer edge
    const R_P2_HOUSE_I = size * 0.336; // Partner 2 house ring inner edge
    const R_P1_PLANET  = size * 0.298; // Partner 1 glyphs
    const R_P1_HOUSE_N = size * 0.262; // Partner 1 house numbers
    const R_ASPECT     = size * 0.235; // aspect circle (white center)

    const ascLon = chart1.houses?.[1]?.cusp_longitude ?? chart1.houses?.['1']?.cusp_longitude ?? 0;
    const rel = (lon: number) => ((lon - ascLon) % 360 + 360) % 360;

    const circle = (r: number, stroke: string, w: number, fill = 'none') =>
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r)
        .attr('fill', fill).attr('stroke', stroke).attr('stroke-width', w);

    // ---- Light background under the wheel only (circle, no square card) ----
    circle(R_OUT + 2, 'none', 0, '#f8f8fb');

    // Backing ring for Partner 2 houses (reads as a separate wheel visually)
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R_P2_HOUSE_O)
      .attr('fill', P2_COLOR).attr('fill-opacity', 0.05).attr('stroke', 'none');

    circle(R_OUT, '#3a3a48', 1.4);
    circle(R_SIGN_IN, '#3a3a48', 1);
    circle(R_P2_HOUSE_O, '#cbb7a3', 0.8);
    circle(R_P2_HOUSE_I, '#cbb7a3', 0.8);
    circle(R_ASPECT, '#c9c9d4', 0.9, '#ffffff');

    // ---- Zodiac: pastel sectors + text glyphs ----
    for (let i = 0; i < 12; i++) {
      const start = i * 30 - ascLon;
      const steps = 24;
      const pts: Array<{ x: number; y: number }> = [];
      for (let s = 0; s <= steps; s++) pts.push(polarToCart(cx, cy, R_OUT, start + (s / steps) * 30));
      for (let s = steps; s >= 0; s--) pts.push(polarToCart(cx, cy, R_SIGN_IN, start + (s / steps) * 30));
      svg.append('path')
        .attr('d', pts.map((p, j) => `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ') + ' Z')
        .attr('fill', ZODIAC_TINT[i]).attr('fill-opacity', 0.16).attr('stroke', 'none');
      const a = polarToCart(cx, cy, R_SIGN_IN, start), b = polarToCart(cx, cy, R_OUT, start);
      svg.append('line').attr('x1', a.x).attr('y1', a.y).attr('x2', b.x).attr('y2', b.y)
        .attr('stroke', '#3a3a48').attr('stroke-width', 0.6);
      const g = polarToCart(cx, cy, (R_SIGN_IN + R_OUT) / 2, start + 15);
      svg.append('text').attr('x', g.x).attr('y', g.y)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
        .attr('fill', ZODIAC_TINT[i]).attr('font-size', 19 * fs).attr('font-weight', 600)
        .text(T(ZODIAC_SYMBOLS[i]));
    }

    // ---- Degree scale ----
    for (let deg = 0; deg < 360; deg++) {
      const isMajor = deg % 30 === 0, isMed = deg % 10 === 0;
      const len = isMajor ? size * 0.020 : isMed ? size * 0.013 : size * 0.007;
      const p1 = polarToCart(cx, cy, R_SIGN_IN, deg - ascLon);
      const p2 = polarToCart(cx, cy, R_SIGN_IN - len, deg - ascLon);
      svg.append('line').attr('x1', p1.x).attr('y1', p1.y).attr('x2', p2.x).attr('y2', p2.y)
        .attr('stroke', isMajor ? '#3a3a48' : '#9a9aa8')
        .attr('stroke-width', isMajor ? 0.9 : isMed ? 0.6 : 0.4);
    }

    // ---- Generic house drawing ----
    // mode 'full' — Partner 1: cusps from center, axes across the whole wheel, numbers near center.
    // mode 'band' — Partner 2: short ticks in its own ring, numbers in the ring, axis labels in the ring.
    const drawHouses = (
      houses: Record<string, ChartHouse>,
      mode: 'full' | 'band',
      color: string,
    ) => {
      const nums = Object.keys(houses).map(Number).filter(n => n >= 1 && n <= 12).sort((a, b) => a - b);
      const cuspDeg = (n: number) => {
        const h = houses[n] || houses[String(n)];
        return h?.cusp_longitude !== undefined ? rel(h.cusp_longitude) : null;
      };

      nums.forEach((n) => {
        const deg = cuspDeg(n);
        if (deg === null) return;
        const isAngle = [1, 4, 7, 10].includes(n);

        if (mode === 'full') {
          const rOut = isAngle ? R_SIGN_IN : R_P2_HOUSE_I;
          const pIn = polarToCart(cx, cy, R_ASPECT, deg);
          const pOut = polarToCart(cx, cy, rOut, deg);
          svg.append('line').attr('x1', pIn.x).attr('y1', pIn.y).attr('x2', pOut.x).attr('y2', pOut.y)
            .attr('stroke', isAngle ? '#33333f' : '#c2c2ce')
            .attr('stroke-width', isAngle ? 1.5 : 0.7)
            .attr('stroke-dasharray', isAngle ? 'none' : '3,3');
        } else {
          // band: short tick in Partner 2's house ring
          const pIn = polarToCart(cx, cy, R_P2_HOUSE_I, deg);
          const pOut = polarToCart(cx, cy, R_P2_HOUSE_O, deg);
          svg.append('line').attr('x1', pIn.x).attr('y1', pIn.y).attr('x2', pOut.x).attr('y2', pOut.y)
            .attr('stroke', isAngle ? color : '#cbb7a3')
            .attr('stroke-width', isAngle ? 1.5 : 0.7);
        }

        // house number, mid-sector
        const idx = nums.indexOf(n);
        const nextDeg = cuspDeg(nums[(idx + 1) % nums.length]) ?? deg + 30;
        const mid = deg + (((nextDeg - deg) + 360) % 360) / 2;
        const numR = mode === 'full' ? R_P1_HOUSE_N : (R_P2_HOUSE_I + R_P2_HOUSE_O) / 2;
        const np = polarToCart(cx, cy, numR, mid);
        svg.append('text').attr('x', np.x).attr('y', np.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('fill', mode === 'full' ? '#8a8a99' : color)
          .attr('font-size', (mode === 'full' ? 11 : 9) * fs)
          .attr('opacity', mode === 'full' ? 1 : 0.85).text(n);
      });

      // ASC/IC/DSC/MC axes
      ([['ASC', 1], ['IC', 4], ['DSC', 7], ['MC', 10]] as Array<[string, number]>).forEach(([label, n]) => {
        const deg = cuspDeg(n);
        if (deg === null) return;
        const r = mode === 'full' ? R_SIGN_IN - size * 0.030 : R_P2_HOUSE_O + size * 0.018;
        const p = polarToCart(cx, cy, r, deg);
        svg.append('text').attr('x', p.x).attr('y', p.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('fill', mode === 'full' ? '#33333f' : color)
          .attr('font-size', (mode === 'full' ? 9 : 8) * fs).attr('font-weight', 700)
          .text(label);
      });
    };

    // Both partners' houses
    if (chart1.houses) drawHouses(chart1.houses, 'full', P1_COLOR); // Partner 1 — full grid
    if (chart2.houses) drawHouses(chart2.houses, 'band', P2_COLOR); // Partner 2 — outer ring

    // ---- Aspects (thin lines, center) ----
    const aspGroup = svg.append('g');
    aspects.forEach(asp => {
      const pd1 = chart1.planets![asp.planet1], pd2 = chart2.planets![asp.planet2];
      if (pd1?.full_degree === undefined || pd2?.full_degree === undefined) return;
      const style = ASPECT_STYLE[asp.aspect] || { color: '#8a8a99', hard: false };
      const p1 = polarToCart(cx, cy, R_ASPECT, rel(pd1.full_degree));
      const p2 = polarToCart(cx, cy, R_ASPECT, rel(pd2.full_degree));
      const orb = asp.orb ?? 3;
      const w = orb <= 1 ? 1.8 : orb <= 3 ? 1.2 : 0.7;
      aspGroup.append('line')
        .attr('x1', p1.x).attr('y1', p1.y).attr('x2', p2.x).attr('y2', p2.y)
        .attr('stroke', style.color).attr('stroke-width', w).attr('stroke-opacity', 0.5)
        .style('cursor', 'pointer')
        .on('mouseover', function (ev: MouseEvent) {
          d3.select(this).attr('stroke-opacity', 1).attr('stroke-width', w + 1);
          setTooltip({
            x: (ev as unknown as { offsetX: number }).offsetX,
            y: (ev as unknown as { offsetY: number }).offsetY,
            color: style.color,
            content: `${PLANET_GLYPH[asp.planet1] || asp.planet1} ${t(`planets.aspectNames.${asp.aspect}`, { defaultValue: asp.aspect })} ${PLANET_GLYPH[asp.planet2] || asp.planet2} · ${t('planets.orb')} ${orb.toFixed(1)}°`,
          });
        })
        .on('mouseout', function () {
          d3.select(this).attr('stroke-opacity', 0.5).attr('stroke-width', w);
          setTooltip(null);
        });
    });

    // ---- Planets: leader line + glyph ----
    const drawPlanets = (
      planetsObj: Record<string, ChartPlanet>,
      trackR: number, tickR: number, color: string, whoName: string,
    ) => {
      const entries = Object.entries(planetsObj)
        .filter(([, d]) => d?.full_degree !== undefined)
        .map(([name, data]) => ({ name, data, deg: rel(data.full_degree!) }));
      const spread = spreadPlanets(entries, 8);

      spread.forEach(({ name, data, deg, adjDeg }) => {
        const tick = polarToCart(cx, cy, tickR, deg);
        svg.append('circle').attr('cx', tick.x).attr('cy', tick.y).attr('r', 1.6)
          .attr('fill', color).attr('opacity', 0.85);
        const gp = polarToCart(cx, cy, trackR, adjDeg);
        svg.append('line').attr('x1', tick.x).attr('y1', tick.y).attr('x2', gp.x).attr('y2', gp.y)
          .attr('stroke', color).attr('stroke-width', 0.5).attr('stroke-opacity', 0.4);
        svg.append('text').attr('x', gp.x).attr('y', gp.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
          .attr('fill', color).attr('font-size', 16 * fs).attr('font-weight', 600)
          .style('cursor', 'pointer')
          .on('mouseover', (ev: MouseEvent) => setTooltip({
            x: (ev as unknown as { offsetX: number }).offsetX,
            y: (ev as unknown as { offsetY: number }).offsetY,
            color,
            content: `${whoName}: ${PLANET_NAME[name] || name} ${data.sign_ru || data.sign || ''} ${Math.floor(data.degree || 0)}°${data.is_retrograde ? ' ℞' : ''}`,
          }))
          .on('mouseout', () => setTooltip(null))
          .text(T(PLANET_GLYPH[name] || name.slice(0, 2)));
        if (data.is_retrograde) {
          const rp = polarToCart(cx, cy, trackR, adjDeg + 2.2);
          svg.append('text').attr('x', rp.x).attr('y', rp.y)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'central')
            .attr('fill', color).attr('font-size', 8 * fs).style('pointer-events', 'none').text('℞');
        }
      });
    };

    drawPlanets(chart1.planets!, R_P1_PLANET, R_P2_HOUSE_I, P1_COLOR, name1); // inner
    drawPlanets(chart2.planets!, R_P2_PLANET, R_SIGN_IN, P2_COLOR, name2);    // outer

    // i18n.language: the tooltip text is baked into the d3 mouseover handler
    // at draw time, so a language switch has to redraw the wheel — without it
    // the old language would survive until some other prop changed.
  }, [chart1, chart2, aspects, size, name1, name2, t, i18n.language]);

  if (!chart1 || !chart2) return null;

  return (
    /* `size` stays the reference resolution: all geometry above is computed
       from it as logical units, while on screen the wheel stretches to the
       container width via viewBox — the browser scales it, no d3-effect
       restart or ResizeObserver needed. */
    <div className="chart-wheel-fluid" style={{ position: 'relative' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        preserveAspectRatio="xMidYMid meet"
      />
      {tooltip && (
        <div style={{
          position: 'absolute', left: tooltip.x + 14, top: tooltip.y - 10,
          background: 'rgba(255,255,255,0.98)', border: `1px solid ${tooltip.color}`,
          borderRadius: 6, padding: '5px 10px', color: '#222', fontSize: 13,
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 100,
          boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default SynastryChartComponentV2;
