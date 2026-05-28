import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const ZODIAC_COLORS = [
  '#FF6B35', '#4CAF50', '#2196F3', '#FF9800', '#FF5722', '#8BC34A',
  '#9C27B0', '#F44336', '#FFC107', '#795548', '#00BCD4', '#3F51B5'
];
const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const ASPECT_COLORS: Record<string, string> = {
  Conjunction: '#FFD700',
  Opposition:  '#FF4500',
  Trine:       '#32CD32',
  Square:      '#FF6347',
  Sextile:     '#1E90FF',
};

const PLANET_GLYPH: Record<string, string> = {
  Sun: '☉', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂',
  Jupiter: '♃', Saturn: '♄', Uranus: '⛢', Neptune: '♆', Pluto: '♇',
  NorthNode: '☊', SouthNode: '☋', Chiron: '⚷', Lilith: '⚸',
};

const PLANET_NAME: Record<string, string> = {
  Sun: 'Солнце', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера',
  Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн', Uranus: 'Уран',
  Neptune: 'Нептун', Pluto: 'Плутон', NorthNode: 'Сев.Узел',
  SouthNode: 'Юж.Узел', Chiron: 'Хирон', Lilith: 'Лилит',
};

interface ChartPlanet {
  full_degree?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
  speed?: number;
  house?: number;
  house_sign?: string;
  is_retrograde?: boolean;
  aspects?: unknown[];
  name?: string;
  [key: string]: unknown;
}

interface ChartHouse {
  cusp_longitude?: number;
  sign?: string;
  sign_ru?: string;
  degree?: number;
}

interface ChartData {
  planets?: Record<string, ChartPlanet>;
  houses?: Record<string, ChartHouse>;
}

interface Aspect {
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string;
  orb?: number;
}

interface TooltipState {
  x: number;
  y: number;
  color: string;
  content: string;
}

interface SynastryChartProps {
  chart1?: ChartData | null;
  chart2?: ChartData | null;
  aspects?: Aspect[];
  size?: number;
  name1?: string;
  name2?: string;
}

const polarToCart = (cx: number, cy: number, r: number, deg: number) => {
  const rad = (180 - deg) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

const spreadPlanets = (entries: Array<{ name: string; data: ChartPlanet; deg: number }>, minGap = 8) => {
  if (entries.length <= 1) return entries.map(e => ({ ...e, adjDeg: e.deg }));
  const sorted = entries.map(e => ({ ...e, adjDeg: e.deg })).sort((a, b) => a.deg - b.deg);
  for (let iter = 0; iter < 60; iter++) {
    let moved = false;
    for (let i = 0; i < sorted.length; i++) {
      const j = (i + 1) % sorted.length;
      const diff = ((sorted[j].adjDeg - sorted[i].adjDeg) + 360) % 360;
      if (diff < minGap) {
        const push = (minGap - diff) / 2;
        sorted[i].adjDeg -= push;
        sorted[j].adjDeg += push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  return sorted;
};

const SynastryChartComponent = ({
  chart1, chart2,
  aspects = [],
  size = 700,
  name1 = 'Партнёр 1',
  name2 = 'Партнёр 2',
}: SynastryChartProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    if (!chart1?.planets || !chart2?.planets || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const cx = size / 2;
    const cy = size / 2;
    const fs = size / 700;

    const R_ZOD_OUT  = size * 0.480;
    const R_ZOD_IN   = size * 0.390;
    const R_P1_TRACK = size * 0.335;
    const R_P1_IN    = size * 0.292;
    const R_P2_TRACK = size * 0.228;
    const R_P2_IN    = size * 0.172;
    const R_ASPECT   = size * 0.18;
    const PLANET_R   = size * 0.024;
    const GLYPH_FS   = size * 0.024;

    const ascLon = chart1.houses?.[1]?.cusp_longitude ?? 0;

    svg.append('circle')
      .attr('cx', cx).attr('cy', cy).attr('r', R_ZOD_OUT)
      .attr('fill', '#ffffff').attr('stroke', '#2d2d3a').attr('stroke-width', 1.5);

    for (let i = 0; i < 12; i++) {
      const startDeg = i * 30 - ascLon;
      const midDeg   = startDeg + 15;
      const steps    = 20;
      const pts      = [];
      for (let s = 0; s <= steps; s++)
        pts.push(polarToCart(cx, cy, R_ZOD_OUT, startDeg + (s / steps) * 30));
      for (let s = steps; s >= 0; s--)
        pts.push(polarToCart(cx, cy, R_ZOD_IN, startDeg + (s / steps) * 30));
      const pathD = pts.map((p, j) =>
        `${j === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`
      ).join(' ') + ' Z';

      svg.append('path').attr('d', pathD)
        .attr('fill', ZODIAC_COLORS[i]).attr('fill-opacity', 0.85)
        .attr('stroke', ZODIAC_COLORS[i]).attr('stroke-width', 0.4).attr('stroke-opacity', 0.5);

      const symPt = polarToCart(cx, cy, (R_ZOD_IN + R_ZOD_OUT) / 2, midDeg);
      svg.append('text')
        .attr('x', symPt.x).attr('y', symPt.y)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('fill', ZODIAC_COLORS[i]).attr('font-size', 14 * fs)
        .text(ZODIAC_SYMBOLS[i]);
    }

    for (let i = 0; i < 12; i++) {
      const deg = i * 30 - ascLon;
      const p1 = polarToCart(cx, cy, R_ZOD_IN, deg);
      const p2 = polarToCart(cx, cy, R_ZOD_OUT, deg);
      svg.append('line')
        .attr('x1', p1.x).attr('y1', p1.y).attr('x2', p2.x).attr('y2', p2.y)
        .attr('stroke', '#2d2d3a').attr('stroke-width', 0.5);
    }

    [R_ZOD_IN, R_P1_IN, R_P2_IN].forEach(r =>
      svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r)
        .attr('fill', 'none').attr('stroke', '#2d2d3a').attr('stroke-width', 1)
    );
    svg.append('circle').attr('cx', cx).attr('cy', cy).attr('r', R_P2_IN)
      .attr('fill', '#0a0a14').attr('stroke', '#2d2d3a').attr('stroke-width', 0.5);

    const drawHouses = (houses: Record<string, ChartHouse>, refAsc: number,
      rIn_reg: number, rOut_reg: number,
      rIn_angle: number, rOut_angle: number,
      lineColor: string, angleColor: string,
      numR: number, numColor: string,
      labelR: number, labelColor: string) => {
      Object.keys(houses).sort((a, b) => Number(a) - Number(b)).forEach((hNum) => {
        const h = houses[hNum];
        if (!h?.cusp_longitude) return;
        const deg = h.cusp_longitude - refAsc;
        const isAngle = [1, 4, 7, 10].includes(Number(hNum));
        const rIn = isAngle ? rIn_angle : rIn_reg;
        const rOut = isAngle ? rOut_angle : rOut_reg;
        const pIn  = polarToCart(cx, cy, rIn,  deg);
        const pOut = polarToCart(cx, cy, rOut, deg);
        svg.append('line')
          .attr('x1', pIn.x).attr('y1', pIn.y).attr('x2', pOut.x).attr('y2', pOut.y)
          .attr('stroke', isAngle ? angleColor : lineColor)
          .attr('stroke-width', isAngle ? 1.2 : 0.6)
          .attr('stroke-dasharray', isAngle ? 'none' : '3,3');

        const hNums = Object.keys(houses).map(Number).sort((a, b) => a - b);
        const currentIdx = hNums.indexOf(Number(hNum));
        const nextHNum = hNums[(currentIdx + 1) % hNums.length];
        const nextH = houses[nextHNum];
        const nextDeg = nextH?.cusp_longitude !== undefined ? nextH.cusp_longitude - refAsc : deg + 30;
        const midDeg = deg + (((nextDeg - deg) + 360) % 360) / 2;
        const numPt = polarToCart(cx, cy, numR, midDeg);
        svg.append('text')
          .attr('x', numPt.x).attr('y', numPt.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('fill', numColor).attr('font-size', 13 * fs)
          .text(Number(hNum));
      });

      [['ASC', 1], ['IC', 4], ['DSC', 7], ['MC', 10]].forEach(([label, hNum]) => {
        const h = houses[hNum] ?? houses[String(hNum)];
        if (!h?.cusp_longitude) return;
        const deg = h.cusp_longitude - refAsc;
        const pt  = polarToCart(cx, cy, labelR, deg);
        svg.append('text')
          .attr('x', pt.x).attr('y', pt.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('fill', labelColor).attr('font-size', 8 * fs).attr('font-weight', 'bold')
          .text(label);
      });
    };

    if (chart1.houses) drawHouses(
      chart1.houses, ascLon,
      R_P1_IN, R_ZOD_IN,
      R_P1_IN, R_P1_TRACK,
      '#2d2d3a', '#000000',
      (R_P1_IN + R_ZOD_IN) * 0.5, '#444455',
      R_ZOD_IN - 11 * fs, '#000000'
    );

    if (chart2.houses) drawHouses(
      chart2.houses, ascLon,
      R_P2_IN, R_P2_TRACK,
      R_P2_IN, R_P2_TRACK,
      '#553333', '#880000',
      (R_P2_IN + R_P2_TRACK) * 0.5, '#664444',
      R_P2_TRACK, '#880000'
    );

    const aspGroup = svg.append('g');
    aspects.forEach(asp => {
      const pd1 = chart1.planets![asp.planet1];
      const pd2 = chart2.planets![asp.planet2];
      if (!pd1 || !pd2) return;
      const color = ASPECT_COLORS[asp.aspect] || '#7c3aed';
      const pt1 = polarToCart(cx, cy, R_ASPECT, pd1.full_degree! - ascLon);
      const pt2 = polarToCart(cx, cy, R_ASPECT, pd2.full_degree! - ascLon);
      aspGroup.append('line')
        .attr('x1', pt1.x).attr('y1', pt1.y).attr('x2', pt2.x).attr('y2', pt2.y)
        .attr('stroke', color)
        .attr('stroke-width', ['Conjunction', 'Opposition'].includes(asp.aspect) ? 2 : 1.2)
        .attr('stroke-opacity', 0.8)
        .style('cursor', 'pointer')
        .on('mouseover', (ev: MouseEvent) => setTooltip({
          x: (ev as unknown as { offsetX: number }).offsetX,
          y: (ev as unknown as { offsetY: number }).offsetY,
          color,
          content: `${PLANET_GLYPH[asp.planet1] || asp.planet1} ${asp.aspect_ru || asp.aspect} ${PLANET_GLYPH[asp.planet2] || asp.planet2}  орб ${asp.orb}°`,
        }))
        .on('mouseout', () => setTooltip(null));
    });

    const drawRing = (planetsObj: Record<string, ChartPlanet>, trackR: number, tickR: number, color: string, fillColor: string, glyphColor: string, isP1: boolean) => {
      const entries = Object.entries(planetsObj)
        .filter(([, d]) => d?.full_degree !== undefined)
        .map(([name, data]) => ({
          name, data,
          deg: ((data.full_degree! - ascLon) % 360 + 360) % 360,
        }));

      const spread = spreadPlanets(entries, 9);

      spread.forEach(({ name, data, deg, adjDeg }) => {
        const trueOuter = polarToCart(cx, cy, tickR, deg);
        const trueInner = polarToCart(cx, cy, trackR + (isP1 ? PLANET_R : -PLANET_R), deg);
        svg.append('line')
          .attr('x1', trueOuter.x).attr('y1', trueOuter.y)
          .attr('x2', trueInner.x).attr('y2', trueInner.y)
          .attr('stroke', color).attr('stroke-width', 0.6).attr('stroke-opacity', 0.45);

        const dotPt = polarToCart(cx, cy, tickR, deg);
        svg.append('circle')
          .attr('cx', dotPt.x).attr('cy', dotPt.y).attr('r', 2)
          .attr('fill', color).attr('opacity', 0.8);

        const pt = polarToCart(cx, cy, trackR, adjDeg);

        svg.append('text')
          .attr('x', pt.x).attr('y', pt.y)
          .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
          .attr('fill', glyphColor).attr('font-size', GLYPH_FS)
          .style('cursor', 'pointer')
          .on('mouseover', (ev: MouseEvent) => setTooltip({
            x: (ev as unknown as { offsetX: number }).offsetX,
            y: (ev as unknown as { offsetY: number }).offsetY,
            color,
            content: `${isP1 ? name1 : name2}: ${PLANET_NAME[name] || name} ${data.sign_ru || data.sign} ${Math.floor(data.degree || 0)}°${data.is_retrograde ? ' ℞' : ''}`,
          }))
          .on('mouseout', () => setTooltip(null))
          .text(PLANET_GLYPH[name] || name[0]);

        if (data.is_retrograde) {
          const rxR = trackR + (isP1 ? (PLANET_R + 8 * fs) : -(PLANET_R + 8 * fs));
          const rxPt = polarToCart(cx, cy, rxR, adjDeg);
          svg.append('text')
            .attr('x', rxPt.x).attr('y', rxPt.y)
            .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
            .attr('fill', color).attr('font-size', 8 * fs)
            .style('pointer-events', 'none').text('℞');
        }
      });
    };

    drawRing(chart1.planets, R_P1_TRACK, R_ZOD_IN, '#2255cc', '#ffffff', '#2255cc', true);
    drawRing(chart2.planets, R_P2_TRACK, (R_P2_TRACK + R_P1_IN) / 2, '#cc2222', '#ffffff', '#cc2222', false);

    const legendY = cy - R_ZOD_OUT - 20;
    const legendOffset = 60 * fs;
    svg.append('text')
      .attr('x', cx - legendOffset).attr('y', legendY)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#2255cc').attr('font-size', 11 * fs)
      .text(name1);
    svg.append('text')
      .attr('x', cx + legendOffset).attr('y', legendY)
      .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
      .attr('fill', '#cc2222').attr('font-size', 11 * fs)
      .text(name2);

  }, [chart1, chart2, aspects, size, name1, name2]);

  if (!chart1 || !chart2) return null;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <svg ref={svgRef} width={size} height={size} style={{ display: 'block' }} />
      {tooltip && (
        <div style={{
          position: 'absolute',
          left: tooltip.x + 14,
          top: tooltip.y - 10,
          background: 'rgba(255,255,255,0.97)',
          border: `1px solid ${tooltip.color}`,
          borderRadius: 6,
          padding: '5px 10px',
          color: '#333',
          fontSize: 13,
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
          zIndex: 100,
          boxShadow: `0 0 10px ${tooltip.color}55`,
        }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default SynastryChartComponent;