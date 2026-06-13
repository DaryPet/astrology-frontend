// src/components/TransitsPanel.tsx
// Транзиты на конкретный день: выбор даты (по умолчанию сегодня, можно любой
// день прошлого/будущего), выбор места (по умолчанию место рождения), лунная фаза,
// транзитные планеты по натальным домам, аспекты к наталу, AI-анализ.
import React from 'react';
import { useTranslation } from 'react-i18next';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
import LocationInput from './LocationInput';
import type { TransitsData, TransitPlanet, TransitAspect } from '../services/api';
import type { Location } from './LocationInput';

interface TransitsPanelProps {
  data: TransitsData | null;
  analysis: string | null;
  loading: boolean;
  error: string;
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  transitsLocation?: Location | null;
  onLocationChange?: (location: Location | null) => void;
  defaultLocation?: Location | null;
}

// Порядок вывода: Луна и быстрые первыми (день), потом медленные (фон)
const PLANET_ORDER = [
  'Moon', 'Sun', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith', 'Chiron'
];

const TransitsPanel: React.FC<TransitsPanelProps> = ({
  data, analysis, loading, error, selectedDate, onDateChange,
  transitsLocation: externalLocation, onLocationChange, defaultLocation
}) => {
  const { t, i18n } = useTranslation();
  const isRu = (i18n.language || 'ru').startsWith('ru');

  const [internalLocation, setInternalLocation] = React.useState<Location | null>(
    externalLocation ?? defaultLocation ?? null
  );

  React.useEffect(() => {
    setInternalLocation(externalLocation ?? null);
  }, [externalLocation]);

  const handleLocationSelect = (location: Location) => {
    setInternalLocation(location);
    onLocationChange?.(location);
  };

  const handleLocationClear = () => {
    setInternalLocation(null);
    onLocationChange?.(null);
  };

  const planetName = (key: string) => t(`planets.names.${key}`, { defaultValue: key });
  const signName = (planet?: TransitPlanet | { sign?: string; sign_ru?: string }) => {
    if (!planet) return '—';
    return isRu ? (planet.sign_ru || planet.sign || '—') : (planet.sign || '—');
  };
  const aspectName = (asp: TransitAspect) => (isRu ? (asp.aspect_ru || asp.aspect) : asp.aspect);

  const sortedPlanets: TransitPlanet[] = data
    ? PLANET_ORDER
      .map(key => data.transit_planets?.[key])
      .filter((p): p is TransitPlanet => !!p)
    : [];

  const tMoon = data?.transit_planets?.Moon;
  const slowAspects = (data?.aspects_to_natal || []).filter(a => a.is_slow);
  const fastAspects = (data?.aspects_to_natal || []).filter(a => !a.is_slow);

  const renderAspect = (asp: TransitAspect, idx: number) => (
    <li key={`${asp.transit}-${asp.natal}-${idx}`}>
      <strong>{planetName(asp.transit)}</strong>
      {' '}{aspectName(asp)}{' '}
      <strong>{planetName(asp.natal)}</strong>
      {asp.is_return && (
        <span style={{ marginLeft: '6px', fontSize: '12px', color: 'var(--accent, #8b5cf6)', fontWeight: 600 }}>
          ⟳ {t('dashboard.transits.return')}
        </span>
      )}
      <span style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '6px' }}>
        ({t('dashboard.progressions.orb')}: {asp.orb}°
        {typeof asp.applying === 'boolean'
          ? `, ${asp.applying ? t('dashboard.progressions.applying') : t('dashboard.progressions.separating')}`
          : ''})
      </span>
    </li>
  );

  return (
    <div style={{
      marginTop: '24px',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '20px',
      background: 'var(--bg-primary)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <h3 style={{ color: 'var(--text-primary)', margin: 0 }}>
            🌌 {t('dashboard.transits.title')}
        </h3>
        {/* Выбор дня: по умолчанию сегодня, любой день прошлого/будущего */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          aria-label={t('dashboard.transits.pickDate')}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        />
        <button
          type="button"
          onClick={() => onDateChange(new Date().toISOString().slice(0, 10))}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            background: 'none',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          {t('dashboard.transits.today')}
        </button>
      </div>

      {/* Выбор места для транзитов */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '6px' }}>
          {t('dashboard.transits.locationTitle')}
        </label>
        <LocationInput
          value={internalLocation?.display_name || ''}
          onChange={() => {}}
          onLocationSelect={handleLocationSelect}
          placeholder={t('dashboard.transits.locationPlaceholder')}
          style={{ width: '300px', maxWidth: '100%' }}
        />
        {internalLocation && (
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
            {internalLocation.display_name}
            <button
              type="button"
              onClick={handleLocationClear}
              style={{
                marginLeft: '8px',
                background: 'none',
                border: 'none',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: '12px',
                textDecoration: 'underline'
              }}
            >
              {t('dashboard.transits.useBirthLocation')}
            </button>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '6px' }}>
          {t('dashboard.transits.subtitle')}
        </p>
      </div>

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
          {/* Ключевые точки дня: лунная фаза + Луна */}
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
                  {isRu ? (data.lunar_phase.phase_ru || data.lunar_phase.phase) : data.lunar_phase.phase}
                </div>
              </div>
            )}
            {tMoon && (
              <div style={{
                flex: '1 1 220px',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                padding: '14px',
                background: 'var(--bg-secondary)'
              }}>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  🌙 {t('dashboard.transits.moonOfDay')}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {signName(tMoon)}
                  {tMoon.natal_house ? ` · ${t('dashboard.progressions.natalHouse')} ${tMoon.natal_house}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Таблица транзитных планет */}
          <div style={{ marginTop: '20px', overflowX: 'auto' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.transits.planetsTitle')}
            </h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{t('planets.sign')}</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{t('planets.degree')}</th>
                  <th style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>{t('dashboard.transits.movingThroughHouse')}</th>
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

          {/* Аспекты: медленные = темы периода */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.transits.slowAspectsTitle')}
            </h4>
            {slowAspects.length ? (
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', lineHeight: 1.8 }}>
                {slowAspects.slice(0, 8).map(renderAspect)}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>{t('dashboard.transits.noSlowAspects')}</p>
            )}
          </div>

          {/* Аспекты: быстрые = окраска дня */}
          <div style={{ marginTop: '16px' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
              {t('dashboard.transits.fastAspectsTitle')}
            </h4>
            {fastAspects.length ? (
              <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-primary)', lineHeight: 1.8 }}>
                {fastAspects.slice(0, 8).map(renderAspect)}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>{t('dashboard.transits.noFastAspects')}</p>
            )}
          </div>
        </>
      )}

      {/* AI-анализ дня */}
      {analysis && (
        <div style={{ marginTop: '24px', lineHeight: '2', fontSize: '16px' }}>
          <h4 style={{ color: 'var(--text-primary)' }}>
            {t('dashboard.transits.analysisTitle')}
          </h4>
          <MarkdownContent content={analysis} />
        </div>
      )}
    </div>
  );
};

export default TransitsPanel;
