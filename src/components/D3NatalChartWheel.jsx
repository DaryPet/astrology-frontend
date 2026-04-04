import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';

// Профессиональные цвета как на astro.com
const ZODIAC_COLORS = [
  '#FF6B35', '#4CAF50', '#2196F3', '#FF9800', '#FF5722', '#8BC34A',
  '#9C27B0', '#F44336', '#FFC107', '#795548', '#00BCD4', '#3F51B5'
];

const PLANET_COLORS = {
  Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#8B7355', Venus: '#FFB6C1',
  Mars: '#FF4500', Jupiter: '#FFA500', Saturn: '#DAA520', Uranus: '#40E0D0',
  Neptune: '#4169E1', Pluto: '#8B008B', Chiron: '#32CD32', 
  NorthNode: '#9370DB', SouthNode: '#9370DB', Ascendant: '#FF1493',
  MC: '#00BFFF', IC: '#00BFFF', DC: '#FF1493'
};

const ZODIAC_SYMBOLS = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

const D3NatalChartWheel = ({ chartData, size = 800 }) => {
  const { t } = useTranslation();
  const svgRef = useRef(null);
  const [hoveredElement, setHoveredElement] = useState(null);

  // Ключи знаков для переводов
  const zodiacKeys = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  useEffect(() => {
    if (!chartData || !svgRef.current) return;

    // Очищаем предыдущий SVG
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current);
    const center = size / 2;
    const radius = size * 0.45;

    // 1. Внешний круг
    svg.append('circle')
      .attr('cx', center)
      .attr('cy', center)
      .attr('r', radius)
      .attr('fill', 'none')
      .attr('stroke', '#2d2d3a')
      .attr('stroke-width', 2);

    // 2. Знаки зодиака (12 секторов)
    const zodiacArc = d3.arc()
      .innerRadius(radius * 0.7)
      .outerRadius(radius)
      .startAngle((d, i) => (i * Math.PI) / 6)
      .endAngle((d, i) => ((i + 1) * Math.PI) / 6);

    const zodiacGroup = svg.append('g').attr('class', 'zodiac');
    
    zodiacGroup.selectAll('.zodiac-sector')
      .data(d3.range(12))
      .enter()
      .append('path')
      .attr('class', 'zodiac-sector')
      .attr('d', zodiacArc)
      .attr('fill', (d, i) => ZODIAC_COLORS[i])
      .attr('fill-opacity', 0.1)
      .attr('stroke', (d, i) => ZODIAC_COLORS[i])
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.3);

    // 3. Символы знаков
    zodiacGroup.selectAll('.zodiac-symbol')
      .data(d3.range(12))
      .enter()
      .append('text')
      .attr('class', 'zodiac-symbol')
      .attr('x', (d, i) => {
        const angle = (i * 30 + 15) * (Math.PI / 180);
        return center + (radius * 0.85) * Math.cos(angle - Math.PI / 2);
      })
      .attr('y', (d, i) => {
        const angle = (i * 30 + 15) * (Math.PI / 180);
        return center + (radius * 0.85) * Math.sin(angle - Math.PI / 2);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d, i) => ZODIAC_COLORS[i])
      .attr('font-size', size * 0.025)
      .attr('font-weight', 'bold')
      .text((d, i) => ZODIAC_SYMBOLS[i]);

    // 4. Названия знаков
    zodiacGroup.selectAll('.zodiac-name')
      .data(d3.range(12))
      .enter()
      .append('text')
      .attr('class', 'zodiac-name')
      .attr('x', (d, i) => {
        const angle = (i * 30 + 15) * (Math.PI / 180);
        return center + (radius * 0.95) * Math.cos(angle - Math.PI / 2);
      })
      .attr('y', (d, i) => {
        const angle = (i * 30 + 15) * (Math.PI / 180);
        return center + (radius * 0.95) * Math.sin(angle - Math.PI / 2);
      })
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', (d, i) => ZODIAC_COLORS[i])
      .attr('font-size', size * 0.015)
      .attr('font-weight', 'bold')
      .text((d, i) => t(`planets.signs.${zodiacKeys[i]}`, zodiacKeys[i]));

    // 5. Градусная сетка
    const gridGroup = svg.append('g').attr('class', 'grid');
    
    // Основные линии каждые 30°
    for (let i = 0; i < 360; i += 30) {
      const angle = i * (Math.PI / 180);
      const x1 = center + (radius * 0.7) * Math.cos(angle - Math.PI / 2);
      const y1 = center + (radius * 0.7) * Math.sin(angle - Math.PI / 2);
      const x2 = center + radius * Math.cos(angle - Math.PI / 2);
      const y2 = center + radius * Math.sin(angle - Math.PI / 2);
      
      gridGroup.append('line')
        .attr('x1', x1)
        .attr('y1', y1)
        .attr('x2', x2)
        .attr('y2', y2)
        .attr('stroke', '#2d2d3a')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5);
    }

    // 6. Планеты (если есть данные)
    if (chartData.planets) {
      const planetsGroup = svg.append('g').attr('class', 'planets');
      const planetRadius = radius * 0.6;
      
      Object.entries(chartData.planets).forEach(([name, data]) => {
        if (!data.full_degree) return;
        
        const angle = (data.full_degree - 90) * (Math.PI / 180);
        const x = center + planetRadius * Math.cos(angle);
        const y = center + planetRadius * Math.sin(angle);
        
        // Планета
        const planet = planetsGroup.append('circle')
          .attr('cx', x)
          .attr('cy', y)
          .attr('r', size * 0.015)
          .attr('fill', PLANET_COLORS[name] || '#7c3aed')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
          .attr('class', 'planet')
          .attr('data-name', name)
          .on('mouseover', () => setHoveredElement({ type: 'planet', name, data }))
          .on('mouseout', () => setHoveredElement(null));
        
        // Символ планеты
        planetsGroup.append('text')
          .attr('x', x)
          .attr('y', y)
          .attr('text-anchor', 'middle')
          .attr('dominant-baseline', 'middle')
          .attr('fill', '#fff')
          .attr('font-size', size * 0.012)
          .attr('font-weight', 'bold')
          .text(name.substring(0, 2));
      });
    }

    // 7. Аспекты (если есть)
    if (chartData.aspects && chartData.aspects.length > 0 && chartData.planets) {
      const aspectsGroup = svg.append('g').attr('class', 'aspects');
      const planetRadius = radius * 0.6;
      
      chartData.aspects.forEach((aspect, i) => {
        const planet1 = chartData.planets[aspect.planet1];
        const planet2 = chartData.planets[aspect.planet2];
        
        if (!planet1 || !planet2) return;
        
        const angle1 = (planet1.full_degree - 90) * (Math.PI / 180);
        const angle2 = (planet2.full_degree - 90) * (Math.PI / 180);
        
        const x1 = center + planetRadius * Math.cos(angle1);
        const y1 = center + planetRadius * Math.sin(angle1);
        const x2 = center + planetRadius * Math.cos(angle2);
        const y2 = center + planetRadius * Math.sin(angle2);
        
        // Цвет аспекта
        const aspectColor = {
          'Conjunction': '#FFD700',
          'Opposition': '#FF4500',
          'Trine': '#32CD32',
          'Square': '#FF6347',
          'Sextile': '#1E90FF'
        }[aspect.aspect] || '#7c3aed';
        
        // Линия аспекта
        aspectsGroup.append('line')
          .attr('x1', x1)
          .attr('y1', y1)
          .attr('x2', x2)
          .attr('y2', y2)
          .attr('stroke', aspectColor)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.6)
          .attr('stroke-dasharray', aspect.aspect === 'Trine' || aspect.aspect === 'Sextile' ? 'none' : '4,2')
          .attr('class', 'aspect')
          .attr('data-index', i)
          .on('mouseover', () => setHoveredElement({ type: 'aspect', aspect, index: i }))
          .on('mouseout', () => setHoveredElement(null));
      });
    }

  }, [chartData, size]);

  // Тултип
  const renderTooltip = () => {
    if (!hoveredElement) return null;

    if (hoveredElement.type === 'planet') {
      const { name, data } = hoveredElement;
      const signIndex = Math.floor(data.full_degree / 30) % 12;
      const signDegree = data.full_degree % 30;
      const degrees = Math.floor(signDegree);
      const minutes = Math.floor((signDegree - degrees) * 60);
      
      return (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(26, 26, 46, 0.95)',
          border: `2px solid ${PLANET_COLORS[name] || '#7c3aed'}`,
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#fff',
          fontSize: '14px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          minWidth: '200px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: PLANET_COLORS[name] || '#7c3aed',
              marginRight: '8px'
            }} />
            <strong style={{ color: PLANET_COLORS[name] || '#7c3aed' }}>
              {name}
            </strong>
          </div>
          <div style={{ marginBottom: '4px' }}>
            <span style={{ color: ZODIAC_COLORS[signIndex] }}>
              {t(`planets.signs.${zodiacKeys[signIndex]}`, zodiacKeys[signIndex])} {degrees}°{minutes}′
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {t('planets.sign', 'Sign')}: {t(`planets.signs.${zodiacKeys[signIndex]}`, zodiacKeys[signIndex])} ({ZODIAC_SYMBOLS[signIndex]})
          </div>
        </div>
      );
    }

    if (hoveredElement.type === 'aspect') {
      const { aspect } = hoveredElement;
      const aspectColor = {
        'Conjunction': '#FFD700',
        'Opposition': '#FF4500',
        'Trine': '#32CD32',
        'Square': '#FF6347',
        'Sextile': '#1E90FF'
      }[aspect.aspect] || '#7c3aed';
      
      return (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(26, 26, 46, 0.95)',
          border: `2px solid ${aspectColor}`,
          borderRadius: '8px',
          padding: '12px 16px',
          color: '#fff',
          fontSize: '14px',
          zIndex: 1000,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          minWidth: '200px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: aspectColor,
              marginRight: '8px'
            }} />
            <strong style={{ color: aspectColor }}>
              {aspect.planet1} - {aspect.planet2}
            </strong>
          </div>
          <div style={{ marginBottom: '4px' }}>
            {t('planets.aspect', 'Aspect')}: <span style={{ color: aspectColor }}>{aspect.aspect}</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94a3b8' }}>
            {t('planets.orb', 'Orb')}: {aspect.orb}°
          </div>
        </div>
      );
    }

    return null;
  };

  if (!chartData) {
    return (
      <div style={{
        width: size,
        height: size,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-secondary)',
        borderRadius: '50%',
        border: '2px dashed var(--border)'
      }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          background: 'var(--bg-primary)',
          border: '2px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
        }}
      />
      {renderTooltip()}
    </div>
  );
};

export default D3NatalChartWheel;