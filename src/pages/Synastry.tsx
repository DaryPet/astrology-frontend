import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { geocodeAPI, astrologyAPI } from '../services/api';
import { streamSynastryAspectAnalysis } from '../services/streamApi';
import type { StreamPhase } from '../hooks/useStreamedText';
import Header from '../components/Header';
import LocationInput from '../components/LocationInput';
// СТАРЫЙ рендер синастрии (D3, чёрный центр). Не удалять — вернуть при необходимости:
// import SynastryChartComponent from '../components/SynastryChartComponent-draft';
import SynastryChartComponent from '../components/SynastryChartComponentV2';
import AspectGrid from '../components/AspectGrid';
import AspectAnalysisModal from '../components/AspectAnalysisModal';
import AnalysisModeToggle from '../components/AnalysisModeToggle';

interface PersonFormData {
  name: string;
  birth_date: string;
  birth_time: string;
  birth_place: string;
  latitude: number | null;
  longitude: number | null;
  timezone: string;
}

interface SynastryResponse {
  chart1?: ChartData;
  chart2?: ChartData;
  aspects?: AspectData[];
  overlays?: unknown[];
  [key: string]: unknown;
}

interface ChartData {
  planets?: Record<string, { full_degree?: number; sign?: string; sign_ru?: string; degree?: number; speed?: number; house?: number; is_retrograde?: boolean }>;
  houses?: Record<string, { cusp_longitude?: number; sign?: string }>;
  sun_sign?: string;
  moon_sign?: string;
  ascendant?: string;
  [key: string]: unknown;
}

interface AspectData {
  planet1: string;
  planet2: string;
  aspect: string;
  aspect_ru?: string;
  orb?: number;
}

interface SynastryDataForAnalysis {
  chart1: ChartData;
  chart2: ChartData;
  overlays: unknown;
  aspects: unknown;
  person1_name?: string;
  person2_name?: string;
  type: string;
  [key: string]: unknown;
}

function Synastry() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState<{ person1: PersonFormData; person2: PersonFormData }>({
    person1: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'UTC' },
    person2: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'UTC' }
  });
  const [synastry, setSynastry] = useState<SynastryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [personNames, setPersonNames] = useState<{ p1: string; p2: string }>({ p1: '', p2: '' });
  const [selectedAspectData, setSelectedAspectData] = useState<AspectData | null>(null);
  const [selectedAspectKey, setSelectedAspectKey] = useState<string | null>(null);
  const selectedAspectKeyRef = useRef<string | null>(null);
  const [aspectAnalysis, setAspectAnalysis] = useState<string | null>(null);
  const [aspectLoading, setAspectLoading] = useState(false);
  // Своя ячейка на каждую карточку аспекта (ключ — planet1_planet2_aspect), плюс
  // номер поколения на повторный клик по той же карточке — карточки кликаются
  // параллельно и независимо, ничего не отменяем (см. Dashboard.tsx).
  const [aspectLiveStreams, setAspectLiveStreams] = useState<Record<string, { phase: StreamPhase; text: string }>>({});
  const aspectGenerationRef = useRef<Record<string, number>>({});
  const [isNavigating, setIsNavigating] = useState(false);
  const [analysisMode, setAnalysisMode] = useState<string>(() => {
    return localStorage.getItem('synastryAnalysisMode') || 'simple';
  });
  const [relationshipContext, setRelationshipContext] = useState<string>(() => {
    return localStorage.getItem('synastryRelationshipContext') || 'default';
  });

  useEffect(() => {
    const savedSynastry = localStorage.getItem('savedSynastry');
    const savedNames = localStorage.getItem('savedPersonNames');

    if (savedSynastry && !synastry) {
      try {
        const parsed = JSON.parse(savedSynastry);
        setSynastry(parsed);
      } catch (e) {
        console.error('Error parsing saved synastry:', e);
      }
    }

    if (savedNames && !personNames.p1) {
      try {
        setPersonNames(JSON.parse(savedNames));
      } catch (e) {
        console.error('Error parsing saved names:', e);
      }
    }
  }, [synastry, personNames]);

  const handleLocationSelect = async (location: { lat: number; lon: number; display_name: string; timezone?: string }, personNum: number) => {
    const lat = typeof location.lat === 'string' ? parseFloat(String(location.lat)) : location.lat;
    const lon = typeof location.lon === 'string' ? parseFloat(String(location.lon)) : location.lon;
    let timezone = location.timezone || 'UTC';

    if (lat && lon) {
      try {
        const detected = await geocodeAPI.detectTimezone(lat, lon);
        if (detected && detected !== 'UTC') timezone = detected;
      } catch (e) { console.warn('Timezone detection warning:', e); }
    }

    const key = personNum === 1 ? 'person1' : 'person2';
    setFormData(f => ({
      ...f,
      [key]: {
        ...f[key],
        birth_place: location.display_name,
        latitude: lat,
        longitude: lon,
        timezone: timezone
      }
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const parseForm = (p: PersonFormData) => {
        const [y, m, d] = p.birth_date.split('-');
        const [h, min] = p.birth_time.split(':');
        return {
          birth_date: `${y}-${m}-${d}T${h}:${min}:00`,
          birth_time: p.birth_time,
          birth_place: p.birth_place,
          latitude: p.latitude || 55.7558,
          longitude: p.longitude || 37.6173,
          timezone: p.timezone,
          house_system: 'Placidus'
        };
      };

      const chart1Data = parseForm(formData.person1);
      const chart2Data = parseForm(formData.person2);

      const res = await api.post('/synastry/direct', {
        chart1: chart1Data,
        chart2: chart2Data
      });

      const synastryWithFormData = {
        ...res.data,
        chart1_input: chart1Data,
        chart2_input: chart2Data
      };

      setSynastry(synastryWithFormData);
      localStorage.setItem('savedSynastry', JSON.stringify(synastryWithFormData));
      setPersonNames({ p1: formData.person1.name, p2: formData.person2.name });
      localStorage.setItem('savedPersonNames', JSON.stringify({ p1: formData.person1.name, p2: formData.person2.name }));
    } catch (err) {
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || (err as Error)?.message || t('home.errors.calcError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAspectClick = async (aspect: AspectData) => {
    const aspectKey = `${aspect.planet1}_${aspect.planet2}_${aspect.aspect}`;
    setSelectedAspectData(aspect);
    setSelectedAspectKey(aspectKey);
    selectedAspectKeyRef.current = aspectKey;
    setAspectLoading(true);

    const storageKey = `aspectAnalysis_${aspect.planet1}_${aspect.planet2}_${aspect.aspect}`;
    const savedAnalysis = localStorage.getItem(storageKey);
    if (savedAnalysis) {
      setAspectAnalysis(savedAnalysis);
      setAspectLoading(false);
      return;
    }

    setAspectAnalysis(null);

    const aspectPayload = {
      planet1: aspect.planet1 ?? '',
      planet2: aspect.planet2 ?? '',
      aspect_name: aspect.aspect ?? '',
      aspect_name_ru: aspect.aspect_ru || aspect.aspect,
      orb: aspect.orb,
      language: i18n.language
    };

    const myGeneration = (aspectGenerationRef.current[aspectKey] ?? 0) + 1;
    aspectGenerationRef.current[aspectKey] = myGeneration;
    const isCurrentGeneration = () => aspectGenerationRef.current[aspectKey] === myGeneration;
    const isStillOpen = () => isCurrentGeneration() && selectedAspectKeyRef.current === aspectKey;
    const clearLive = () => {
      if (!isCurrentGeneration()) return;
      setAspectLiveStreams(prev => {
        if (!(aspectKey in prev)) return prev;
        const next = { ...prev };
        delete next[aspectKey];
        return next;
      });
    };

    let accumulated = '';
    await streamSynastryAspectAnalysis(
      // mode не берём из analysisMode: как и в нестрим-версии выше — здесь он не был
      // прокинут, дефолт 'simple' сохраняем, чтобы не менять поведение попутно.
      { ...aspectPayload, mode: 'simple' },
      {
        onStage: (stage) => {
          if (!isCurrentGeneration()) return;
          setAspectLiveStreams(prev => {
            const cur = prev[aspectKey];
            if (cur?.phase === 'typing') return prev;
            return { ...prev, [aspectKey]: { phase: stage === 'generating' ? 'generating' : 'searching', text: cur?.text ?? '' } };
          });
        },
        onDelta: (text) => {
          accumulated += text;
          if (!isCurrentGeneration()) return;
          setAspectLiveStreams(prev => ({ ...prev, [aspectKey]: { phase: 'typing', text: accumulated } }));
        },
        onFinal: (result) => {
          localStorage.setItem(storageKey, result.analysis);
          clearLive();
          if (isStillOpen()) {
            setAspectAnalysis(result.analysis);
            setAspectLoading(false);
          }
        },
        onError: async (detail) => {
          if (!accumulated) {
            try {
              const result = await astrologyAPI.getSynastryAspectAnalysis(aspectPayload);
              localStorage.setItem(storageKey, result.analysis);
              if (isStillOpen()) setAspectAnalysis(result.analysis);
            } catch (err) {
              if (isStillOpen()) console.error('Aspect analysis error:', err);
            } finally {
              clearLive();
              if (isStillOpen()) setAspectLoading(false);
            }
            return;
          }
          clearLive();
          if (isStillOpen()) {
            console.error('Aspect analysis error:', detail);
            setAspectLoading(false);
          }
        },
      }
    );
  };

  const prepareSynastryDataForAnalysis = useCallback((synastryData: SynastryResponse | null, personNames: { p1: string; p2: string }): SynastryDataForAnalysis | null => {
    if (!synastryData) return null;
    return {
      chart1: {
        ...(synastryData.chart1_input || {}),
        sun_sign: synastryData.chart1?.sun_sign,
        moon_sign: synastryData.chart1?.moon_sign,
        ascendant: synastryData.chart1?.ascendant,
        planets: synastryData.chart1?.planets,
        houses: synastryData.chart1?.houses
      },
      chart2: {
        ...(synastryData.chart2_input || {}),
        sun_sign: synastryData.chart2?.sun_sign,
        moon_sign: synastryData.chart2?.moon_sign,
        ascendant: synastryData.chart2?.ascendant,
        planets: synastryData.chart2?.planets,
        houses: synastryData.chart2?.houses
      },
      overlays: synastryData.overlays || [],
      aspects: synastryData.aspects || [],
      person1_name: personNames.p1,
      person2_name: personNames.p2,
      type: 'synastry',
      relationship_context: relationshipContext
    };
  }, [relationshipContext]);

  const chart1Data = synastry?.chart1;
  const chart2Data = synastry?.chart2;

  const handleFullSynastryAnalysisClick = () => {
    const synastryDataForAnalysis = prepareSynastryDataForAnalysis(synastry, personNames);
    if (!synastryDataForAnalysis) return;

    localStorage.setItem('synastryAnalysisMode', analysisMode);
    localStorage.setItem('synastryRelationshipContext', relationshipContext);

    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedChartId');
    localStorage.removeItem('chartDataForAnalysis');
    // localStorage.removeItem('savedFullAnalysis');
    // localStorage.removeItem('savedFullAnalysis_simple');
    // localStorage.removeItem('savedFullAnalysis_advanced');
    // localStorage.removeItem('savedChartId');
    // localStorage.removeItem('chartDataForAnalysis');
    // localStorage.removeItem('pendingAnalysisResult');
    localStorage.setItem('chartDataForAnalysis', JSON.stringify(synastryDataForAnalysis));

    // Persist analysis job to survive navigation during processing
    localStorage.setItem('pendingAnalysisJob', JSON.stringify({
      chartDataForAnalysis: synastryDataForAnalysis,
      analysisMode,
      timestamp: Date.now()
    }));

    setIsNavigating(true);

    setTimeout(() => {
      if (!isAuthenticated) {
        navigate(`/${i18n.language}/login`, {
          state: { from: '/synastry', chartDataForAnalysis: synastryDataForAnalysis, showFullAnalysis: true, analysisMode }
        });
      } else {
        navigate(`/${i18n.language}/dashboard`, {
          state: { showFullAnalysis: true, chartDataForAnalysis: synastryDataForAnalysis, analysisMode }
        });
      }
    }, 0);
  };

  const handleNewCalculation = () => {
    setFormData({
      person1: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'UTC' },
      person2: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'UTC' }
    });
    setSynastry(null);
    setPersonNames({ p1: '', p2: '' });
    setSelectedAspectData(null);
    setAspectAnalysis(null);
    setError('');
    setRelationshipContext('default');
    localStorage.removeItem('savedSynastry');
    localStorage.removeItem('savedPersonNames');
    localStorage.removeItem('synastryRelationshipContext');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('aspectAnalysis_')) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <div className="synastry-page">
      <Header />

      <div className="container" style={{ padding: 'var(--space-8) 0' }}>
        <h1 style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>{t('synastry.title')}</h1>

        {error && <div className="error">{error}</div>}

        {!synastry ? (
          <form onSubmit={handleSubmit}>
            <div className="synastry-form">
              <div className="form-card">
                <h3 style={{ marginBottom: '20px', color: '#ffd700' }}>{t('synastry.person1')}</h3>
                <div className="form-group">
                  <label>{t('synastry.form.name')}</label>
                  <input type="text" value={formData.person1.name} onChange={(e) => setFormData({ ...formData, person1: { ...formData.person1, name: e.target.value } })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('synastry.form.birthDate')}</label>
                    <input type="date" value={formData.person1.birth_date} onChange={(e) => setFormData({ ...formData, person1: { ...formData.person1, birth_date: e.target.value } })} required />
                  </div>
                  <div className="form-group">
                    <label>{t('synastry.form.birthTime')}</label>
                    <input type="time" value={formData.person1.birth_time} onChange={(e) => setFormData({ ...formData, person1: { ...formData.person1, birth_time: e.target.value } })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('synastry.form.birthPlace')}</label>
                  <LocationInput
                    value={formData.person1.birth_place}
                    onLocationSelect={(loc) => handleLocationSelect(loc, 1)}
                    placeholder={t('synastry.form.birthPlacePlaceholder')}
                    required
                  />
                </div>
              </div>

              <div className="form-card">
                <h3 style={{ marginBottom: '20px', color: '#ff6b6b' }}>{t('synastry.person2')}</h3>
                <div className="form-group">
                  <label>{t('synastry.form.name')}</label>
                  <input type="text" value={formData.person2.name} onChange={(e) => setFormData({ ...formData, person2: { ...formData.person2, name: e.target.value } })} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('synastry.form.birthDate')}</label>
                    <input type="date" value={formData.person2.birth_date} onChange={(e) => setFormData({ ...formData, person2: { ...formData.person2, birth_date: e.target.value } })} required />
                  </div>
                  <div className="form-group">
                    <label>{t('synastry.form.birthTime')}</label>
                    <input type="time" value={formData.person2.birth_time} onChange={(e) => setFormData({ ...formData, person2: { ...formData.person2, birth_time: e.target.value } })} />
                  </div>
                </div>
                <div className="form-group">
                  <label>{t('synastry.form.birthPlace')}</label>
                  <LocationInput
                    value={formData.person2.birth_place}
                    onLocationSelect={(loc) => handleLocationSelect(loc, 2)}
                    placeholder={t('synastry.form.birthPlacePlaceholder')}
                    required
                  />
                </div>
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={loading} style={{ maxWidth: '300px', margin: '0 auto', display: 'block' }}>
              {loading ? t('synastry.calculating') : t('synastry.calculate')}
            </button>
          </form>
        ) : (
          <div>
            <div className="result-card" style={{ marginBottom: 'var(--space-7)' }}>
              <h3 style={{ textAlign: 'center', marginBottom: 'var(--space-5)' }}>{t('synastry.title')}</h3>

              <div className="ui-grid" style={{ gap: 'var(--space-5)', marginBottom: 'var(--space-5)' }}>
                <div>
                  <h4 style={{ color: '#3b82f6', marginBottom: '10px', textAlign: 'center' }}>{personNames.p1 || t('synastry.person1')}</h4>
                  <div className="ui-row ui-meta" style={{ justifyContent: 'center' }}>
                    <div className="ui-row" style={{ gap: 'var(--space-5)' }}>
                      <div><strong>{t('chart.sun')}:</strong> {synastry.chart1?.sun_sign ? t('planets.signs.' + synastry.chart1.sun_sign) : '—'}</div>
                      <div><strong>{t('chart.moon')}:</strong> {synastry.chart1?.moon_sign ? t('planets.signs.' + synastry.chart1.moon_sign) : '—'}</div>
                      <div><strong>{t('chart.ascendant')}:</strong> {synastry.chart1?.ascendant ? t('planets.signs.' + synastry.chart1.ascendant) : '—'}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ color: '#ef4444', marginBottom: '10px', textAlign: 'center' }}>{personNames.p2 || t('synastry.person2')}</h4>
                  <div className="ui-row ui-meta" style={{ justifyContent: 'center' }}>
                    <div className="ui-row" style={{ gap: 'var(--space-5)' }}>
                      <div><strong>{t('chart.sun')}:</strong> {synastry.chart2?.sun_sign ? t('planets.signs.' + synastry.chart2.sun_sign) : '—'}</div>
                      <div><strong>{t('chart.moon')}:</strong> {synastry.chart2?.moon_sign ? t('planets.signs.' + synastry.chart2.moon_sign) : '—'}</div>
                      <div><strong>{t('chart.ascendant')}:</strong> {synastry.chart2?.ascendant ? t('planets.signs.' + synastry.chart2.ascendant) : '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
                <div className="ui-row ui-row--tight">
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                  <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>{personNames.p1 || t('synastry.person1')}</span>
                </div>
                <div className="ui-row ui-row--tight">
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <span style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>{personNames.p2 || t('synastry.person2')}</span>
                </div>
              </div>

              <div className="ui-row" style={{ justifyContent: 'center' }}>
                {chart1Data && chart2Data && (
                  <SynastryChartComponent chart1={chart1Data} chart2={chart2Data} aspects={synastry.aspects} size={700} name1={personNames.p1} name2={personNames.p2} />
                )}
              </div>

              {!loading && !isNavigating && synastry && (
                <div style={{ textAlign: 'center', marginTop: 'var(--space-6)' }}>
                  <AnalysisModeToggle value={analysisMode} onChange={setAnalysisMode} />
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontSize: '14px' }}>
                      {t('synastry.relationshipContext.label')}
                    </label>
                    <select
                      value={relationshipContext}
                      onChange={(e) => {
                        setRelationshipContext(e.target.value);
                        localStorage.setItem('synastryRelationshipContext', e.target.value);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid var(--border)',
                        background: 'var(--background)',
                        color: 'var(--text-primary)',
                        fontSize: '14px',
                        cursor: 'pointer',
                        minWidth: '200px'
                      }}
                    >
                      <option value="default">{t('synastry.relationshipContext.default')}</option>
                      <option value="relatives">{t('synastry.relationshipContext.relatives')}</option>
                      <option value="partner">{t('synastry.relationshipContext.partner')}</option>
                      <option value="colleagues">{t('synastry.relationshipContext.colleagues')}</option>
                      <option value="friends">{t('synastry.relationshipContext.friends')}</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    className="btn-full-analysis"
                    onClick={handleFullSynastryAnalysisClick}
                    disabled={loading}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '14px 28px',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: loading ? 'default' : 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      opacity: loading ? 0.8 : 1,
                      minWidth: '280px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: 'auto',
                      marginRight: 'auto'
                    }}
                  >
                    {t('synastry.getFullAnalysis')}
                  </button>

                  <button
                    type="button"
                    onClick={handleNewCalculation}
                    style={{
                      marginTop: '16px',
                      marginLeft: 'auto',
                      marginRight: 'auto',
                      background: 'transparent',
                      color: 'var(--text-primary)',
                      padding: '12px 24px',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'background 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    {t('synastry.calculateAgain')}
                  </button>
                </div>
              )}
            </div>

            <div className="result-card" style={{ marginTop: '20px' }}>
              <AspectGrid aspects={synastry.aspects} onAspectClick={handleAspectClick} />
            </div>
          </div>
        )}
      </div>
      <AspectAnalysisModal
        aspect={selectedAspectData}
        analysis={aspectAnalysis}
        displayedText={(selectedAspectKey && aspectLiveStreams[selectedAspectKey]?.text) || ''}
        phase={(selectedAspectKey && aspectLiveStreams[selectedAspectKey]?.phase) || 'idle'}
        isOpen={!!selectedAspectData}
        onClose={() => {
          setSelectedAspectData(null);
          setSelectedAspectKey(null);
          selectedAspectKeyRef.current = null;
        }}
        loading={aspectLoading}
      />
    </div>
  );
}

export default Synastry;