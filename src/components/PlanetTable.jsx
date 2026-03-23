import React from 'react';

// Цвета стихий
const ELEMENT_COLORS = {
  fire: '#FF6B35',
  earth: '#4CAF50',
  air: '#2196F3',
  water: '#FF9800'
};

// Стихии знаков
const SIGN_ELEMENTS = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water'
};

// Русские названия планет
const PLANET_NAMES_RU = {
  Sun: 'Солнце',
  Moon: 'Луна',
  Mercury: 'Меркурий',
  Venus: 'Венера',
  Mars: 'Марс',
  Jupiter: 'Юпитер',
  Saturn: 'Сатурн',
  Uranus: 'Уран',
  Neptune: 'Нептун',
  Pluto: 'Плутон',
  Chiron: 'Хирон',
  NorthNode: 'Северный узел',
  SouthNode: 'Южный узел'
};

// Цвета планет
const PLANET_COLORS = {
  Sun: '#FFD700',
  Moon: '#C0C0C0',
  Mercury: '#8B7355',
  Venus: '#FFB6C1',
  Mars: '#FF4500',
  Jupiter: '#FFA500',
  Saturn: '#DAA520',
  Uranus: '#40E0D0',
  Neptune: '#4169E1',
  Pluto: '#8B008B',
  Chiron: '#32CD32',
  NorthNode: '#9370DB',
  SouthNode: '#9370DB'
};

const PlanetTable = ({ planets, houses }) => {
  if (!planets) return null;

  // Преобразуем объект планет в массив
  const planetList = Object.entries(planets)
    .filter(([name, data]) => data && data.full_degree !== undefined)
    .map(([name, data]) => {
      const degree = data.full_degree;
      const signIndex = Math.floor(degree / 30) % 12;
      const signDegree = degree % 30;
      const degrees = Math.floor(signDegree);
      const minutes = Math.floor((signDegree - degrees) * 60);
      
      // Определяем дом планеты
      let house = null;
      if (houses) {
        for (let i = 1; i <= 12; i++) {
          if (houses[i] !== undefined) {
            const houseDegree = houses[i];
            const nextHouseDegree = houses[i + 1] || houses[1] + 360;
            const adjustedDegree = degree < houseDegree ? degree + 360 : degree;
            
            if (adjustedDegree >= houseDegree && adjustedDegree < nextHouseDegree) {
              house = i;
              break;
            }
          }
        }
      }

      return {
        name,
        russianName: PLANET_NAMES_RU[name] || name,
        degree,
        signIndex,
        degrees,
        minutes,
        house,
        color: PLANET_COLORS[name] || '#7c3aed',
        element: SIGN_ELEMENTS[['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 
                               'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'][signIndex]]
      };
    })
    .sort((a, b) => a.degree - b.degree); // Сортируем по градусам

  // Знаки зодиака на русском
  const zodiacSignsRu = ['Овен', 'Телец', 'Близнецы', 'Рак', 'Лев', 'Дева', 
                         'Весы', 'Скорпион', 'Стрелец', 'Козерог', 'Водолей', 'Рыбы'];

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
    }}>
      <h3 style={{
        marginTop: 0,
        marginBottom: '20px',
        color: 'var(--text-primary)',
        fontSize: '18px',
        fontWeight: 'bold',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <span style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          color: '#fff'
        }}>
          ♆
        </span>
        Планеты в знаках
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '12px'
      }}>
        {planetList.map((planet) => (
          <div
            key={planet.name}
            style={{
              background: 'var(--bg-primary)',
              borderRadius: '8px',
              padding: '16px',
              border: `1px solid ${planet.color}40`,
              transition: 'all 0.2s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 16px ${planet.color}30`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Индикатор стихии */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              background: ELEMENT_COLORS[planet.element] || '#7c3aed'
            }} />

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: planet.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '12px',
                flexShrink: 0,
                border: '2px solid var(--bg-primary)',
                boxShadow: `0 0 0 2px ${planet.color}40`
              }}>
                <span style={{
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 'bold'
                }}>
                  {planet.name.substring(0, 2)}
                </span>
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    color: 'var(--text-primary)',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    {planet.russianName}
                  </span>
                  
                  {planet.house && (
                    <span style={{
                      background: 'var(--accent)',
                      color: '#fff',
                      fontSize: '11px',
                      fontWeight: 'bold',
                      padding: '2px 8px',
                      borderRadius: '12px'
                    }}>
                      Дом {planet.house}
                    </span>
                  )}
                </div>
                
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    color: ELEMENT_COLORS[planet.element] || '#7c3aed',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {zodiacSignsRu[planet.signIndex]}
                  </span>
                  
                  <span style={{
                    color: 'var(--text-secondary)',
                    fontSize: '13px'
                  }}>
                    {planet.degrees}°{planet.minutes}′
                  </span>
                </div>
              </div>
            </div>

            {/* Дополнительная информация */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: ELEMENT_COLORS[planet.element] || '#7c3aed'
                }} />
                <span style={{ textTransform: 'capitalize' }}>
                  {planet.element === 'fire' ? 'Огонь' : 
                   planet.element === 'earth' ? 'Земля' : 
                   planet.element === 'air' ? 'Воздух' : 'Вода'}
                </span>
              </div>
              
              <div>
                <span style={{ marginRight: '4px' }}>Градус:</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {planet.degree.toFixed(2)}°
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Легенда стихий */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--bg-primary)',
        borderRadius: '8px',
        border: '1px solid var(--border)'
      }}>
        <h4 style={{
          marginTop: 0,
          marginBottom: '12px',
          color: 'var(--text-primary)',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          Легенда стихий
        </h4>
        
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {[
            { element: 'fire', name: 'Огонь', signs: ['Овен', 'Лев', 'Стрелец'] },
            { element: 'earth', name: 'Земля', signs: ['Телец', 'Дева', 'Козерог'] },
            { element: 'air', name: 'Воздух', signs: ['Близнецы', 'Весы', 'Водолей'] },
            { element: 'water', name: 'Вода', signs: ['Рак', 'Скорпион', 'Рыбы'] }
          ].map((item) => (
            <div
              key={item.element}
              style={{
                flex: 1,
                minWidth: '120px',
                background: 'var(--bg-secondary)',
                borderRadius: '6px',
                padding: '12px',
                borderLeft: `4px solid ${ELEMENT_COLORS[item.element]}`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: ELEMENT_COLORS[item.element],
                  marginRight: '8px'
                }} />
                <span style={{
                  color: 'var(--text-primary)',
                  fontWeight: 'bold',
                  fontSize: '13px'
                }}>
                  {item.name}
                </span>
              </div>
              
              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                lineHeight: '1.4'
              }}>
                {item.signs.join(', ')}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PlanetTable;