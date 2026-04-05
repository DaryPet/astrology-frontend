
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
          SHOW_DIGNITIES_TEXT: false
        });
        const radixData = convertToRadixFormat(chartData);
        if (!radixData) return;
        
        const radix = chart.radix(radixData);
        radix.aspects();
      } catch (error) {
        console.error('Ошибка:', error);
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

    console.log('=== DEBUG AstroChartComponent ===');
    console.log('planets keys:', Object.keys(data.planets));
    console.log('Has Chiron?', 'Chiron' in data.planets);
    console.log('Chiron data:', data.planets['Chiron']);
    console.log('Vertex data:', data.vertex);

    Object.entries(data.planets).forEach(([name, p]) => {
      const key = planetMapping[name];
      console.log(`  ${name} -> key: ${key}, full_degree: ${p?.full_degree}, speed: ${p?.speed}`);
      if (key && p?.full_degree !== undefined) {
        // Формат: [degree, speed]
        // speed - скорость планеты (градусы/день). Если < 0, планета ретроградна
        planets[key] = [p.full_degree % 360, p.speed ?? 0];
      }
    });

    console.log('result planets:', Object.keys(planets));

    if (data.vertex && data.vertex.longitude !== undefined) {
      planets['Vx'] = [data.vertex.longitude % 360, 0];
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
