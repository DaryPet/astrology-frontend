/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';

interface ChartPlanetData {
  full_degree?: number;
  speed?: number;
}

interface ChartHouseData {
  cusp_longitude?: number;
}

interface ChartData {
  planets?: Record<string, ChartPlanetData>;
  houses?: Record<string, ChartHouseData>;
  vertex?: { longitude: number };
  houses_meta?: {
    pars_fortuna?: { longitude: number };
  };
}

// Сквозной счётчик, а не Date.now(): полноэкранный просмотр (LiveSkyFrame)
// рендерит ВТОРОЙ экземпляр колеса поверх первого, и при совпадении
// миллисекунды оба контейнера получили бы один id — библиотека зовёт
// getElementById и нарисовала бы второй чертёж внутрь первого.
let chartInstanceSeq = 0;

const AstroChartComponent = ({ chartData, size = 700 }: { chartData: ChartData; size?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !chartData || !containerRef.current) return;

    import('@astrodraw/astrochart').then(module => {
      const Chart = module.Chart;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const containerId = `astrochart-${++chartInstanceSeq}-${Date.now()}`;
        containerRef.current.id = containerId;

        try {
          // Use any to bypass type checking for the library callback
          const chart = new Chart(containerId, size, size, {
            SHOW_DIGNITIES_TEXT: false,
            CUSTOM_SYMBOL_FN: (name: string, x: number, y: number): any => {
              if (name === 'Vx') {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                g.setAttribute('transform', `translate(${x}, ${y})`);
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '0');
                circle.setAttribute('cy', '0');
                circle.setAttribute('r', '8');
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#000');
                circle.setAttribute('stroke-width', '2');
                g.appendChild(circle);
                const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                text.setAttribute('x', '0');
                text.setAttribute('y', '4');
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

          const aspectsSettings = {
            ASPECTS: {
              conjunction: { degree: 0, orbit: 12, color: 'transparent' },
              sextile: { degree: 60, orbit: 8, color: '#1E90FF' },
              square: { degree: 90, orbit: 10, color: '#FF4500' },
              trine: { degree: 120, orbit: 10, color: '#27AE60' },
              opposition: { degree: 180, orbit: 12, color: '#27AE60' }
            }
          };

          const aspectCalc = new module.AspectCalculator(radixData.planets, aspectsSettings);
          const calculatedAspects = aspectCalc.radix(radixData.planets);

          radix.addPointsOfInterest(radixData.planets);
          radix.aspects(calculatedAspects);
        } catch (error) {
          throw error;
        }
      }
    });
  }, [chartData, size]);

  const convertToRadixFormat = (data: ChartData) => {
    if (!data || !data.planets || !data.houses) return null;

    const planets: Record<string, [number, number]> = {};
    const cusps = new Array(12);

    const planetMapping: Record<string, string> = {
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

    if (data.vertex && data.vertex.longitude !== undefined) {
      planets['Vx'] = [data.vertex.longitude % 360, 0];
    }

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

    // if (cusps[9] !== undefined) {
    //   cusps[3] = (cusps[9] + 180) % 360;
    // }

    return { planets, cusps };
  };

  // `size` — эталонное разрешение рисунка, а не ширина на экране. Библиотека
  // сама проставляет корню SVG `viewBox="0 0 size size"` (astrochart.js), а
  // атрибуты width/height у неё в пикселях. Презентационные атрибуты имеют
  // минимальную специфичность, поэтому их перебивает CSS-правило
  // `.chart-wheel-fluid > svg` — перерисовывать библиотеку на ресайз не нужно.
  return <div ref={containerRef} className="chart-wheel-fluid" />;
};

export default AstroChartComponent;