import React from 'react';
import { useTranslation } from 'react-i18next';
import type { ProgressedPlanet } from '../services/api';
import { pickLocalized } from '../i18n/localizedField';

interface ProgressedPlanetsTableProps {
  planets: Record<string, ProgressedPlanet> | undefined;
}

// Порядок вывода: личные планеты первыми (в прогрессиях они интерпретационно значимы)
const PLANET_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith', 'Chiron'
];

const ProgressedPlanetsTable: React.FC<ProgressedPlanetsTableProps> = ({ planets }) => {
  const { t, i18n } = useTranslation();

  const planetName = (key: string) => t(`planets.names.${key}`, { defaultValue: key });
  const signName = (planet?: ProgressedPlanet) => {
    if (!planet) return '—';
    return pickLocalized(i18n.language, planet.sign, planet.sign_ru, planet.sign_uk);
  };

  const sortedPlanets: ProgressedPlanet[] = planets
    ? PLANET_ORDER
      .map(key => planets[key])
      .filter((p): p is ProgressedPlanet => !!p)
    : [];

  if (!sortedPlanets.length) return null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
            <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{t('planets.sign')}</th>
            <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{t('planets.degree')}</th>
            <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{t('dashboard.progressions.natalHouse')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlanets.map((planet) => (
            <tr key={planet.planet} style={{ color: 'var(--text-primary)' }}>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                <strong>{planetName(planet.planet)}</strong>
                {planet.is_retrograde && (
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>℞</span>
                )}
                {' — '}{signName(planet)}
                {planet.changed_sign && (
                  <span title={t('dashboard.progressions.changedSign')} style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--accent, #8b5cf6)' }}>
                    ↗
                  </span>
                )}
                {planet.changed_house && (
                  <span title={t('dashboard.progressions.changedHouse')} style={{ marginLeft: '4px', fontSize: '12px', color: 'var(--accent, #8b5cf6)' }}>
                    ⌂
                  </span>
                )}
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                {planet.degree?.toFixed(1)}°
              </td>
              <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                {planet.changed_house && planet.natal_planet_house
                  ? `${planet.natal_planet_house} → ${planet.natal_house}`
                  : (planet.natal_house ?? '—')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProgressedPlanetsTable;
