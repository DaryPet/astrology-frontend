
import React, { useEffect, useRef } from 'react';

const AstroChartComponent = ({ chartData, size = 700 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !chartData || !containerRef.current) return;

    import('@astrodraw/astrochart').then(module => {
      const Chart = module.Chart;

      containerRef.current.innerHTML = '';
      const containerId = `astrochart-${Date.now()}`;
      containerRef.current.id = containerId;

      try {
        const chart = new Chart(containerId, size, size, {
          SHOW_DIGNITIES_TEXT: false,
          CUSTOM_SYMBOL_FN: (name, x, y) => {
            if (name === 'Vx') {
              const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', x);
              circle.setAttribute('cy', y);
              circle.setAttribute('r', '8');
              circle.setAttribute('fill', 'none');
              circle.setAttribute('stroke', '#000');
              circle.setAttribute('stroke-width', '2');
              g.appendChild(circle);
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', x);
              text.setAttribute('y', y + 4);
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('fill', '#000');
              text.setAttribute('font-size', '10');
              text.setAttribute('font-weight', 'bold');
              text.textContent = 'Vx';
              g.appendChild(text);
              return g;
            }
            return null;
          }
        });
        const radixData = convertToRadixFormat(chartData);
        if (!radixData) return;

        const radix = chart.radix(radixData);

        // Настройки аспектов с sextile
        const aspectsSettings = {
          ASPECTS: {
            conjunction: { degree: 0, orbit: 12, color: 'transparent' },
            sextile: { degree: 60, orbit: 8, color: '#1E90FF' },
            square: { degree: 90, orbit: 10, color: '#FF4500' },
            trine: { degree: 120, orbit: 10, color: '#27AE60' },
            opposition: { degree: 180, orbit: 12, color: '#27AE60' }
          }
        };

        // Создать AspectCalculator явно с sextile
        const aspectCalc = new module.AspectCalculator(radixData.planets, aspectsSettings);
        const calculatedAspects = aspectCalc.radix(radixData.planets);

        // Добавить все точки и отрисовать аспекты
        radix.addPointsOfInterest(radixData.planets);
        radix.aspects(calculatedAspects);
      } catch (error) {
        throw error; // Chart rendering error
      }
    });
  }, [chartData, size]);

  const convertToRadixFormat = (data) => {
    if (!data || !data.planets || !data.houses) return null;

    const planets = {};
    const cusps = new Array(12);

    const planetMapping = {
      'Sun': 'Sun', 'Moon': 'Moon', 'Mercury': 'Mercury',
      'Venus': 'Venus', 'Mars': 'Mars', 'Jupiter': 'Jupiter',
      'Saturn': 'Saturn', 'Uranus': 'Uranus', 'Neptune': 'Neptune',
      'Pluto': 'Pluto', 'Chiron': 'Chiron', 'Lilith': 'Lilith',
      'NorthNode': 'NNode', 'SouthNode': 'SNode',
      'Vertex': 'Vx'
    };

    Object.entries(data.planets).forEach(([name, p]) => {
      const key = planetMapping[name];
      if (key && p?.full_degree !== undefined) {
        planets[key] = [p.full_degree % 360, p.speed ?? 0];
      }
    });

    // Вершина (Vertex)
    if (data.vertex && data.vertex.longitude !== undefined) {
      planets['Vx'] = [data.vertex.longitude % 360, 0];
    }

    // Парта Фортуны (pars_fortuna) из houses_meta
    if (data.houses_meta && data.houses_meta.pars_fortuna) {
      const pf = data.houses_meta.pars_fortuna;
      const longitude = pf.longitude % 360;
      planets['Fortune'] = [longitude, 0];
    }

    for (let i = 1; i <= 12; i++) {
      const house = data.houses[i];
      cusps[i-1] = house?.cusp_longitude !== undefined
        ? house.cusp_longitude % 360
        : ((i-1) * 30) % 360;
    }

    return { planets, cusps };
  };

  return <div ref={containerRef} style={{ width: size, height: size }} />;
};

export default AstroChartComponent;
