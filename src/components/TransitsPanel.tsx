import React from 'react';
import { useTranslation } from 'react-i18next';
import ErrorWithRetry from './ErrorWithRetry';
import MarkdownContent from './MarkdownContent';
import ProcessingMessage from './ProcessingMessage';
import LiveSkyCarousel from './LiveSkyCarousel';
import { Calendar, MapPin, Check } from 'lucide-react';
import LocationInput from './LocationInput';
import type { TransitsData, TransitPlanet, TransitAspect } from '../services/api';
import type { Location } from './LocationInput';
import type { StreamPhase } from '../hooks/useStreamedText';
import { pickLocalized } from '../i18n/localizedField';

// Mirrors TransitsHistoryEntry in Dashboard.tsx — kept local (structural
// typing) since this is a presentational component, see
// plans/transits-analysis-history-list.md.
export interface TransitsHistoryEntry {
  cacheKey: string;
  day: string;
  locationName: string | null;
  mode: string;
  lang: string;
  createdAt: number;
  dataKey?: string;
}

interface TransitsPanelProps {
  data: TransitsData | null;
  analysis: string | null;
  transitsReady?: boolean;
  displayedText?: string;
  phase?: StreamPhase;
  loading: boolean;
  error: string;
  onRetry?: () => void;
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
  onLocationChange?: (location: Location | null) => void;
  transitsLocation?: Location | null;
  analysisLocation?: string | null;
  analysisDate?: string | null;
  birthPlace?: string;
  onRunAnalysis?: () => void;
  transitsRemaining?: number;
  transitsLimit?: number;
  generationLocked?: boolean;
  history?: TransitsHistoryEntry[];
  viewingCacheKey?: string | null;
  onSelectHistoryEntry?: (entry: TransitsHistoryEntry) => void;
  // Pinned "Текущий" row — the live slot (whatever's currently generating
  // or was last completed for the picked date), always present in the list
  // so it's never lost while browsing older entries. null = nothing live
  // yet (fresh chart, never run).
  currentEntry?: { day: string; locationName: string | null; status: 'locked' | 'ready' } | null;
  onSelectCurrent?: () => void;
}

// Порядок вывода: Луна и быстрые первыми (день), потом медленные (фон)
const PLANET_ORDER = [
  'Moon', 'Sun', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'NorthNode', 'SouthNode', 'Lilith', 'Chiron'
];

const TransitsPanel: React.FC<TransitsPanelProps> = ({
  data, analysis, transitsReady, displayedText = '', phase = 'idle', loading, error, onRetry, selectedDate, onDateChange, onLocationChange, transitsLocation, birthPlace, analysisLocation, analysisDate,
  onRunAnalysis, transitsRemaining, transitsLimit, generationLocked, history = [], viewingCacheKey, onSelectHistoryEntry,
  currentEntry, onSelectCurrent
}) => {
  const { t, i18n } = useTranslation();

  const handleLocationSelect = (location: Location) => {
    onLocationChange?.(location);
  };

  const planetName = (key: string) => t(`planets.names.${key}`, { defaultValue: key });
  const signName = (planet?: TransitPlanet | { sign?: string; sign_ru?: string; sign_uk?: string }) => {
    if (!planet) return '—';
    return pickLocalized(i18n.language, planet.sign, planet.sign_ru, planet.sign_uk);
  };
  const aspectName = (asp: TransitAspect) => pickLocalized(i18n.language, asp.aspect, asp.aspect_ru, asp.aspect_uk);

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
        <span className="ui-aspect-name">
          ⟳ {t('dashboard.transits.return')}
        </span>
      )}
      <span className="ui-aspect-orb">
        ({t('dashboard.progressions.orb')}: {asp.orb}°
        {typeof asp.applying === 'boolean'
          ? `, ${asp.applying ? t('dashboard.progressions.applying') : t('dashboard.progressions.separating')}`
          : ''})
      </span>
    </li>
  );

  return (
    <div className="ui-card ui-section ui-fade-in">
      <div className="ui-row" style={{ marginBottom: 'var(--space-3)' }}>
        <h3 className="ui-subtitle" style={{ marginBottom: 0 }}>
          {t('dashboard.transits.title')}
        </h3>
        {/* Выбор дня: по умолчанию сегодня, любой день прошлого/будущего */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => e.target.value && onDateChange(e.target.value)}
          aria-label={t('dashboard.transits.pickDate')}
          className="ui-input"
          style={{ width: 'auto', cursor: 'pointer' }}
        />
        <button
          type="button"
          onClick={() => onDateChange(new Date().toISOString().slice(0, 10))}
          className="ui-btn ui-btn--ghost ui-btn--sm"
        >
          {t('dashboard.transits.today')}
        </button>
      </div>

      {/* Выбор места для транзитов */}
      <div className="ui-field">
        <label className="ui-label">
          {t('dashboard.transits.locationTitle')}
        </label>
        <LocationInput
          value={transitsLocation?.display_name || ''}
          onChange={() => {}}
          onLocationSelect={handleLocationSelect}
          placeholder={t('dashboard.transits.locationPlaceholder')}
          style={{ width: '300px', maxWidth: '100%' }}
        />
        {transitsLocation && (
          <div className="ui-hint">
            {transitsLocation.display_name}
            <button
              type="button"
              onClick={() => onLocationChange?.(null)}
              className="ui-linklike"
            >
              {t('dashboard.transits.useBirthLocation')}
            </button>
          </div>
        )}
        <p className="ui-meta" style={{ marginTop: 'var(--space-2)' }}>
          {t('dashboard.transits.subtitle')}
        </p>
      </div>

      {/* Запуск AI-анализа: явная кнопка + остаток дневного лимита — сразу после выбора даты/места, до расчётов */}
      <div className="ui-row" style={{ marginBottom: 'var(--space-4)' }}>
        <button
          type="button"
          onClick={() => onRunAnalysis?.()}
          disabled={loading || generationLocked || transitsRemaining === 0}
          className="ui-btn ui-btn--primary"
        >
          {t('dashboard.transits.giveAnalysis')}
        </button>
        {typeof transitsRemaining === 'number' && typeof transitsLimit === 'number' && (
          <span className="ui-meta">
            {t('dashboard.transits.remaining', { count: transitsRemaining, limit: transitsLimit })}
          </span>
        )}
      </div>

      {/* На что рассчитан показанный анализ: если он уже готов (или ещё
          стримится) — дата/место заморожены на момент запуска, иначе —
          текущий выбор в форме выше. */}
      <div className="ui-meta ui-row ui-row--tight" style={{ marginBottom: 'var(--space-3)' }}>
        <Calendar size={13} strokeWidth={2} />
        <span>{t('dashboard.transits.calculatedFor')}: {(analysis && analysisDate) ? analysisDate : selectedDate}</span>
        <MapPin size={13} strokeWidth={2} />{' '}
        {analysis && analysisLocation
          ? analysisLocation
          : transitsLocation
            ? transitsLocation.display_name
            : birthPlace
              ? birthPlace
              : t('dashboard.transits.birthLocation')}
      </div>

      {/* Список готовых анализов этой карты — клик подставляет текст из
          localStorage без похода в сеть и не трогает форму выбора даты/
          места и уж тем более фоновую генерацию, если она сейчас идёт.
          Не дропдаун — обычные кликабельные строки. "Текущий" — закреплённая
          первая строка, ведущая обратно к живому слоту (спиннер/стриминг/
          готовый текст — что сейчас реально происходит для выбранной даты),
          даже пока просматривается какая-то из более старых записей. */}
      {(currentEntry || history.length > 0) && (
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <h4 className="ui-label">
            {t('dashboard.transits.historyTitle')}
          </h4>
          <div className="ui-stack">
            {currentEntry && (
              <button
                type="button"
                onClick={() => onSelectCurrent?.()}
                className={`ui-listbtn${!viewingCacheKey ? ' ui-listbtn--active' : ''}`}
              >
                {t('dashboard.transits.currentLabel')} — {currentEntry.day}
                {currentEntry.locationName ? ` · ${currentEntry.locationName}` : ''}
                {currentEntry.status === 'locked' && (
                  <span className="ui-chip" style={{ marginLeft: 'var(--space-2)' }}>
                    {t('dashboard.transits.inProgress')}
                  </span>
                )}
                {!viewingCacheKey && currentEntry.status === 'ready' && (
                  <Check size={14} strokeWidth={2.5} className="ui-accent" style={{ marginLeft: 'var(--space-2)' }} />
                )}
              </button>
            )}
            {history.slice().reverse().map((entry) => {
              const isActive = entry.cacheKey === viewingCacheKey;
              return (
                <button
                  key={entry.cacheKey}
                  type="button"
                  onClick={() => onSelectHistoryEntry?.(entry)}
                  className={`ui-listbtn${isActive ? ' ui-listbtn--active' : ''}`}
                >
                  {entry.day}
                  {entry.locationName ? ` · ${entry.locationName}` : ''}
                  {isActive && (
                    <Check size={14} strokeWidth={2.5} className="ui-accent" style={{ marginLeft: 'var(--space-2)' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading && phase !== 'typing' && !analysis && (
        <div style={{ marginTop: 'var(--space-5)' }}>
          <ProcessingMessage
            size="sm"
            title={phase === 'generating' ? t('dashboard.fullAnalysis.generating') : t('dashboard.fullAnalysis.searching')}
            phase={phase === 'generating' ? 'generating' : 'searching'}
          />
          {/* Transit planets are the sky right now, not the natal chart —
              hence variant="sky" and its own title. */}
          <LiveSkyCarousel
            variant="sky"
            people={data?.transit_planets ? [{ planets: data.transit_planets }] : []}
          />
        </div>
      )}

      {error && (
        <ErrorWithRetry message={error} onRetry={onRetry} />
      )}

      {/* Daily AI analysis: shown only after an explicit run (transitsReady),
          or while a just-started analysis is streaming (phase === 'typing').
          Sits right where the spinner is — above the planet table and aspect lists. */}
      {((transitsReady && analysis) || phase === 'typing') && (
        <div className="ui-fade-in" style={{ marginTop: 'var(--space-6)', lineHeight: 'var(--leading-loose)', fontSize: 'var(--text-md)' }}>
          <h4 className="ui-subtitle">
            {t('dashboard.transits.analysisTitle')}
          </h4>
          <MarkdownContent content={analysis ?? displayedText} />
          {!analysis && phase === 'typing' && (
            <span className="typing-cursor" aria-hidden="true">▍</span>
          )}
        </div>
      )}

      {data && (
        <>
          {/* Ключевые точки дня: лунная фаза + Луна */}
          <div className="ui-row" style={{ marginTop: 'var(--space-4)', alignItems: 'stretch' }}>
            {data.lunar_phase && (
              <div className="ui-card ui-card--tight" style={{ flex: '1 1 220px' }}>
                <div className="ui-stat__label">
                  🌗 {t('dashboard.progressions.lunarPhase')}
                </div>
                <div className="ui-stat__value">
                  {pickLocalized(i18n.language, data.lunar_phase.phase, data.lunar_phase.phase_ru, data.lunar_phase.phase_uk)}
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
                <div className="ui-stat__label">
                  🌙 {t('dashboard.transits.moonOfDay')}
                </div>
                <div className="ui-stat__value">
                  {signName(tMoon)}
                  {tMoon.natal_house ? ` · ${t('dashboard.progressions.natalHouse')} ${tMoon.natal_house}` : ''}
                </div>
              </div>
            )}
          </div>

          {/* Таблица транзитных планет */}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.transits.planetsTitle')}
            </h4>
            {/* Обёртка обязательна: без неё таблица растягивает страницу по
                горизонтали на узком экране (ui.css:213, эталон применения —
                ProgressedPlanetsTable.tsx). */}
            <div className="ui-table-wrap">
              <table className="ui-table">
                <thead>
                  <tr >
                    <th>{t('planets.sign')}</th>
                    <th>{t('planets.degree')}</th>
                    <th>{t('dashboard.transits.movingThroughHouse')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlanets.map((planet) => (
                    <tr key={planet.planet} className="ui-table__strong">
                      <td>
                        <strong>{planetName(planet.planet)}</strong>
                        {planet.is_retrograde && (
                          <span className="ui-muted">℞</span>
                        )}
                        {' — '}{signName(planet)}
                      </td>
                      <td>
                        {planet.degree?.toFixed(1)}°
                      </td>
                      <td>
                        {planet.natal_house ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Аспекты: медленные = темы периода */}
          <div style={{ marginTop: 'var(--space-5)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.transits.slowAspectsTitle')}
            </h4>
            {slowAspects.length ? (
              <ul className="ui-list">
                {slowAspects.slice(0, 8).map(renderAspect)}
              </ul>
            ) : (
              <p className="ui-muted">{t('dashboard.transits.noSlowAspects')}</p>
            )}
          </div>

          {/* Аспекты: быстрые = окраска дня */}
          <div style={{ marginTop: 'var(--space-4)' }}>
            <h4 className="ui-subtitle">
              {t('dashboard.transits.fastAspectsTitle')}
            </h4>
            {fastAspects.length ? (
              <ul className="ui-list">
                {fastAspects.slice(0, 8).map(renderAspect)}
              </ul>
            ) : (
              <p className="ui-muted">{t('dashboard.transits.noFastAspects')}</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default TransitsPanel;
