import React from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
import type { ProgressionsData, ProgressedPlanet, ProgressionAspect } from '../services/api';

interface ProgressionsPanelProps {
  data: ProgressionsData | null;
  analysis: string | null;
  loading: boolean;
  error: string;
}

// Порядок вывода: личные планеты первыми (в прогрессиях они интерпретационно значимы)
const PLANET_ORDER = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith', 'Chiron'
];

const ProgressionsPanel: React.FC<ProgressionsPanelProps> = ({ data, analysis, loading, error }) => {
  const { t, i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').startsWith('ru');

  const planetName = (key: string) => t(`planets.names.${key}`, { defaultValue: key });
  const signName = (planet?: ProgressedPlanet | { sign?: string; sign_ru?: string }) => {
    if (!planet) return '—';
    return isRu ? (planet.sign_ru || planet.sign || '—') : (planet.sign || '—');
  };
  const aspectName = (asp: ProgressionAspect) => (isRu ? (asp.aspect_ru || asp.aspect) : asp.aspect);

  const sortedPlanets: ProgressedPlanet[] = data
    ? PLANET_ORDER
      .map(key => data.progressed_planets?.[key])
      .filter((p): p is ProgressedPlanet => !!p)
    : [];

  const progMoon = data?.progressed_planets?.Moon;
  const progSun = data?.progressed_planets?.Sun;

  return (
    <div style={{
      background: 'var(--bg-card)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      padding: '30px',
      marginTop: '30px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          📈 {t('dashboard.progressions.title')}
        </h3>
        {data && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {t('dashboard.progressions.period')}: {data.period} · {t('dashboard.progressions.age')}: {Math.floor(data.age_years)} {t('dashboard.progressions.years')}
          </span>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
        {t('dashboard.progressions.subtitle')}
      </p>

      {loading && (
        <div style={{ marginTop: '20px' }}>
          <ProcessingMessage size="sm" />
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginTop: '16px' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Ключевые точки: прогрессивные Луна и Солнце */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            {progMoon && (
              <div style={{
                flex: '1 1 220px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                background: 'var(--bg-secondary)'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  🌙 {t('dashboard.progressions.progressedMoon')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {signName(progMoon)}
                  {progMoon.natal_house ? ` · ${t('dashboard.progressions.natalHouse')} ${progMoon.natal_house}` : ''}
                </div>
              </div>
            )}
            {progSun && (
              <div style={{
                flex: '1 1 220px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                background: 'var(--bg-secondary)'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  ☀️ {t('dashboard.progressions.progressedSun')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {signName(progSun)}
                  {progSun.changed_sign && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: 'var(--accent, #8b5cf6)' }}>
                      {t('dashboard.progressions.changedSign')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Таблица прогрессивных планет */}
          <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.progressions.planetsTitle')}
            </h4>
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
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                      {planet.degree?.toFixed(1)}°
                    </td>
                    <td style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
                      {planet.natal_house ?? '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Аспекты прогрессий к наталу */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.progressions.aspectsTitle')}
            </h4>
            {data.aspects_to_natal?.length ? (
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', lineHeight: 1.8 }}>
                {data.aspects_to_natal.slice(0, 10).map((asp, idx) => (
                  <li key={`${asp.progressed}-${asp.natal}-${idx}`}>
                    <strong>{planetName(asp.progressed)}</strong>
                    {' '}{aspectName(asp)}{' '}
                    <strong>{planetName(asp.natal)}</strong>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '6px' }}>
                      ({t('dashboard.progressions.orb')}: {asp.orb}°)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>
                {t('dashboard.progressions.noAspects')}
              </p>
            )}
          </div>
        </>
      )}

      {/* AI-анализ */}
      {analysis && (
        <div style={{ marginTop: '24px', lineHeight: '2', fontSize: '16px' }}>
          <h4 style={{ color: 'var(--text-primary)' }}>
            {t('dashboard.progressions.analysisTitle')}
          </h4>
          <MarkdownContent content={analysis} />
        </div>
      )}
    </div>
  );
};

export default ProgressionsPanel;
