import React, { useEffect, useRef } from 'react';

const SynastryChartComponent = ({ chart1, chart2, size = 700 }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !chart1 || !chart2 || !containerRef.current) return;

    containerRef.current.innerHTML = '';
    const containerId = `synastry-chart-${Date.now()}`;
    containerRef.current.id = containerId;

    import('@astrodraw/astrochart').then(module => {
      const Chart = module.Chart;

      try {
        const chart = new Chart(containerId, size, size, {
          SHOW_DIGINITIES_TEXT: false,
          CUSTOM_SYMBOL_FN: (name, x, y) => {
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            // Person 1 - Blue Circle
            if (name.startsWith('P1_')) {
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', x);
              circle.setAttribute('cy', y);
              circle.setAttribute('r', '8');
              circle.setAttribute('fill', '#3b82f6');
              circle.setAttribute('stroke', '#1d4ed8');
              circle.setAttribute('stroke-width', '2');
              g.appendChild(circle);

              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', x);
              text.setAttribute('y', y + 4);
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('fill', '#fff');
              text.setAttribute('font-size', '9');
              text.setAttribute('font-weight', 'bold');
              text.textContent = name.replace('P1_', '');
              g.appendChild(text);
              return g;
            }
            // Person 2 - Red Circle
            else if (name.startsWith('P2_')) {
              const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
              circle.setAttribute('cx', x);
              circle.setAttribute('cy', y);
              circle.setAttribute('r', '8');
              circle.setAttribute('fill', '#ef4444');
              circle.setAttribute('stroke', '#dc2626');
              circle.setAttribute('stroke-width', '2');
              g.appendChild(circle);

              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', x);
              text.setAttribute('y', y + 4);
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('fill', '#fff');
              text.setAttribute('font-size', '9');
              text.setAttribute('font-weight', 'bold');
              text.textContent = name.replace('P2_', '');
              g.appendChild(text);
              return g;
            }
            return null;
          }
        });

        const radixData = convertSynastryToRadixFormat(chart1, chart2);
        if (!radixData) return;

        const radix = chart.radix(radixData);

        // Settings for aspects
        const aspectsSettings = {
          ASPECTS: {
            conjunction: { degree: 0, orbit: 12, color: '#FFD700' },
            sextile: { degree: 60, orbit: 8, color: '#1E90FF' },
            square: { degree: 90, orbit: 10, color: '#FF4500' },
            trine: { degree: 120, orbit: 10, color: '#32CD32' },
            opposition: { degree: 180, orbit: 12, color: '#FF4500' }
          }
        };

        const aspectCalc = new module.AspectCalculator(radixData.planets, aspectsSettings);
        const calculatedAspects = aspectCalc.radix(radixData.planets);

        radix.addPointsOfInterest(radixData.planets);
        radix.aspects(calculatedAspects);
      } catch (error) {
        console.error('Synastry chart rendering error:', error);
      }
    });
  }, [chart1, chart2, size]);

  const convertSynastryToRadixFormat = (data1, data2) => {
    if (!data1 || !data1.planets || !data1.houses || !data2 || !data2.planets || !data2.houses) return null;

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

    // Person 1 planets (Blue)
    Object.entries(data1.planets).forEach(([name, p]) => {
      const key = planetMapping[name];
      if (key && p?.full_degree !== undefined) {
        planets['P1_' + key] = [p.full_degree % 360, p.speed ?? 0];
      }
    });

    // Person 2 planets (Red)
    Object.entries(data2.planets).forEach(([name, p]) => {
      const key = planetMapping[name];
      if (key && p?.full_degree !== undefined) {
        planets['P2_' + key] = [p.full_degree % 360, p.speed ?? 0];
      }
    });

    // Houses (using chart1's houses)
    Object.entries(data1.houses).forEach(([houseNum, h]) => {
      if (h?.cusp_longitude !== undefined) {
        cusps[parseInt(houseNum) - 1] = h.cusp_longitude % 360;
      }
    });

    return { planets, cusps };
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', justifyContent: 'center' }} />
  );
};

export default SynastryChartComponent;
