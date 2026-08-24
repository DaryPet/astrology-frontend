// src/components/DailyForecastPanel.tsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import LocationInput from './LocationInput';
import type { Location } from './LocationInput';
import ProcessingMessage from './ProcessingMessage';
import { astrologyAPI } from '../services/api';
import { LLM_MODELS, DEFAULT_LLM, LLMModelOption } from '../config/llmModels';

interface ForecastAspect {
  transit: string;
  aspect: string;
  natal: string;
  orb: number;
  weight: number;
  is_point: boolean;
}

interface ForecastResult {
  score: number;
  category: string;
  summary: string;
  base_score: number;
  key_aspects: ForecastAspect[];
  houses_activated: number[];
  fortune: number | null;
  is_day_chart: boolean | null;
  llm_error?: string | null;
}

interface DailyForecastPanelProps {
  natalChart: Record<string, any> | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  critical: '#e53935',
  challenging: '#fb8c00',
  neutral: '#9e9e9e',
  favorable: '#43a047',
  excellent: '#d4af37',
};

const today = () => new Date().toISOString().slice(0, 10);

const DailyForecastPanel: React.FC<DailyForecastPanelProps> = ({ natalChart }) => {
  const { t, i18n } = useTranslation();
  const language = (i18n.language || 'ru').startsWith('ru') ? 'ru' : 'en';

  const [date, setDate] = useState<string>(today());
  const [time, setTime] = useState<string>('12:00');
  const [location, setLocation] = useState<Location | null>(null);
  const [llm, setLlm] = useState<LLMModelOption>(DEFAULT_LLM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [showAspects, setShowAspects] = useState(false);

  const meta = natalChart?.meta || {};

  const cacheKey = () =>
    `daily_forecast|${meta.birth_date}|${meta.birth_place}|${date}|${time}|` +
    `${location ? `${location.lat},${location.lon}` : 'natal'}|${llm.provider}|${llm.model || ''}|${language}`;

  const run = async () => {
    setError('');
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
        birth_date: meta.birth_date,
        birth_place: meta.birth_place,
        latitude: meta.latitude,
        longitude: meta.longitude,
        timezone: meta.timezone,
        house_system:
          (natalChart?.houses_meta as { house_system?: string } | undefined)?.house_system || 'Placidus',
        natal_chart: natalChart,
        target_date: `${date}T${time}:00`,
        transit_timezone: location?.timezone || meta.timezone,
        transit_latitude: location?.lat,
        transit_longitude: location?.lon,
        transit_place: location?.display_name,
        language,
        llm_provider: llm.provider,
        llm_model: llm.model,
      });
      setResult(data as unknown as ForecastResult);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const catColor = result ? CATEGORY_COLORS[result.category] || CATEGORY_COLORS.neutral : '';
  const catLabel = result ? t(`dailyForecast.categories.${result.category}`) : '';

  const inputStyle: React.CSSProperties = {
    padding: '8px 10px',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    background: 'var(--bg-secondary, transparent)',
    color: 'var(--text-primary)',
    fontSize: '14px',
  };

  return (
    <div style={{ marginTop: 'var(--space-6)' }}>
      {/* Форма */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
        <label className="ui-stack ui-meta">
          {t('dailyForecast.dateLabel')}
          <input type="date" style={inputStyle} value={date} onChange={e => setDate(e.target.value)} />
        </label>
        <label className="ui-stack ui-meta">
          {t('dailyForecast.timeLabel')}
          <input type="time" style={inputStyle} value={time} onChange={e => setTime(e.target.value)} />
        </label>
        <div className="ui-stack ui-meta">
          {t('dailyForecast.locationLabel')}
          <LocationInput
            value={location?.display_name || ''}
            onChange={() => {}}
            onLocationSelect={setLocation}
            placeholder={meta.birth_place || t('dailyForecast.locationPlaceholder')}
            style={{ width: '260px', maxWidth: '100%' }}
          />
        </div>
        <label className="ui-stack ui-meta">
          {t('dailyForecast.modelLabel')}
          <select
            style={inputStyle}
            value={`${llm.provider}|${llm.model || ''}`}
            onChange={e => {
              const [provider, model] = e.target.value.split('|');
              setLlm(LLM_MODELS.find(m => m.provider === provider && (m.model || '') === model) || DEFAULT_LLM);
            }}>
            {LLM_MODELS.map(m => (
              <option key={`${m.provider}|${m.model || ''}`} value={`${m.provider}|${m.model || ''}`}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-primary" onClick={run} disabled={loading || !natalChart}>
          {loading ? t('dailyForecast.running') : t('dailyForecast.run')}
        </button>
      </div>

      {loading && (
        <div style={{ marginTop: 'var(--space-6)' }}>
          <ProcessingMessage />
        </div>
      )}

      {error && (
        <div className="ui-error" style={{ marginTop: 'var(--space-4)' }}>{error}</div>
      )}

      {result && !loading && (
        <div
          style={{
            marginTop: '24px',
            border: '1px solid var(--border)',
            borderRadius: '12px',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '44px', fontWeight: 700, color: catColor }}>
              {result.score}/10
            </div>
            <span
              style={{
                padding: '4px 14px',
                borderRadius: '20px',
                background: catColor,
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
              }}>
              {catLabel}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              base: {result.base_score}
            </span>
          </div>

          {result.summary && (
            <p style={{ margin: 0, lineHeight: 'var(--leading-relaxed)', fontSize: 'var(--text-md)' }}>{result.summary}</p>
          )}
          {result.llm_error && (
            <p style={{ margin: 0, fontSize: '13px', color: CATEGORY_COLORS.challenging }}>
              {t('dailyForecast.llmFallback')}
            </p>
          )}

          <div className="ui-meta">
            {t('dailyForecast.activatedHouses')}: {result.houses_activated.join(', ') || '—'}
            {result.fortune != null && <> · {t('dailyForecast.fortune')}: {result.fortune}°</>}
            {result.is_day_chart != null && (
              <> · {result.is_day_chart ? t('dailyForecast.dayChart') : t('dailyForecast.nightChart')}</>
            )}
          </div>

          <button
            onClick={() => setShowAspects(v => !v)}
            style={{
              alignSelf: 'flex-start',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--accent, #7c3aed)',
              fontSize: '14px',
              padding: 0,
            }}>
            {showAspects ? t('dailyForecast.aspectsHide') : t('dailyForecast.aspectsShow')}
          </button>

          {/* Пять колонок на 320 не помещаются; --plain — потому что своей рамки
              у этой таблицы не было, а обычный .ui-table-wrap добавил бы её и
              на десктопе. */}
          {showAspects && (
            <div className="ui-table-wrap ui-table-wrap--plain">
              <table style={{ borderCollapse: 'collapse', fontSize: '13px', width: '100%' }}>
                <thead>
                  <tr>
                    <th>{t('dailyForecast.colTransit')}</th>
                    <th>{t('dailyForecast.colAspect')}</th>
                    <th>{t('dailyForecast.colNatal')}</th>
                    <th>{t('dailyForecast.colOrb')}</th>
                    <th>{t('dailyForecast.colWeight')}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.key_aspects.map((a, i) => (
                    <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                      <td>{t(`planets.names.${a.transit}`, { defaultValue: a.transit })}</td>
                      <td>{t(`dailyForecast.aspects.${a.aspect}`, { defaultValue: a.aspect })}</td>
                      <td>
                        {a.is_point ? a.natal : t(`planets.names.${a.natal}`, { defaultValue: a.natal })}
                      </td>
                      <td>{a.orb}°</td>
                      <td style={{ padding: '6px', color: a.weight >= 0 ? CATEGORY_COLORS.favorable : CATEGORY_COLORS.critical }}>
                        {a.weight > 0 ? `+${a.weight}` : a.weight}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DailyForecastPanel;
