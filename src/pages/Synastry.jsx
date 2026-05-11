import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { geocodeAPI, astrologyAPI } from '../services/api';
import Header from '../components/Header';
import LocationInput from '../components/LocationInput';
import SynastryChartComponent from '../components/SynastryChartComponent';
import AspectGrid from '../components/AspectGrid';
import AspectAnalysisModal from '../components/AspectAnalysisModal';

function Synastry() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    person1: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'UTC' },
    person2: { name: '', birth_date: '', birth_time: '12:00', birth_place: '', latitude: null, longitude: null, timezone: 'UTC' }
  });
  const [synastry, setSynastry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [personNames, setPersonNames] = useState({ p1: '', p2: '' });
  const [selectedAspectData, setSelectedAspectData] = useState(null);
  const [aspectAnalysis, setAspectAnalysis] = useState(null);
  const [aspectLoading, setAspectLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Восстановление синастрии из localStorage при загрузке
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

  const handleLocationSelect = async (location, personNum) => {
    const lat = parseFloat(location.lat);
    const lon = parseFloat(location.lon);
    let timezone = location.timezone || 'UTC';

    if (lat && lon) {
      try {
        const detected = await geocodeAPI.detectTimezone(lat, lon);
        if (detected && detected !== 'UTC') timezone = detected;
      } catch (e) { console.warn('Timezone detection warning:', e); }
    }

    const updater = personNum === 1
      ? (p) => setFormData(f => ({...f, person1: p}))
      : (p) => setFormData(f => ({...f, person2: p}));

    updater({
      ...formData[`person${personNum}`],
      birth_place: location.display_name,
      latitude: lat,
      longitude: lon,
      timezone: timezone
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const parseForm = (p) => {
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
      setError(err.response?.data?.detail || err.message || t('home.errors.calcError'));
    } finally {
      setLoading(false);
    }
  };

  const handleAspectClick = async (aspect) => {
    setSelectedAspectData(aspect);
    setAspectLoading(true);

    const storageKey = `aspectAnalysis_${aspect.planet1}_${aspect.planet2}_${aspect.aspect}`;
    const savedAnalysis = localStorage.getItem(storageKey);
    if (savedAnalysis) {
      setAspectAnalysis(savedAnalysis);
      setAspectLoading(false);
      return;
    }

    setAspectAnalysis(null);

    try {
      const result = await astrologyAPI.getSynastryAspectAnalysis({
        planet1: aspect.planet1,
        planet2: aspect.planet2,
        aspect_name: aspect.aspect,
        aspect_name_ru: aspect.aspect_ru || aspect.aspect,
        orb: aspect.orb,
        language: i18n.language
      });

      localStorage.setItem(storageKey, result.analysis);
      setAspectAnalysis(result.analysis);
    } catch (err) {
      console.error('Aspect analysis error:', err);
    } finally {
      setAspectLoading(false);
    }
  };

  // const prepareSynastryDataForAnalysis = (synastryData, personNames) => {
  //   return {
  //     chart1: { ...(synastryData.chart1_input || {}), ...synastryData.chart1 },
  //     chart2: { ...(synastryData.chart2_input || {}), ...synastryData.chart2 },
  //     person1_name: personNames.p1,
  //     person2_name: personNames.p2,
  //     type: 'synastry'
  //   };
  // };

  const prepareSynastryDataForAnalysis = (synastryData, personNames) => {
    return {
      chart1: {
        ...synastryData.chart1_input,
        sun_sign: synastryData.chart1?.sun_sign,
        moon_sign: synastryData.chart1?.moon_sign,
        ascendant: synastryData.chart1?.ascendant,
        planets: synastryData.chart1?.planets
      },
      chart2: {
        ...synastryData.chart2_input,
        sun_sign: synastryData.chart2?.sun_sign,
        moon_sign: synastryData.chart2?.moon_sign,
        ascendant: synastryData.chart2?.ascendant,
        planets: synastryData.chart2?.planets
      },
      overlays: synastryData.overlays,
      aspects: synastryData.aspects,
      person1_name: personNames.p1,
      person2_name: personNames.p2,
      type: 'synastry'
    };
  };

  const chart1Data = synastry?.chart1;
  const chart2Data = synastry?.chart2;

  const handleFullSynastryAnalysisClick = () => {
    const synastryDataForAnalysis = prepareSynastryDataForAnalysis(synastry, personNames);

    localStorage.removeItem('savedFullAnalysis');
    localStorage.removeItem('savedChartId');
    localStorage.removeItem('chartDataForAnalysis');
    localStorage.setItem('chartDataForAnalysis', JSON.stringify(synastryDataForAnalysis));

    setIsNavigating(true); // Hide button immediately

    // Defer navigation to next event loop to allow React to flush state update
    setTimeout(() => {
      if (!isAuthenticated) {
        navigate(`/${i18n.language}/login`, {
          state: { from: '/synastry', chartDataForAnalysis: synastryDataForAnalysis, showFullAnalysis: true }
        });
      } else {
        navigate(`/${i18n.language}/dashboard`, {
          state: { showFullAnalysis: true, chartDataForAnalysis: synastryDataForAnalysis }
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
    localStorage.removeItem('savedSynastry');
    localStorage.removeItem('savedPersonNames');
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('aspectAnalysis_')) {
        localStorage.removeItem(key);
      }
    });
  };

  return (
    <div className="synastry-page">
      <Header />

      <div className="container" style={{ padding: '40px 0' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>{t('synastry.title')}</h1>

        {error && <div className="error">{error}</div>}

        {!synastry ? (
          <form onSubmit={handleSubmit}>
            <div className="synastry-form">
              <div className="form-card">
                <h3 style={{ marginBottom: '20px', color: '#ffd700' }}>{t('synastry.person1')}</h3>
                <div className="form-group">
                  <label>{t('synastry.form.name')}</label>
                  <input type="text" value={formData.person1.name} onChange={(e) => setFormData({...formData, person1: {...formData.person1, name: e.target.value}})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('synastry.form.birthDate')}</label>
                    <input type="date" value={formData.person1.birth_date} onChange={(e) => setFormData({...formData, person1: {...formData.person1, birth_date: e.target.value}})} required />
                  </div>
                  <div className="form-group">
                    <label>{t('synastry.form.birthTime')}</label>
                    <input type="time" value={formData.person1.birth_time} onChange={(e) => setFormData({...formData, person1: {...formData.person1, birth_time: e.target.value}})} />
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
                  <input type="text" value={formData.person2.name} onChange={(e) => setFormData({...formData, person2: {...formData.person2, name: e.target.value}})} required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>{t('synastry.form.birthDate')}</label>
                    <input type="date" value={formData.person2.birth_date} onChange={(e) => setFormData({...formData, person2: {...formData.person2, birth_date: e.target.value}})} required />
                  </div>
                  <div className="form-group">
                    <label>{t('synastry.form.birthTime')}</label>
                    <input type="time" value={formData.person2.birth_time} onChange={(e) => setFormData({...formData, person2: {...formData.person2, birth_time: e.target.value}})} />
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
            <div className="result-card" style={{ marginBottom: '30px' }}>
              <h3 style={{ textAlign: 'center', marginBottom: '20px' }}>{t('synastry.title')}</h3>

              {/* Individual Info side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <h4 style={{ color: '#3b82f6', marginBottom: '10px' }}>{personNames.p1 || t('synastry.person1')}</h4>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div><strong>{t('chart.sun')}:</strong> {synastry.chart1?.sun_sign ? t('planets.signs.' + synastry.chart1.sun_sign) : '—'}</div>
                      <div><strong>{t('chart.moon')}:</strong> {synastry.chart1?.moon_sign ? t('planets.signs.' + synastry.chart1.moon_sign) : '—'}</div>
                      <div><strong>{t('chart.ascendant')}:</strong> {synastry.chart1?.ascendant ? t('planets.signs.' + synastry.chart1.ascendant) : '—'}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 style={{ color: '#ef4444', marginBottom: '10px' }}>{personNames.p2 || t('synastry.person2')}</h4>
                  <div style={{ display: 'flex', justifyContent: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                      <div><strong>{t('chart.sun')}:</strong> {synastry.chart2?.sun_sign ? t('planets.signs.' + synastry.chart2.sun_sign) : '—'}</div>
                      <div><strong>{t('chart.moon')}:</strong> {synastry.chart2?.moon_sign ? t('planets.signs.' + synastry.chart2.moon_sign) : '—'}</div>
                      <div><strong>{t('chart.ascendant')}:</strong> {synastry.chart2?.ascendant ? t('planets.signs.' + synastry.chart2.ascendant) : '—'}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#3b82f6' }}></div>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{personNames.p1 || t('synastry.person1')}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ef4444' }}></div>
                  <span style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{personNames.p2 || t('synastry.person2')}</span>
                </div>
              </div>

              {/* Single Combined Chart */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                {chart1Data && chart2Data && (
                  <SynastryChartComponent chart1={chart1Data} chart2={chart2Data} size={700} />
                )}
              </div>

              {!loading && !isNavigating && synastry && (
                <div style={{ textAlign: 'center', marginTop: '24px' }}>
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
        isOpen={!!selectedAspectData}
        onClose={() => setSelectedAspectData(null)}
        loading={aspectLoading}
      />
    </div>
  );
}

export default Synastry;
