/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { useTranslation } from 'react-i18next';

// Цвета стихий
const ELEMENT_COLORS: Record<string, string> = {
  fire: '#FF6B35',
  earth: '#4CAF50',
  air: '#2196F3',
  water: '#FF9800'
};

// Стихии знаков
const SIGN_ELEMENTS: Record<string, string> = {
  Aries: 'fire', Taurus: 'earth', Gemini: 'air', Cancer: 'water',
  Leo: 'fire', Virgo: 'earth', Libra: 'air', Scorpio: 'water',
  Sagittarius: 'fire', Capricorn: 'earth', Aquarius: 'air', Pisces: 'water'
};

// Цвета планет
const PLANET_COLORS: Record<string, string> = {
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
  SouthNode: '#9370DB',
  Ft: '#00CED1',
  Vertex: '#FF69B4'
};

interface PlanetData {
  full_degree?: number;
  sign?: string;
  speed?: number;
  house?: number;
  house_sign?: string;
  aspects?: any[];
}

interface PlanetTableProps {
  planets: Record<string, PlanetData> | undefined;
  houses?: Record<string, { cusp_longitude?: number; degree?: number }>;
  onPlanetClick?: (planetData: any) => void;
}

interface PlanetItem {
  name: string;
  translatedName: string;
  degree: number;
  signIndex: number;
  degrees: number;
  minutes: number;
  house: number | null;
  houseSign: string | null;
  aspects: any[];
  speed: number;
  color: string;
  element: string;
  translatedSign: string;
  sign: string;
}

const PlanetTable = ({ planets, houses, onPlanetClick }: PlanetTableProps) => {
  const { t } = useTranslation();

  if (!planets) return null;

  // Знаки зодиака
  const zodiacSigns = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

  // Преобразуем объект планет в массив
  const planetList: PlanetItem[] = Object.entries(planets)
    .filter(([, data]) => data && data.full_degree !== undefined)
    .map(([name, data]) => {
      const degree = parseFloat(String(data.full_degree || 0));

      // Защита от NaN
      if (isNaN(degree)) {
        return null;
      }

      const signIndex = Math.floor(degree / 30) % 12;
      const signDegree = degree % 30;
      const degrees = Math.floor(signDegree);
      const minutes = Math.floor((signDegree - degrees) * 60);

      // Используем sign из данных, если есть, иначе вычисляем
      const signName = data.sign || zodiacSigns[signIndex];
      const signTranslated = t(`planets.signs.${signName}`);

      // Определяем дом планеты - сначала проверяем, есть ли в данных, иначе вычисляем
      let house = data.house || null;
      if (!house && houses) {
        for (let i = 1; i <= 12; i++) {
          if (houses[i] !== undefined) {
            const houseDegree = (houses[i] as { cusp_longitude?: number }).cusp_longitude || 0;
            const nextHouseDegree = (houses[i + 1] as { cusp_longitude?: number })?.cusp_longitude || (houses[1] as { cusp_longitude?: number }).cusp_longitude || 0 + 360;
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
        translatedName: t(`planets.names.${name}`, name),
        degree,
        signIndex,
        degrees,
        minutes,
        house,
        houseSign: data.house_sign || null,
        aspects: data.aspects || [],
        speed: data.speed || 0,
        color: PLANET_COLORS[name] || '#7c3aed',
        element: SIGN_ELEMENTS[signName] || SIGN_ELEMENTS[zodiacSigns[signIndex]],
        translatedSign: signTranslated,
        sign: signName
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a as PlanetItem).degree - (b as PlanetItem).degree) as PlanetItem[];

  // Подсчет количества планет по стихиям
  const elementCounts = planetList.reduce((acc, planet) => {
    acc[planet.element] = (acc[planet.element] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="ui-card">
      <h3 className="ui-subtitle ui-row ui-row--tight" style={{ marginBottom: 'var(--space-2)' }}>
        <span className="ui-dot">
          ♆
        </span>
        {t('planets.title')}
      </h3>

      {/* Подсказка появляется только там, где клик реально что-то делает:
          onPlanetClick — опциональный проп, без него карточки не кликабельны. */}
      {onPlanetClick && (
        <p className="ui-hint-clickable">{t('planets.clickHint')}</p>
      )}

      <div className="ui-grid">
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
            onClick={() => onPlanetClick && onPlanetClick({
              name: planet.name,
              sign: planet.sign,
              degree: planet.degrees + (planet.minutes / 60),
              house: planet.house,
              house_sign: planet.houseSign,
              aspects: planet.aspects,
              is_retrograde: planet.speed < 0
            })}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = `0 6px 16px ${planet.color}30`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
            }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '4px',
              height: '100%',
              background: ELEMENT_COLORS[planet.element] || '#7c3aed'
            }} />

            <div className="ui-row" style={{ marginBottom: 'var(--space-3)', flexWrap: 'nowrap' }}>
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
                <div className="ui-row ui-row--between" style={{ marginBottom: 'var(--space-1)', flexWrap: 'nowrap' }}>
                  <span className="ui-stat__value">
                    {planet.translatedName}
                    {planet.speed < 0 && (
                      <span style={{
                        marginLeft: '6px',
                        color: '#ff6b6b',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>R</span>
                    )}
                  </span>
                </div>

                <div className="ui-row ui-row--tight">
                  <span style={{
                    color: ELEMENT_COLORS[planet.element] || '#7c3aed',
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {planet.translatedSign}
                  </span>

                  <span className="ui-meta">
                    {planet.degrees}°{planet.minutes}′
                  </span>
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '12px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid var(--border)'
            }}>
              <div className="ui-row ui-row--tight">
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: ELEMENT_COLORS[planet.element] || '#7c3aed'
                }} />
                <span style={{ textTransform: 'capitalize' }}>
                  {t(`planets.elements.${planet.element}`, planet.element)}
                </span>
              </div>

              <div className="ui-table__center">
                <span className="ui-table__strong">
                  {t('planets.house')} {planet.house ? planet.house.toString().trim() : '—'}
                </span>
              </div>

              <div className="ui-table__num">
                <span style={{ marginRight: '4px' }}>{t('planets.degree')}:</span>
                <span className="ui-table__strong">
                  {typeof planet.degree === 'number' ? planet.degree.toFixed(2) : planet.degree}°
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="ui-card ui-card--tight" style={{ marginTop: 'var(--space-6)', background: 'var(--bg-primary)' }}>
        <h4 className="ui-label" style={{ marginBottom: 'var(--space-3)' }}>
          {t('planets.legend')}
        </h4>

        <div className="ui-row">
          {[
            { element: 'fire', name: t('planets.elements.fire'), signs: [t('planets.signs.Aries'), t('planets.signs.Leo'), t('planets.signs.Sagittarius')], count: elementCounts.fire || 0 },
            { element: 'earth', name: t('planets.elements.earth'), signs: [t('planets.signs.Taurus'), t('planets.signs.Virgo'), t('planets.signs.Capricorn')], count: elementCounts.earth || 0 },
            { element: 'air', name: t('planets.elements.air'), signs: [t('planets.signs.Gemini'), t('planets.signs.Libra'), t('planets.signs.Aquarius')], count: elementCounts.air || 0 },
            { element: 'water', name: t('planets.elements.water'), signs: [t('planets.signs.Cancer'), t('planets.signs.Scorpio'), t('planets.signs.Pisces')], count: elementCounts.water || 0 }
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
              }}>
              <div className="ui-row ui-row--tight" style={{ marginBottom: 'var(--space-2)', flexWrap: 'nowrap' }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: ELEMENT_COLORS[item.element],
                  marginRight: '8px'
                }} />
                <span className="ui-table__strong">
                  {item.name}
                </span>
              </div>

              <div className="ui-aspect-orb" style={{ marginLeft: 0, lineHeight: 1.4 }}>
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