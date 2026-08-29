import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorWithRetry from './ErrorWithRetry';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
import LiveSkyCarousel from './LiveSkyCarousel';
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
  onRetry?: () => void;
}

const ProgressionsPanel: React.FC<ProgressionsPanelProps> = ({ data, analysis, displayedText = '', phase = 'idle', loading, error, onRetry }) => {
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
      <div className="ui-row ui-row--between ui-row--tight">
        <h3 className="ui-subtitle" style={{ marginBottom: 0 }}>
          📈 {t('dashboard.progressions.title')}
        </h3>
        {data && (
          <span className="ui-meta">
            {t('dashboard.progressions.period')}: {data.period} · {t('dashboard.progressions.age')}: {Math.floor(data.age_years)} {t('dashboard.progressions.years')}
          </span>
        )}
      </div>
      <p className="ui-meta" style={{ marginTop: 'var(--space-2)' }}>
        {t('dashboard.progressions.subtitle')}
      </p>

      {loading && phase !== 'typing' && !analysis && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <ProcessingMessage
            size="sm"
            title={phase === 'generating' ? t('dashboard.fullAnalysis.generating') : t('dashboard.fullAnalysis.searching')}
            phase={phase === 'generating' ? 'generating' : 'searching'}
          />
          <LiveSkyCarousel
            variant="progressed"
            people={data?.progressed_planets ? [{ planets: data.progressed_planets }] : []}
          />
        </div>
      )}

      {error && (
        <ErrorWithRetry message={error} onRetry={onRetry} style={{ marginTop: 'var(--space-4)' }} />
      )}

      {/* AI analysis: sits right where the spinner is — above the planet table and aspect lists. */}
      {(analysis || phase === 'typing') && (
        <div className="ui-fade-in" style={{ marginTop: 'var(--space-6)', lineHeight: 'var(--leading-loose)', fontSize: 'var(--text-md)' }}>
          <h4 className="ui-table__strong">
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
          <div className="ui-row" style={{ marginTop: 'var(--space-4)', alignItems: 'stretch' }}>
            {data.lunar_phase && (
              <div style={{
                flex: '1 1 220px',
                border: '1px solid var(--accent, #8b5cf6)',
                borderRadius: '10px',
                padding: '14px',
                background: 'var(--bg-secondary)'
              }}>
                <div className="ui-meta">
                  🌗 {t('dashboard.progressions.lunarPhase')}
                </div>
                <div className="ui-stat__value">
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
                <div className="ui-meta">
                  🌙 {t('dashboard.progressions.progressedMoon')}
                </div>
                <div className="ui-stat__value">
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
                <div className="ui-meta">
                  ☀️ {t('dashboard.progressions.progressedSun')}
                </div>
                <div className="ui-stat__value">
                  {signName(progSun)}
                  {progSun.changed_sign && (
                    <span className="ui-aspect-name">
                      {t('dashboard.progressions.changedSign')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Таблица прогрессивных планет */}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.progressions.planetsTitle')}
            </h4>
            <ProgressedPlanetsTable planets={data.progressed_planets} />
          </div>

          {/* Аспекты прогрессий к наталу */}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.progressions.aspectsTitle')}
            </h4>
            {data.aspects_to_natal?.length ? (
              <ul className="ui-list">
                {data.aspects_to_natal.slice(0, 10).map((asp, idx) => (
                  <li key={`${asp.progressed}-${asp.natal}-${idx}`}>
                    <strong>{planetName(asp.progressed)}</strong>
                    {' '}{aspectName(asp)}{' '}
                    <strong>{planetName(asp.natal)}</strong>
                    <span className="ui-aspect-orb">
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
