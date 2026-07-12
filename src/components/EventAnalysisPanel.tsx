// src/components/EventAnalysisPanel.tsx
// Анализ события: дата+время+место события, выбор LLM.
// Без натальных данных — payload строго по контракту /api/daily-forecast.
// Самодостаточная панель: своё состояние и запрос, пропсов нет.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LocationInput from './LocationInput';
import type { Location } from './LocationInput';
import ProcessingMessage from './ProcessingMessage';
import { astrologyAPI, geocodeAPI } from '../services/api';
import { LLM_MODELS, DEFAULT_LLM, LLMModelOption } from '../config/llmModels';

type MatchType =
  | 'favourite_win_likely'
  | 'favourite_edge'
  | 'draw_likely'
  | 'underdog_edge'
  | 'underdog_win_likely';

// Отображаем только анализ и ответ; остальные поля ответа
// (key_aspects, strength_breakdown, moon_report и пр.) не рендерим.
interface EventAnalysisResult {
  score?: number;
  category?: 'critical' | 'challenging' | 'neutral' | 'favorable' | 'excellent';
  favorite?: string;
  opponent?: string;
  verdict?: string;
  summary?: string;
  match_type?: MatchType;
  llm_error?: string | null;
  from_cache?: boolean;
  cached_at?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  critical: '#e53935',
  challenging: '#fb8c00',
  neutral: '#9e9e9e',
  favorable: '#43a047',
  excellent: '#d4af37',
};

const today = () => new Date().toISOString().slice(0, 10);

const EventAnalysisPanel: React.FC = () => {
  const { t } = useTranslation();

  const [date, setDate] = useState<string>(today());
  const [time, setTime] = useState<string>('12:00');
  const [location, setLocation] = useState<Location | null>(null);
  const [extraTime, setExtraTime] = useState(false);
  const [llm, setLlm] = useState<LLMModelOption>(DEFAULT_LLM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EventAnalysisResult | null>(null);

  const handleLocationSelect = async (loc: Location) => {
    // Таймзона всегда должна быть таймзоной места события; фоллбэк 'UTC'
    // из LocationInput недопустим — уточняем по координатам.
    if ((!loc.timezone || loc.timezone === 'UTC') && Number.isFinite(loc.lat) && Number.isFinite(loc.lon)) {
      try {
        const detected = await geocodeAPI.detectTimezone(loc.lat, loc.lon);
        if (detected && detected !== 'UTC') {
          loc = { ...loc, timezone: detected };
        }
      } catch {
        // оставляем как есть — валидация ниже не пропустит без таймзоны
      }
    }
    setLocation(loc);
  };

  const cacheKey = () =>
    `event_analysis|${date}|${time}|` +
    `${location ? `${location.lat},${location.lon}` : ''}|${extraTime ? 'et' : ''}|` +
    `${llm.provider}|${llm.model || ''}`;

  const run = async () => {
    setError('');

    if (!date || !time || !location || !location.timezone || location.timezone === 'UTC') {
      setError(t('eventAnalysis.validation.missingFields'));
      return;
    }

    const key = cacheKey();
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        setResult(JSON.parse(cached));
        return;
      } catch {
        localStorage.removeItem(key);
      }
    }

    setLoading(true);
    setResult(null);
    try {
      const data = await astrologyAPI.getDailyForecast({
        target_date: `${date}T${time}:00`,
        transit_timezone: location.timezone,
        transit_place: location.display_name,
        transit_latitude: location.lat,
        transit_longitude: location.lon,
        llm_provider: llm.provider,
        llm_model: llm.model,
        ...(extraTime && { extra_time_possible: true }),
      });
      setResult(data as EventAnalysisResult);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      const detail = e?.response?.data?.detail;
      if (Array.isArray(detail)) {
        setError(detail.map((err: { msg?: string }) => err.msg || JSON.stringify(err)).join(', '));
      } else {
        setError(detail || e?.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const catColor = result?.category
    ? CATEGORY_COLORS[result.category] || CATEGORY_COLORS.neutral
    : CATEGORY_COLORS.neutral;
  const catLabel = result?.category ? t(`eventAnalysis.categories.${result.category}`) : '';

  const hasTexts = Boolean(result?.favorite || result?.opponent || result?.verdict);

  // maxWidth: 'none' перебивает глобальный .hero p { max-width: 600px },
  // иначе абзацы обрезаются посреди контейнера
  const sectionTitleStyle: React.CSSProperties = {
    margin: 0,
    maxWidth: 'none',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  };

  const paragraphStyle: React.CSSProperties = {
    margin: '4px 0 0',
    maxWidth: 'none',
    lineHeight: 1.7,
    fontSize: '15px',
  };

  return (
    <div className="event-analysis-panel">
      {/* Форма события — тот же дизайн, что форма расчёта карты */}
      <div className="form-card">
        {error && <div className="error">{error}</div>}

        <form
          onSubmit={e => {
            e.preventDefault();
            run();
          }}
        >
          <div className="form-row">
            <div className="form-group">
              <label>{t('eventAnalysis.dateLabel')}</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label>{t('eventAnalysis.timeLabel')}</label>
              <input type="time" value={time} onChange={e => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label>{t('eventAnalysis.locationLabel')}</label>
            <LocationInput
              value={location?.display_name || ''}
              onChange={() => {}}
              onLocationSelect={handleLocationSelect}
              placeholder={t('eventAnalysis.locationPlaceholder')}
            />
            {location?.timezone && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('eventAnalysis.timezoneNote')}: {location.timezone.replace('_', ' ')}
              </div>
            )}
          </div>

          <div className="form-group">
            <label>{t('eventAnalysis.modelLabel')}</label>
            <select
              value={`${llm.provider}|${llm.model || ''}`}
              onChange={e => {
                const [provider, model] = e.target.value.split('|');
                setLlm(LLM_MODELS.find(m => m.provider === provider && (m.model || '') === model) || DEFAULT_LLM);
              }}
            >
              {LLM_MODELS.map(m => (
                <option key={`${m.provider}|${m.model || ''}`} value={`${m.provider}|${m.model || ''}`}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={extraTime}
                onChange={e => setExtraTime(e.target.checked)}
                style={{ width: 'auto' }}
              />
              {t('eventAnalysis.extraTimeLabel')}
            </label>
          </div>

          <button type="submit" className="btn-register" disabled={loading}>
            {loading ? t('eventAnalysis.running') : t('eventAnalysis.run')}
          </button>
        </form>
      </div>

      {loading && (
        <div style={{ marginTop: '24px' }}>
          <ProcessingMessage />
        </div>
      )}

      {/* Результат */}
      {result && !loading && (
        <div
          style={{
            margin: '24px auto 0',
            maxWidth: '800px',
            width: '100%',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {result.score != null && (
              <div style={{ fontSize: '44px', fontWeight: 700, color: catColor }}>
                {result.score}/10
              </div>
            )}
            {result.category && (
              <span
                style={{
                  padding: '4px 14px',
                  borderRadius: '20px',
                  background: catColor,
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                }}
              >
                {catLabel}
              </span>
            )}
            {result.match_type && (
              <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {t(`eventAnalysis.matchType.${result.match_type}`, { defaultValue: result.match_type })}
              </span>
            )}
            {result.from_cache && (
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {t('eventAnalysis.fromCache')}
                {result.cached_at ? ` (${result.cached_at})` : ''}
              </span>
            )}
          </div>

          {hasTexts ? (
            <>
              {result.favorite && (
                <div>
                  <p style={sectionTitleStyle}>{t('eventAnalysis.favoriteLabel')}</p>
                  <p style={paragraphStyle}>{result.favorite}</p>
                </div>
              )}
              {result.opponent && (
                <div>
                  <p style={sectionTitleStyle}>{t('eventAnalysis.opponentLabel')}</p>
                  <p style={paragraphStyle}>{result.opponent}</p>
                </div>
              )}
              {result.verdict && (
                <div>
                  <p style={sectionTitleStyle}>{t('eventAnalysis.verdictLabel')}</p>
                  <p style={paragraphStyle}>{result.verdict}</p>
                </div>
              )}
            </>
          ) : (
            result.summary && (
              <p style={{ ...paragraphStyle, margin: 0, whiteSpace: 'pre-line' }}>{result.summary}</p>
            )
          )}

          {result.llm_error && (
            <p style={{ margin: 0, maxWidth: 'none', fontSize: '13px', color: CATEGORY_COLORS.challenging }}>
              {t('eventAnalysis.llmFallback')}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default EventAnalysisPanel;
