import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorWithRetry from './ErrorWithRetry';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
import LiveSkyCarousel from './LiveSkyCarousel';
import ProgressedPlanetsTable from './ProgressedPlanetsTable';
import type { ProgressedSynastryData, ProgressedSynastryPerson } from '../services/api';
import type { StreamPhase } from '../hooks/useStreamedText';
import { pickLocalized } from '../i18n/localizedField';

interface ProgressedSynastryPanelProps {
  data: ProgressedSynastryData | null;
  analysis: string | null;
  displayedText?: string;
  phase?: StreamPhase;
  loading: boolean;
  error: string;
  onRetry?: () => void;
  name1?: string;
  name2?: string;
}

const ProgressedSynastryPanel: React.FC<ProgressedSynastryPanelProps> = ({ data, analysis, displayedText = '', phase = 'idle', loading, error, onRetry, name1, name2 }) => {
  const { t, i18n } = useTranslation();

  const name1Label = name1 || t('dashboard.progressedSynastry.partner1');
  const name2Label = name2 || t('dashboard.progressedSynastry.partner2');

  const signName = (obj?: { sign?: string; sign_ru?: string; sign_uk?: string }) => {
    if (!obj) return '—';
    return pickLocalized(i18n.language, obj.sign, obj.sign_ru, obj.sign_uk);
  };

  const renderPersonCard = (person: ProgressedSynastryPerson | undefined, label: string) => {
    if (!person) return null;
    const progSun = person.progressed_planets?.Sun;
    const progMoon = person.progressed_planets?.Moon;
    return (
      <div style={{
        flex: '1 1 260px',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '14px',
        background: 'var(--bg-secondary)'
      }}>
        <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          {label}
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div>
            {t('dashboard.progressedSynastry.age')}: <strong className="ui-table__strong">{Math.floor(person.age_years)}</strong> {t('dashboard.progressedSynastry.years')}
          </div>
          {person.lunar_phase && (
            <div>
              🌗 {t('dashboard.progressedSynastry.lunarPhase')}: <strong className="ui-table__strong">
                {pickLocalized(i18n.language, person.lunar_phase.phase, person.lunar_phase.phase_ru, person.lunar_phase.phase_uk)}
              </strong>
            </div>
          )}
          {progSun && (
            <div>☀️ {t('dashboard.progressedSynastry.progressedSun')}: <strong className="ui-table__strong">{signName(progSun)}</strong></div>
          )}
          {progMoon && (
            <div>🌙 {t('dashboard.progressedSynastry.progressedMoon')}: <strong className="ui-table__strong">{signName(progMoon)}</strong></div>
          )}
          {person.progressed_ascendant && (
            <div>⬆️ {t('dashboard.progressedSynastry.progressedAscendant')}: <strong className="ui-table__strong">{signName(person.progressed_ascendant)}</strong></div>
          )}
        </div>
      </div>
    );
  };

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
          📈 {t('dashboard.progressedSynastry.title')}{' '}
          <span className="ui-meta" style={{ fontWeight: 400 }}>
            ({t('dashboard.progressedSynastry.hint')})
          </span>
        </h3>
        {data && (
          <span className="ui-meta">
            {t('dashboard.progressedSynastry.period')}: {data.period}
          </span>
        )}
      </div>
      <p className="ui-meta" style={{ marginTop: 'var(--space-2)' }}>
        {t('dashboard.progressedSynastry.subtitle')}
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
            people={data
              ? [
                { label: name1Label, planets: data.person1.progressed_planets },
                { label: name2Label, planets: data.person2.progressed_planets },
              ]
              : []}
          />
        </div>
      )}

      {error && (
        <ErrorWithRetry message={error} onRetry={onRetry} style={{ marginTop: 'var(--space-4)' }} />
      )}

      {/* AI analysis: sits right where the spinner is — above the partner cards and planet tables. */}
      {(analysis || phase === 'typing') && (
        <div className="ui-fade-in" style={{ marginTop: 'var(--space-6)', lineHeight: 'var(--leading-loose)', fontSize: 'var(--text-md)' }}>
          <h4 className="ui-table__strong">
            {t('dashboard.progressedSynastry.analysisTitle')}
          </h4>
          <MarkdownContent content={analysis ?? displayedText} />
          {!analysis && phase === 'typing' && (
            <span className="typing-cursor" aria-hidden="true">▍</span>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Partner cards: age, lunar phase, progressed Sun/Moon/ascendant */}
          <div className="ui-row" style={{ marginTop: 'var(--space-4)', alignItems: 'stretch' }}>
            {renderPersonCard(data.person1, name1Label)}
            {renderPersonCard(data.person2, name2Label)}
          </div>

          {/* Progressed planets tables per partner */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.progressedSynastry.planetsTitle')}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <div className="ui-stat__value" style={{ marginBottom: 'var(--space-2)' }}>{name1Label}</div>
                <ProgressedPlanetsTable planets={data.person1?.progressed_planets} />
              </div>
              <div>
                <div className="ui-stat__value" style={{ marginBottom: 'var(--space-2)' }}>{name2Label}</div>
                <ProgressedPlanetsTable planets={data.person2?.progressed_planets} />
              </div>
            </div>
          </div>

          {/* Period dynamics: what changed against the natal synastry */}
          <div style={{ marginTop: 'var(--space-6)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.progressedSynastry.dynamicsTitle')}
            </h4>
            {data.dynamics && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{
                  flex: '1 1 160px', border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 14px', background: 'var(--bg-secondary)'
                }}>
                  <div className="ui-meta">{t('dashboard.progressedSynastry.natalTotal')}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.dynamics.natal_total}</div>
                </div>
                <div style={{
                  flex: '1 1 160px', border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 14px', background: 'var(--bg-secondary)'
                }}>
                  <div className="ui-meta">{t('dashboard.progressedSynastry.progressedTotal')}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.dynamics.progressed_total}</div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ProgressedSynastryPanel;
