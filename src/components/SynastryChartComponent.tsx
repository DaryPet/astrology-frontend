/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useRef } from 'react';

interface ChartPlanetData {
  full_degree?: number;
  speed?: number;
}

interface ChartHouseData {
  cusp_longitude?: number;
}

interface SynastryChartData {
  planets?: Record<string, ChartPlanetData>;
  houses?: Record<string, ChartHouseData>;
  vertex?: { longitude: number };
  houses_meta?: {
    pars_fortuna?: { longitude: number };
  };
}

const SynastryChartComponent = ({ chart1, chart2, size = 700 }: { chart1: SynastryChartData; chart2: SynastryChartData; size?: number }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !chart1 || !chart2 || !containerRef.current) return;

    import('@astrodraw/astrochart').then(module => {
      const Chart = module.Chart;

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        const containerId = `synastrychart-${Date.now()}`;
        containerRef.current.id = containerId;

        try {
          const chart = new Chart(containerId, size, size, {
            SHOW_DIGNITIES_TEXT: false,
            CUSTOM_SYMBOL_FN: (name: string, _x: number, _y: number): any => {
              if (name === 'Vx') {
                const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '0');
                circle.setAttribute('cy', '4');
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

          const planetMapping: Record<string, string> = {
            'Sun': 'Sun', 'Moon': 'Moon', 'Mercury': 'Mercury',
            'Venus': 'Venus', 'Mars': 'Mars', 'Jupiter': 'Jupiter',
            'Saturn': 'Saturn', 'Uranus': 'Uranus', 'Neptune': 'Neptune',
            'Pluto': 'Pluto', 'Chiron': 'Chiron', 'Lilith': 'Lilith',
            'NorthNode': 'NNode', 'SouthNode': 'SNode',
            'Vertex': 'Vx'
          };

          const planets1: Record<string, [number, number]> = {};
          const planets2: Record<string, [number, number]> = {};
          const cusps = new Array(12);

          Object.entries(chart1.planets || {}).forEach(([name, p]) => {
            const key = planetMapping[name];
            if (key && p?.full_degree !== undefined) {
              planets1[key] = [p.full_degree % 360, p.speed ?? 0];
            }
          });

          Object.entries(chart2.planets || {}).forEach(([name, p]) => {
            const key = planetMapping[name];
            if (key && p?.full_degree !== undefined) {
              planets2[key] = [p.full_degree % 360, p.speed ?? 0];
            }
          });

          for (let i = 1; i <= 12; i++) {
            const house = chart1.houses?.[i];
            cusps[i-1] = house?.cusp_longitude !== undefined
              ? house.cusp_longitude % 360
              : ((i-1) * 30) % 360;
          }

          const radix = chart.radix({ planets: planets1, cusps });
          radix.addPointsOfInterest(planets1);
          radix.addPointsOfInterest(planets2);
        } catch (error) {
          /* eslint-disable no-console */
          console.error('Chart error:', error);
        }
      }
    });
  }, [chart1, chart2, size]);

  return <div ref={containerRef} style={{ width: size, height: size }} />;
};

export default SynastryChartComponent;