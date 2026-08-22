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
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
            <th>{t('planets.sign')}</th>
            <th>{t('planets.degree')}</th>
            <th>{t('dashboard.progressions.natalHouse')}</th>
          </tr>
        </thead>
        <tbody>
          {sortedPlanets.map((planet) => (
            <tr key={planet.planet} className="ui-table__strong">
              <td>
                <strong>{planetName(planet.planet)}</strong>
                {planet.is_retrograde && (
                  <span style={{ color: 'var(--text-secondary)', marginLeft: '4px' }}>℞</span>
                )}
                {' — '}{signName(planet)}
                {planet.changed_sign && (
                  <span title={t('dashboard.progressions.changedSign')} className="ui-aspect-name">
                    ↗
                  </span>
                )}
                {planet.changed_house && (
                  <span title={t('dashboard.progressions.changedHouse')} className="ui-aspect-name">
                    ⌂
                  </span>
                )}
              </td>
              <td>
                {planet.degree?.toFixed(1)}°
              </td>
              <td>
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
