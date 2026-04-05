// import React, { useEffect, useRef } from 'react';
// import * as d3 from 'd3';

// const SwissEphemerisChartWheel = ({ chartData, size = 800 }) => {
//   const svgRef = useRef(null);

//   // Отрисовка колеса с D3.js
//   useEffect(() => {
//     if (!chartData || !svgRef.current) return;

//     // Очищаем предыдущий SVG
//     d3.select(svgRef.current).selectAll('*').remove();

//     const svg = d3.select(svgRef.current);
//     const center = size / 2;
//     const radius = size * 0.45;

//     // 1. Внешний круг
//     svg.append('circle')
//       .attr('cx', center)
//       .attr('cy', center)
//       .attr('r', radius)
//       .attr('fill', 'none')
//       .attr('stroke', '#2d2d3a')
//       .attr('stroke-width', 2);

//     // 2. Знаки зодиака (12 секторов) - НЕПОДВИЖНЫЕ!
//     const zodiacArc = d3.arc()
//       .innerRadius(radius * 0.7)
//       .outerRadius(radius)
//       .startAngle((d, i) => (i * Math.PI) / 6 - Math.PI / 2)  // 0° Овна наверху
//       .endAngle((d, i) => ((i + 1) * Math.PI) / 6 - Math.PI / 2);

//     const zodiacColors = [
//       '#FF6B35', '#4CAF50', '#2196F3', '#FF9800', '#FF5722', '#8BC34A',
//       '#9C27B0', '#F44336', '#FFC107', '#795548', '#00BCD4', '#3F51B5'
//     ];

//     const zodiacSymbols = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];

//     const zodiacGroup = svg.append('g').attr('class', 'zodiac');
    
//     // Секторы знаков
//     zodiacGroup.selectAll('.zodiac-sector')
//       .data(zodiacColors)
//       .enter()
//       .append('path')
//       .attr('class', 'zodiac-sector')
//       .attr('d', zodiacArc)
//       .attr('fill', (d, i) => d)
//       .attr('stroke', '#2d2d3a')
//       .attr('stroke-width', 0.5)
//       .attr('transform', `translate(${center}, ${center})`);

//     // Символы знаков
//     zodiacGroup.selectAll('.zodiac-symbol')
//       .data(zodiacSymbols)
//       .enter()
//       .append('text')
//       .attr('class', 'zodiac-symbol')
//       .attr('x', (d, i) => {
//         const angle = (i * Math.PI) / 6 - Math.PI / 12 - Math.PI / 2;
//         return center + (radius * 0.85) * Math.cos(angle);
//       })
//       .attr('y', (d, i) => {
//         const angle = (i * Math.PI) / 6 - Math.PI / 12 - Math.PI / 2;
//         return center + (radius * 0.85) * Math.sin(angle);
//       })
//       .attr('text-anchor', 'middle')
//       .attr('dominant-baseline', 'middle')
//       .attr('fill', '#fff')
//       .attr('font-size', size * 0.02)
//       .attr('font-weight', 'bold')
//       .text(d => d);

//     // 3. Дома - ВРАЩАЮТСЯ от Асцендента!
//     if (chartData.houses && chartData.houses[1]) {
//       const housesGroup = svg.append('g').attr('class', 'houses');
//       const ascDegree = chartData.houses[1].degree || 0;
      
//       // 12 домов
//       for (let i = 0; i < 12; i++) {
//         const houseStart = (ascDegree + (i * 30)) % 360;
//         const houseEnd = (ascDegree + ((i + 1) * 30)) % 360;
        
//         const startAngle = (houseStart - 90) * (Math.PI / 180);
//         const endAngle = (houseEnd - 90) * (Math.PI / 180);
        
//         // Сектор дома
//         const houseArc = d3.arc()
//           .innerRadius(radius * 0.4)
//           .outerRadius(radius * 0.7)
//           .startAngle(startAngle)
//           .endAngle(endAngle);
        
//         housesGroup.append('path')
//           .attr('class', 'house-sector')
//           .attr('d', houseArc)
//           .attr('fill', `rgba(100, 100, 150, ${0.1 + (i % 2) * 0.05})`)
//           .attr('stroke', '#4a4a6a')
//           .attr('stroke-width', 0.5)
//           .attr('transform', `translate(${center}, ${center})`);
        
//         // Номер дома
//         const houseCenter = (ascDegree + (i * 30) + 15) % 360;
//         const centerAngle = (houseCenter - 90) * (Math.PI / 180);
        
//         housesGroup.append('text')
//           .attr('class', 'house-number')
//           .attr('x', center + (radius * 0.55) * Math.cos(centerAngle))
//           .attr('y', center + (radius * 0.55) * Math.sin(centerAngle))
//           .attr('text-anchor', 'middle')
//           .attr('dominant-baseline', 'middle')
//           .attr('fill', '#fff')
//           .attr('font-size', size * 0.016)
//           .attr('font-weight', 'bold')
//           .text(i + 1);
//       }
//     }

//     // 4. Планеты - позиционируются относительно знаков
//     if (chartData.planets) {
//       const planetsGroup = svg.append('g').attr('class', 'planets');
//       const planetRadius = radius * 0.6;
      
//       const planetColors = {
//         Sun: '#FFD700', Moon: '#C0C0C0', Mercury: '#8B7355', Venus: '#FFB6C1',
//         Mars: '#FF4500', Jupiter: '#FFA500', Saturn: '#DAA520', Uranus: '#40E0D0',
//         Neptune: '#4169E1', Pluto: '#8B008B', Chiron: '#32CD32', 
//         NorthNode: '#9370DB', SouthNode: '#9370DB', Ascendant: '#FF1493',
//         MC: '#00BFFF', IC: '#00BFFF', DC: '#FF1493',
//         Vertex: '#FF69B4', PartOfFortune: '#00CED1'
//       };
      
//       Object.entries(chartData.planets).forEach(([name, data]) => {
//         if (!data || data.full_degree == null) return;
        
//         // Угол планеты в неподвижной системе знаков
//         const planetAngle = (data.full_degree - 90) * (Math.PI / 180);
        
//         const x = center + planetRadius * Math.cos(planetAngle);
//         const y = center + planetRadius * Math.sin(planetAngle);
        
//         // Круг планеты
//         planetsGroup.append('circle')
//           .attr('cx', x)
//           .attr('cy', y)
//           .attr('r', size * 0.008)
//           .attr('fill', planetColors[name] || '#7c3aed')
//           .attr('stroke', '#fff')
//           .attr('stroke-width', 1)
//           .attr('class', 'planet')
//           .attr('data-name', name);
        
//         // Символ планеты
//         planetsGroup.append('text')
//           .attr('x', x)
//           .attr('y', y)
//           .attr('text-anchor', 'middle')
//           .attr('dominant-baseline', 'middle')
//           .attr('fill', '#fff')
//           .attr('font-size', size * 0.012)
//           .attr('font-weight', 'bold')
//           .text(name.substring(0, 2));
//       });
//     }

//     // 4.1. Вертекс
//     if (chartData.vertex) {
//       const vertexGroup = svg.append('g').attr('class', 'vertex');
//       const planetRadius = radius * 0.6;
      
//       const vertexAngle = (chartData.vertex.longitude - 90) * (Math.PI / 180);
//       const x = center + planetRadius * Math.cos(vertexAngle);
//       const y = center + planetRadius * Math.sin(vertexAngle);
      
//       vertexGroup.append('circle')
//         .attr('cx', x)
//         .attr('cy', y)
//         .attr('r', size * 0.008)
//         .attr('fill', planetColors['Vertex'])
//         .attr('stroke', '#fff')
//         .attr('stroke-width', 1);
      
//       vertexGroup.append('text')
//         .attr('x', x)
//         .attr('y', y)
//         .attr('text-anchor', 'middle')
//         .attr('dominant-baseline', 'middle')
//         .attr('fill', '#fff')
//         .attr('font-size', size * 0.012)
//         .attr('font-weight', 'bold')
//         .text('Vx');
//     }

//     // 4.2. Колесо Фортуны
//     if (chartData.part_of_fortune) {
//       const pofGroup = svg.append('g').attr('class', 'part_of_fortune');
//       const planetRadius = radius * 0.6;
      
//       const pofAngle = (chartData.part_of_fortune.degree - 90) * (Math.PI / 180);
//       const x = center + planetRadius * Math.cos(pofAngle);
//       const y = center + planetRadius * Math.sin(pofAngle);
      
//       pofGroup.append('circle')
//         .attr('cx', x)
//         .attr('cy', y)
//         .attr('r', size * 0.008)
//         .attr('fill', planetColors['PartOfFortune'])
//         .attr('stroke', '#fff')
//         .attr('stroke-width', 1);
      
//       pofGroup.append('text')
//         .attr('x', x)
//         .attr('y', y)
//         .attr('text-anchor', 'middle')
//         .attr('dominant-baseline', 'middle')
//         .attr('fill', '#fff')
//         .attr('font-size', size * 0.012)
//         .attr('font-weight', 'bold')
//         .text('PF');
//     }

//     // 5. Аспекты
//     if (chartData.aspects && chartData.aspects.length > 0 && chartData.planets) {
//       const aspectsGroup = svg.append('g').attr('class', 'aspects');
//       const planetRadius = radius * 0.6;
      
//       chartData.aspects.forEach((aspect, i) => {
//         const planet1 = chartData.planets[aspect.planet1];
//         const planet2 = chartData.planets[aspect.planet2];
        
//         if (!planet1 || !planet2) return;
        
//         const angle1 = (planet1.full_degree - 90) * (Math.PI / 180);
//         const angle2 = (planet2.full_degree - 90) * (Math.PI / 180);
        
//         const x1 = center + planetRadius * Math.cos(angle1);
//         const y1 = center + planetRadius * Math.sin(angle1);
//         const x2 = center + planetRadius * Math.cos(angle2);
//         const y2 = center + planetRadius * Math.sin(angle2);
        
//         // Цвет аспекта
//         const aspectColor = {
//           'Conjunction': '#FFD700',
//           'Opposition': '#FF4500',
//           'Trine': '#32CD32',
//           'Square': '#FF6347',
//           'Sextile': '#1E90FF'
//         }[aspect.aspect] || '#7c3aed';
        
//         // Линия аспекта
//         aspectsGroup.append('line')
//           .attr('x1', x1)
//           .attr('y1', y1)
//           .attr('x2', x2)
//           .attr('y2', y2)
//           .attr('stroke', aspectColor)
//           .attr('stroke-width', 1.5)
//           .attr('stroke-opacity', 0.6)
//           .attr('stroke-dasharray', aspect.aspect === 'Trine' || aspect.aspect === 'Sextile' ? 'none' : '4,2')
//           .attr('class', 'aspect')
//           .attr('data-index', i);
//       });
//     }

//     // 6. Деления градусов
//     const degreeGroup = svg.append('g').attr('class', 'degrees');
    
//     // Каждые 5 градусов
//     for (let deg = 0; deg < 360; deg += 5) {
//       const angle = (deg - 90) * (Math.PI / 180);
//       const isMajor = deg % 30 === 0;
      
//       const innerR = radius * (isMajor ? 0.68 : 0.7);
//       const outerR = radius * (isMajor ? 0.72 : 0.71);
      
//       degreeGroup.append('line')
//         .attr('x1', center + innerR * Math.cos(angle))
//         .attr('y1', center + innerR * Math.sin(angle))
//         .attr('x2', center + outerR * Math.cos(angle))
//         .attr('y2', center + outerR * Math.sin(angle))
//         .attr('stroke', isMajor ? '#fff' : '#888')
//         .attr('stroke-width', isMajor ? 1.5 : 0.8);
//     }

//   }, [chartData, size]);

//   return (
//     <div style={{ position: 'relative', width: size, height: size }}>
//       <svg
//         ref={svgRef}
//         width={size}
//         height={size}
//         style={{ display: 'block' }}
//       />
//       <div style={{
//         position: 'absolute',
//         bottom: '10px',
//         left: '50%',
//         transform: 'translateX(-50%)',
//         background: 'rgba(26, 26, 46, 0.8)',
//         padding: '5px 10px',
//         borderRadius: '4px',
//         color: '#fff',
//         fontSize: '12px'
//       }}>
//         Swiss Ephemeris Chart
//       </div>
//     </div>
//   );
// };

// export default SwissEphemerisChartWheel;
