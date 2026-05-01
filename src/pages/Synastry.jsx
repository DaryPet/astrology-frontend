import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { geocodeAPI } from '../services/api';
import Header from '../components/Header';
import LocationInput from '../components/LocationInput';
import SynastryChartComponent from '../components/SynastryChartComponent';
import AspectGrid from '../components/AspectGrid';
import AspectAnalysisModal from '../components/AspectAnalysisModal';
import { astrologyAPI } from '../services/api';

function Synastry() {
  const { t, i18n } = useTranslation();
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
          timezone: p.timezone
        };
      };

      const res = await api.post('/synastry/direct', {
        chart1: parseForm(formData.person1),
        chart2: parseForm(formData.person2)
      });
      setSynastry(res.data);
      setPersonNames({ p1: formData.person1.name, p2: formData.person2.name });
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
                {synastry.chart1 && synastry.chart2 && (
                  <SynastryChartComponent chart1={synastry.chart1} chart2={synastry.chart2} size={700} />
                )}
              </div>
            </div>

            <div className="result-card" style={{marginTop: '20px'}}>
              <AspectGrid aspects={synastry.aspects} onAspectClick={handleAspectClick} />
            </div>

            <button onClick={() => { setSynastry(null); setPersonNames({ p1: '', p2: '' }); }} className="btn btn-primary" style={{ maxWidth: '300px', margin: '40px auto 0', display: 'block' }}>
              {t('synastry.calculateAgain')}
            </button>
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
