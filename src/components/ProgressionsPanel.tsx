import React from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
import ProgressedPlanetsTable from './ProgressedPlanetsTable';
import type { ProgressionsData, ProgressedPlanet, ProgressionAspect } from '../services/api';
import type { StreamPhase } from '../hooks/useStreamedText';
import { pickLocalized } from '../i18n/localizedField';

interface ProgressionsPanelProps {
  data: ProgressionsData | null;
  analysis: string | null;
  displayedText?: string;
  phase?: StreamPhase;
  loading: boolean;
  error: string;
}

const ProgressionsPanel: React.FC<ProgressionsPanelProps> = ({ data, analysis, displayedText = '', phase = 'idle', loading, error }) => {
  const { t, i18n } = useTranslation();

  const planetName = (key: string) => t(`planets.names.${key}`, { defaultValue: key });
  const signName = (planet?: ProgressedPlanet | { sign?: string; sign_ru?: string; sign_uk?: string }) => {
    if (!planet) return '—';
    return pickLocalized(i18n.language, planet.sign, planet.sign_ru, planet.sign_uk);
  };
  const aspectName = (asp: ProgressionAspect) => pickLocalized(i18n.language, asp.aspect, asp.aspect_ru, asp.aspect_uk);

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

      {loading && phase !== 'typing' && !analysis && (
        <div style={{ marginTop: '20px' }}>
          <ProcessingMessage
            size="sm"
            title={phase === 'generating' ? t('dashboard.fullAnalysis.generating') : t('dashboard.fullAnalysis.searching')}
          />
        </div>
      )}

      {error && (
        <div className="error-message" style={{ marginTop: '16px' }}>
          {error}
        </div>
      )}

      {/* AI analysis: sits right where the spinner is — above the planet table and aspect lists. */}
      {(analysis || phase === 'typing') && (
        <div style={{ marginTop: '24px', lineHeight: '2', fontSize: '16px' }}>
          <h4 style={{ color: 'var(--text-primary)' }}>
            {t('dashboard.progressions.analysisTitle')}
          </h4>
          <MarkdownContent content={analysis ?? displayedText} />
          {!analysis && phase === 'typing' && (
            <span className="typing-cursor" aria-hidden="true">▍</span>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Ключевые точки: лунная фаза + прогрессивные Луна и Солнце */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            {data.lunar_phase && (
              <div style={{
                flex: '1 1 220px',
                border: '1px solid var(--accent, #8b5cf6)',
                borderRadius: '10px',
                padding: '14px',
                background: 'var(--bg-secondary)'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  🌗 {t('dashboard.progressions.lunarPhase')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {pickLocalized(i18n.language, data.lunar_phase.phase, data.lunar_phase.phase_ru, data.lunar_phase.phase_uk)}
                </div>
              </div>
            )}
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
                {typeof progMoon.years_to_next_sign === 'number' && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {t('dashboard.progressions.nextSignIn')} ~{progMoon.years_to_next_sign} {t('dashboard.progressions.yearsShort')}
                  </div>
                )}
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
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.progressions.planetsTitle')}
            </h4>
            <ProgressedPlanetsTable planets={data.progressed_planets} />
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
                      ({t('dashboard.progressions.orb')}: {asp.orb}°
                      {typeof asp.applying === 'boolean'
                        ? `, ${asp.applying ? t('dashboard.progressions.applying') : t('dashboard.progressions.separating')}`
                        : ''})
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
    </div>
  );
};

export default ProgressionsPanel;
