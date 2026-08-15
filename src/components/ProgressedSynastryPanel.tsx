import React from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
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
  name1?: string;
  name2?: string;
}

const ProgressedSynastryPanel: React.FC<ProgressedSynastryPanelProps> = ({ data, analysis, displayedText = '', phase = 'idle', loading, error, name1, name2 }) => {
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
            {t('dashboard.progressedSynastry.age')}: <strong style={{ color: 'var(--text-primary)' }}>{Math.floor(person.age_years)}</strong> {t('dashboard.progressedSynastry.years')}
          </div>
          {person.lunar_phase && (
            <div>
              🌗 {t('dashboard.progressedSynastry.lunarPhase')}: <strong style={{ color: 'var(--text-primary)' }}>
                {pickLocalized(i18n.language, person.lunar_phase.phase, person.lunar_phase.phase_ru, person.lunar_phase.phase_uk)}
              </strong>
            </div>
          )}
          {progSun && (
            <div>☀️ {t('dashboard.progressedSynastry.progressedSun')}: <strong style={{ color: 'var(--text-primary)' }}>{signName(progSun)}</strong></div>
          )}
          {progMoon && (
            <div>🌙 {t('dashboard.progressedSynastry.progressedMoon')}: <strong style={{ color: 'var(--text-primary)' }}>{signName(progMoon)}</strong></div>
          )}
          {person.progressed_ascendant && (
            <div>⬆️ {t('dashboard.progressedSynastry.progressedAscendant')}: <strong style={{ color: 'var(--text-primary)' }}>{signName(person.progressed_ascendant)}</strong></div>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '8px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
          📈 {t('dashboard.progressedSynastry.title')}
        </h3>
        {data && (
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            {t('dashboard.progressedSynastry.period')}: {data.period}
          </span>
        )}
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
        {t('dashboard.progressedSynastry.subtitle')}
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

      {/* AI-анализ: стоит ровно на месте спиннера — до карточек партнёров и таблиц планет. */}
      {(analysis || phase === 'typing') && (
        <div style={{ marginTop: '24px', lineHeight: '2', fontSize: '16px' }}>
          <h4 style={{ color: 'var(--text-primary)' }}>
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
          {/* Карточки партнёров: возраст, лунная фаза, прогр. Солнце/Луна/асцендент */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
            {renderPersonCard(data.person1, name1Label)}
            {renderPersonCard(data.person2, name2Label)}
          </div>

          {/* Таблицы прогрессивных планет по каждому партнёру */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.progressedSynastry.planetsTitle')}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>{name1Label}</div>
                <ProgressedPlanetsTable planets={data.person1?.progressed_planets} />
              </div>
              <div>
                <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>{name2Label}</div>
                <ProgressedPlanetsTable planets={data.person2?.progressed_planets} />
              </div>
            </div>
          </div>

          {/* Динамика периода: что изменилось по сравнению с натальной синастрией */}
          <div style={{ marginTop: '24px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.progressedSynastry.dynamicsTitle')}
            </h4>
            {data.dynamics && (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{
                  flex: '1 1 160px', border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 14px', background: 'var(--bg-secondary)'
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('dashboard.progressedSynastry.natalTotal')}</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>{data.dynamics.natal_total}</div>
                </div>
                <div style={{
                  flex: '1 1 160px', border: '1px solid var(--border)', borderRadius: '10px',
                  padding: '12px 14px', background: 'var(--bg-secondary)'
                }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{t('dashboard.progressedSynastry.progressedTotal')}</div>
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
